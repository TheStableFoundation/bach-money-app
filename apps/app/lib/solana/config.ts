import { PublicKey, clusterApiUrl, type Cluster as Web3Cluster } from "@solana/web3.js";

/**
 * Network registry — the single source of truth for on-chain configuration.
 *
 * Both devnet and testnet are first-class; the active one is chosen at runtime
 * (see lib/solana/network.tsx) so an end-user can switch between them. This
 * module stays a pure, framework-free resolver: `getNetwork(cluster)` works on
 * the server (the faucet route) and on the client alike. Mainnet is
 * intentionally not wired up.
 */

export type Cluster = Extract<Web3Cluster, "devnet" | "testnet">;

export const SUPPORTED_CLUSTERS: readonly Cluster[] = ["devnet", "testnet"];

export function isCluster(x: unknown): x is Cluster {
  return x === "devnet" || x === "testnet";
}

export function clusterLabel(cluster: Cluster): string {
  return cluster === "testnet" ? "Testnet" : "Devnet";
}

/** Cluster shown on first load, before the user picks one. */
export const DEFAULT_CLUSTER: Cluster = isCluster(
  process.env.NEXT_PUBLIC_SOLANA_CLUSTER?.trim().toLowerCase(),
)
  ? (process.env.NEXT_PUBLIC_SOLANA_CLUSTER!.trim().toLowerCase() as Cluster)
  : "devnet";

export type TokenInfo = {
  mint: PublicKey;
  symbol: string;
  label: string;
  decimals: number;
};

type NetworkAddresses = {
  programId: string;
  toneUsdMint: string;
  bachMint: string;
  collateralMint: string;
};

// Same program keypair on every cluster, so one program id.
const PROGRAM_ID_ADDRESS = "yh9n52WPmWJBYTsBU1kBYfLSuxWY8zZTUPbjDB6d7wc";

// NOTE: Next.js inlines NEXT_PUBLIC_* only via *literal* property access. Never
// index process.env dynamically here or the values vanish from the client bundle.
const ADDRESSES: Record<Cluster, NetworkAddresses> = {
  devnet: {
    programId: PROGRAM_ID_ADDRESS,
    toneUsdMint: "B4wtMQyvYaY9bDNTnBY3sRczqRUp3zW8P7CaFqLVCb5f",
    bachMint: "DENNuKzCcrLhEtxZ8tm7nSeef8qvKgGGrdxX6euNkNS7",
    collateralMint: "HjsxowJNtQoy2fEzdRqdYaWf7nNpDQumTG7k61RYmnrg",
  },
  testnet: {
    programId: PROGRAM_ID_ADDRESS,
    // Created by `bootstrap:testnet`; override if the market is re-bootstrapped.
    toneUsdMint:
      process.env.NEXT_PUBLIC_TONEUSD_MINT?.trim() ||
      "52fQM2Hges4SE3mrkuxD1AXWq7h4nh2NQ19VLdfkFLz",
    // testnet BACH mint — pairs with the program built `--features testnet`.
    bachMint: "A6a2s9LTZcYZQgxrDatLHYfvHhJEfb5ZWuFENhHtxJtR",
    collateralMint:
      process.env.NEXT_PUBLIC_COLLATERAL_MINT?.trim() ||
      "ufWWrjjx5ET1qbjU25Zncgco3CiBa4U9XyGaMbQsB7Q",
  },
};

const RPC_OVERRIDES: Record<Cluster, string | undefined> = {
  devnet: process.env.NEXT_PUBLIC_SOLANA_RPC_URL_DEVNET?.trim() || undefined,
  testnet: process.env.NEXT_PUBLIC_SOLANA_RPC_URL_TESTNET?.trim() || undefined,
};

// Legacy single override; applies to the default cluster only.
const LEGACY_RPC = process.env.NEXT_PUBLIC_SOLANA_RPC_URL?.trim() || undefined;

function rpcFor(cluster: Cluster): string {
  return (
    RPC_OVERRIDES[cluster] ||
    (cluster === DEFAULT_CLUSTER ? LEGACY_RPC : undefined) ||
    clusterApiUrl(cluster)
  );
}

export type ResolvedNetwork = {
  cluster: Cluster;
  label: string;
  rpcEndpoint: string;
  programId: PublicKey;
  toneUsdMint: PublicKey;
  bachMint: PublicKey;
  collateralMint: PublicKey;
  /**
   * Token registry. `decimals` lives here only — components must never hardcode
   * decimal constants; route every amount through lib/format/token.ts instead.
   */
  tokens: { toneUSD: TokenInfo; BACH: TokenInfo; collateral: TokenInfo };
  explorerAddress: (address: PublicKey | string) => string;
  explorerTx: (signature: string) => string;
};

const EXPLORER = "https://explorer.solana.com";

const cache = new Map<Cluster, ResolvedNetwork>();

/** Resolve a cluster to its addresses, RPC, tokens, and explorer links. Memoized. */
export function getNetwork(cluster: Cluster): ResolvedNetwork {
  const cached = cache.get(cluster);
  if (cached) return cached;

  const a = ADDRESSES[cluster];
  const programId = new PublicKey(a.programId);
  const toneUsdMint = new PublicKey(a.toneUsdMint);
  const bachMint = new PublicKey(a.bachMint);
  const collateralMint = new PublicKey(a.collateralMint);
  const suffix = `?cluster=${cluster}`;

  const net: ResolvedNetwork = {
    cluster,
    label: clusterLabel(cluster),
    rpcEndpoint: rpcFor(cluster),
    programId,
    toneUsdMint,
    bachMint,
    collateralMint,
    tokens: {
      toneUSD: { mint: toneUsdMint, symbol: "toneUSD", label: "toneUSD", decimals: 6 },
      BACH: { mint: bachMint, symbol: "BACH", label: "BACH", decimals: 12 },
      collateral: { mint: collateralMint, symbol: "tCOLL", label: "Test collateral", decimals: 9 },
    },
    explorerAddress: (address) => {
      const x = typeof address === "string" ? address : address.toBase58();
      return `${EXPLORER}/address/${x}${suffix}`;
    },
    explorerTx: (signature) => `${EXPLORER}/tx/${signature}${suffix}`,
  };
  cache.set(cluster, net);
  return net;
}

/** Smallest unit of BACH (1 BACH = 10^12 semitone), analogous to lamports. */
export const SEMITONE_PER_BACH = 10n ** 12n;

export function shortAddress(address: PublicKey | string, chars = 4): string {
  const a = typeof address === "string" ? address : address.toBase58();
  return `${a.slice(0, chars)}…${a.slice(-chars)}`;
}
