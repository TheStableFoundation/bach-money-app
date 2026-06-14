# @bach-money/scripts

Operational scripts for the Bach Money protocol.

## bootstrap-devnet.ts

Takes a freshly deployed program and brings the protocol to a usable state:
creates the toneUSD stablecoin mint, initializes the protocol config, registers a
test collateral market, and funds the payer with test collateral so vaults can
be exercised end to end.

The two `Initialize*` instructions are built by hand here because the SDK does
not ship builders for them yet. The layouts mirror `protocol/src/instruction.rs`
and the account orderings mirror `protocol/src/processor.rs`.

### Prerequisites

- The program is deployed to devnet (`yh9n52WPmWJBYTsBU1kBYfLSuxWY8zZTUPbjDB6d7wc`).
- The fee-payer keypair has some devnet SOL (a few tenths of a SOL is plenty).

### Run

```bash
pnpm install                                   # from the repo root, once
pnpm --filter @bach-money/scripts bootstrap:devnet
```

### What it does

1. Create the toneUSD mint (6 decimals, mint authority = config PDA).
2. `InitializeProtocol` with default risk params (2.5% fee, 150% liquidation).
3. Create a test collateral mint (9 decimals, authority kept by the payer).
4. Create the protocol-owned collateral vault (ATA owned by the config PDA).
5. `InitializeCollateral` (price $100, 1,000,000 toneUSD ceiling, 150% ratio).
6. Mint 1,000 test collateral tokens to the payer.

It is idempotent: re-running skips on-chain state that already exists and reuses
mints recorded in `bootstrap-output.devnet.json`.

### Environment overrides

| Variable          | Default                                   |
| ----------------- | ----------------------------------------- |
| `RPC_URL`         | `clusterApiUrl("devnet")`                 |
| `KEYPAIR_PATH`    | `~/.config/solana/main_0.json`            |
| `PROGRAM_ID`      | the devnet deployment                     |
| `TONEUSD_MINT`      | reuse an existing toneUSD mint              |
| `COLLATERAL_MINT` | reuse an existing collateral mint         |

The printed addresses (config PDA, toneUSD mint, collateral mint, collateral PDA,
collateral vault) are what you feed into `@bach-money/sdk` to open and operate a
vault.
