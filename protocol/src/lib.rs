pub mod entrypoint;
pub mod error;
pub mod instruction;
pub mod math;
pub mod processor;
pub mod state;

use solana_program::pubkey;
use solana_program::pubkey::Pubkey;

pub const CONFIG_SEED: &[u8] = b"config";
pub const COLLATERAL_SEED: &[u8] = b"collateral";
pub const VAULT_SEED: &[u8] = b"vault";
pub const STABLE_MINT_DECIMALS: u8 = 6;
pub const STABLECOIN_NAME: [u8; state::STABLE_NAME_LEN] = *b"toneUSD\0\0\0\0\0\0\0\0\0";
pub const STABLECOIN_SYMBOL: [u8; state::STABLE_SYMBOL_LEN] = *b"toneUSD\0";
pub const GOVERNANCE_MINT: Pubkey = pubkey!("DENNuKzCcrLhEtxZ8tm7nSeef8qvKgGGrdxX6euNkNS7");
