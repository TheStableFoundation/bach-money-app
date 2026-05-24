use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::pubkey::Pubkey;

pub const STABLE_NAME_LEN: usize = 16;
pub const STABLE_SYMBOL_LEN: usize = 8;

#[derive(Debug, Clone, BorshSerialize, BorshDeserialize, PartialEq)]
pub struct ProtocolConfig {
    pub is_initialized: bool,
    pub bump: u8,
    pub governance_mint: Pubkey,
    pub stable_mint: Pubkey,
    pub governance_authority: Pubkey,
    pub oracle_authority: Pubkey,
    pub stability_fee_bps: u16,
    pub liquidation_ratio_bps: u16,
    pub liquidation_penalty_bps: u16,
    pub min_collateral_ratio_bps: u16,
    pub stablecoin_name: [u8; STABLE_NAME_LEN],
    pub stablecoin_symbol: [u8; STABLE_SYMBOL_LEN],
}

impl ProtocolConfig {
    pub const LEN: usize = 162;
}

#[derive(Debug, Clone, BorshSerialize, BorshDeserialize, PartialEq)]
pub struct CollateralConfig {
    pub is_initialized: bool,
    pub bump: u8,
    pub collateral_mint: Pubkey,
    pub collateral_vault: Pubkey,
    pub price_e6: u64,
    pub debt_ceiling: u64,
    pub total_debt: u64,
    pub total_collateral: u64,
    pub collateral_decimals: u8,
    pub liquidation_ratio_bps: u16,
    pub enabled: bool,
}

impl CollateralConfig {
    pub const LEN: usize = 102;
}

#[derive(Debug, Clone, BorshSerialize, BorshDeserialize, PartialEq)]
pub struct VaultPosition {
    pub is_initialized: bool,
    pub bump: u8,
    pub owner: Pubkey,
    pub collateral_mint: Pubkey,
    pub collateral_amount: u64,
    pub debt_amount: u64,
    pub last_accrual_timestamp: i64,
}

impl VaultPosition {
    pub const LEN: usize = 90;
}
