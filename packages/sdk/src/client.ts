import {
  Connection,
  PublicKey,
  AccountInfo,
} from "@solana/web3.js";
import type { ProtocolConfig, CollateralConfig, VaultPosition } from "./types.js";
import { findConfigPda, findCollateralPda, findVaultPda } from "./instructions.js";

/**
 * Lightweight read-only client for fetching and deserializing Bach Money
 * on-chain accounts. For sending transactions, compose instructions from
 * `instructions.ts` and sign/send with the wallet adapter of your choice.
 */
export class BachMoneyClient {
  constructor(
    public readonly connection: Connection,
    public readonly programId: PublicKey,
  ) {}

  // ---------------------------------------------------------------------------
  // Account fetchers
  // ---------------------------------------------------------------------------

  async fetchProtocolConfig(): Promise<ProtocolConfig | null> {
    const [pda] = await findConfigPda(this.programId);
    const info = await this.connection.getAccountInfo(pda);
    if (!info) return null;
    return deserializeProtocolConfig(info);
  }

  async fetchCollateralConfig(
    collateralMint: PublicKey,
  ): Promise<CollateralConfig | null> {
    const [pda] = await findCollateralPda(collateralMint, this.programId);
    const info = await this.connection.getAccountInfo(pda);
    if (!info) return null;
    return deserializeCollateralConfig(info);
  }

  async fetchVaultPosition(
    owner: PublicKey,
    collateralMint: PublicKey,
  ): Promise<VaultPosition | null> {
    const [pda] = await findVaultPda(owner, collateralMint, this.programId);
    const info = await this.connection.getAccountInfo(pda);
    if (!info) return null;
    return deserializeVaultPosition(info);
  }

  // Convenience: collateral ratio as a plain number (e.g. 1.5 = 150%)
  collateralRatio(vault: VaultPosition, collateral: CollateralConfig): number {
    if (vault.debtAmount === 0n) return Infinity;
    const valueE6 =
      (vault.collateralAmount * collateral.priceE6) /
      BigInt(10 ** collateral.collateralDecimals);
    return Number((valueE6 * 10_000n) / vault.debtAmount) / 10_000;
  }

  isLiquidatable(
    vault: VaultPosition,
    collateral: CollateralConfig,
  ): boolean {
    if (vault.debtAmount === 0n) return false;
    const ratioBps =
      (((vault.collateralAmount * collateral.priceE6) /
        BigInt(10 ** collateral.collateralDecimals)) *
        10_000n) /
      vault.debtAmount;
    return ratioBps < BigInt(collateral.liquidationRatioBps);
  }
}

// ---------------------------------------------------------------------------
// Borsh deserialization — mirrors state.rs field layout exactly
// ---------------------------------------------------------------------------

class Reader {
  private offset = 0;
  constructor(private readonly data: Buffer) {}

  u8(): number {
    return this.data.readUInt8(this.offset++);
  }

  bool(): boolean {
    return this.u8() !== 0;
  }

  u16(): number {
    const v = this.data.readUInt16LE(this.offset);
    this.offset += 2;
    return v;
  }

  u64(): bigint {
    const v = this.data.readBigUInt64LE(this.offset);
    this.offset += 8;
    return v;
  }

  i64(): bigint {
    const v = this.data.readBigInt64LE(this.offset);
    this.offset += 8;
    return v;
  }

  pubkey(): PublicKey {
    const bytes = this.data.subarray(this.offset, this.offset + 32);
    this.offset += 32;
    return new PublicKey(bytes);
  }

  fixedStr(len: number): string {
    const bytes = this.data.subarray(this.offset, this.offset + len);
    this.offset += len;
    return Buffer.from(bytes).toString("utf8").replace(/\0/g, "").trim();
  }
}

function deserializeProtocolConfig(
  info: AccountInfo<Buffer>,
): ProtocolConfig {
  const r = new Reader(info.data);
  return {
    isInitialized: r.bool(),
    bump: r.u8(),
    governanceMint: r.pubkey(),
    stableMint: r.pubkey(),
    governanceAuthority: r.pubkey(),
    oracleAuthority: r.pubkey(),
    stabilityFeeBps: r.u16(),
    liquidationRatioBps: r.u16(),
    liquidationPenaltyBps: r.u16(),
    minCollateralRatioBps: r.u16(),
    stablecoinName: r.fixedStr(16),
    stablecoinSymbol: r.fixedStr(8),
  };
}

function deserializeCollateralConfig(
  info: AccountInfo<Buffer>,
): CollateralConfig {
  const r = new Reader(info.data);
  return {
    isInitialized: r.bool(),
    bump: r.u8(),
    collateralMint: r.pubkey(),
    collateralVault: r.pubkey(),
    priceE6: r.u64(),
    debtCeiling: r.u64(),
    totalDebt: r.u64(),
    totalCollateral: r.u64(),
    collateralDecimals: r.u8(),
    liquidationRatioBps: r.u16(),
    enabled: r.bool(),
  };
}

function deserializeVaultPosition(
  info: AccountInfo<Buffer>,
): VaultPosition {
  const r = new Reader(info.data);
  return {
    isInitialized: r.bool(),
    bump: r.u8(),
    owner: r.pubkey(),
    collateralMint: r.pubkey(),
    collateralAmount: r.u64(),
    debtAmount: r.u64(),
    lastAccrualTimestamp: r.i64(),
  };
}
