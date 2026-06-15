/**
 * Vault smoke test (devnet / testnet).
 *
 * Exercises the full user lifecycle against the live program using the same SDK
 * the frontend uses: open vault -> deposit collateral -> mint toneUSD ->
 * repay -> withdraw. Proves the instruction handlers actually work on-chain.
 *
 * Uses the bootstrap payer (which holds test collateral). Run:
 *   pnpm --filter @bach-money/scripts smoke:devnet
 *   pnpm --filter @bach-money/scripts smoke:testnet
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  getAccount,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";
import {
  BachMoneyClient,
  openVault,
  depositCollateral,
  mintStablecoin,
  burnStablecoin,
  withdrawCollateral,
  findConfigPda,
  findCollateralPda,
  findVaultPda,
} from "@bach-money/sdk";
import { resolveNetwork, resolveMints, loadKeypair } from "./networks.ts";

const NET = resolveNetwork();
const { cluster, rpcUrl, keypairPath, programId } = NET;
const { toneUsdMint: TONEUSD_MINT, collateralMint: COLLATERAL_MINT } =
  resolveMints(NET);

const COLLATERAL_DECIMALS = 9;
const TONEUSD_DECIMALS = 6;

const DEPOSIT = 10n * 10n ** BigInt(COLLATERAL_DECIMALS); // 10 collateral
const MINT = 100n * 10n ** BigInt(TONEUSD_DECIMALS); // 100 toneUSD
const REPAY = 40n * 10n ** BigInt(TONEUSD_DECIMALS); // 40 toneUSD
const WITHDRAW = 2n * 10n ** BigInt(COLLATERAL_DECIMALS); // 2 collateral

const fmt = (a: bigint, d: number) => {
  const base = 10n ** BigInt(d);
  return `${a / base}.${(a % base).toString().padStart(d, "0").replace(/0+$/, "") || "0"}`;
};

async function tokenBalance(c: Connection, ata: PublicKey): Promise<bigint> {
  try {
    return (await getAccount(c, ata)).amount;
  } catch {
    return 0n;
  }
}

async function send(
  c: Connection,
  payer: Keypair,
  tx: Transaction,
  label: string,
): Promise<void> {
  const sig = await sendAndConfirmTransaction(c, tx, [payer], {
    commitment: "confirmed",
  });
  console.log(`  ✓ ${label}: ${sig}`);
}

async function main() {
  const c = new Connection(rpcUrl, "confirmed");
  const payer = loadKeypair(keypairPath);
  const owner = payer.publicKey;
  const client = new BachMoneyClient(c, programId);

  const [configPda] = await findConfigPda(programId);
  const [collateralConfigPda] = await findCollateralPda(COLLATERAL_MINT, programId);
  const [vaultPda] = await findVaultPda(owner, COLLATERAL_MINT, programId);
  const ownerCollateralAta = getAssociatedTokenAddressSync(COLLATERAL_MINT, owner);
  const ownerStableAta = getAssociatedTokenAddressSync(TONEUSD_MINT, owner);

  console.log(`Vault smoke test (${cluster})`);
  console.log("  payer:", owner.toBase58());

  const market = await client.fetchCollateralConfig(COLLATERAL_MINT);
  if (!market) throw new Error("collateral market not found — run bootstrap first");
  const collateralVault = market.collateralVault;

  const startColl = await tokenBalance(c, ownerCollateralAta);
  const startStable = await tokenBalance(c, ownerStableAta);
  console.log(
    `  start balances — collateral ${fmt(startColl, COLLATERAL_DECIMALS)}, toneUSD ${fmt(startStable, TONEUSD_DECIMALS)}`,
  );

  // 1. open vault (skip if it already exists)
  const existing = await client.fetchVaultPosition(owner, COLLATERAL_MINT);
  if (!existing) {
    await send(
      c,
      payer,
      new Transaction().add(
        openVault({ owner, configPda, collateralConfigPda, vaultPda, programId }),
      ),
      "openVault",
    );
  } else {
    console.log("  • vault already exists, reusing");
  }

  // 2. deposit collateral
  await send(
    c,
    payer,
    new Transaction().add(
      depositCollateral(
        {
          owner,
          configPda,
          collateralConfigPda,
          vaultPda,
          ownerCollateralAta,
          collateralVault,
          tokenProgram: TOKEN_PROGRAM_ID,
          programId,
        },
        DEPOSIT,
      ),
    ),
    `depositCollateral ${fmt(DEPOSIT, COLLATERAL_DECIMALS)}`,
  );

  // 3. mint toneUSD (create the toneUSD ATA on first mint)
  const mintTx = new Transaction();
  if (!(await c.getAccountInfo(ownerStableAta))) {
    mintTx.add(
      createAssociatedTokenAccountInstruction(owner, ownerStableAta, owner, TONEUSD_MINT),
    );
  }
  mintTx.add(
    mintStablecoin(
      {
        owner,
        configPda,
        collateralConfigPda,
        vaultPda,
        stableMint: TONEUSD_MINT,
        ownerStableAta,
        tokenProgram: TOKEN_PROGRAM_ID,
        programId,
      },
      MINT,
    ),
  );
  await send(c, payer, mintTx, `mintStablecoin ${fmt(MINT, TONEUSD_DECIMALS)}`);

  // 4. repay (burn) part of the debt
  await send(
    c,
    payer,
    new Transaction().add(
      burnStablecoin(
        {
          owner,
          configPda,
          collateralConfigPda,
          vaultPda,
          stableMint: TONEUSD_MINT,
          ownerStableAta,
          tokenProgram: TOKEN_PROGRAM_ID,
          programId,
        },
        REPAY,
      ),
    ),
    `burnStablecoin ${fmt(REPAY, TONEUSD_DECIMALS)}`,
  );

  // 5. withdraw some collateral
  await send(
    c,
    payer,
    new Transaction().add(
      withdrawCollateral(
        {
          owner,
          configPda,
          collateralConfigPda,
          vaultPda,
          ownerCollateralAta,
          collateralVault,
          tokenProgram: TOKEN_PROGRAM_ID,
          programId,
        },
        WITHDRAW,
      ),
    ),
    `withdrawCollateral ${fmt(WITHDRAW, COLLATERAL_DECIMALS)}`,
  );

  // Verify final on-chain state
  const vault = await client.fetchVaultPosition(owner, COLLATERAL_MINT);
  const endStable = await tokenBalance(c, ownerStableAta);
  if (!vault) throw new Error("vault disappeared");
  const ratio = client.collateralRatio(vault, market);

  console.log("\nFinal vault state:");
  console.log("  collateral :", fmt(vault.collateralAmount, COLLATERAL_DECIMALS));
  console.log("  debt       :", fmt(vault.debtAmount, TONEUSD_DECIMALS), "toneUSD");
  console.log("  ratio      :", Number.isFinite(ratio) ? `${(ratio * 100).toFixed(1)}%` : "∞");
  console.log("  toneUSD bal:", fmt(endStable, TONEUSD_DECIMALS));
  console.log(`\n✅ Full lifecycle succeeded on ${cluster}.`);
}

main().catch((e) => {
  console.error("\n❌ Smoke test failed:", e);
  process.exit(1);
});
