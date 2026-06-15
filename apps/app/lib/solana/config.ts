import { PublicKey, clusterApiUrl, type Cluster } from "@solana/web3.js";

/**
 * Single source of truth for on-chain configuration.
 *
 * The active cluster is chosen at build time by NEXT_PUBLIC_SOLANA_CLUSTER
 * ("devnet" or "testnet") and defaults to devnet. Mainnet is intentionally not
 * wired up — do not add it without a deliberate, reviewed change.
 *
 * The program id is the same across clusters (the program is deployed from one
 * program keypair). The toneUSD and collateral mints are created per cluster by
 * scripts/bootstrap.ts, so the testnet mints come from env until pinned here.
 */

type SupportedCluster = Extract<Cluster, "devnet" | "testnet">;

function resolveCluster(): SupportedCluster {
  const raw = process.env.NEXT_PUBLIC_SOLANA_CLUSTER?.trim().toLowerCase();
  if (raw === "testnet") return "testnet";
  if (raw && raw !== "devnet") {
    throw new Error(
      `Unsupported NEXT_PUBLIC_SOLANA_CLUSTER "${raw}" — use "devnet" or "testnet".`,
    );
  }
  return "devnet";
}

export const CLUSTER: SupportedCluster = resolveCluster();

/** Capitalized cluster name for UI badges and copy. */
export const NETWORK_LABEL = CLUSTER === "testnet" ? "Testnet" : "Devnet";

type NetworkConfig = {
  programId: string;
  toneUsdMint: string;
  bachMint: string;
  collateralMint: string;
};

// Same program keypair on every cluster, so one program id.
const PROGRAM_ID_ADDRESS = "yh9n52WPmWJBYTsBU1kBYfLSuxWY8zZTUPbjDB6d7wc";

const DEFAULTS: Record<SupportedCluster, NetworkConfig> = {
  devnet: {
    programId: PROGRAM_ID_ADDRESS,
    // toneUSD stablecoin mint — 6 decimals, mint authority = config PDA.
    toneUsdMint: "B4wtMQyvYaY9bDNTnBY3sRczqRUp3zW8P7CaFqLVCb5f",
    // BACH governance mint — must match GOVERNANCE_MINT in protocol/src/lib.rs.
    bachMint: "DENNuKzCcrLhEtxZ8tm7nSeef8qvKgGGrdxX6euNkNS7",
    // Test collateral mint created by scripts/bootstrap.ts (CLUSTER=devnet).
    collateralMint: "HjsxowJNtQoy2fEzdRqdYaWf7nNpDQumTG7k61RYmnrg",
  },
  testnet: {
    programId: PROGRAM_ID_ADDRESS,
    // toneUSD + test collateral created by `bootstrap:testnet`. Override with
    // NEXT_PUBLIC_TONEUSD_MINT / NEXT_PUBLIC_COLLATERAL_MINT if re-bootstrapped.
    toneUsdMint: "52fQM2Hges4SE3mrkuxD1AXWq7h4nh2NQ19VLdfkFLz",
    // testnet BACH mint — pairs with the program built `--features testnet`.
    bachMint: "A6a2s9LTZcYZQgxrDatLHYfvHhJEfb5ZWuFENhHtxJtR",
    collateralMint: "ufWWrjjx5ET1qbjU25Zncgco3CiBa4U9XyGaMbQsB7Q",
  },
};

/** Active cluster's addresses, with per-env overrides taking precedence. */
const NET: NetworkConfig = {
  programId:
    process.env.NEXT_PUBLIC_PROGRAM_ID?.trim() || DEFAULTS[CLUSTER].programId,
  toneUsdMint:
    process.env.NEXT_PUBLIC_TONEUSD_MINT?.trim() ||
    DEFAULTS[CLUSTER].toneUsdMint,
  bachMint:
    process.env.NEXT_PUBLIC_BACH_MINT?.trim() || DEFAULTS[CLUSTER].bachMint,
  collateralMint:
    process.env.NEXT_PUBLIC_COLLATERAL_MINT?.trim() ||
    DEFAULTS[CLUSTER].collateralMint,
};

function pk(address: string, name: string): PublicKey {
  if (!address) {
    throw new Error(
      `Missing ${name} for cluster "${CLUSTER}". Set the matching ` +
        `NEXT_PUBLIC_* env var (the bootstrap script prints these).`,
    );
  }
  return new PublicKey(address);
}

/**
 * RPC endpoint. The public cluster RPCs are heavily rate-limited; for anything
 * beyond light testing set NEXT_PUBLIC_SOLANA_RPC_URL to a private endpoint for
 * the active cluster (Helius / Triton / QuickNode).
 */
export const RPC_ENDPOINT =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL?.trim() || clusterApiUrl(CLUSTER);

/** Deployed Bach Money program. */
export const PROGRAM_ID = pk(NET.programId, "PROGRAM_ID");

/** toneUSD stablecoin mint — 6 decimals, mint authority = config PDA. */
export const TONEUSD_MINT = pk(NET.toneUsdMint, "TONEUSD_MINT");

/** BACH governance mint — 12 decimals. */
export const BACH_MINT = pk(NET.bachMint, "BACH_MINT");

/**
 * Active collateral market. This is a TEST collateral mint created by
 * scripts/bootstrap.ts; replace when a real collateral market is added.
 */
export const COLLATERAL_MINT = pk(NET.collateralMint, "COLLATERAL_MINT");

export type TokenInfo = {
  mint: PublicKey;
  symbol: string;
  label: string;
  decimals: number;
};

/**
 * Token registry. `decimals` lives here only — components must never hardcode
 * decimal constants; route every amount through lib/format/token.ts instead.
 */
export const TOKENS = {
  toneUSD: {
    mint: TONEUSD_MINT,
    symbol: "toneUSD",
    label: "toneUSD",
    decimals: 6,
  },
  BACH: {
    mint: BACH_MINT,
    symbol: "BACH",
    label: "BACH",
    decimals: 12,
  },
  collateral: {
    mint: COLLATERAL_MINT,
    symbol: "tCOLL",
    label: "Test collateral",
    decimals: 9,
  },
} satisfies Record<string, TokenInfo>;

/** Smallest unit of BACH (1 BACH = 10^12 semitone), analogous to lamports. */
export const SEMITONE_PER_BACH = 10n ** 12n;

const EXPLORER = "https://explorer.solana.com";
const EXPLORER_SUFFIX = `?cluster=${CLUSTER}`;

export function explorerAddress(address: PublicKey | string): string {
  const a = typeof address === "string" ? address : address.toBase58();
  return `${EXPLORER}/address/${a}${EXPLORER_SUFFIX}`;
}

export function explorerTx(signature: string): string {
  return `${EXPLORER}/tx/${signature}${EXPLORER_SUFFIX}`;
}

export function shortAddress(address: PublicKey | string, chars = 4): string {
  const a = typeof address === "string" ? address : address.toBase58();
  return `${a.slice(0, chars)}…${a.slice(-chars)}`;
}
