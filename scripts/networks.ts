/**
 * Shared network resolution for the operational scripts.
 *
 * Every script targets a single cluster, chosen by the CLUSTER env var
 * ("devnet" or "testnet", default devnet). The program is deployed from one
 * program keypair, so its id is the same on every cluster; the governance mint
 * is likewise a fixed pubkey baked into protocol/src/lib.rs. The toneUSD and
 * collateral mints are created per cluster by bootstrap and persisted to a
 * per-cluster output file.
 *
 * Env overrides (all optional):
 *   CLUSTER          devnet | testnet                 (default: devnet)
 *   RPC_URL          cluster RPC                       (default: clusterApiUrl)
 *   KEYPAIR_PATH     fee payer / authority            (default: ~/.config/solana/main_0.json)
 *   PROGRAM_ID       deployed program id              (default: the shared id below)
 *   GOVERNANCE_MINT  governance mint pubkey           (default: the shared mint below)
 */

import { homedir } from "node:os";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { Keypair, PublicKey, clusterApiUrl } from "@solana/web3.js";

export type Cluster = "devnet" | "testnet";

// Shared across clusters: the program is deployed from one program keypair, so
// its id is the same on every cluster.
const PROGRAM_ID = "yh9n52WPmWJBYTsBU1kBYfLSuxWY8zZTUPbjDB6d7wc";

// BACH governance mint per network. Must match the GOVERNANCE_MINT constant the
// program was compiled with (protocol/src/lib.rs); the program validates it by
// key equality at InitializeProtocol.
const GOVERNANCE_MINT: Record<Cluster, string> = {
  devnet: "DENNuKzCcrLhEtxZ8tm7nSeef8qvKgGGrdxX6euNkNS7",
  testnet: "A6a2s9LTZcYZQgxrDatLHYfvHhJEfb5ZWuFENhHtxJtR",
};

export function resolveCluster(): Cluster {
  const raw = (process.env.CLUSTER ?? "devnet").trim().toLowerCase();
  if (raw === "devnet" || raw === "testnet") return raw;
  throw new Error(`Unsupported CLUSTER "${raw}" — use "devnet" or "testnet".`);
}

export type BootstrapOutput = {
  toneUsdMint?: string;
  collateralMint?: string;
  collateralVault?: string;
};

export type Network = {
  cluster: Cluster;
  rpcUrl: string;
  keypairPath: string;
  programId: PublicKey;
  governanceMint: PublicKey;
  outputFile: string;
  faucetPath: string;
};

export function resolveNetwork(): Network {
  const cluster = resolveCluster();
  return {
    cluster,
    rpcUrl: process.env.RPC_URL ?? clusterApiUrl(cluster),
    keypairPath:
      process.env.KEYPAIR_PATH ??
      join(homedir(), ".config", "solana", "main_0.json"),
    programId: new PublicKey(process.env.PROGRAM_ID ?? PROGRAM_ID),
    governanceMint: new PublicKey(
      process.env.GOVERNANCE_MINT ?? GOVERNANCE_MINT[cluster],
    ),
    outputFile: join(import.meta.dirname, `bootstrap-output.${cluster}.json`),
    faucetPath: join(import.meta.dirname, `.faucet-keypair.${cluster}.json`),
  };
}

export function loadKeypair(path: string): Keypair {
  return Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(readFileSync(path, "utf8")) as number[]),
  );
}

/**
 * The toneUSD + collateral mints for a cluster, from env or the bootstrap
 * output file. Throws a clear error if the cluster has not been bootstrapped.
 */
export function resolveMints(net: Network): {
  toneUsdMint: PublicKey;
  collateralMint: PublicKey;
} {
  const out = loadOutput(net.outputFile);
  const toneUsd = process.env.TONEUSD_MINT ?? out.toneUsdMint;
  const collateral = process.env.COLLATERAL_MINT ?? out.collateralMint;
  if (!toneUsd) {
    throw new Error(
      `No toneUSD mint for ${net.cluster} — run bootstrap:${net.cluster} first ` +
        `or set TONEUSD_MINT.`,
    );
  }
  if (!collateral) {
    throw new Error(
      `No collateral mint for ${net.cluster} — run bootstrap:${net.cluster} first ` +
        `or set COLLATERAL_MINT.`,
    );
  }
  return {
    toneUsdMint: new PublicKey(toneUsd),
    collateralMint: new PublicKey(collateral),
  };
}

/** Just the toneUSD mint (e.g. for the liquidation test, which mints its own collateral). */
export function resolveToneUsdMint(net: Network): PublicKey {
  const out = loadOutput(net.outputFile);
  const toneUsd = process.env.TONEUSD_MINT ?? out.toneUsdMint;
  if (!toneUsd) {
    throw new Error(
      `No toneUSD mint for ${net.cluster} — run bootstrap:${net.cluster} first ` +
        `or set TONEUSD_MINT.`,
    );
  }
  return new PublicKey(toneUsd);
}

export function loadOutput(file: string): BootstrapOutput {
  if (!existsSync(file)) return {};
  return JSON.parse(readFileSync(file, "utf8")) as BootstrapOutput;
}

export function saveOutput(file: string, out: BootstrapOutput): void {
  writeFileSync(file, JSON.stringify(out, null, 2) + "\n");
}
