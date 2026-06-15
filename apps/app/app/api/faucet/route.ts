import { NextResponse } from "next/server";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import {
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import {
  DEFAULT_CLUSTER,
  getNetwork,
  isCluster,
  type Cluster,
} from "@/lib/solana/config";

// Needs the Node runtime (keypair signing + spl-token), not edge.
export const runtime = "nodejs";

// Per-cluster faucet authority. Each is the MintTokens authority of that
// cluster's test collateral mint (set up by setup-faucet:<cluster>). They are
// distinct keys, so only the clusters you have configured will hand out tokens.
// FAUCET_SECRET_KEY (no suffix) is honored as the devnet key for back-compat.
function loadFaucet(cluster: Cluster): Keypair {
  const secret =
    cluster === "testnet"
      ? process.env.FAUCET_SECRET_KEY_TESTNET
      : process.env.FAUCET_SECRET_KEY_DEVNET ?? process.env.FAUCET_SECRET_KEY;
  if (!secret) {
    throw new Error(`faucet is not configured for ${cluster}`);
  }
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(secret) as number[]));
}

export async function POST(req: Request) {
  let owner: PublicKey;
  let cluster: Cluster;
  try {
    const body = (await req.json()) as { owner?: string; cluster?: string };
    owner = new PublicKey(body.owner ?? "");
    cluster = isCluster(body.cluster) ? body.cluster : DEFAULT_CLUSTER;
  } catch {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }

  try {
    const network = getNetwork(cluster);
    const faucet = loadFaucet(cluster);
    // Test collateral handed out per request.
    const amount = 100n * 10n ** BigInt(network.tokens.collateral.decimals);
    const connection = new Connection(network.rpcEndpoint, "confirmed");
    const ata = await getOrCreateAssociatedTokenAccount(
      connection,
      faucet,
      network.collateralMint,
      owner,
    );
    const signature = await mintTo(
      connection,
      faucet,
      network.collateralMint,
      ata.address,
      faucet,
      amount,
    );
    return NextResponse.json({ signature, amount: amount.toString() });
  } catch (e) {
    const message = e instanceof Error ? e.message : "faucet error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
