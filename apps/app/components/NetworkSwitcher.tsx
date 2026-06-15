"use client";

import { clusterLabel, isCluster } from "@/lib/solana/config";
import { useNetwork } from "@/lib/solana/network";

/**
 * Lets the user switch the active Solana cluster (devnet / testnet). Styled to
 * read like the old network badge, but it's a real control. The choice is
 * persisted and rewires the RPC connection + all on-chain addresses live.
 */
export function NetworkSwitcher({ className = "" }: { className?: string }) {
  const { cluster, setCluster, clusters } = useNetwork();

  return (
    <label
      className={`label relative inline-flex items-center rounded-full border border-border pl-2 pr-5 py-0.5 transition-colors hover:bg-surface-2 ${className}`}
    >
      <span className="sr-only">Network</span>
      <select
        value={cluster}
        onChange={(e) => {
          if (isCluster(e.target.value)) setCluster(e.target.value);
        }}
        className="cursor-pointer appearance-none bg-transparent pr-1 text-inherit focus:outline-none"
      >
        {clusters.map((c) => (
          <option key={c} value={c}>
            {clusterLabel(c)}
          </option>
        ))}
      </select>
      <span
        aria-hidden
        className="pointer-events-none absolute right-2 text-[0.6rem] opacity-60"
      >
        ▾
      </span>
    </label>
  );
}
