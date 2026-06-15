"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_CLUSTER,
  SUPPORTED_CLUSTERS,
  getNetwork,
  isCluster,
  type Cluster,
  type ResolvedNetwork,
} from "./config";

const STORAGE_KEY = "bach.cluster";

type NetworkContextValue = {
  cluster: Cluster;
  setCluster: (cluster: Cluster) => void;
  clusters: readonly Cluster[];
  network: ResolvedNetwork;
};

const NetworkContext = createContext<NetworkContextValue | null>(null);

export function NetworkProvider({ children }: { children: ReactNode }) {
  // Start from the env default so server and first client render match (no
  // hydration mismatch); adopt the saved choice after mount.
  const [cluster, setClusterState] = useState<Cluster>(DEFAULT_CLUSTER);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (isCluster(saved) && saved !== cluster) setClusterState(saved);
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setCluster = useCallback((next: Cluster) => {
    setClusterState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const value = useMemo<NetworkContextValue>(
    () => ({
      cluster,
      setCluster,
      clusters: SUPPORTED_CLUSTERS,
      network: getNetwork(cluster),
    }),
    [cluster, setCluster],
  );

  return (
    <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>
  );
}

export function useNetwork(): NetworkContextValue {
  const ctx = useContext(NetworkContext);
  if (!ctx) {
    throw new Error("useNetwork must be used within a NetworkProvider");
  }
  return ctx;
}
