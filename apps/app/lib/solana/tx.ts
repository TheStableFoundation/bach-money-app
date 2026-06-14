import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";
import {
  openVault,
  depositCollateral,
  withdrawCollateral,
  mintStablecoin,
  burnStablecoin,
  findConfigPda,
  findCollateralPda,
  findVaultPda,
} from "@bach-money/sdk";
import { PROGRAM_ID, COLLATERAL_MINT, TONEUSD_MINT } from "./config";

async function derivePdas(owner: PublicKey) {
  const [configPda] = await findConfigPda(PROGRAM_ID);
  const [collateralConfigPda] = await findCollateralPda(
    COLLATERAL_MINT,
    PROGRAM_ID,
  );
  const [vaultPda] = await findVaultPda(owner, COLLATERAL_MINT, PROGRAM_ID);
  return { configPda, collateralConfigPda, vaultPda };
}

async function accountExists(
  connection: Connection,
  account: PublicKey,
): Promise<boolean> {
  return (await connection.getAccountInfo(account)) !== null;
}

export async function buildOpenVaultTx(owner: PublicKey): Promise<Transaction> {
  const { configPda, collateralConfigPda, vaultPda } = await derivePdas(owner);
  return new Transaction().add(
    openVault({
      owner,
      configPda,
      collateralConfigPda,
      vaultPda,
      programId: PROGRAM_ID,
    }),
  );
}

export async function buildDepositTx(
  owner: PublicKey,
  collateralVault: PublicKey,
  amount: bigint,
): Promise<Transaction> {
  const { configPda, collateralConfigPda, vaultPda } = await derivePdas(owner);
  const ownerCollateralAta = getAssociatedTokenAddressSync(
    COLLATERAL_MINT,
    owner,
  );
  return new Transaction().add(
    depositCollateral(
      {
        owner,
        configPda,
        collateralConfigPda,
        vaultPda,
        ownerCollateralAta,
        collateralVault,
        tokenProgram: TOKEN_PROGRAM_ID,
        programId: PROGRAM_ID,
      },
      amount,
    ),
  );
}

export async function buildWithdrawTx(
  owner: PublicKey,
  collateralVault: PublicKey,
  amount: bigint,
): Promise<Transaction> {
  const { configPda, collateralConfigPda, vaultPda } = await derivePdas(owner);
  const ownerCollateralAta = getAssociatedTokenAddressSync(
    COLLATERAL_MINT,
    owner,
  );
  return new Transaction().add(
    withdrawCollateral(
      {
        owner,
        configPda,
        collateralConfigPda,
        vaultPda,
        ownerCollateralAta,
        collateralVault,
        tokenProgram: TOKEN_PROGRAM_ID,
        programId: PROGRAM_ID,
      },
      amount,
    ),
  );
}

export async function buildMintTx(
  connection: Connection,
  owner: PublicKey,
  amount: bigint,
): Promise<Transaction> {
  const { configPda, collateralConfigPda, vaultPda } = await derivePdas(owner);
  const ownerStableAta = getAssociatedTokenAddressSync(TONEUSD_MINT, owner);

  const tx = new Transaction();
  if (!(await accountExists(connection, ownerStableAta))) {
    // Create the user's toneUSD account on first mint.
    tx.add(
      createAssociatedTokenAccountInstruction(
        owner,
        ownerStableAta,
        owner,
        TONEUSD_MINT,
      ),
    );
  }
  tx.add(
    mintStablecoin(
      {
        owner,
        configPda,
        collateralConfigPda,
        vaultPda,
        stableMint: TONEUSD_MINT,
        ownerStableAta,
        tokenProgram: TOKEN_PROGRAM_ID,
        programId: PROGRAM_ID,
      },
      amount,
    ),
  );
  return tx;
}

export async function buildBurnTx(
  owner: PublicKey,
  amount: bigint,
): Promise<Transaction> {
  const { configPda, collateralConfigPda, vaultPda } = await derivePdas(owner);
  const ownerStableAta = getAssociatedTokenAddressSync(TONEUSD_MINT, owner);
  return new Transaction().add(
    burnStablecoin(
      {
        owner,
        configPda,
        collateralConfigPda,
        vaultPda,
        stableMint: TONEUSD_MINT,
        ownerStableAta,
        tokenProgram: TOKEN_PROGRAM_ID,
        programId: PROGRAM_ID,
      },
      amount,
    ),
  );
}
