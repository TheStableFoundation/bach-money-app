import {
  PublicKey,
  TransactionInstruction,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import { CONFIG_SEED, COLLATERAL_SEED, VAULT_SEED } from "./constants.js";

// Instruction discriminants — Borsh enum variant index (u8 tag)
const enum Tag {
  InitializeProtocol = 0,
  InitializeCollateral = 1,
  UpdateProtocolRiskParams = 2,
  UpdateOraclePrice = 3,
  OpenVault = 4,
  DepositCollateral = 5,
  WithdrawCollateral = 6,
  MintStablecoin = 7,
  BurnStablecoin = 8,
  LiquidateVault = 9,
}

// ---------------------------------------------------------------------------
// Borsh helpers (no runtime dependency — keeps the SDK lean)
// ---------------------------------------------------------------------------

function writeU8(buf: number[], value: number): void {
  buf.push(value & 0xff);
}

function writeU16LE(buf: number[], value: number): void {
  buf.push(value & 0xff, (value >> 8) & 0xff);
}

function writeU64LE(buf: number[], value: bigint): void {
  for (let i = 0; i < 8; i++) {
    buf.push(Number((value >> BigInt(i * 8)) & 0xffn));
  }
}

function writePubkey(buf: number[], key: PublicKey): void {
  buf.push(...key.toBytes());
}

// ---------------------------------------------------------------------------
// PDA derivation helpers
// ---------------------------------------------------------------------------

export async function findConfigPda(programId: PublicKey): Promise<[PublicKey, number]> {
  return PublicKey.findProgramAddress([CONFIG_SEED], programId);
}

export async function findCollateralPda(
  collateralMint: PublicKey,
  programId: PublicKey,
): Promise<[PublicKey, number]> {
  return PublicKey.findProgramAddress(
    [COLLATERAL_SEED, collateralMint.toBytes()],
    programId,
  );
}

export async function findVaultPda(
  owner: PublicKey,
  collateralMint: PublicKey,
  programId: PublicKey,
): Promise<[PublicKey, number]> {
  return PublicKey.findProgramAddress(
    [VAULT_SEED, owner.toBytes(), collateralMint.toBytes()],
    programId,
  );
}

// ---------------------------------------------------------------------------
// Instruction builders
// ---------------------------------------------------------------------------

export interface OpenVaultAccounts {
  owner: PublicKey;
  configPda: PublicKey;
  collateralConfigPda: PublicKey;
  vaultPda: PublicKey;
  programId: PublicKey;
}

export function openVault(accounts: OpenVaultAccounts): TransactionInstruction {
  const data = Buffer.from([Tag.OpenVault]);
  return new TransactionInstruction({
    programId: accounts.programId,
    keys: [
      { pubkey: accounts.owner, isSigner: true, isWritable: true },
      { pubkey: accounts.configPda, isSigner: false, isWritable: false },
      { pubkey: accounts.collateralConfigPda, isSigner: false, isWritable: false },
      { pubkey: accounts.vaultPda, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

export interface DepositCollateralAccounts {
  owner: PublicKey;
  configPda: PublicKey;
  collateralConfigPda: PublicKey;
  vaultPda: PublicKey;
  ownerCollateralAta: PublicKey;
  collateralVault: PublicKey;
  tokenProgram: PublicKey;
  programId: PublicKey;
}

export function depositCollateral(
  accounts: DepositCollateralAccounts,
  amount: bigint,
): TransactionInstruction {
  const buf: number[] = [Tag.DepositCollateral];
  writeU64LE(buf, amount);
  return new TransactionInstruction({
    programId: accounts.programId,
    keys: [
      { pubkey: accounts.owner, isSigner: true, isWritable: true },
      { pubkey: accounts.configPda, isSigner: false, isWritable: false },
      { pubkey: accounts.collateralConfigPda, isSigner: false, isWritable: true },
      { pubkey: accounts.vaultPda, isSigner: false, isWritable: true },
      { pubkey: accounts.ownerCollateralAta, isSigner: false, isWritable: true },
      { pubkey: accounts.collateralVault, isSigner: false, isWritable: true },
      { pubkey: accounts.tokenProgram, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(buf),
  });
}

export interface WithdrawCollateralAccounts {
  owner: PublicKey;
  configPda: PublicKey;
  collateralConfigPda: PublicKey;
  vaultPda: PublicKey;
  ownerCollateralAta: PublicKey;
  collateralVault: PublicKey;
  tokenProgram: PublicKey;
  programId: PublicKey;
}

export function withdrawCollateral(
  accounts: WithdrawCollateralAccounts,
  amount: bigint,
): TransactionInstruction {
  const buf: number[] = [Tag.WithdrawCollateral];
  writeU64LE(buf, amount);
  return new TransactionInstruction({
    programId: accounts.programId,
    keys: [
      { pubkey: accounts.owner, isSigner: true, isWritable: false },
      { pubkey: accounts.configPda, isSigner: false, isWritable: false },
      { pubkey: accounts.collateralConfigPda, isSigner: false, isWritable: true },
      { pubkey: accounts.vaultPda, isSigner: false, isWritable: true },
      { pubkey: accounts.ownerCollateralAta, isSigner: false, isWritable: true },
      { pubkey: accounts.collateralVault, isSigner: false, isWritable: true },
      { pubkey: accounts.tokenProgram, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(buf),
  });
}

export interface MintStablecoinAccounts {
  owner: PublicKey;
  configPda: PublicKey;
  collateralConfigPda: PublicKey;
  vaultPda: PublicKey;
  stableMint: PublicKey;
  ownerStableAta: PublicKey;
  tokenProgram: PublicKey;
  programId: PublicKey;
}

export function mintStablecoin(
  accounts: MintStablecoinAccounts,
  amount: bigint,
): TransactionInstruction {
  const buf: number[] = [Tag.MintStablecoin];
  writeU64LE(buf, amount);
  return new TransactionInstruction({
    programId: accounts.programId,
    keys: [
      { pubkey: accounts.owner, isSigner: true, isWritable: false },
      { pubkey: accounts.configPda, isSigner: false, isWritable: false },
      { pubkey: accounts.collateralConfigPda, isSigner: false, isWritable: true },
      { pubkey: accounts.vaultPda, isSigner: false, isWritable: true },
      { pubkey: accounts.stableMint, isSigner: false, isWritable: true },
      { pubkey: accounts.ownerStableAta, isSigner: false, isWritable: true },
      { pubkey: accounts.tokenProgram, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(buf),
  });
}

export interface BurnStablecoinAccounts {
  owner: PublicKey;
  configPda: PublicKey;
  collateralConfigPda: PublicKey;
  vaultPda: PublicKey;
  stableMint: PublicKey;
  ownerStableAta: PublicKey;
  tokenProgram: PublicKey;
  programId: PublicKey;
}

export function burnStablecoin(
  accounts: BurnStablecoinAccounts,
  amount: bigint,
): TransactionInstruction {
  const buf: number[] = [Tag.BurnStablecoin];
  writeU64LE(buf, amount);
  return new TransactionInstruction({
    programId: accounts.programId,
    keys: [
      { pubkey: accounts.owner, isSigner: true, isWritable: false },
      { pubkey: accounts.configPda, isSigner: false, isWritable: false },
      { pubkey: accounts.collateralConfigPda, isSigner: false, isWritable: true },
      { pubkey: accounts.vaultPda, isSigner: false, isWritable: true },
      { pubkey: accounts.stableMint, isSigner: false, isWritable: true },
      { pubkey: accounts.ownerStableAta, isSigner: false, isWritable: true },
      { pubkey: accounts.tokenProgram, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(buf),
  });
}

export interface LiquidateVaultAccounts {
  liquidator: PublicKey;
  configPda: PublicKey;
  collateralConfigPda: PublicKey;
  vaultPda: PublicKey;
  stableMint: PublicKey;
  liquidatorStableAta: PublicKey;
  collateralVault: PublicKey;
  liquidatorCollateralAta: PublicKey;
  tokenProgram: PublicKey;
  programId: PublicKey;
}

export function liquidateVault(
  accounts: LiquidateVaultAccounts,
  repayAmount: bigint,
): TransactionInstruction {
  const buf: number[] = [Tag.LiquidateVault];
  writeU64LE(buf, repayAmount);
  return new TransactionInstruction({
    programId: accounts.programId,
    keys: [
      { pubkey: accounts.liquidator, isSigner: true, isWritable: false },
      { pubkey: accounts.configPda, isSigner: false, isWritable: false },
      { pubkey: accounts.collateralConfigPda, isSigner: false, isWritable: true },
      { pubkey: accounts.vaultPda, isSigner: false, isWritable: true },
      { pubkey: accounts.stableMint, isSigner: false, isWritable: true },
      { pubkey: accounts.liquidatorStableAta, isSigner: false, isWritable: true },
      { pubkey: accounts.collateralVault, isSigner: false, isWritable: true },
      { pubkey: accounts.liquidatorCollateralAta, isSigner: false, isWritable: true },
      { pubkey: accounts.tokenProgram, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(buf),
  });
}

export interface UpdateOraclePriceAccounts {
  oracleAuthority: PublicKey;
  configPda: PublicKey;
  collateralConfigPda: PublicKey;
  programId: PublicKey;
}

export function updateOraclePrice(
  accounts: UpdateOraclePriceAccounts,
  priceE6: bigint,
): TransactionInstruction {
  const buf: number[] = [Tag.UpdateOraclePrice];
  writeU64LE(buf, priceE6);
  return new TransactionInstruction({
    programId: accounts.programId,
    keys: [
      { pubkey: accounts.oracleAuthority, isSigner: true, isWritable: false },
      { pubkey: accounts.configPda, isSigner: false, isWritable: false },
      { pubkey: accounts.collateralConfigPda, isSigner: false, isWritable: true },
    ],
    data: Buffer.from(buf),
  });
}

// Re-export unused imports to avoid TS warnings on helpers kept for future use
export { SYSVAR_RENT_PUBKEY };
