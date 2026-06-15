"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import {
  getAccount,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import {
  BachMoneyClient,
  type CollateralConfig,
  type ProtocolConfig,
  type VaultPosition,
} from "@bach-money/sdk";
import {
  PROGRAM_ID,
  COLLATERAL_MINT,
  TOKENS,
  NETWORK_LABEL,
  explorerAddress,
  explorerTx,
  shortAddress,
} from "@/lib/solana/config";
import {
  formatToken,
  formatUnits,
  formatUsd,
  parseUnits,
  isValidAmount,
} from "@/lib/format/token";
import { WalletButton } from "@/components/WalletButton";
import { FaucetButton } from "@/components/FaucetButton";
import {
  buildOpenVaultTx,
  buildDepositTx,
  buildWithdrawTx,
  buildMintTx,
  buildBurnTx,
} from "@/lib/solana/tx";

type Balances = { sol: bigint; toneUSD: bigint; collateral: bigint };
type Status =
  | { kind: "ok"; signature: string; label: string }
  | { kind: "error"; message: string }
  | null;

type Action = "deposit" | "mint" | "repay" | "withdraw";

const POW10 = (d: number) => 10n ** BigInt(d);

export function VaultDashboard() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();

  const client = useMemo(
    () => new BachMoneyClient(connection, PROGRAM_ID),
    [connection],
  );

  const [config, setConfig] = useState<ProtocolConfig | null>(null);
  const [market, setMarket] = useState<CollateralConfig | null>(null);
  const [vault, setVault] = useState<VaultPosition | null>(null);
  const [balances, setBalances] = useState<Balances | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cfg, mkt] = await Promise.all([
        client.fetchProtocolConfig(),
        client.fetchCollateralConfig(COLLATERAL_MINT),
      ]);
      setConfig(cfg);
      setMarket(mkt);

      if (publicKey) {
        const [vlt, bal] = await Promise.all([
          client.fetchVaultPosition(publicKey, COLLATERAL_MINT),
          loadBalances(connection, publicKey),
        ]);
        setVault(vlt);
        setBalances(bal);
      } else {
        setVault(null);
        setBalances(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [client, connection, publicKey]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const run = useCallback(
    async (label: string, build: () => Promise<import("@solana/web3.js").Transaction>) => {
      if (!publicKey) return;
      setBusy(label);
      setStatus(null);
      try {
        const tx = await build();
        const signature = await sendTransaction(tx, connection);
        const latest = await connection.getLatestBlockhash();
        await connection.confirmTransaction(
          { signature, ...latest },
          "confirmed",
        );
        setStatus({ kind: "ok", signature, label });
        await refresh();
      } catch (e) {
        setStatus({ kind: "error", message: humanError(e) });
      } finally {
        setBusy(null);
      }
    },
    [publicKey, sendTransaction, connection, refresh],
  );

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-5xl px-6 pb-24 pt-10 sm:px-8">
        <h1 className="text-2xl font-semibold tracking-tight">Vault</h1>
        <p className="mt-1 text-sm text-muted">
          Lock collateral and mint toneUSD on Solana {NETWORK_LABEL.toLowerCase()}.
        </p>

        {error && (
          <Banner kind="error">
            Could not read the protocol: {error}. The public{" "}
            {NETWORK_LABEL.toLowerCase()} RPC is rate-limited; set
            NEXT_PUBLIC_SOLANA_RPC_URL to a private endpoint.
          </Banner>
        )}

        {!loading && config === null && !error && (
          <Banner kind="warn">
            The protocol is not initialized on this cluster.
          </Banner>
        )}

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          <ProtocolCard config={config} loading={loading} />
          <MarketCard market={market} loading={loading} />
        </div>

        <div className="mt-6">
          {!publicKey ? (
            <ConnectPrompt />
          ) : (
            <VaultPanel
              client={client}
              market={market}
              config={config}
              vault={vault}
              balances={balances}
              busy={busy}
              status={status}
              owner={publicKey}
              onRefresh={refresh}
              onOpen={() =>
                run("open", () => buildOpenVaultTx(publicKey))
              }
              onAction={(action, amount) => {
                if (!market) return;
                const dec =
                  action === "mint" || action === "repay"
                    ? TOKENS.toneUSD.decimals
                    : TOKENS.collateral.decimals;
                const base = parseUnits(amount, dec);
                if (action === "deposit")
                  return run("deposit", () =>
                    buildDepositTx(publicKey, market.collateralVault, base),
                  );
                if (action === "withdraw")
                  return run("withdraw", () =>
                    buildWithdrawTx(publicKey, market.collateralVault, base),
                  );
                if (action === "mint")
                  return run("mint", () =>
                    buildMintTx(connection, publicKey, base),
                  );
                return run("repay", () => buildBurnTx(publicKey, base));
              }}
            />
          )}
        </div>
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

function Header() {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4 sm:px-8">
        <div className="flex items-center gap-3">
          <span className="text-base font-semibold tracking-tight">
            Bach Money
          </span>
          <span className="label rounded-full border border-border px-2 py-0.5">
            {NETWORK_LABEL}
          </span>
        </div>
        <WalletButton />
      </div>
    </header>
  );
}

// ---------------------------------------------------------------------------
// Protocol + market cards
// ---------------------------------------------------------------------------

function ProtocolCard({
  config,
  loading,
}: {
  config: ProtocolConfig | null;
  loading: boolean;
}) {
  return (
    <Card title="Protocol">
      {loading && !config ? (
        <Skeleton rows={4} />
      ) : config ? (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
          <Stat label="Stablecoin" value={config.stablecoinSymbol} />
          <Stat
            label="Stability fee"
            value={`${(config.stabilityFeeBps / 100).toFixed(2)}%`}
          />
          <Stat
            label="Liquidation ratio"
            value={`${(config.liquidationRatioBps / 100).toFixed(0)}%`}
          />
          <Stat
            label="Min. ratio"
            value={`${(config.minCollateralRatioBps / 100).toFixed(0)}%`}
          />
          <Stat
            label="toneUSD mint"
            value={
              <AddressLink address={config.stableMint} />
            }
          />
          <Stat
            label="BACH governance"
            value={<AddressLink address={config.governanceMint} />}
          />
        </dl>
      ) : (
        <Empty>Not initialized.</Empty>
      )}
    </Card>
  );
}

function MarketCard({
  market,
  loading,
}: {
  market: CollateralConfig | null;
  loading: boolean;
}) {
  const utilization =
    market && market.debtCeiling > 0n
      ? Number((market.totalDebt * 10000n) / market.debtCeiling) / 100
      : 0;

  return (
    <Card title="Collateral market">
      {loading && !market ? (
        <Skeleton rows={4} />
      ) : market ? (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
          <Stat label="Collateral" value={TOKENS.collateral.symbol} />
          <Stat label="Oracle price" value={formatUsd(market.priceE6)} />
          <Stat
            label="Total collateral"
            value={formatUnits(
              market.totalCollateral,
              market.collateralDecimals,
              { maxFractionDigits: 2 },
            )}
          />
          <Stat
            label="Total debt"
            value={formatToken(market.totalDebt, TOKENS.toneUSD, {
              maxFractionDigits: 2,
            })}
          />
          <Stat
            label="Debt ceiling"
            value={formatToken(market.debtCeiling, TOKENS.toneUSD, {
              maxFractionDigits: 0,
            })}
          />
          <Stat label="Utilization" value={`${utilization.toFixed(1)}%`} />
        </dl>
      ) : (
        <Empty>No collateral market registered.</Empty>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Vault panel (wallet connected)
// ---------------------------------------------------------------------------

function VaultPanel({
  client,
  market,
  config,
  vault,
  balances,
  busy,
  status,
  owner,
  onRefresh,
  onOpen,
  onAction,
}: {
  client: BachMoneyClient;
  market: CollateralConfig | null;
  config: ProtocolConfig | null;
  vault: VaultPosition | null;
  balances: Balances | null;
  busy: string | null;
  status: Status;
  owner: PublicKey;
  onRefresh: () => Promise<void>;
  onOpen: () => void;
  onAction: (action: Action, amount: string) => void;
}) {
  if (!market || !config) {
    return (
      <Card title="Your position">
        <Empty>Waiting for protocol data…</Empty>
      </Card>
    );
  }

  const collValueE6 = vault
    ? (vault.collateralAmount * market.priceE6) /
      POW10(market.collateralDecimals)
    : 0n;
  const ratio =
    vault && vault.debtAmount > 0n ? client.collateralRatio(vault, market) : null;
  const requiredBps = Math.max(
    market.liquidationRatioBps,
    config.minCollateralRatioBps,
  );
  const maxDebt = (collValueE6 * 10000n) / BigInt(requiredBps);
  const available =
    vault && maxDebt > vault.debtAmount ? maxDebt - vault.debtAmount : 0n;
  const liqPriceE6 =
    vault && vault.debtAmount > 0n && vault.collateralAmount > 0n
      ? (BigInt(market.liquidationRatioBps) *
          vault.debtAmount *
          POW10(market.collateralDecimals)) /
        (vault.collateralAmount * 10000n)
      : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <Card
        title="Your position"
        aside={
          <div className="flex items-center gap-4">
            <Balances balances={balances} />
            <FaucetButton owner={owner} onDone={onRefresh} />
          </div>
        }
      >
        {!vault ? (
          <div className="flex flex-col items-start gap-4">
            <Empty>No vault yet for this market.</Empty>
            <Button onClick={onOpen} busy={busy === "open"} variant="primary">
              Open vault
            </Button>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex items-baseline justify-between">
              <span className="label">Health</span>
              <HealthBadge
                ratio={ratio}
                liquidationBps={market.liquidationRatioBps}
                requiredBps={requiredBps}
              />
            </div>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
              <Stat
                label="Collateral"
                value={formatUnits(
                  vault.collateralAmount,
                  market.collateralDecimals,
                  { maxFractionDigits: 4 },
                )}
                sub={formatUsd(collValueE6)}
              />
              <Stat
                label="Debt"
                value={formatToken(vault.debtAmount, TOKENS.toneUSD, {
                  maxFractionDigits: 2,
                })}
              />
              <Stat
                label="Available to mint"
                value={formatToken(available, TOKENS.toneUSD, {
                  maxFractionDigits: 2,
                })}
              />
              <Stat
                label="Liquidation price"
                value={liqPriceE6 !== null ? formatUsd(liqPriceE6) : "—"}
              />
            </dl>
          </div>
        )}
      </Card>

      <ActionCard
        disabled={!vault}
        busy={busy}
        status={status}
        balances={balances}
        vault={vault}
        available={available}
        onAction={onAction}
      />
    </div>
  );
}

function Balances({ balances }: { balances: Balances | null }) {
  if (!balances) return null;
  return (
    <div className="flex gap-4 text-right">
      <MiniStat label="SOL" value={formatUnits(balances.sol, 9, { maxFractionDigits: 3 })} />
      <MiniStat
        label="toneUSD"
        value={formatUnits(balances.toneUSD, TOKENS.toneUSD.decimals, {
          maxFractionDigits: 2,
        })}
      />
      <MiniStat
        label={TOKENS.collateral.symbol}
        value={formatUnits(balances.collateral, TOKENS.collateral.decimals, {
          maxFractionDigits: 2,
        })}
      />
    </div>
  );
}

const ACTIONS: { id: Action; label: string }[] = [
  { id: "deposit", label: "Deposit" },
  { id: "mint", label: "Mint" },
  { id: "repay", label: "Repay" },
  { id: "withdraw", label: "Withdraw" },
];

function ActionCard({
  disabled,
  busy,
  status,
  balances,
  vault,
  available,
  onAction,
}: {
  disabled: boolean;
  busy: string | null;
  status: Status;
  balances: Balances | null;
  vault: VaultPosition | null;
  available: bigint;
  onAction: (action: Action, amount: string) => void;
}) {
  const [action, setAction] = useState<Action>("deposit");
  const [amount, setAmount] = useState("");

  const token =
    action === "mint" || action === "repay"
      ? TOKENS.toneUSD
      : TOKENS.collateral;

  const max = (() => {
    if (!vault) return 0n;
    switch (action) {
      case "deposit":
        return balances?.collateral ?? 0n;
      case "withdraw":
        return vault.collateralAmount;
      case "mint":
        return available;
      case "repay":
        return min(vault.debtAmount, balances?.toneUSD ?? 0n);
    }
  })();

  const valid = isValidAmount(amount, token.decimals, max);
  const actionBusy = busy === action;

  return (
    <Card title="Actions">
      <div
        className="grid grid-cols-4 gap-1 rounded-lg bg-surface-2 p-1"
        role="tablist"
      >
        {ACTIONS.map((a) => (
          <button
            key={a.id}
            role="tab"
            aria-selected={action === a.id}
            onClick={() => {
              setAction(a.id);
              setAmount("");
            }}
            className={`rounded-md px-2 py-1.5 text-sm font-medium transition-colors ${
              action === a.id
                ? "bg-surface text-ink shadow-sm"
                : "text-muted hover:text-ink"
            }`}
          >
            {a.label}
          </button>
        ))}
      </div>

      <div className="mt-5">
        <div className="flex items-end justify-between">
          <label className="label" htmlFor="amount">
            Amount
          </label>
          <button
            className="label hover:text-ink"
            onClick={() =>
              setAmount(formatUnits(max, token.decimals, { group: false }))
            }
            disabled={disabled}
          >
            Max {formatUnits(max, token.decimals, { maxFractionDigits: 4 })}
          </button>
        </div>
        <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-border bg-surface px-3 focus-within:border-accent">
          <input
            id="amount"
            inputMode="decimal"
            placeholder="0.0"
            value={amount}
            disabled={disabled}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
            className="num h-11 w-full bg-transparent text-lg outline-none placeholder:text-muted/60 disabled:opacity-50"
          />
          <span className="text-sm font-medium text-muted">{token.symbol}</span>
        </div>
      </div>

      <Button
        className="mt-5 w-full"
        variant="primary"
        disabled={disabled || !valid}
        busy={actionBusy}
        onClick={() => onAction(action, amount)}
      >
        {labelFor(action)}
      </Button>

      {status && (
        <div className="mt-4">
          {status.kind === "ok" ? (
            <Banner kind="ok">
              {capitalize(status.label)} confirmed.{" "}
              <a
                className="underline underline-offset-2"
                href={explorerTx(status.signature)}
                target="_blank"
                rel="noreferrer"
              >
                View transaction
              </a>
            </Banner>
          ) : (
            <Banner kind="error">{status.message}</Banner>
          )}
        </div>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

function Card({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-surface p-6">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="label">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
}) {
  return (
    <div>
      <dt className="label">{label}</dt>
      <dd className="num mt-1 text-lg font-medium tracking-tight">{value}</dd>
      {sub && <div className="num text-xs text-muted">{sub}</div>}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="label">{label}</div>
      <div className="num text-sm font-medium">{value}</div>
    </div>
  );
}

function HealthBadge({
  ratio,
  liquidationBps,
  requiredBps,
}: {
  ratio: number | null;
  liquidationBps: number;
  requiredBps: number;
}) {
  if (ratio === null)
    return <span className="text-sm text-muted">No debt</span>;
  const bps = ratio * 10000;
  const tone =
    bps < liquidationBps
      ? "danger"
      : bps < requiredBps
        ? "warn"
        : "positive";
  const text =
    tone === "danger"
      ? "At risk"
      : tone === "warn"
        ? "Thin"
        : "Healthy";
  const color =
    tone === "danger"
      ? "text-danger"
      : tone === "warn"
        ? "text-warn"
        : "text-positive";
  return (
    <span className={`num text-sm font-medium ${color}`}>
      {(ratio * 100).toFixed(0)}% · {text}
    </span>
  );
}

function Button({
  children,
  onClick,
  busy,
  disabled,
  variant = "default",
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  busy?: boolean;
  disabled?: boolean;
  variant?: "default" | "primary";
  className?: string;
}) {
  const base =
    "inline-flex h-11 items-center justify-center rounded-lg px-5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40";
  const styles =
    variant === "primary"
      ? "bg-ink text-bg hover:bg-accent-ink"
      : "border border-border bg-surface text-ink hover:bg-surface-2";
  return (
    <button
      onClick={onClick}
      disabled={disabled || busy}
      className={`${base} ${styles} ${className}`}
    >
      {busy ? "Confirming…" : children}
    </button>
  );
}

function AddressLink({ address }: { address: PublicKey }) {
  return (
    <a
      className="mono text-sm font-normal text-accent hover:underline"
      href={explorerAddress(address)}
      target="_blank"
      rel="noreferrer"
    >
      {shortAddress(address)}
    </a>
  );
}

function Banner({
  kind,
  children,
}: {
  kind: "ok" | "warn" | "error";
  children: React.ReactNode;
}) {
  const color =
    kind === "ok"
      ? "border-positive/30 text-positive"
      : kind === "warn"
        ? "border-warn/30 text-warn"
        : "border-danger/30 text-danger";
  return (
    <div
      className={`mt-4 rounded-lg border bg-surface px-4 py-3 text-sm ${color}`}
    >
      {children}
    </div>
  );
}

function ConnectPrompt() {
  return (
    <Card title="Your position">
      <div className="flex flex-col items-start gap-4 py-2">
        <p className="text-sm text-muted">
          Connect a Solana wallet (set to {NETWORK_LABEL.toLowerCase()}) to open
          a vault and mint toneUSD.
        </p>
        <WalletButton />
      </div>
    </Card>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted">{children}</p>;
}

function Skeleton({ rows }: { rows: number }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {Array.from({ length: rows * 2 }).map((_, i) => (
        <div key={i} className="h-9 animate-pulse rounded bg-surface-2" />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function loadBalances(
  connection: import("@solana/web3.js").Connection,
  owner: PublicKey,
): Promise<Balances> {
  const sol = BigInt(await connection.getBalance(owner));
  const [toneUSD, collateral] = await Promise.all([
    tokenBalance(connection, owner, TOKENS.toneUSD.mint),
    tokenBalance(connection, owner, TOKENS.collateral.mint),
  ]);
  return { sol, toneUSD, collateral };
}

async function tokenBalance(
  connection: import("@solana/web3.js").Connection,
  owner: PublicKey,
  mint: PublicKey,
): Promise<bigint> {
  try {
    const ata = getAssociatedTokenAddressSync(mint, owner);
    const account = await getAccount(connection, ata);
    return account.amount;
  } catch {
    return 0n; // account not created yet
  }
}

function min(a: bigint, b: bigint): bigint {
  return a < b ? a : b;
}

function labelFor(action: Action): string {
  switch (action) {
    case "deposit":
      return "Deposit collateral";
    case "mint":
      return "Mint toneUSD";
    case "repay":
      return "Repay toneUSD";
    case "withdraw":
      return "Withdraw collateral";
  }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function humanError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/insufficient/i.test(msg)) return "Insufficient collateral for this action.";
  if (/0x1\b|insufficient funds/i.test(msg)) return "Insufficient funds.";
  if (/User rejected|rejected the request/i.test(msg))
    return "Transaction rejected in wallet.";
  return msg;
}
