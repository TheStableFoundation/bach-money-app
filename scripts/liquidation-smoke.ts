/**
 * Liquidation smoke test (devnet / testnet).
 *
 * Proves the liquidateVault handler end-to-end on a DEDICATED collateral market
 * (its own mint) so the main market and existing vaults are untouched:
 *   create market -> open vault -> deposit -> mint near-max -> drop oracle price
 *   -> liquidate -> verify seized collateral + reduced debt.
 *
 * Run: pnpm --filter @bach-money/scripts liquidation:devnet
 *      pnpm --filter @bach-money/scripts liquidation:testnet
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
  createMint,
  getAccount,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import {
  BachMoneyClient,
  initializeCollateral,
  openVault,
  depositCollateral,
  mintStablecoin,
  updateOraclePrice,
  liquidateVault,
  findConfigPda,
  findCollateralPda,
  findVaultPda,
} from "@bach-money/sdk";
import { resolveNetwork, resolveToneUsdMint, loadKeypair } from "./networks.ts";

const NET = resolveNetwork();
const { cluster, rpcUrl, keypairPath, programId } = NET;
const TONEUSD_MINT = resolveToneUsdMint(NET);

const DEC = 9;
const ONE = 10n ** BigInt(DEC);
const TONE = 10n ** 6n;
const PRICE_START = 100_000_000n; // $100
const PRICE_DROP = 80_000_000n; // $80 -> ratio 133% < 150%
const DEPOSIT = 1n * ONE; // 1 collateral ($100)
const MINT = 60n * TONE; // 60 toneUSD -> ratio 166% (healthy at 150%)
const REPAY = 30n * TONE; // liquidator repays 30 toneUSD

const fmt = (a: bigint, d: number) =>
  `${a / 10n ** BigInt(d)}.${(a % 10n ** BigInt(d)).toString().padStart(d, "0").replace(/0+$/, "") || "0"}`;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Public cluster RPCs are load-balanced; a "confirmed" write may not be visible
// on the node that simulates the next tx. Retry transient failures with a delay.
async function send(c: Connection, payer: Keypair, tx: Transaction, label: string, tries = 5) {
  for (let i = 0; i < tries; i++) {
    try {
      tx.recentBlockhash = undefined;
      tx.lastValidBlockHeight = undefined;
      tx.signatures = [];
      const sig = await sendAndConfirmTransaction(c, tx, [payer], { commitment: "confirmed" });
      console.log(`  ✓ ${label}: ${sig}`);
      return;
    } catch (e) {
      if (i === tries - 1) throw e;
      await sleep(2500);
    }
  }
}

async function waitFor(c: Connection, pk: PublicKey, tries = 15) {
  for (let i = 0; i < tries; i++) {
    if (await c.getAccountInfo(pk)) return;
    await sleep(1500);
  }
  throw new Error(`account ${pk.toBase58()} not visible after waiting`);
}

async function main() {
  const c = new Connection(rpcUrl, "confirmed");
  const payer = loadKeypair(keypairPath);
  const owner = payer.publicKey;
  const client = new BachMoneyClient(c, programId);
  const [configPda] = await findConfigPda(programId);

  console.log(`Liquidation smoke test (${cluster})`);
  console.log("  payer:", owner.toBase58());

  // Fresh dedicated collateral market so the main market is untouched.
  console.log("\n[1] Create dedicated liquidation-test collateral mint...");
  const mint = await createMint(c, payer, owner, null, DEC);
  console.log("  mint:", mint.toBase58());
  const ownerColl = await getOrCreateAssociatedTokenAccount(c, payer, mint, owner);
  await mintTo(c, payer, mint, ownerColl.address, payer, 10n * ONE);
  const vaultAta = await getOrCreateAssociatedTokenAccount(c, payer, mint, configPda, true);
  const collateralVault = vaultAta.address;

  const [collateralPda] = await findCollateralPda(mint, programId);
  const [vaultPda] = await findVaultPda(owner, mint, programId);
  const stableAta = (await getOrCreateAssociatedTokenAccount(c, payer, TONEUSD_MINT, owner)).address;

  // Ensure the new mint + protocol-owned vault are visible before registering.
  await waitFor(c, mint);
  await waitFor(c, collateralVault);

  const vdbg = await c.getParsedAccountInfo(collateralVault);
  const info = (vdbg.value?.data as { parsed?: { info?: { owner?: string; mint?: string } } })?.parsed?.info;
  console.log("DEBUG  configPda      :", configPda.toBase58());
  console.log("DEBUG  vault.owner    :", info?.owner);
  console.log("DEBUG  collateral mint :", mint.toBase58());
  console.log("DEBUG  vault.mint     :", info?.mint);
  console.log("DEBUG  collateralPda  :", collateralPda.toBase58());

  console.log("[2] InitializeCollateral ($100, 150% liq)...");
  await send(
    c,
    payer,
    new Transaction().add(
      initializeCollateral(
        { payer: owner, configPda, collateralPda, collateralMint: mint, collateralVault, programId },
        { priceE6: PRICE_START, debtCeiling: 1_000_000n * TONE, liquidationRatioBps: 15_000 },
      ),
    ),
    "initializeCollateral",
  );

  console.log("[3] Open vault, deposit 1, mint 60 toneUSD...");
  await send(c, payer, new Transaction().add(
    openVault({ owner, configPda, collateralConfigPda: collateralPda, vaultPda, programId }),
  ), "openVault");
  await send(c, payer, new Transaction().add(
    depositCollateral({ owner, configPda, collateralConfigPda: collateralPda, vaultPda, ownerCollateralAta: ownerColl.address, collateralVault, tokenProgram: TOKEN_PROGRAM_ID, programId }, DEPOSIT),
  ), "deposit");
  await send(c, payer, new Transaction().add(
    mintStablecoin({ owner, configPda, collateralConfigPda: collateralPda, vaultPda, stableMint: TONEUSD_MINT, ownerStableAta: stableAta, tokenProgram: TOKEN_PROGRAM_ID, programId }, MINT),
  ), "mint");

  let market = await client.fetchCollateralConfig(mint);
  let vault = await client.fetchVaultPosition(owner, mint);
  console.log(`  healthy ratio: ${(client.collateralRatio(vault!, market!) * 100).toFixed(0)}% — liquidatable: ${client.isLiquidatable(vault!, market!)}`);

  console.log("[4] Drop oracle price to $80...");
  await send(c, payer, new Transaction().add(
    updateOraclePrice({ oracleAuthority: owner, configPda, collateralConfigPda: collateralPda, programId }, PRICE_DROP),
  ), "updateOraclePrice");

  market = await client.fetchCollateralConfig(mint);
  vault = await client.fetchVaultPosition(owner, mint);
  console.log(`  underwater ratio: ${(client.collateralRatio(vault!, market!) * 100).toFixed(0)}% — liquidatable: ${client.isLiquidatable(vault!, market!)}`);

  const liqCollBefore = (await getAccount(c, ownerColl.address)).amount;

  console.log("[5] Liquidate (repay 30 toneUSD)...");
  await send(c, payer, new Transaction().add(
    liquidateVault({ liquidator: owner, configPda, collateralConfigPda: collateralPda, vaultPda, stableMint: TONEUSD_MINT, liquidatorStableAta: stableAta, collateralVault, liquidatorCollateralAta: ownerColl.address, tokenProgram: TOKEN_PROGRAM_ID, programId }, REPAY),
  ), "liquidateVault");

  vault = await client.fetchVaultPosition(owner, mint);
  const liqCollAfter = (await getAccount(c, ownerColl.address)).amount;
  const seized = liqCollAfter - liqCollBefore;

  console.log("\nResult:");
  console.log("  vault debt now      :", fmt(vault!.debtAmount, 6), "toneUSD (was 60)");
  console.log("  vault collateral now:", fmt(vault!.collateralAmount, DEC), "(was 1)");
  console.log("  collateral seized   :", fmt(seized, DEC), "(~$" + fmt(seized * PRICE_DROP / ONE, 6) + " incl. 13% penalty on $30)");
  console.log(`\n✅ liquidateVault works on ${cluster}.`);
}

main().catch((e) => {
  console.error("\n❌ Liquidation smoke test failed:", e);
  process.exit(1);
});
