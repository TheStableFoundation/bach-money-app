import { PublicKey } from "@solana/web3.js";

// Seeds — must match lib.rs constants
export const CONFIG_SEED = Buffer.from("config");
export const COLLATERAL_SEED = Buffer.from("collateral");
export const VAULT_SEED = Buffer.from("vault");

export const STABLE_MINT_DECIMALS = 6;
export const STABLECOIN_NAME = "Bach Dollar";
export const STABLECOIN_SYMBOL = "BACHD";

export const GOVERNANCE_MINT = new PublicKey(
  "CTQBjyrX8pYyqbNa8vAhQfnRXfu9cUxnvrxj5PvbzTmf",
);

// BPS helpers
export const BPS_DENOMINATOR = 10_000n;
