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

import * as sdk from "./client";
import type { SendParams, SphereIdentity, SphereNetworkInfo } from "./types";

interface SphereContextValue {
  identity: SphereIdentity | null;
  network: SphereNetworkInfo | null;
  transport: string | null;
  isConnecting: boolean;
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}

const SphereContext = createContext<SphereContextValue | null>(null);

export function SphereProvider({ children }: { children: ReactNode }) {
  const [identity, setIdentity] = useState<SphereIdentity | null>(null);
  const [network, setNetwork] = useState<SphereNetworkInfo | null>(null);
  const [transport, setTransport] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const attemptedResume = useRef(false);
  const queryClient = useQueryClient();

  const applySession = useCallback(() => {
    setIdentity(sdk.getIdentitySync());
    setNetwork(sdk.getNetworkSync());
    setTransport(sdk.getTransportSync());
  }, []);

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

  const connect = useCallback(async () => {
    setIsConnecting(true);
    try {
      await sdk.connectWallet();
      applySession();
      toast.success("Wallet connected");
      await queryClient.invalidateQueries();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Connection failed";
      toast.error(message);
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, [applySession, queryClient]);

  const disconnect = useCallback(async () => {
    await sdk.disconnectWallet();
    setIdentity(null);
    setNetwork(null);
    setTransport(null);
    queryClient.clear();
    toast("Wallet disconnected");
  }, [queryClient]);

  const value = useMemo<SphereContextValue>(
    () => ({
      identity,
      network,
      transport,
      isConnecting,
      isConnected: !!identity,
      connect,
      disconnect,
    }),
    [identity, network, transport, isConnecting, connect, disconnect],
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

const AUTO_REFRESH_MS = 30_000;

export function useBalances() {
  const { isConnected } = useSphere();
  return useQuery({
    queryKey: ["sphere", "balances"],
    queryFn: () => sdk.getBalances(),
    enabled: isConnected,
    refetchInterval: AUTO_REFRESH_MS,
    staleTime: 10_000,
  });
}

export function useHistory() {
  const { isConnected } = useSphere();
  return useQuery({
    queryKey: ["sphere", "history"],
    queryFn: () => sdk.getHistory(),
    enabled: isConnected,
    refetchInterval: AUTO_REFRESH_MS,
    staleTime: 10_000,
  });
}

export function useSendTokens() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: SendParams) => sdk.sendTokens(params),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["sphere", "balances"] });
      queryClient.invalidateQueries({ queryKey: ["sphere", "history"] });
      const suffix = result.deliveryPending ? " (delivery pending)" : "";
      toast.success(`Transaction ${result.status}${suffix}`);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Transaction failed");
    },
  });
}
