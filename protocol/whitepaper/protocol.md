# Bach Money Protocol

**A Maker-style over-collateralized stablecoin on Solana**

Version 1 (draft) · 2026

---

## Abstract

Bach Money is a collateralized debt position (CDP) protocol on Solana. Users lock
approved SPL tokens as collateral and mint **toneUSD**, a stablecoin
that targets a soft peg of 1 toneUSD = 1 USD. Each position is over-collateralized:
the value of locked collateral must stay above a configured multiple of the debt.
Positions that fall below the liquidation threshold can be closed by anyone in
exchange for the underlying collateral plus a penalty.

The design follows MakerDAO's vault model. toneUSD is the equivalent of DAI, and
the governance asset **€BACH** is the equivalent of MKR. Version 1 is deliberately
small: a single on-chain program, authority-based governance, and a trusted oracle
for prices. It is a foundation to build on, not a finished monetary system.

---

## 1. Design goals

- **Solvency by construction.** Every toneUSD in circulation is backed by collateral
  worth more than the debt it secures, enforced on every mint and withdrawal.
- **Minimal surface area.** One native Solana program, no Anchor, manual Borsh
  serialization, and checked arithmetic throughout.
- **Per-market isolation.** Each collateral type has its own price, debt ceiling,
  and liquidation ratio, so risk in one market does not silently spread to another.
- **Upgradeable trust assumptions.** Version 1 uses an authority key for governance
  and a trusted oracle. The config already records an on-chain governance mint so
  later versions can move to token voting without a state migration.

---

## 2. Assets

| Role | Asset | Maker equivalent | Notes |
|---|---|---|---|
| Stablecoin | **toneUSD** | DAI | SPL mint, 6 decimals, peg target 1 USD. Mint authority is the protocol config PDA. |
| Governance | **€BACH** (`BACH`) | MKR | 12 decimals. The on-chain mint is compiled per network (currently devnet); see Appendix B. Recorded in config; not yet used for voting. |

toneUSD has no fixed mint address. It is an SPL mint created during deployment whose
mint authority is transferred to the program's config PDA, then adopted by the
protocol during initialization. The on-chain config stores the chosen mint plus its
display name (`toneUSD`) and symbol (`toneUSD`).

---

## 3. Architecture

The protocol is a single native `solana-program` deployed under the BPF upgradeable
loader. State lives in program-derived accounts (PDAs); collateral tokens live in
SPL token accounts owned by the config PDA. The program never holds keypairs. It
authorizes mints, burns, and collateral transfers by signing for its own PDA with
`invoke_signed`.

### 3.1 Accounts and PDAs

| Account | Seeds | Size (bytes) | Purpose |
|---|---|---|---|
| `ProtocolConfig` | `["config"]` | 162 | Global parameters, authorities, toneUSD mint. One per deployment. |
| `CollateralConfig` | `["collateral", collateral_mint]` | 102 | One per collateral market. Price, ceilings, accounting. |
| `VaultPosition` | `["vault", owner, collateral_mint]` | 90 | One per user per market. Collateral and debt. |

Collateral is pooled per market in a single SPL token account (the "collateral
vault") owned by the config PDA. Individual `VaultPosition` records track each
user's share of that pool against their debt.

### 3.2 ProtocolConfig

| Field | Type | Meaning |
|---|---|---|
| `is_initialized` | bool | Set once during `InitializeProtocol`. |
| `bump` | u8 | Config PDA bump. |
| `governance_mint` | Pubkey | €BACH mint (fixed constant). |
| `stable_mint` | Pubkey | toneUSD mint adopted at init. |
| `governance_authority` | Pubkey | May update risk parameters. |
| `oracle_authority` | Pubkey | May update collateral prices. |
| `stability_fee_bps` | u16 | Annualized simple interest on debt. |
| `liquidation_ratio_bps` | u16 | Global floor for market liquidation ratios. |
| `liquidation_penalty_bps` | u16 | Bonus collateral paid to liquidators. |
| `min_collateral_ratio_bps` | u16 | Minimum ratio required to mint or withdraw. |
| `stablecoin_name` | [u8; 16] | "toneUSD", null-padded. |
| `stablecoin_symbol` | [u8; 8] | "toneUSD", null-padded. |

### 3.3 CollateralConfig

| Field | Type | Meaning |
|---|---|---|
| `is_initialized` | bool | Set once during `InitializeCollateral`. |
| `bump` | u8 | Collateral PDA bump. |
| `collateral_mint` | Pubkey | SPL mint accepted by this market. |
| `collateral_vault` | Pubkey | Protocol-owned token account holding pooled collateral. |
| `price_e6` | u64 | USD price of one whole token, scaled by 1e6. |
| `debt_ceiling` | u64 | Maximum toneUSD that may be minted against this market. |
| `total_debt` | u64 | Outstanding toneUSD debt in this market. |
| `total_collateral` | u64 | Pooled collateral base units. |
| `collateral_decimals` | u8 | Read from the mint at init. |
| `liquidation_ratio_bps` | u16 | Effective ratio: `max(provided, config floor)`. |
| `enabled` | bool | Whether deposits are accepted. |

### 3.4 VaultPosition

| Field | Type | Meaning |
|---|---|---|
| `is_initialized` | bool | Set during `OpenVault`. |
| `bump` | u8 | Vault PDA bump. |
| `owner` | Pubkey | Position owner. |
| `collateral_mint` | Pubkey | Market this vault belongs to. |
| `collateral_amount` | u64 | Collateral base units locked. |
| `debt_amount` | u64 | toneUSD base units owed, including accrued fees. |
| `last_accrual_timestamp` | i64 | Unix time of the last fee accrual. |

---

## 4. Roles and authorities

Version 1 governance is key-based.

- **Governance authority.** Sets and updates global risk parameters through
  `UpdateProtocolRiskParams`. Expected to be a multisig on any real deployment.
- **Oracle authority.** Pushes prices through `UpdateOraclePrice`. Expected to sit
  behind a secured off-chain signer.
- **Config PDA.** The program's own authority. It is the mint authority for toneUSD
  and the owner of every collateral vault. Only the program can move pooled
  collateral or mint toneUSD, and only by signing for this PDA.

---

## 5. Instruction set

The instruction enum is Borsh-encoded with a one-byte variant tag equal to its
index in the list below.

| Tag | Instruction | Caller | Effect |
|---|---|---|---|
| 0 | `InitializeProtocol` | deployer | Creates the config PDA and adopts the toneUSD mint. |
| 1 | `InitializeCollateral` | governance | Registers a collateral market. |
| 2 | `UpdateProtocolRiskParams` | governance authority | Updates fee, ratios, penalty, oracle authority. |
| 3 | `UpdateOraclePrice` | oracle authority | Sets a market's `price_e6`. |
| 4 | `OpenVault` | user | Creates an empty `VaultPosition`. |
| 5 | `DepositCollateral` | user | Transfers collateral into the market vault. |
| 6 | `WithdrawCollateral` | user | Returns collateral if the vault stays healthy. |
| 7 | `MintStablecoin` | user | Mints toneUSD as debt against the vault. |
| 8 | `BurnStablecoin` | user | Burns toneUSD to repay debt. |
| 9 | `LiquidateVault` | anyone | Repays debt of an unhealthy vault for discounted collateral. |

`InitializeProtocol` validates that the supplied toneUSD mint has 6 decimals and a
mint authority equal to the config PDA. It checks the governance mint by public key
only; the account itself is never read, so €BACH does not need to exist on the
target cluster for initialization to succeed.

---

## 6. Risk parameters

All ratios and rates are expressed in basis points (1 bps = 0.01%). The protocol
rejects parameter sets that fall outside these bounds:

| Parameter | Constraint |
|---|---|
| `stability_fee_bps` | ≤ 5000 (≤ 50% per year) |
| `liquidation_ratio_bps` | ≥ 10000 (≥ 100%) |
| `liquidation_penalty_bps` | ≤ 5000 (≤ 50%) |
| `min_collateral_ratio_bps` | ≥ 10000 and ≤ `liquidation_ratio_bps` |

A collateral market sets its own price, debt ceiling, and liquidation ratio at
registration. The market liquidation ratio is raised to the global floor if a lower
value is supplied: `effective = max(provided, config.liquidation_ratio_bps)`. Price
and debt ceiling must both be non-zero.

---

## 7. Core mathematics

All arithmetic is checked and performed in `u128` intermediates to avoid overflow.
Two fixed scales are used: prices and USD values carry six decimals of precision
(`PRICE_SCALE = 1e6`), and toneUSD itself has six decimals, so debt amounts and USD
values share a common unit and compare directly.

### 7.1 Collateral value

The USD value of a vault's collateral, scaled by 1e6:

```
value_e6 = collateral_amount × price_e6 / 10^collateral_decimals
```

### 7.2 Borrowing power

The maximum debt a given collateral value can support at a required ratio:

```
max_debt = value_e6 × 10000 / required_ratio_bps
```

When minting or withdrawing, the required ratio is the stricter of the two
configured ratios:

```
required_ratio = max(collateral.liquidation_ratio_bps, config.min_collateral_ratio_bps)
```

A vault is rejected as under-collateralized if its debt would exceed `max_debt`.

*Example.* 2.0 tokens of a 9-decimal collateral priced at $150 give a value of
$300. At a 150% ratio the vault may carry at most $200 of debt, that is 200 toneUSD.

### 7.3 Collateral ratio

```
ratio_bps = value_e6 × 10000 / debt_amount      (∞ when debt is zero)
```

A vault is liquidatable when its ratio falls below the market's
`liquidation_ratio_bps`.

### 7.4 Stability fee

Debt accrues a simple, non-compounding fee proportional to elapsed time. Fees are
applied lazily whenever a vault is touched (deposit, withdraw, mint, burn, or
liquidate):

```
fee      = debt × stability_fee_bps / 10000 × elapsed_seconds / 31_536_000
new_debt = debt + fee
```

A year is fixed at 31,536,000 seconds (365 days). Accrued fees increase both the
vault's debt and the market's `total_debt`.

*Example.* 1.0 toneUSD of debt at a 5% fee over exactly one year accrues to 1.05 toneUSD.

### 7.5 Liquidation payout

The collateral seized when a liquidator repays `repay_amount` of debt:

```
seized = repay_amount × 10^collateral_decimals × (10000 + penalty_bps) / price_e6 / 10000
```

This returns the repaid USD value converted to collateral units, plus the
liquidation penalty as a bonus.

*Example.* Repaying $50 of debt against collateral priced at $200 with a 13% penalty
seizes 0.2825 tokens, worth $56.50.

---

## 8. Position lifecycle

1. **Open.** `OpenVault` creates an empty `VaultPosition` PDA for the caller and one
   collateral market.
2. **Deposit.** `DepositCollateral` transfers the user's SPL tokens into the
   market's collateral vault. The user signs the transfer.
3. **Mint.** `MintStablecoin` accrues fees, checks the market debt ceiling, verifies
   the post-mint ratio against `max(liquidation_ratio, min_collateral_ratio)`, and
   mints toneUSD to the user. The config PDA signs the mint.
4. **Burn.** `BurnStablecoin` accrues fees and burns toneUSD from the user to reduce
   debt. The user signs the burn.
5. **Withdraw.** `WithdrawCollateral` accrues fees, reduces the locked amount,
   re-checks health, and returns tokens. The config PDA signs the transfer.

A vault may be partially repaid and reused. Collateral can only leave while the
remaining position stays above the required ratio.

---

## 9. Liquidation

Anyone may liquidate a vault whose collateral ratio has fallen below the market
liquidation ratio. The liquidator:

1. Repays up to the vault's outstanding debt by burning their own toneUSD.
2. Receives the corresponding collateral plus the liquidation penalty, capped at
   the vault's available collateral.

The vault's debt and collateral are reduced accordingly, as is the market's
accounting. Healthy vaults cannot be liquidated; the attempt fails with
`VaultHealthy`. The penalty is the liquidator's incentive and the protocol's first
line of defense against bad debt.

---

## 10. Oracle model

Each market stores a single `price_e6`, the USD price of one whole collateral token
scaled by 1e6. The oracle authority updates it through `UpdateOraclePrice`. There is
no on-chain aggregation, staleness check, or deviation bound in version 1. Price
integrity rests entirely on the oracle authority, which should be operated behind a
secured signer or multisig and refreshed frequently enough that liquidations stay
solvent.

---

## 11. Security model and trust assumptions

- **Authority-based governance.** A compromised governance authority can change risk
  parameters; a compromised oracle authority can misprice collateral and trigger or
  prevent liquidations. Both should be multisigs or HSM-backed signers.
- **No price safety rails.** There is no oracle staleness or deviation guard, so a
  stale or manipulated price can produce unfair liquidations or under-collateralized
  mints.
- **Simple, non-compounding fees.** The stability fee is linear and only accrues on
  interaction. A dormant vault accrues no fee until it is next touched.
- **Checked arithmetic.** Every arithmetic path uses checked operations and returns
  `MathOverflow` rather than wrapping.
- **No global debt ceiling or surplus buffer.** Risk is bounded per market by its
  own debt ceiling. There is no system-wide ceiling, no debt auction, and no surplus
  or reserve in version 1.

### Error surface

The program returns typed errors including `InvalidPda`, `Unauthorized`,
`AlreadyInitialized`, `Uninitialized`, `InvalidMint`, `InvalidTokenAccount`,
`VaultHealthy`, `InsufficientCollateral`, `CollateralDisabled`,
`InvalidRiskParameter`, and `MathOverflow`.

---

## 12. Limitations and roadmap

Version 1 is intentionally narrow. Known gaps and likely future work:

- **Token-based governance.** Move from an authority key to €BACH vote-escrow or
  token voting. The governance mint is already recorded on-chain for this.
- **Oracle hardening.** Add staleness windows, deviation bounds, and aggregation
  across multiple price feeds.
- **Monetary tooling.** A savings rate for toneUSD holders, a peg-stability module, a
  surplus buffer, and debt auctions for handling shortfalls.
- **Global risk controls.** A system-wide debt ceiling and emergency shutdown path.
- **Compounding fees.** Replace linear accrual with a per-second compounding rate
  index.

---

## 13. Deployment

The program is a Cargo workspace member built to a BPF/SBF shared object with
`cargo-build-sbf`. Bootstrapping a usable deployment requires, in order: create the
toneUSD mint with 6 decimals and mint authority set to the config PDA, call
`InitializeProtocol`, then register collateral markets with `InitializeCollateral`.

| Network | Program ID |
|---|---|
| Solana devnet | `yh9n52WPmWJBYTsBU1kBYfLSuxWY8zZTUPbjDB6d7wc` |

---

## Appendix A. Maker mapping

| MakerDAO | Bach Money |
|---|---|
| DAI | toneUSD |
| MKR | €BACH |
| Vault / CDP | `VaultPosition` |
| Collateral type (ilk) | `CollateralConfig` |
| Liquidation ratio | `liquidation_ratio_bps` |
| Liquidation penalty | `liquidation_penalty_bps` |
| Stability fee | `stability_fee_bps` |
| Debt ceiling | `debt_ceiling` |

## Appendix B. Constants

| Constant | Value |
|---|---|
| Config seed | `"config"` |
| Collateral seed | `"collateral"` |
| Vault seed | `"vault"` |
| toneUSD decimals | 6 |
| Stablecoin name / symbol | `toneUSD` / `toneUSD` |
| Governance mint (€BACH / BACH) — mainnet-beta | `CTQBjyrX8pYyqbNa8vAhQfnRXfu9cUxnvrxj5PvbzTmf` |
| Governance mint — devnet | `DENNuKzCcrLhEtxZ8tm7nSeef8qvKgGGrdxX6euNkNS7` |
| Governance mint — testnet | `A6a2s9LTZcYZQgxrDatLHYfvHhJEfb5ZWuFENhHtxJtR` |
| BPS denominator | 10000 |
| Price scale | 1000000 |
| Seconds per year | 31536000 |
