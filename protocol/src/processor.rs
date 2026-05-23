use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::{AccountInfo, next_account_info},
    clock::Clock,
    entrypoint::ProgramResult,
    program::{invoke, invoke_signed},
    program_error::ProgramError,
    program_pack::Pack,
    pubkey::Pubkey,
    rent::Rent,
    system_instruction,
    system_program,
    sysvar::Sysvar,
};
use spl_token::{
    instruction as token_instruction,
    state::{Account as TokenAccount, Mint},
};

use crate::{
    COLLATERAL_SEED, CONFIG_SEED, GOVERNANCE_MINT, STABLE_MINT_DECIMALS, STABLECOIN_NAME,
    STABLECOIN_SYMBOL, VAULT_SEED,
    error::BachError,
    instruction::BachInstruction,
    math::{
        accrue_stability_fee, checked_add, checked_sub, collateral_ratio_bps,
        collateral_value_e6, liquidation_payout, max_debt_for_value,
    },
    state::{CollateralConfig, ProtocolConfig, VaultPosition},
};

pub struct Processor;

impl Processor {
    pub fn process(
        program_id: &Pubkey,
        accounts: &[AccountInfo],
        instruction_data: &[u8],
    ) -> ProgramResult {
        match BachInstruction::unpack(instruction_data)? {
            BachInstruction::InitializeProtocol {
                governance_authority,
                oracle_authority,
                stability_fee_bps,
                liquidation_ratio_bps,
                liquidation_penalty_bps,
                min_collateral_ratio_bps,
            } => Self::initialize_protocol(
                program_id,
                accounts,
                governance_authority,
                oracle_authority,
                stability_fee_bps,
                liquidation_ratio_bps,
                liquidation_penalty_bps,
                min_collateral_ratio_bps,
            ),
            BachInstruction::InitializeCollateral {
                price_e6,
                debt_ceiling,
                liquidation_ratio_bps,
            } => Self::initialize_collateral(
                program_id,
                accounts,
                price_e6,
                debt_ceiling,
                liquidation_ratio_bps,
            ),
            BachInstruction::UpdateProtocolRiskParams {
                oracle_authority,
                stability_fee_bps,
                liquidation_ratio_bps,
                liquidation_penalty_bps,
                min_collateral_ratio_bps,
            } => Self::update_protocol_risk_params(
                accounts,
                oracle_authority,
                stability_fee_bps,
                liquidation_ratio_bps,
                liquidation_penalty_bps,
                min_collateral_ratio_bps,
            ),
            BachInstruction::UpdateOraclePrice { price_e6 } => {
                Self::update_oracle_price(accounts, price_e6)
            }
            BachInstruction::OpenVault => Self::open_vault(program_id, accounts),
            BachInstruction::DepositCollateral { amount } => {
                Self::deposit_collateral(program_id, accounts, amount)
            }
            BachInstruction::WithdrawCollateral { amount } => {
                Self::withdraw_collateral(program_id, accounts, amount)
            }
            BachInstruction::MintStablecoin { amount } => {
                Self::mint_stablecoin(program_id, accounts, amount)
            }
            BachInstruction::BurnStablecoin { amount } => {
                Self::burn_stablecoin(accounts, amount)
            }
            BachInstruction::LiquidateVault { repay_amount } => {
                Self::liquidate_vault(program_id, accounts, repay_amount)
            }
        }
    }

    fn initialize_protocol(
        program_id: &Pubkey,
        accounts: &[AccountInfo],
        governance_authority: Pubkey,
        oracle_authority: Pubkey,
        stability_fee_bps: u16,
        liquidation_ratio_bps: u16,
        liquidation_penalty_bps: u16,
        min_collateral_ratio_bps: u16,
    ) -> ProgramResult {
        Self::validate_risk_parameters(
            stability_fee_bps,
            liquidation_ratio_bps,
            liquidation_penalty_bps,
            min_collateral_ratio_bps,
        )?;

        let account_info_iter = &mut accounts.iter();
        let payer_info = next_account_info(account_info_iter)?;
        let config_info = next_account_info(account_info_iter)?;
        let governance_mint_info = next_account_info(account_info_iter)?;
        let stable_mint_info = next_account_info(account_info_iter)?;
        let system_program_info = next_account_info(account_info_iter)?;

        if !payer_info.is_signer {
            return Err(ProgramError::MissingRequiredSignature);
        }
        if governance_mint_info.key != &GOVERNANCE_MINT {
            return Err(BachError::InvalidMint.into());
        }
        if system_program_info.key != &system_program::ID {
            return Err(ProgramError::IncorrectProgramId);
        }

        let (config_pda, bump) = Pubkey::find_program_address(&[CONFIG_SEED], program_id);
        if config_info.key != &config_pda {
            return Err(BachError::InvalidPda.into());
        }

        if config_info.owner != program_id {
            Self::create_pda_account(
                payer_info,
                config_info,
                system_program_info,
                program_id,
                ProtocolConfig::LEN,
                &[CONFIG_SEED, &[bump]],
            )?;
        }

        let stable_mint = Mint::unpack(&stable_mint_info.try_borrow_data()?)
            .map_err(|_| BachError::InvalidMint)?;
        if stable_mint.decimals != STABLE_MINT_DECIMALS {
            return Err(BachError::InvalidMint.into());
        }
        if stable_mint.mint_authority != spl_token::solana_program::program_option::COption::Some(config_pda) {
            return Err(BachError::Unauthorized.into());
        }

        let existing_data = config_info.try_borrow_data()?;
        if existing_data.first().copied().unwrap_or_default() != 0 {
            return Err(BachError::AlreadyInitialized.into());
        }
        drop(existing_data);

        let config = ProtocolConfig {
            is_initialized: true,
            bump,
            governance_mint: GOVERNANCE_MINT,
            stable_mint: *stable_mint_info.key,
            governance_authority,
            oracle_authority,
            stability_fee_bps,
            liquidation_ratio_bps,
            liquidation_penalty_bps,
            min_collateral_ratio_bps,
            stablecoin_name: STABLECOIN_NAME,
            stablecoin_symbol: STABLECOIN_SYMBOL,
        };

        Self::store_state(config_info, &config)
    }

    fn initialize_collateral(
        program_id: &Pubkey,
        accounts: &[AccountInfo],
        price_e6: u64,
        debt_ceiling: u64,
        liquidation_ratio_bps: u16,
    ) -> ProgramResult {
        if price_e6 == 0 || debt_ceiling == 0 || liquidation_ratio_bps < 10_000 {
            return Err(BachError::InvalidRiskParameter.into());
        }

        let account_info_iter = &mut accounts.iter();
        let payer_info = next_account_info(account_info_iter)?;
        let config_info = next_account_info(account_info_iter)?;
        let collateral_info = next_account_info(account_info_iter)?;
        let collateral_mint_info = next_account_info(account_info_iter)?;
        let collateral_vault_info = next_account_info(account_info_iter)?;
        let system_program_info = next_account_info(account_info_iter)?;

        if !payer_info.is_signer {
            return Err(ProgramError::MissingRequiredSignature);
        }
        if system_program_info.key != &system_program::ID {
            return Err(ProgramError::IncorrectProgramId);
        }

        let config = Self::load_protocol_config(config_info)?;
        let (config_pda, _) = Pubkey::find_program_address(&[CONFIG_SEED], program_id);
        if config_info.key != &config_pda {
            return Err(BachError::InvalidPda.into());
        }

        let (collateral_pda, bump) =
            Pubkey::find_program_address(&[COLLATERAL_SEED, collateral_mint_info.key.as_ref()], program_id);
        if collateral_info.key != &collateral_pda {
            return Err(BachError::InvalidPda.into());
        }
        if collateral_info.owner != program_id {
            Self::create_pda_account(
                payer_info,
                collateral_info,
                system_program_info,
                program_id,
                CollateralConfig::LEN,
                &[COLLATERAL_SEED, collateral_mint_info.key.as_ref(), &[bump]],
            )?;
        }

        let collateral_mint =
            Mint::unpack(&collateral_mint_info.try_borrow_data()?).map_err(|_| BachError::InvalidMint)?;
        let collateral_vault = Self::load_token_account(collateral_vault_info)?;
        if collateral_vault.mint != *collateral_mint_info.key || collateral_vault.owner != *config_info.key {
            return Err(BachError::InvalidTokenAccount.into());
        }

        let existing_data = collateral_info.try_borrow_data()?;
        if existing_data.first().copied().unwrap_or_default() != 0 {
            return Err(BachError::AlreadyInitialized.into());
        }
        drop(existing_data);

        let collateral = CollateralConfig {
            is_initialized: true,
            bump,
            collateral_mint: *collateral_mint_info.key,
            collateral_vault: *collateral_vault_info.key,
            price_e6,
            debt_ceiling,
            total_debt: 0,
            total_collateral: 0,
            collateral_decimals: collateral_mint.decimals,
            liquidation_ratio_bps: liquidation_ratio_bps.max(config.liquidation_ratio_bps),
            enabled: true,
        };

        Self::store_state(collateral_info, &collateral)
    }

    fn update_protocol_risk_params(
        accounts: &[AccountInfo],
        oracle_authority: Pubkey,
        stability_fee_bps: u16,
        liquidation_ratio_bps: u16,
        liquidation_penalty_bps: u16,
        min_collateral_ratio_bps: u16,
    ) -> ProgramResult {
        Self::validate_risk_parameters(
            stability_fee_bps,
            liquidation_ratio_bps,
            liquidation_penalty_bps,
            min_collateral_ratio_bps,
        )?;

        let account_info_iter = &mut accounts.iter();
        let authority_info = next_account_info(account_info_iter)?;
        let config_info = next_account_info(account_info_iter)?;

        if !authority_info.is_signer {
            return Err(ProgramError::MissingRequiredSignature);
        }

        let mut config = Self::load_protocol_config(config_info)?;
        if authority_info.key != &config.governance_authority {
            return Err(BachError::Unauthorized.into());
        }

        config.oracle_authority = oracle_authority;
        config.stability_fee_bps = stability_fee_bps;
        config.liquidation_ratio_bps = liquidation_ratio_bps;
        config.liquidation_penalty_bps = liquidation_penalty_bps;
        config.min_collateral_ratio_bps = min_collateral_ratio_bps;

        Self::store_state(config_info, &config)
    }

    fn update_oracle_price(accounts: &[AccountInfo], price_e6: u64) -> ProgramResult {
        if price_e6 == 0 {
            return Err(BachError::InvalidRiskParameter.into());
        }

        let account_info_iter = &mut accounts.iter();
        let oracle_info = next_account_info(account_info_iter)?;
        let config_info = next_account_info(account_info_iter)?;
        let collateral_info = next_account_info(account_info_iter)?;

        if !oracle_info.is_signer {
            return Err(ProgramError::MissingRequiredSignature);
        }

        let config = Self::load_protocol_config(config_info)?;
        if oracle_info.key != &config.oracle_authority {
            return Err(BachError::Unauthorized.into());
        }

        let mut collateral = Self::load_collateral_config(collateral_info)?;
        collateral.price_e6 = price_e6;

        Self::store_state(collateral_info, &collateral)
    }

    fn open_vault(program_id: &Pubkey, accounts: &[AccountInfo]) -> ProgramResult {
        let account_info_iter = &mut accounts.iter();
        let owner_info = next_account_info(account_info_iter)?;
        let config_info = next_account_info(account_info_iter)?;
        let collateral_info = next_account_info(account_info_iter)?;
        let vault_info = next_account_info(account_info_iter)?;
        let system_program_info = next_account_info(account_info_iter)?;

        if !owner_info.is_signer {
            return Err(ProgramError::MissingRequiredSignature);
        }
        if system_program_info.key != &system_program::ID {
            return Err(ProgramError::IncorrectProgramId);
        }

        let _config = Self::load_protocol_config(config_info)?;
        let collateral = Self::load_collateral_config(collateral_info)?;
        let (vault_pda, bump) = Pubkey::find_program_address(
            &[VAULT_SEED, owner_info.key.as_ref(), collateral.collateral_mint.as_ref()],
            program_id,
        );
        if vault_info.key != &vault_pda {
            return Err(BachError::InvalidPda.into());
        }

        if vault_info.owner != program_id {
            Self::create_pda_account(
                owner_info,
                vault_info,
                system_program_info,
                program_id,
                VaultPosition::LEN,
                &[VAULT_SEED, owner_info.key.as_ref(), collateral.collateral_mint.as_ref(), &[bump]],
            )?;
        }

        let existing_data = vault_info.try_borrow_data()?;
        if existing_data.first().copied().unwrap_or_default() != 0 {
            return Err(BachError::AlreadyInitialized.into());
        }
        drop(existing_data);

        let vault = VaultPosition {
            is_initialized: true,
            bump,
            owner: *owner_info.key,
            collateral_mint: collateral.collateral_mint,
            collateral_amount: 0,
            debt_amount: 0,
            last_accrual_timestamp: Clock::get()?.unix_timestamp,
        };

        Self::store_state(vault_info, &vault)
    }

    fn deposit_collateral(
        program_id: &Pubkey,
        accounts: &[AccountInfo],
        amount: u64,
    ) -> ProgramResult {
        if amount == 0 {
            return Err(BachError::InvalidRiskParameter.into());
        }

        let account_info_iter = &mut accounts.iter();
        let owner_info = next_account_info(account_info_iter)?;
        let config_info = next_account_info(account_info_iter)?;
        let collateral_info = next_account_info(account_info_iter)?;
        let vault_info = next_account_info(account_info_iter)?;
        let owner_collateral_info = next_account_info(account_info_iter)?;
        let collateral_vault_info = next_account_info(account_info_iter)?;
        let token_program_info = next_account_info(account_info_iter)?;

        if !owner_info.is_signer {
            return Err(ProgramError::MissingRequiredSignature);
        }
        Self::validate_token_program(token_program_info)?;

        let _config = Self::load_protocol_config(config_info)?;
        let mut collateral = Self::load_collateral_config(collateral_info)?;
        if !collateral.enabled {
            return Err(BachError::CollateralDisabled.into());
        }
        let mut vault = Self::load_vault(vault_info)?;
        Self::validate_vault_owner(program_id, owner_info.key, &collateral, &vault, vault_info)?;
        Self::validate_collateral_accounts(
            owner_collateral_info,
            collateral_vault_info,
            config_info.key,
            &collateral,
            owner_info.key,
        )?;
        Self::accrue_vault_debt(config_info, &mut collateral, &mut vault)?;

        invoke(
            &token_instruction::transfer(
                token_program_info.key,
                owner_collateral_info.key,
                collateral_vault_info.key,
                owner_info.key,
                &[],
                amount,
            )?,
            &[
                owner_collateral_info.clone(),
                collateral_vault_info.clone(),
                owner_info.clone(),
                token_program_info.clone(),
            ],
        )?;

        vault.collateral_amount = checked_add(vault.collateral_amount, amount)?;
        collateral.total_collateral = checked_add(collateral.total_collateral, amount)?;

        Self::store_state(collateral_info, &collateral)?;
        Self::store_state(vault_info, &vault)
    }

    fn withdraw_collateral(
        program_id: &Pubkey,
        accounts: &[AccountInfo],
        amount: u64,
    ) -> ProgramResult {
        if amount == 0 {
            return Err(BachError::InvalidRiskParameter.into());
        }

        let account_info_iter = &mut accounts.iter();
        let owner_info = next_account_info(account_info_iter)?;
        let config_info = next_account_info(account_info_iter)?;
        let collateral_info = next_account_info(account_info_iter)?;
        let vault_info = next_account_info(account_info_iter)?;
        let owner_collateral_info = next_account_info(account_info_iter)?;
        let collateral_vault_info = next_account_info(account_info_iter)?;
        let token_program_info = next_account_info(account_info_iter)?;

        if !owner_info.is_signer {
            return Err(ProgramError::MissingRequiredSignature);
        }
        Self::validate_token_program(token_program_info)?;

        let config = Self::load_protocol_config(config_info)?;
        let mut collateral = Self::load_collateral_config(collateral_info)?;
        let mut vault = Self::load_vault(vault_info)?;
        Self::validate_vault_owner(program_id, owner_info.key, &collateral, &vault, vault_info)?;
        Self::validate_collateral_accounts(
            owner_collateral_info,
            collateral_vault_info,
            config_info.key,
            &collateral,
            owner_info.key,
        )?;
        Self::accrue_vault_debt(config_info, &mut collateral, &mut vault)?;

        vault.collateral_amount = checked_sub(vault.collateral_amount, amount)?;
        collateral.total_collateral = checked_sub(collateral.total_collateral, amount)?;
        Self::assert_vault_is_healthy(&config, &collateral, &vault)?;

        invoke_signed(
            &token_instruction::transfer(
                token_program_info.key,
                collateral_vault_info.key,
                owner_collateral_info.key,
                config_info.key,
                &[],
                amount,
            )?,
            &[
                collateral_vault_info.clone(),
                owner_collateral_info.clone(),
                config_info.clone(),
                token_program_info.clone(),
            ],
            &[&[CONFIG_SEED, &[config.bump]]],
        )?;

        Self::store_state(collateral_info, &collateral)?;
        Self::store_state(vault_info, &vault)
    }

    fn mint_stablecoin(
        program_id: &Pubkey,
        accounts: &[AccountInfo],
        amount: u64,
    ) -> ProgramResult {
        if amount == 0 {
            return Err(BachError::InvalidRiskParameter.into());
        }

        let account_info_iter = &mut accounts.iter();
        let owner_info = next_account_info(account_info_iter)?;
        let config_info = next_account_info(account_info_iter)?;
        let collateral_info = next_account_info(account_info_iter)?;
        let vault_info = next_account_info(account_info_iter)?;
        let stable_mint_info = next_account_info(account_info_iter)?;
        let owner_stable_info = next_account_info(account_info_iter)?;
        let token_program_info = next_account_info(account_info_iter)?;

        if !owner_info.is_signer {
            return Err(ProgramError::MissingRequiredSignature);
        }
        Self::validate_token_program(token_program_info)?;

        let config = Self::load_protocol_config(config_info)?;
        let mut collateral = Self::load_collateral_config(collateral_info)?;
        let mut vault = Self::load_vault(vault_info)?;
        Self::validate_vault_owner(program_id, owner_info.key, &collateral, &vault, vault_info)?;
        Self::validate_stable_token_account(
            stable_mint_info,
            owner_stable_info,
            owner_info.key,
            &config,
        )?;
        Self::accrue_vault_debt(config_info, &mut collateral, &mut vault)?;

        let new_vault_debt = checked_add(vault.debt_amount, amount)?;
        let new_total_debt = checked_add(collateral.total_debt, amount)?;
        if new_total_debt > collateral.debt_ceiling {
            return Err(BachError::InvalidRiskParameter.into());
        }

        let candidate_vault = VaultPosition {
            debt_amount: new_vault_debt,
            ..vault.clone()
        };
        Self::assert_vault_is_healthy(&config, &collateral, &candidate_vault)?;

        invoke_signed(
            &token_instruction::mint_to(
                token_program_info.key,
                stable_mint_info.key,
                owner_stable_info.key,
                config_info.key,
                &[],
                amount,
            )?,
            &[
                stable_mint_info.clone(),
                owner_stable_info.clone(),
                config_info.clone(),
                token_program_info.clone(),
            ],
            &[&[CONFIG_SEED, &[config.bump]]],
        )?;

        vault.debt_amount = new_vault_debt;
        collateral.total_debt = new_total_debt;

        Self::store_state(collateral_info, &collateral)?;
        Self::store_state(vault_info, &vault)
    }

    fn burn_stablecoin(accounts: &[AccountInfo], amount: u64) -> ProgramResult {
        if amount == 0 {
            return Err(BachError::InvalidRiskParameter.into());
        }

        let account_info_iter = &mut accounts.iter();
        let owner_info = next_account_info(account_info_iter)?;
        let config_info = next_account_info(account_info_iter)?;
        let collateral_info = next_account_info(account_info_iter)?;
        let vault_info = next_account_info(account_info_iter)?;
        let stable_mint_info = next_account_info(account_info_iter)?;
        let owner_stable_info = next_account_info(account_info_iter)?;
        let token_program_info = next_account_info(account_info_iter)?;

        if !owner_info.is_signer {
            return Err(ProgramError::MissingRequiredSignature);
        }
        Self::validate_token_program(token_program_info)?;

        let config = Self::load_protocol_config(config_info)?;
        let mut collateral = Self::load_collateral_config(collateral_info)?;
        let mut vault = Self::load_vault(vault_info)?;
        Self::validate_stable_token_account(
            stable_mint_info,
            owner_stable_info,
            owner_info.key,
            &config,
        )?;
        Self::accrue_vault_debt(config_info, &mut collateral, &mut vault)?;

        if owner_info.key != &vault.owner {
            return Err(BachError::Unauthorized.into());
        }
        if amount > vault.debt_amount {
            return Err(BachError::InvalidRiskParameter.into());
        }

        invoke(
            &token_instruction::burn(
                token_program_info.key,
                owner_stable_info.key,
                stable_mint_info.key,
                owner_info.key,
                &[],
                amount,
            )?,
            &[
                owner_stable_info.clone(),
                stable_mint_info.clone(),
                owner_info.clone(),
                token_program_info.clone(),
            ],
        )?;

        vault.debt_amount = checked_sub(vault.debt_amount, amount)?;
        collateral.total_debt = checked_sub(collateral.total_debt, amount)?;

        Self::store_state(collateral_info, &collateral)?;
        Self::store_state(vault_info, &vault)
    }

    fn liquidate_vault(
        program_id: &Pubkey,
        accounts: &[AccountInfo],
        repay_amount: u64,
    ) -> ProgramResult {
        if repay_amount == 0 {
            return Err(BachError::InvalidRiskParameter.into());
        }

        let account_info_iter = &mut accounts.iter();
        let liquidator_info = next_account_info(account_info_iter)?;
        let config_info = next_account_info(account_info_iter)?;
        let collateral_info = next_account_info(account_info_iter)?;
        let vault_info = next_account_info(account_info_iter)?;
        let stable_mint_info = next_account_info(account_info_iter)?;
        let liquidator_stable_info = next_account_info(account_info_iter)?;
        let liquidator_collateral_info = next_account_info(account_info_iter)?;
        let collateral_vault_info = next_account_info(account_info_iter)?;
        let token_program_info = next_account_info(account_info_iter)?;

        if !liquidator_info.is_signer {
            return Err(ProgramError::MissingRequiredSignature);
        }
        Self::validate_token_program(token_program_info)?;

        let config = Self::load_protocol_config(config_info)?;
        let mut collateral = Self::load_collateral_config(collateral_info)?;
        let mut vault = Self::load_vault(vault_info)?;
        Self::validate_stable_token_account(
            stable_mint_info,
            liquidator_stable_info,
            liquidator_info.key,
            &config,
        )?;
        Self::validate_collateral_accounts(
            liquidator_collateral_info,
            collateral_vault_info,
            config_info.key,
            &collateral,
            liquidator_info.key,
        )?;
        Self::accrue_vault_debt(config_info, &mut collateral, &mut vault)?;

        if Self::vault_is_healthy(&config, &collateral, &vault)? {
            return Err(BachError::VaultHealthy.into());
        }

        let repay_amount = repay_amount.min(vault.debt_amount);
        let collateral_to_seize = liquidation_payout(
            repay_amount,
            collateral.collateral_decimals,
            collateral.price_e6,
            config.liquidation_penalty_bps,
        )?
        .min(vault.collateral_amount);

        invoke(
            &token_instruction::burn(
                token_program_info.key,
                liquidator_stable_info.key,
                stable_mint_info.key,
                liquidator_info.key,
                &[],
                repay_amount,
            )?,
            &[
                liquidator_stable_info.clone(),
                stable_mint_info.clone(),
                liquidator_info.clone(),
                token_program_info.clone(),
            ],
        )?;

        invoke_signed(
            &token_instruction::transfer(
                token_program_info.key,
                collateral_vault_info.key,
                liquidator_collateral_info.key,
                config_info.key,
                &[],
                collateral_to_seize,
            )?,
            &[
                collateral_vault_info.clone(),
                liquidator_collateral_info.clone(),
                config_info.clone(),
                token_program_info.clone(),
            ],
            &[&[CONFIG_SEED, &[config.bump]]],
        )?;

        vault.debt_amount = checked_sub(vault.debt_amount, repay_amount)?;
        vault.collateral_amount = checked_sub(vault.collateral_amount, collateral_to_seize)?;
        collateral.total_debt = checked_sub(collateral.total_debt, repay_amount)?;
        collateral.total_collateral = checked_sub(collateral.total_collateral, collateral_to_seize)?;

        Self::store_state(collateral_info, &collateral)?;
        Self::store_state(vault_info, &vault)
    }

    fn validate_risk_parameters(
        stability_fee_bps: u16,
        liquidation_ratio_bps: u16,
        liquidation_penalty_bps: u16,
        min_collateral_ratio_bps: u16,
    ) -> ProgramResult {
        if stability_fee_bps > 5_000
            || liquidation_ratio_bps < 10_000
            || liquidation_penalty_bps > 5_000
            || min_collateral_ratio_bps < 10_000
            || min_collateral_ratio_bps > liquidation_ratio_bps
        {
            return Err(BachError::InvalidRiskParameter.into());
        }

        Ok(())
    }

    fn create_pda_account<'a>(
        payer_info: &AccountInfo<'a>,
        account_info: &AccountInfo<'a>,
        system_program_info: &AccountInfo<'a>,
        program_id: &Pubkey,
        size: usize,
        signer_seeds: &[&[u8]],
    ) -> ProgramResult {
        let rent = Rent::get()?;
        let lamports = rent.minimum_balance(size);
        invoke_signed(
            &system_instruction::create_account(
                payer_info.key,
                account_info.key,
                lamports,
                size as u64,
                program_id,
            ),
            &[payer_info.clone(), account_info.clone(), system_program_info.clone()],
            &[signer_seeds],
        )
    }

    fn load_protocol_config(account_info: &AccountInfo) -> Result<ProtocolConfig, ProgramError> {
        let config = ProtocolConfig::try_from_slice(&account_info.try_borrow_data()?)
            .map_err(|_| BachError::Uninitialized)?;
        if !config.is_initialized {
            return Err(BachError::Uninitialized.into());
        }
        Ok(config)
    }

    fn load_collateral_config(account_info: &AccountInfo) -> Result<CollateralConfig, ProgramError> {
        let collateral = CollateralConfig::try_from_slice(&account_info.try_borrow_data()?)
            .map_err(|_| BachError::Uninitialized)?;
        if !collateral.is_initialized {
            return Err(BachError::Uninitialized.into());
        }
        Ok(collateral)
    }

    fn load_vault(account_info: &AccountInfo) -> Result<VaultPosition, ProgramError> {
        let vault = VaultPosition::try_from_slice(&account_info.try_borrow_data()?)
            .map_err(|_| BachError::Uninitialized)?;
        if !vault.is_initialized {
            return Err(BachError::Uninitialized.into());
        }
        Ok(vault)
    }

    fn store_state<T: BorshSerialize>(account_info: &AccountInfo, state: &T) -> ProgramResult {
        state
            .serialize(&mut &mut account_info.try_borrow_mut_data()?[..])
            .map_err(|_| ProgramError::InvalidAccountData)
    }

    fn load_token_account(account_info: &AccountInfo) -> Result<TokenAccount, ProgramError> {
        TokenAccount::unpack(&account_info.try_borrow_data()?).map_err(|_| BachError::InvalidTokenAccount.into())
    }

    fn validate_token_program(token_program_info: &AccountInfo) -> ProgramResult {
        if token_program_info.key != &spl_token::ID {
            return Err(ProgramError::IncorrectProgramId);
        }
        Ok(())
    }

    fn validate_vault_owner(
        program_id: &Pubkey,
        owner: &Pubkey,
        collateral: &CollateralConfig,
        vault: &VaultPosition,
        vault_info: &AccountInfo,
    ) -> ProgramResult {
        let (vault_pda, _) = Pubkey::find_program_address(
            &[VAULT_SEED, owner.as_ref(), collateral.collateral_mint.as_ref()],
            program_id,
        );
        if vault_info.key != &vault_pda || vault.owner != *owner || vault.collateral_mint != collateral.collateral_mint
        {
            return Err(BachError::InvalidPda.into());
        }
        Ok(())
    }

    fn validate_collateral_accounts(
        user_collateral_info: &AccountInfo,
        collateral_vault_info: &AccountInfo,
        protocol_authority: &Pubkey,
        collateral: &CollateralConfig,
        user_owner: &Pubkey,
    ) -> ProgramResult {
        let user_collateral = Self::load_token_account(user_collateral_info)?;
        let collateral_vault = Self::load_token_account(collateral_vault_info)?;
        if user_collateral.owner != *user_owner || user_collateral.mint != collateral.collateral_mint {
            return Err(BachError::InvalidTokenAccount.into());
        }
        if collateral_vault.owner != *protocol_authority
            || collateral_vault.mint != collateral.collateral_mint
            || collateral.collateral_vault != *collateral_vault_info.key
        {
            return Err(BachError::InvalidTokenAccount.into());
        }
        Ok(())
    }

    fn validate_stable_token_account(
        stable_mint_info: &AccountInfo,
        user_stable_info: &AccountInfo,
        owner: &Pubkey,
        config: &ProtocolConfig,
    ) -> ProgramResult {
        if stable_mint_info.key != &config.stable_mint {
            return Err(BachError::InvalidMint.into());
        }
        let stable_mint =
            Mint::unpack(&stable_mint_info.try_borrow_data()?).map_err(|_| BachError::InvalidMint)?;
        if stable_mint.decimals != STABLE_MINT_DECIMALS {
            return Err(BachError::InvalidMint.into());
        }
        let user_stable = Self::load_token_account(user_stable_info)?;
        if user_stable.owner != *owner || user_stable.mint != config.stable_mint {
            return Err(BachError::InvalidTokenAccount.into());
        }
        Ok(())
    }

    fn accrue_vault_debt(
        config_info: &AccountInfo,
        collateral: &mut CollateralConfig,
        vault: &mut VaultPosition,
    ) -> ProgramResult {
        let config = Self::load_protocol_config(config_info)?;
        let now = Clock::get()?.unix_timestamp;
        let elapsed = now.saturating_sub(vault.last_accrual_timestamp);
        let accrued = accrue_stability_fee(vault.debt_amount, config.stability_fee_bps, elapsed)?;
        if accrued > vault.debt_amount {
            collateral.total_debt = checked_add(collateral.total_debt, accrued - vault.debt_amount)?;
        }
        vault.debt_amount = accrued;
        vault.last_accrual_timestamp = now;
        Ok(())
    }

    fn vault_is_healthy(
        config: &ProtocolConfig,
        collateral: &CollateralConfig,
        vault: &VaultPosition,
    ) -> Result<bool, ProgramError> {
        if vault.debt_amount == 0 {
            return Ok(true);
        }

        let collateral_value =
            collateral_value_e6(vault.collateral_amount, collateral.collateral_decimals, collateral.price_e6)?;
        let ratio = collateral_ratio_bps(collateral_value, vault.debt_amount)?;
        let required_ratio = collateral
            .liquidation_ratio_bps
            .max(config.min_collateral_ratio_bps) as u64;
        Ok(ratio >= required_ratio)
    }

    fn assert_vault_is_healthy(
        config: &ProtocolConfig,
        collateral: &CollateralConfig,
        vault: &VaultPosition,
    ) -> ProgramResult {
        let collateral_value =
            collateral_value_e6(vault.collateral_amount, collateral.collateral_decimals, collateral.price_e6)?;
        let required_ratio = collateral
            .liquidation_ratio_bps
            .max(config.min_collateral_ratio_bps);
        let max_debt = max_debt_for_value(collateral_value, required_ratio)?;
        if vault.debt_amount > max_debt {
            return Err(BachError::InsufficientCollateral.into());
        }
        Ok(())
    }
}
