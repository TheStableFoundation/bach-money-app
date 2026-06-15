/**
 * Bach Money — protocol bootstrap (devnet / testnet)
 * -----------------------------------------------------------------------------
 * Brings a freshly deployed protocol program to a state where vaults can be
 * opened and toneUSD can be minted. It does, in order:
 *
 *   1. Create the toneUSD stablecoin mint (6 decimals, mint authority = config PDA)
 *   2. InitializeProtocol  — stores risk params + the toneUSD mint in ProtocolConfig
 *   3. Create a test collateral mint (we keep authority so we can fund ourselves)
 *   4. Create the protocol-owned collateral vault token account (owner = config PDA)
 *   5. InitializeCollateral — registers the collateral market
 *   6. Mint some test collateral to the payer so deposits can be tested
 *
 * The two Initialize* instructions are built by hand because the SDK does not
 * (yet) ship builders for them. Layouts mirror protocol/src/instruction.rs and
 * the account orderings mirror protocol/src/processor.rs exactly.
 *
 * Nothing here is destructive: every step is idempotent. Re-running skips work
 * that is already on-chain and reuses mints recorded in the per-cluster output
 * file (bootstrap-output.<cluster>.json).
 *
 * Run:   pnpm --filter @bach-money/scripts bootstrap:devnet
 *        pnpm --filter @bach-money/scripts bootstrap:testnet
 *
 * Cluster + shared env overrides live in networks.ts. Bootstrap-specific ones:
 *   TONEUSD_MINT        reuse an existing toneUSD mint instead of creating one
 *   COLLATERAL_MINT     reuse an existing collateral mint instead of creating one
 *   INIT_PROTOCOL_ONLY  set to "1" to stop after InitializeProtocol (skip collateral)
 */

import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import {
  resolveNetwork,
  loadKeypair,
  loadOutput,
  saveOutput,
  type BootstrapOutput,
} from "./networks.ts";

// --- configuration -----------------------------------------------------------

const NET = resolveNetwork();
const { cluster, rpcUrl, keypairPath, programId, governanceMint, outputFile } =
  NET;

// Seeds — must match protocol/src/lib.rs.
const CONFIG_SEED = Buffer.from("config");
const COLLATERAL_SEED = Buffer.from("collateral");

const STABLE_MINT_DECIMALS = 6;

// Protocol risk parameters (validated on-chain in validate_risk_parameters):
//   stability_fee_bps      <= 5000
//   liquidation_ratio_bps  >= 10000
//   liquidation_penalty    <= 5000
//   min_collateral_ratio   in [10000, liquidation_ratio_bps]
const STABILITY_FEE_BPS = 250; // 2.5% annualised
const LIQUIDATION_RATIO_BPS = 15_000; // 150%
const LIQUIDATION_PENALTY_BPS = 1_300; // 13%
const MIN_COLLATERAL_RATIO_BPS = 15_000; // 150%

// Test collateral market.
const COLLATERAL_DECIMALS = 9;
const COLLATERAL_PRICE_E6 = 100_000_000n; // $100.000000 per collateral token
const COLLATERAL_DEBT_CEILING = 1_000_000_000_000n; // 1,000,000 toneUSD (6 decimals)
const COLLATERAL_LIQ_RATIO_BPS = 15_000; // 150%
const TEST_COLLATERAL_MINT_AMOUNT = 1_000n * 10n ** BigInt(COLLATERAL_DECIMALS); // 1000 tokens

// Borsh enum tags (BachInstruction order in protocol/src/instruction.rs).
const TAG_INITIALIZE_PROTOCOL = 0;
const TAG_INITIALIZE_COLLATERAL = 1;

// --- helpers -----------------------------------------------------------------

/** A program-owned account whose first byte (is_initialized) is non-zero. */
async function isInitialized(
  connection: Connection,
  pda: PublicKey,
): Promise<boolean> {
  const info = await connection.getAccountInfo(pda);
  return (
    info !== null &&
    info.owner.equals(programId) &&
    info.data.length > 0 &&
    info.data[0] !== 0
  );
}

function buildInitializeProtocolIx(
  payer: PublicKey,
  configPda: PublicKey,
  toneUsdMint: PublicKey,
): TransactionInstruction {
  const data = Buffer.alloc(1 + 32 + 32 + 2 + 2 + 2 + 2);
  let o = 0;
  o = data.writeUInt8(TAG_INITIALIZE_PROTOCOL, o);
  payer.toBuffer().copy(data, o); // governance_authority
  o += 32;
  payer.toBuffer().copy(data, o); // oracle_authority
  o += 32;
  o = data.writeUInt16LE(STABILITY_FEE_BPS, o);
  o = data.writeUInt16LE(LIQUIDATION_RATIO_BPS, o);
  o = data.writeUInt16LE(LIQUIDATION_PENALTY_BPS, o);
  data.writeUInt16LE(MIN_COLLATERAL_RATIO_BPS, o);

  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: configPda, isSigner: false, isWritable: true },
      { pubkey: governanceMint, isSigner: false, isWritable: false },
      { pubkey: toneUsdMint, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

function buildInitializeCollateralIx(
  payer: PublicKey,
  configPda: PublicKey,
  collateralPda: PublicKey,
  collateralMint: PublicKey,
  collateralVault: PublicKey,
): TransactionInstruction {
  const data = Buffer.alloc(1 + 8 + 8 + 2);
  let o = 0;
  o = data.writeUInt8(TAG_INITIALIZE_COLLATERAL, o);
  o = data.writeBigUInt64LE(COLLATERAL_PRICE_E6, o);
  o = data.writeBigUInt64LE(COLLATERAL_DEBT_CEILING, o);
  data.writeUInt16LE(COLLATERAL_LIQ_RATIO_BPS, o);

  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: configPda, isSigner: false, isWritable: false },
      { pubkey: collateralPda, isSigner: false, isWritable: true },
      { pubkey: collateralMint, isSigner: false, isWritable: false },
      { pubkey: collateralVault, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

// --- main --------------------------------------------------------------------

async function main(): Promise<void> {
  const connection = new Connection(rpcUrl, "confirmed");
  const payer = loadKeypair(keypairPath);
  const out: BootstrapOutput = loadOutput(outputFile);

  const [configPda] = PublicKey.findProgramAddressSync([CONFIG_SEED], programId);

  console.log(`Bach Money ${cluster} bootstrap`);
  console.log("  RPC:        ", rpcUrl);
  console.log("  Program:    ", programId.toBase58());
  console.log("  Payer:      ", payer.publicKey.toBase58());
  console.log("  Config PDA: ", configPda.toBase58());

  const balance = await connection.getBalance(payer.publicKey);
  console.log("  Balance:    ", (balance / 1e9).toFixed(4), "SOL");
  if (balance < 0.1 * 1e9) {
    throw new Error("Payer balance is low; fund it before bootstrapping.");
  }

  // --- 1 + 2: toneUSD mint and InitializeProtocol -----------------------------
  let toneUsdMint: PublicKey;
  if (await isInitialized(connection, configPda)) {
    // Already initialized — read the stored stable_mint (offset 34 in ProtocolConfig:
    // is_initialized(1) + bump(1) + governance_mint(32) = 34).
    const info = await connection.getAccountInfo(configPda);
    toneUsdMint = new PublicKey(info!.data.subarray(34, 66));
    console.log("\n[1-2] Protocol already initialized.");
    console.log("      toneUSD mint:", toneUsdMint.toBase58());
  } else {
    const reuse = process.env.TONEUSD_MINT ?? out.toneUsdMint;
    if (reuse) {
      toneUsdMint = new PublicKey(reuse);
      console.log("\n[1] Reusing toneUSD mint:", toneUsdMint.toBase58());
    } else {
      console.log("\n[1] Creating toneUSD mint (6 decimals, authority = config PDA)...");
      toneUsdMint = await createMint(
        connection,
        payer,
        configPda, // mint authority — only the program (config PDA) can mint/burn
        null, // no freeze authority
        STABLE_MINT_DECIMALS,
      );
      out.toneUsdMint = toneUsdMint.toBase58();
      saveOutput(outputFile, out);
      console.log("    toneUSD mint:", toneUsdMint.toBase58());
    }

    console.log("[2] InitializeProtocol...");
    const sig = await sendAndConfirmTransaction(
      connection,
      new Transaction().add(
        buildInitializeProtocolIx(payer.publicKey, configPda, toneUsdMint),
      ),
      [payer],
    );
    console.log("    sig:", sig);
  }

  if (process.env.INIT_PROTOCOL_ONLY === "1") {
    console.log("\n✅ Protocol initialized (INIT_PROTOCOL_ONLY set — skipping collateral setup).\n");
    console.log("  PROGRAM_ID  ", programId.toBase58());
    console.log("  CONFIG_PDA  ", configPda.toBase58());
    console.log("  TONEUSD_MINT", toneUsdMint.toBase58());
    console.log("  BACH_MINT   ", governanceMint.toBase58());
    return;
  }

  // --- 3: test collateral mint ----------------------------------------------
  let collateralMint: PublicKey;
  const reuseCollateral = process.env.COLLATERAL_MINT ?? out.collateralMint;
  if (reuseCollateral) {
    collateralMint = new PublicKey(reuseCollateral);
    console.log("\n[3] Reusing collateral mint:", collateralMint.toBase58());
  } else {
    console.log(
      `\n[3] Creating test collateral mint (${COLLATERAL_DECIMALS} decimals, authority = payer)...`,
    );
    collateralMint = await createMint(
      connection,
      payer,
      payer.publicKey, // we keep authority so we can fund ourselves for testing
      null,
      COLLATERAL_DECIMALS,
    );
    out.collateralMint = collateralMint.toBase58();
    saveOutput(outputFile, out);
    console.log("    collateral mint:", collateralMint.toBase58());
  }

  const [collateralPda] = PublicKey.findProgramAddressSync(
    [COLLATERAL_SEED, collateralMint.toBuffer()],
    programId,
  );

  // --- 4: protocol-owned collateral vault (ATA owned by the config PDA) ------
  console.log("\n[4] Ensuring collateral vault (ATA owned by config PDA)...");
  const vaultAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    collateralMint,
    configPda,
    true, // allowOwnerOffCurve — config PDA is off-curve
  );
  const collateralVault = vaultAccount.address;
  out.collateralVault = collateralVault.toBase58();
  saveOutput(outputFile, out);
  console.log("    collateral vault:", collateralVault.toBase58());

  // --- 5: InitializeCollateral ----------------------------------------------
  if (await isInitialized(connection, collateralPda)) {
    console.log("\n[5] Collateral market already initialized:", collateralPda.toBase58());
  } else {
    console.log("[5] InitializeCollateral...");
    const sig = await sendAndConfirmTransaction(
      connection,
      new Transaction().add(
        buildInitializeCollateralIx(
          payer.publicKey,
          configPda,
          collateralPda,
          collateralMint,
          collateralVault,
        ),
      ),
      [payer],
    );
    console.log("    market PDA:", collateralPda.toBase58());
    console.log("    sig:", sig);
  }

  // --- 6: fund the payer with test collateral -------------------------------
  console.log("\n[6] Minting test collateral to payer...");
  const payerCollateralAta = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    collateralMint,
    payer.publicKey,
  );
  await mintTo(
    connection,
    payer,
    collateralMint,
    payerCollateralAta.address,
    payer, // mint authority
    TEST_COLLATERAL_MINT_AMOUNT,
  );
  console.log("    payer collateral ATA:", payerCollateralAta.address.toBase58());
  console.log("    minted:", TEST_COLLATERAL_MINT_AMOUNT.toString(), "base units");

  // --- summary ---------------------------------------------------------------
  console.log(`\n✅ Bootstrap complete (${cluster}).\n`);
  console.log("  PROGRAM_ID      ", programId.toBase58());
  console.log("  CONFIG_PDA      ", configPda.toBase58());
  console.log("  TONEUSD_MINT    ", toneUsdMint.toBase58());
  console.log("  COLLATERAL_MINT ", collateralMint.toBase58());
  console.log("  COLLATERAL_PDA  ", collateralPda.toBase58());
  console.log("  COLLATERAL_VAULT", collateralVault.toBase58());
  console.log("  TOKEN_PROGRAM   ", TOKEN_PROGRAM_ID.toBase58());
  console.log(
    `\nFrontend: set NEXT_PUBLIC_SOLANA_CLUSTER=${cluster}` +
      (cluster === "testnet"
        ? " plus NEXT_PUBLIC_TONEUSD_MINT / NEXT_PUBLIC_COLLATERAL_MINT to the mints above."
        : "."),
  );
  console.log("\nNext: openVault -> depositCollateral -> mintStablecoin (via @bach-money/sdk).");
}

main().catch((err) => {
  console.error("\n❌ Bootstrap failed:", err);
  process.exit(1);
});
