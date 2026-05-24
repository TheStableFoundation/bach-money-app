import { PublicKey } from "@solana/web3.js";

/**
 * On-chain representation of the global protocol configuration.
 * Mirrors state::ProtocolConfig in the Rust program.
 */
export interface ProtocolConfig {
  isInitialized: boolean;
  bump: number;
  governanceMint: PublicKey;
  stableMint: PublicKey;
  governanceAuthority: PublicKey;
  oracleAuthority: PublicKey;
  /** Annual stability fee in basis points (e.g. 250 = 2.5%) */
  stabilityFeeBps: number;
  /** Global minimum liquidation ratio in bps (e.g. 15000 = 150%) */
  liquidationRatioBps: number;
  /** Liquidation penalty in bps (e.g. 1300 = 13%) */
  liquidationPenaltyBps: number;
  /** Minimum collateral ratio to open/maintain a vault in bps */
  minCollateralRatioBps: number;
  stablecoinName: string;
  stablecoinSymbol: string;
}

/**
 * Per-collateral market configuration.
 * Mirrors state::CollateralConfig in the Rust program.
 */
export interface CollateralConfig {
  isInitialized: boolean;
  bump: number;
  collateralMint: PublicKey;
  collateralVault: PublicKey;
  /** Oracle price scaled by 1_000_000 (e.g. $150.00 = 150_000_000) */
  priceE6: bigint;
  /** Maximum total stablecoin that can be minted against this collateral */
  debtCeiling: bigint;
  totalDebt: bigint;
  totalCollateral: bigint;
  collateralDecimals: number;
  /** Per-collateral liquidation ratio in bps; >= global minimum */
  liquidationRatioBps: number;
  enabled: boolean;
}

/**
 * A user's collateralized debt position (vault).
 * Mirrors state::VaultPosition in the Rust program.
 */
export interface VaultPosition {
  isInitialized: boolean;
  bump: number;
  owner: PublicKey;
  collateralMint: PublicKey;
  collateralAmount: bigint;
  debtAmount: bigint;
  lastAccrualTimestamp: bigint;
}
