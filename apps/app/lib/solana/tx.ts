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
import type { ResolvedNetwork } from "./config";

async function derivePdas(net: ResolvedNetwork, owner: PublicKey) {
  const [configPda] = await findConfigPda(net.programId);
  const [collateralConfigPda] = await findCollateralPda(
    net.collateralMint,
    net.programId,
  );
  const [vaultPda] = await findVaultPda(owner, net.collateralMint, net.programId);
  return { configPda, collateralConfigPda, vaultPda };
}

async function accountExists(
  connection: Connection,
  account: PublicKey,
): Promise<boolean> {
  return (await connection.getAccountInfo(account)) !== null;
}

export async function buildOpenVaultTx(
  net: ResolvedNetwork,
  owner: PublicKey,
): Promise<Transaction> {
  const { configPda, collateralConfigPda, vaultPda } = await derivePdas(net, owner);
  return new Transaction().add(
    openVault({
      owner,
      configPda,
      collateralConfigPda,
      vaultPda,
      programId: net.programId,
    }),
  );
}

export async function buildDepositTx(
  net: ResolvedNetwork,
  owner: PublicKey,
  collateralVault: PublicKey,
  amount: bigint,
): Promise<Transaction> {
  const { configPda, collateralConfigPda, vaultPda } = await derivePdas(net, owner);
  const ownerCollateralAta = getAssociatedTokenAddressSync(
    net.collateralMint,
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
        programId: net.programId,
      },
      amount,
    ),
  );
}

export async function buildWithdrawTx(
  net: ResolvedNetwork,
  owner: PublicKey,
  collateralVault: PublicKey,
  amount: bigint,
): Promise<Transaction> {
  const { configPda, collateralConfigPda, vaultPda } = await derivePdas(net, owner);
  const ownerCollateralAta = getAssociatedTokenAddressSync(
    net.collateralMint,
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
        programId: net.programId,
      },
      amount,
    ),
  );
}

export async function buildMintTx(
  net: ResolvedNetwork,
  connection: Connection,
  owner: PublicKey,
  amount: bigint,
): Promise<Transaction> {
  const { configPda, collateralConfigPda, vaultPda } = await derivePdas(net, owner);
  const ownerStableAta = getAssociatedTokenAddressSync(net.toneUsdMint, owner);

  const tx = new Transaction();
  if (!(await accountExists(connection, ownerStableAta))) {
    // Create the user's toneUSD account on first mint.
    tx.add(
      createAssociatedTokenAccountInstruction(
        owner,
        ownerStableAta,
        owner,
        net.toneUsdMint,
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
        stableMint: net.toneUsdMint,
        ownerStableAta,
        tokenProgram: TOKEN_PROGRAM_ID,
        programId: net.programId,
      },
      amount,
    ),
  );
  return tx;
}

export async function buildBurnTx(
  net: ResolvedNetwork,
  owner: PublicKey,
  amount: bigint,
): Promise<Transaction> {
  const { configPda, collateralConfigPda, vaultPda } = await derivePdas(net, owner);
  const ownerStableAta = getAssociatedTokenAddressSync(net.toneUsdMint, owner);
  return new Transaction().add(
    burnStablecoin(
      {
        owner,
        configPda,
        collateralConfigPda,
        vaultPda,
        stableMint: net.toneUsdMint,
        ownerStableAta,
        tokenProgram: TOKEN_PROGRAM_ID,
        programId: net.programId,
      },
      amount,
    ),
  );
}
