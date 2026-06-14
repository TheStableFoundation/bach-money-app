import { PublicKey, clusterApiUrl, type Cluster } from "@solana/web3.js";

/**
 * Single source of truth for on-chain configuration.
 *
 * DEVNET ONLY. Do not point this at mainnet without a deliberate, reviewed
 * change — the program, mints, and collateral market below are all devnet.
 */

export const CLUSTER: Cluster = "devnet";

/**
 * RPC endpoint. The public devnet RPC is heavily rate-limited; for anything
 * beyond light testing set NEXT_PUBLIC_SOLANA_RPC_URL to a private devnet URL
 * from Helius / Triton / QuickNode.
 */
export const RPC_ENDPOINT =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL?.trim() || clusterApiUrl(CLUSTER);

/** Deployed Bach Money program (devnet). */
export const PROGRAM_ID = new PublicKey(
  "yh9n52WPmWJBYTsBU1kBYfLSuxWY8zZTUPbjDB6d7wc",
);

/** toneUSD stablecoin mint (devnet) — 6 decimals, mint authority = config PDA. */
export const TONEUSD_MINT = new PublicKey(
  "B4wtMQyvYaY9bDNTnBY3sRczqRUp3zW8P7CaFqLVCb5f",
);

/** BACH governance mint (devnet) — 12 decimals. */
export const BACH_MINT = new PublicKey(
  "DENNuKzCcrLhEtxZ8tm7nSeef8qvKgGGrdxX6euNkNS7",
);

/**
 * Active collateral market (devnet). This is a TEST collateral mint created by
 * scripts/bootstrap-devnet.ts; replace when a real collateral market is added.
 */
export const COLLATERAL_MINT = new PublicKey(
  "HjsxowJNtQoy2fEzdRqdYaWf7nNpDQumTG7k61RYmnrg",
);

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
