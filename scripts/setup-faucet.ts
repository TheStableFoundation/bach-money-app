/**
 * Faucet setup (devnet / testnet).
 *
 * Makes public testing possible: gives the main collateral mint a dedicated
 * faucet authority (not the main wallet) so a server-side API route can mint
 * test collateral to any wallet.
 *
 *   1. generate/load a per-cluster faucet keypair (gitignored)
 *   2. transfer the collateral mint's MintTokens authority payer -> faucet
 *   3. fund the faucet with a little SOL (ATA rent + fees)
 *   4. verify the faucet can mint
 *
 * Prints FAUCET_SECRET_KEY to put in apps/app/.env.local. Run:
 *   pnpm --filter @bach-money/scripts setup-faucet:devnet
 *   pnpm --filter @bach-money/scripts setup-faucet:testnet
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import {
  Connection,
  Keypair,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  AuthorityType,
  getMint,
  setAuthority,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import { resolveNetwork, resolveMints, loadKeypair } from "./networks.ts";

const NET = resolveNetwork();
const { cluster, rpcUrl, keypairPath, faucetPath } = NET;
const { collateralMint: COLLATERAL_MINT } = resolveMints(NET);
const FUND_LAMPORTS = 300_000_000; // 0.3 SOL

async function main() {
  const c = new Connection(rpcUrl, "confirmed");
  const payer = loadKeypair(keypairPath);

  console.log(`Faucet setup (${cluster})`);
  console.log("  collateral mint:", COLLATERAL_MINT.toBase58());

  // 1. faucet keypair
  let faucet: Keypair;
  if (existsSync(faucetPath)) {
    faucet = loadKeypair(faucetPath);
    console.log("Reusing faucet keypair:", faucet.publicKey.toBase58());
  } else {
    faucet = Keypair.generate();
    writeFileSync(faucetPath, JSON.stringify([...faucet.secretKey]));
    console.log("Generated faucet keypair:", faucet.publicKey.toBase58());
  }

  // 2. transfer mint authority -> faucet
  const mint = await getMint(c, COLLATERAL_MINT);
  if (mint.mintAuthority?.equals(faucet.publicKey)) {
    console.log("Mint authority already = faucet.");
  } else if (mint.mintAuthority?.equals(payer.publicKey)) {
    await setAuthority(
      c,
      payer,
      COLLATERAL_MINT,
      payer,
      AuthorityType.MintTokens,
      faucet.publicKey,
    );
    console.log("Transferred mint authority payer -> faucet.");
  } else {
    throw new Error(
      `Unexpected mint authority ${mint.mintAuthority?.toBase58()} — expected payer or faucet.`,
    );
  }

  // 3. fund faucet
  const bal = await c.getBalance(faucet.publicKey);
  if (bal < FUND_LAMPORTS / 2) {
    await sendAndConfirmTransaction(
      c,
      new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: payer.publicKey,
          toPubkey: faucet.publicKey,
          lamports: FUND_LAMPORTS,
        }),
      ),
      [payer],
    );
    console.log(`Funded faucet with ${FUND_LAMPORTS / 1e9} SOL.`);
  } else {
    console.log(`Faucet balance ok: ${(bal / 1e9).toFixed(3)} SOL.`);
  }

  // 4. verify the faucet can mint (mint 1 test token to the payer)
  const ata = await getOrCreateAssociatedTokenAccount(
    c,
    faucet,
    COLLATERAL_MINT,
    payer.publicKey,
  );
  await mintTo(c, faucet, COLLATERAL_MINT, ata.address, faucet, 1_000_000_000n);
  console.log("Verified: faucet minted 1 test collateral to payer.");

  console.log("\nSet this in apps/app/.env.local:\n");
  console.log(`FAUCET_SECRET_KEY=${JSON.stringify([...faucet.secretKey])}`);
}

main().catch((e) => {
  console.error("\n❌ Faucet setup failed:", e);
  process.exit(1);
});
