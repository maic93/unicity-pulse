import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";

import { useSettings } from "@/lib/settings";
import * as sdk from "./client";
import type { SendParams, SphereIdentity, SphereNetworkInfo } from "./types";

interface SphereContextValue {
  identity: SphereIdentity | null;
  network: SphereNetworkInfo | null;
  transport: string | null;
  sessionId: string | null;
  connectedAt: number | null;
  permissions: string[];
  walletProtocol: string | null;
  /** Wallet is locked — the session is still alive, requests are refused. */
  isLocked: boolean;
  /** Wallet is on a different network than this dApp targets. */
  isNetworkMismatch: boolean;
  isConnecting: boolean;
  isConnected: boolean;
  /** Last connection error, already translated to a human message. */
  lastError: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}

const SphereContext = createContext<SphereContextValue | null>(null);

export function SphereProvider({ children }: { children: ReactNode }) {
  const [identity, setIdentity] = useState<SphereIdentity | null>(null);
  const [network, setNetwork] = useState<SphereNetworkInfo | null>(null);
  const [transport, setTransport] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [connectedAt, setConnectedAt] = useState<number | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [walletProtocol, setWalletProtocol] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [isNetworkMismatch, setIsNetworkMismatch] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const attemptedResume = useRef(false);
  const queryClient = useQueryClient();

  const applySession = useCallback(() => {
    setIdentity(sdk.getIdentitySync());
    setNetwork(sdk.getNetworkSync());
    setTransport(sdk.getTransportSync());
    setSessionId(sdk.getSessionIdSync());
    setConnectedAt(sdk.getConnectedAtSync());
    setPermissions(sdk.getPermissionsSync());
    setWalletProtocol(sdk.getWalletProtocolSync());
    setIsLocked(sdk.isLockedSync());
    setIsNetworkMismatch(sdk.isNetworkMismatchSync());
  }, []);

  const clearSession = useCallback(() => {
    setIdentity(null);
    setNetwork(null);
    setTransport(null);
    setSessionId(null);
    setConnectedAt(null);
    setPermissions([]);
    setWalletProtocol(null);
    setIsLocked(false);
    setIsNetworkMismatch(false);
  }, []);

  // Silent session resume on load (no wallet UI is shown).
  useEffect(() => {
    if (attemptedResume.current) return;
    attemptedResume.current = true;
    void (async () => {
      setIsConnecting(true);
      try {
        await sdk.reconnectWallet();
        applySession();
      } finally {
        setIsConnecting(false);
      }
    })();
  }, [applySession]);

  // Wallet lifecycle: lock, unlock, revoked session, identity change, activity.
  useEffect(() => {
    return sdk.onSphereLifecycle((event) => {
      switch (event.type) {
        case "locked":
          setIsLocked(true);
          toast.warning("Sphere wallet locked — unlock it to keep querying.");
          break;
        case "unlocked":
          setIsLocked(false);
          applySession();
          toast.success("Sphere wallet unlocked");
          void queryClient.invalidateQueries();
          break;
        case "disconnected":
          clearSession();
          queryClient.clear();
          toast.error("Wallet session ended. Reconnect to continue.");
          break;
        case "identityChanged":
          applySession();
          toast("Active wallet identity changed");
          void queryClient.invalidateQueries();
          break;
        case "activity":
          void queryClient.invalidateQueries({ queryKey: ["sphere"] });
          break;
      }
    });
  }, [applySession, clearSession, queryClient]);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setLastError(null);
    try {
      await sdk.connectWallet();
      applySession();
      if (sdk.isNetworkMismatchSync()) {
        toast.warning(
          `Wallet is on network ${sdk.getNetworkSync()?.name ?? "unknown"} — this app targets ${sdk.TESTNET_NETWORK.name}.`,
        );
      } else if (sdk.isLockedSync()) {
        toast.warning("Connected, but the Sphere wallet is locked.");
      } else {
        toast.success("Wallet connected");
      }
      await queryClient.invalidateQueries();
    } catch (err) {
      const message = sdk.describeSphereError(err);
      setLastError(message);
      toast.error(message);
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, [applySession, queryClient]);

  const disconnect = useCallback(async () => {
    await sdk.disconnectWallet();
    clearSession();
    setLastError(null);
    queryClient.clear();
    toast("Wallet disconnected");
  }, [clearSession, queryClient]);

  const value = useMemo<SphereContextValue>(
    () => ({
      identity,
      network,
      transport,
      sessionId,
      connectedAt,
      permissions,
      walletProtocol,
      isLocked,
      isNetworkMismatch,
      isConnecting,
      isConnected: !!identity,
      lastError,
      connect,
      disconnect,
    }),
    [
      identity,
      network,
      transport,
      sessionId,
      connectedAt,
      permissions,
      walletProtocol,
      isLocked,
      isNetworkMismatch,
      isConnecting,
      lastError,
      connect,
      disconnect,
    ],
  );

  return (
    <SphereContext.Provider value={value}>{children}</SphereContext.Provider>
  );
}

export function useSphere(): SphereContextValue {
  const ctx = useContext(SphereContext);
  if (!ctx) throw new Error("useSphere must be used inside <SphereProvider>");
  return ctx;
}

export function useBalances() {
  const { isConnected, isLocked } = useSphere();
  const { autoRefreshMs } = useSettings();
  return useQuery({
    queryKey: ["sphere", "balances"],
    queryFn: () => sdk.getBalances(),
    enabled: isConnected && !isLocked,
    refetchInterval: autoRefreshMs > 0 && !isLocked ? autoRefreshMs : false,
    staleTime: 10_000,
    retry: false,
  });
}

export function useHistory() {
  const { isConnected, isLocked } = useSphere();
  const { autoRefreshMs } = useSettings();
  return useQuery({
    queryKey: ["sphere", "history"],
    queryFn: () => sdk.getHistory(),
    enabled: isConnected && !isLocked,
    refetchInterval: autoRefreshMs > 0 && !isLocked ? autoRefreshMs : false,
    staleTime: 10_000,
    retry: false,
  });
}

/** Real chain tip from the current testnet2 gateway. */
export function useLatestBlock() {
  const { autoRefreshMs } = useSettings();
  return useQuery({
    queryKey: ["unicity", "latestBlock"],
    queryFn: () => sdk.getLatestBlock(),
    refetchInterval: autoRefreshMs > 0 ? Math.max(10_000, autoRefreshMs) : 20_000,
    staleTime: 10_000,
    retry: false,
  });
}

/** Real gateway health (also the source of the latency reading). */
export function useGatewayHealth() {
  return useQuery({
    queryKey: ["unicity", "gatewayHealth"],
    queryFn: () => sdk.getGatewayHealth(),
    refetchInterval: 20_000,
    staleTime: 10_000,
    retry: false,
  });
}

export function useSendTokens() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: SendParams) => sdk.sendTokens(params),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["sphere", "balances"] });
      queryClient.invalidateQueries({ queryKey: ["sphere", "history"] });
      const suffix = result.deliveryPending ? " · delivery pending" : "";
      const ref = result.transferId ? ` (${result.transferId.slice(0, 10)}…)` : "";
      toast.success(`Transfer ${result.status}${suffix}${ref}`);
    },
    onError: (err) => {
      toast.error(sdk.describeSphereError(err));
    },
  });
}
