"use client";

import { useState } from "react";
import type { PublicKey } from "@solana/web3.js";

export function FaucetButton({
  owner,
  onDone,
}: {
  owner: PublicKey;
  onDone: () => void | Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function request() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/faucet", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ owner: owner.toBase58() }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "faucet request failed");
      await onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={request}
      disabled={busy}
      title={error ?? "Mint test collateral to your wallet"}
      className="inline-flex h-8 items-center justify-center rounded-md border border-border px-3 text-xs font-medium text-ink transition-colors hover:bg-surface-2 disabled:opacity-40"
    >
      {busy ? "Requesting…" : error ? "Faucet error" : "Get test collateral"}
    </button>
  );
}
