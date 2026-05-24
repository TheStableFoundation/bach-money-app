use solana_program::program_error::ProgramError;
use thiserror::Error;

#[derive(Debug, Error, Copy, Clone)]
pub enum BachError {
    #[error("instruction data is invalid")]
    InvalidInstruction,
    #[error("account does not match the expected program derived address")]
    InvalidPda,
    #[error("caller is not authorized")]
    Unauthorized,
    #[error("protocol is already initialized")]
    AlreadyInitialized,
    #[error("protocol state is uninitialized")]
    Uninitialized,
    #[error("token mint does not match the expected asset")]
    InvalidMint,
    #[error("token account does not match the expected owner or mint")]
    InvalidTokenAccount,
    #[error("vault is healthy and cannot be liquidated")]
    VaultHealthy,
    #[error("vault would become under-collateralized")]
    InsufficientCollateral,
    #[error("collateral market is disabled")]
    CollateralDisabled,
    #[error("risk parameter is invalid")]
    InvalidRiskParameter,
    #[error("math overflow")]
    MathOverflow,
}

impl From<BachError> for ProgramError {
    fn from(value: BachError) -> Self {
        ProgramError::Custom(value as u32)
    }
}
