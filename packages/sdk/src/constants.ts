import { PublicKey } from "@solana/web3.js";

// Seeds — must match lib.rs constants
export const CONFIG_SEED = Buffer.from("config");
export const COLLATERAL_SEED = Buffer.from("collateral");
export const VAULT_SEED = Buffer.from("vault");

export const STABLE_MINT_DECIMALS = 6;
export const STABLECOIN_NAME = "toneUSD";
export const STABLECOIN_SYMBOL = "toneUSD";

export const GOVERNANCE_MINT = new PublicKey(
  "DENNuKzCcrLhEtxZ8tm7nSeef8qvKgGGrdxX6euNkNS7",
);

// BPS helpers
export const BPS_DENOMINATOR = 10_000n;
