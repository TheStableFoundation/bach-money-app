import { NextResponse } from "next/server";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import {
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import { RPC_ENDPOINT, COLLATERAL_MINT, TOKENS } from "@/lib/solana/config";

// Needs the Node runtime (keypair signing + spl-token), not edge.
export const runtime = "nodejs";

// Test collateral handed out per request.
const AMOUNT = 100n * 10n ** BigInt(TOKENS.collateral.decimals);

function loadFaucet(): Keypair {
  const secret = process.env.FAUCET_SECRET_KEY;
  if (!secret) throw new Error("FAUCET_SECRET_KEY is not configured");
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(secret) as number[]));
}

export async function POST(req: Request) {
  let owner: PublicKey;
  try {
    const body = (await req.json()) as { owner?: string };
    owner = new PublicKey(body.owner ?? "");
  } catch {
    return NextResponse.json({ error: "invalid owner address" }, { status: 400 });
  }

  try {
    const faucet = loadFaucet();
    const connection = new Connection(RPC_ENDPOINT, "confirmed");
    const ata = await getOrCreateAssociatedTokenAccount(
      connection,
      faucet,
      COLLATERAL_MINT,
      owner,
    );
    const signature = await mintTo(
      connection,
      faucet,
      COLLATERAL_MINT,
      ata.address,
      faucet,
      AMOUNT,
    );
    return NextResponse.json({ signature, amount: AMOUNT.toString() });
  } catch (e) {
    const message = e instanceof Error ? e.message : "faucet error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
