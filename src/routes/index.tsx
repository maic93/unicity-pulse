import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Blocks,
  CheckCircle2,
  Clock,
  Copy,
  Fingerprint,
  Gauge,
  Network,
  Package,
  RefreshCcw,
  Wallet as WalletIcon,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { GlassCard } from "@/components/GlassCard";
import { StatusBadge } from "@/components/StatusBadge";
import { ConnectGate } from "@/components/wallet/ConnectGate";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useBalances,
  useHistory,
  useSphere,
} from "@/lib/sphere/provider";
import {
  GATEWAY_URL,
  SDK_PACKAGE,
  SDK_VERSION,
  getLatestBlock,
} from "@/lib/sphere/client";
import { formatAmount, formatRelative, shortAddress } from "@/lib/format";

export const Route = createFileRoute("/")({
  component: DashboardPage,
});

function DashboardPage() {
  return (
    <ClientOnly fallback={<DashboardSkeleton />}>
      <ConnectGate>
        <Dashboard />
      </ConnectGate>
    </ClientOnly>
  );
}

function useGatewayLatency() {
  const [latency, setLatency] = useState<number | null>(null);
  useEffect(() => {
    let cancelled = false;
    async function ping() {
      const start = performance.now();
      try {
        await fetch(GATEWAY_URL, { method: "HEAD", mode: "no-cors" });
      } catch {
        /* no-cors resolves on reachable hosts */
      }
      if (!cancelled) setLatency(Math.round(performance.now() - start));
    }
    void ping();
    const id = setInterval(() => void ping(), 15_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);
  return latency;
}

function Dashboard() {
  const {
    identity,
    network,
    transport,
    sessionId,
    connectedAt,
    isConnected,
  } = useSphere();
  const balances = useBalances();
  const history = useHistory();
  const latency = useGatewayLatency();

  const latestBlock = useQuery({
    queryKey: ["sphere", "latestBlock"],
    queryFn: () => getLatestBlock(),
    enabled: isConnected,
    retry: false,
    staleTime: 30_000,
  });

  const primary = balances.data?.[0];
  const address =
    identity?.nametag ?? identity?.directAddress ?? identity?.chainPubkey ?? "";
  const blockHeight = extractBlockHeight(latestBlock.data);

  const refreshAll = () => {
    void balances.refetch();
    void history.refetch();
    void latestBlock.refetch();
    toast("Refreshing all sources…");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mono text-[11px] uppercase tracking-widest text-primary">
            Dev console · overview
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Live state of your Sphere Connect session on the Unicity Testnet.
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={refreshAll}>
          <RefreshCcw className="h-4 w-4" />
          Refresh all
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Stat
          icon={<WalletIcon className="h-4 w-4" />}
          label="Connected wallet"
          value={identity?.nametag ?? "Sphere Wallet"}
          hint={
            <button
              type="button"
              className="mono inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary"
              onClick={() => {
                void navigator.clipboard.writeText(address);
                toast.success("Address copied");
              }}
              title={address}
            >
              {shortAddress(address, 10, 8)}
              <Copy className="h-3 w-3" />
            </button>
          }
          badge={<StatusBadge variant="primary">TESTNET</StatusBadge>}
        />

        <Stat
          icon={<Gauge className="h-4 w-4" />}
          label="Current balance"
          value={
            balances.isLoading ? (
              <Skeleton className="h-7 w-32" />
            ) : primary ? (
              <span className="mono">
                {formatAmount(primary.amount, primary.decimals ?? 0)}{" "}
                <span className="text-sm text-muted-foreground">
                  {primary.symbol}
                </span>
              </span>
            ) : (
              <span className="text-sm text-muted-foreground">No balance</span>
            )
          }
          hint={
            balances.dataUpdatedAt
              ? `Updated ${formatRelative(balances.dataUpdatedAt)}`
              : "Never"
          }
          action={
            <Button
              size="icon"
              variant="ghost"
              onClick={() => void balances.refetch()}
              disabled={balances.isFetching}
              className="h-7 w-7"
            >
              <RefreshCcw
                className={balances.isFetching ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"}
              />
            </Button>
          }
        />

        <Stat
          icon={<Network className="h-4 w-4" />}
          label="Network"
          value={
            <span className="mono">
              {network?.name ?? "testnet2"}{" "}
              <span className="text-xs text-muted-foreground">
                · id {network?.id ?? 4}
              </span>
            </span>
          }
          hint={`Gateway ${GATEWAY_URL.replace(/^https?:\/\//, "")}`}
          badge={<StatusBadge variant="success">Online</StatusBadge>}
        />

        <Stat
          icon={<Blocks className="h-4 w-4" />}
          label="Latest block"
          value={
            latestBlock.isLoading ? (
              <Skeleton className="h-7 w-24" />
            ) : blockHeight !== null ? (
              <span className="mono">#{blockHeight.toLocaleString()}</span>
            ) : (
              <span className="text-sm text-muted-foreground">
                Not exposed by SDK
              </span>
            )
          }
          hint={latestBlock.error ? "getLatestBlock RPC unavailable" : "sphere_getLatestBlock"}
          action={
            <Button
              size="icon"
              variant="ghost"
              onClick={() => void latestBlock.refetch()}
              disabled={latestBlock.isFetching}
              className="h-7 w-7"
            >
              <RefreshCcw
                className={latestBlock.isFetching ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"}
              />
            </Button>
          }
        />

        <Stat
          icon={<Package className="h-4 w-4" />}
          label="SDK version"
          value={<span className="mono">v{SDK_VERSION}</span>}
          hint={SDK_PACKAGE}
        />

        <Stat
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="Connection status"
          value={
            <span className="inline-flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-success" />
              Connected
            </span>
          }
          hint={`Transport: ${transport ?? "—"}`}
          badge={<StatusBadge variant="success">Live</StatusBadge>}
        />

        <Stat
          icon={<Fingerprint className="h-4 w-4" />}
          label="Current session"
          value={
            sessionId ? (
              <button
                type="button"
                className="mono truncate text-sm hover:text-primary"
                onClick={() => {
                  void navigator.clipboard.writeText(sessionId);
                  toast.success("Session ID copied");
                }}
                title={sessionId}
              >
                {shortAddress(sessionId, 6, 6)}
              </button>
            ) : (
              <span className="text-sm text-muted-foreground">—</span>
            )
          }
          hint={
            connectedAt
              ? `Established ${formatRelative(connectedAt)}`
              : "Not established"
          }
        />

        <Stat
          icon={<Clock className="h-4 w-4" />}
          label="Last sync"
          value={
            <span className="mono text-sm">
              {balances.dataUpdatedAt
                ? formatRelative(balances.dataUpdatedAt)
                : "—"}
            </span>
          }
          hint={
            history.dataUpdatedAt
              ? `history · ${formatRelative(history.dataUpdatedAt)}`
              : "History not yet loaded"
          }
        />

        <Stat
          icon={<Activity className="h-4 w-4" />}
          label="Connection latency"
          value={
            latency === null ? (
              <span className="text-sm text-muted-foreground">measuring…</span>
            ) : (
              <span className="mono">{latency} ms</span>
            )
          }
          hint="HEAD ping to gateway · 15s"
        />
      </div>
    </div>
  );
}

function extractBlockHeight(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "number") return raw;
  if (typeof raw === "string" && /^\d+$/.test(raw)) return Number(raw);
  if (typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    for (const key of ["height", "number", "block", "blockNumber", "index"]) {
      const v = o[key];
      if (typeof v === "number") return v;
      if (typeof v === "string" && /^\d+$/.test(v)) return Number(v);
    }
  }
  return null;
}

function Stat({
  icon,
  label,
  value,
  hint,
  action,
  badge,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  action?: ReactNode;
  badge?: ReactNode;
}) {
  return (
    <GlassCard>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
          <span className="grid h-6 w-6 place-items-center rounded-md bg-primary/15 text-primary">
            {icon}
          </span>
          {label}
        </div>
        <div className="flex items-center gap-1">
          {badge}
          {action}
        </div>
      </div>
      <div className="mt-3 text-2xl font-semibold tracking-tight">{value}</div>
      {hint && (
        <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
      )}
    </GlassCard>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    </div>
  );
}
