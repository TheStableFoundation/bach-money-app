# @bach-money/scripts

Operational scripts for the Bach Money protocol. Every script targets a single
cluster, chosen by the `CLUSTER` env var (`devnet` or `testnet`, default
`devnet`). The npm scripts set it for you (`:devnet` / `:testnet` variants), and
shared resolution lives in `networks.ts`.

## bootstrap.ts

Takes a freshly deployed program and brings the protocol to a usable state:
creates the toneUSD stablecoin mint, initializes the protocol config, registers a
test collateral market, and funds the payer with test collateral so vaults can
be exercised end to end.

The two `Initialize*` instructions are built by hand here because the SDK does
not ship builders for them yet. The layouts mirror `protocol/src/instruction.rs`
and the account orderings mirror `protocol/src/processor.rs`.

### Prerequisites

- The program is deployed to the target cluster. It is deployed from one program
  keypair, so its id is the same on devnet and testnet
  (`yh9n52WPmWJBYTsBU1kBYfLSuxWY8zZTUPbjDB6d7wc`).
- The fee-payer keypair has some SOL on that cluster (a few tenths of a SOL is
  plenty; `solana airdrop` works on devnet, the testnet faucet on testnet).

### Run

```bash
pnpm install                                          # from the repo root, once
pnpm --filter @bach-money/scripts bootstrap:devnet
pnpm --filter @bach-money/scripts bootstrap:testnet
```

### What it does

1. Create the toneUSD mint (6 decimals, mint authority = config PDA).
2. `InitializeProtocol` with default risk params (2.5% fee, 150% liquidation).
3. Create a test collateral mint (9 decimals, authority kept by the payer).
4. Create the protocol-owned collateral vault (ATA owned by the config PDA).
5. `InitializeCollateral` (price $100, 1,000,000 toneUSD ceiling, 150% ratio).
6. Mint 1,000 test collateral tokens to the payer.

It is idempotent: re-running skips on-chain state that already exists and reuses
mints recorded per cluster in `bootstrap-output.<cluster>.json`.

The toneUSD and collateral mints are new on each cluster. After bootstrapping
testnet, feed the printed mints to the frontend (see "Wiring the frontend").

### Environment overrides

Shared across all scripts (see `networks.ts`):

| Variable          | Default                                       |
| ----------------- | --------------------------------------------- |
| `CLUSTER`         | `devnet`                                      |
| `RPC_URL`         | `clusterApiUrl(CLUSTER)`                       |
| `KEYPAIR_PATH`    | `~/.config/solana/main_0.json`                |
| `PROGRAM_ID`      | the shared deployment id                       |
| `GOVERNANCE_MINT` | the constant from `protocol/src/lib.rs`        |

Bootstrap-specific:

| Variable             | Default                                    |
| -------------------- | ------------------------------------------ |
| `TONEUSD_MINT`       | reuse an existing toneUSD mint              |
| `COLLATERAL_MINT`    | reuse an existing collateral mint          |
| `INIT_PROTOCOL_ONLY` | set to `1` to stop after InitializeProtocol |

## vault-smoke.ts / liquidation-smoke.ts

End-to-end checks against the live program using the same SDK as the frontend.
`smoke` runs open -> deposit -> mint -> repay -> withdraw on the bootstrapped
market; `liquidation` spins up a throwaway collateral market and proves
`liquidateVault`. Both read the cluster's mints from
`bootstrap-output.<cluster>.json` (or `TONEUSD_MINT` / `COLLATERAL_MINT`).

```bash
pnpm --filter @bach-money/scripts smoke:devnet
pnpm --filter @bach-money/scripts smoke:testnet
pnpm --filter @bach-money/scripts liquidation:devnet
pnpm --filter @bach-money/scripts liquidation:testnet
```

## setup-faucet.ts

Moves the collateral mint's authority to a dedicated, gitignored faucet keypair
(`.faucet-keypair.<cluster>.json`) so the app's `/api/faucet` route can hand out
test collateral. Prints `FAUCET_SECRET_KEY` for `apps/app/.env.local`.

```bash
pnpm --filter @bach-money/scripts setup-faucet:devnet
pnpm --filter @bach-money/scripts setup-faucet:testnet
```

## Wiring the frontend

Both clusters are baked into `apps/app/lib/solana/config.ts`, and the user
switches between them at runtime with the network selector in the header (the
choice is saved to `localStorage`). `NEXT_PUBLIC_SOLANA_CLUSTER` only sets the
cluster shown on first load (defaults to `devnet`).

Everything else is optional and per-cluster:

```dotenv
# default cluster on first visit (devnet | testnet)
NEXT_PUBLIC_SOLANA_CLUSTER=devnet

# private RPCs — strongly recommended, the public ones are rate-limited
NEXT_PUBLIC_SOLANA_RPC_URL_DEVNET=<private devnet RPC>
NEXT_PUBLIC_SOLANA_RPC_URL_TESTNET=<private testnet RPC>

# faucet authorities, one per cluster (from setup-faucet:<cluster>)
FAUCET_SECRET_KEY_DEVNET=<from setup-faucet:devnet>
FAUCET_SECRET_KEY_TESTNET=<from setup-faucet:testnet>

# only if a cluster is re-bootstrapped with fresh mints
NEXT_PUBLIC_TONEUSD_MINT=<testnet toneUSD mint>
NEXT_PUBLIC_COLLATERAL_MINT=<testnet collateral mint>
```

`FAUCET_SECRET_KEY` (no suffix) still works as the devnet key for back-compat.
