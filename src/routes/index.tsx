import { createFileRoute } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import {
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
  Copy,
  RefreshCcw,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { GlassCard } from "@/components/GlassCard";
import { StatusBadge } from "@/components/StatusBadge";
import { ConnectGate } from "@/components/wallet/ConnectGate";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSphere, useBalances, useHistory } from "@/lib/sphere/provider";
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

function Dashboard() {
  const { identity, network, transport } = useSphere();
  const balances = useBalances();
  const history = useHistory();

  const primary = balances.data?.[0];
  const address =
    identity?.nametag ?? identity?.directAddress ?? identity?.chainPubkey ?? "";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Live data from the Unicity Testnet via Sphere Connect.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => {
            void balances.refetch();
            void history.refetch();
            toast("Refreshing…");
          }}
        >
          <RefreshCcw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <GlassCard
          title="Wallet"
          action={<StatusBadge variant="primary">TESTNET</StatusBadge>}
        >
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary">
              <Wallet className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Connected address</p>
              <button
                className="mono flex items-center gap-2 text-sm font-medium hover:text-primary"
                onClick={() => {
                  void navigator.clipboard.writeText(address);
                  toast.success("Address copied");
                }}
                title={address}
              >
                {shortAddress(address, 8, 6)}
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
            <Info label="Nametag" value={identity?.nametag ?? "—"} mono />
            <Info label="Transport" value={transport ?? "—"} />
          </dl>
        </GlassCard>

        <GlassCard
          title="Available balance"
          description={
            balances.dataUpdatedAt
              ? `Updated ${formatRelative(balances.dataUpdatedAt)}`
              : "Fetching from testnet…"
          }
          action={
            <Button
              size="icon"
              variant="ghost"
              onClick={() => void balances.refetch()}
              disabled={balances.isFetching}
            >
              <RefreshCcw
                className={
                  balances.isFetching ? "h-4 w-4 animate-spin" : "h-4 w-4"
                }
              />
            </Button>
          }
        >
          {balances.isLoading ? (
            <Skeleton className="h-10 w-40" />
          ) : primary ? (
            <div className="flex items-baseline gap-2">
              <span className="mono text-3xl font-semibold tracking-tight">
                {formatAmount(primary.amount, primary.decimals ?? 0)}
              </span>
              <span className="text-sm font-medium text-muted-foreground">
                {primary.symbol}
              </span>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No balances reported by the wallet.
            </p>
          )}
          {balances.data && balances.data.length > 1 && (
            <ul className="mt-4 space-y-1.5 border-t border-border pt-3 text-xs">
              {balances.data.slice(1).map((b) => (
                <li
                  key={b.coinId}
                  className="flex items-center justify-between"
                >
                  <span className="text-muted-foreground">{b.symbol}</span>
                  <span className="mono">
                    {formatAmount(b.amount, b.decimals ?? 0)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </GlassCard>

        <GlassCard title="Network" description="Sphere Connect session">
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Name</span>
              <span className="mono">{network?.name ?? "testnet2"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Network ID</span>
              <span className="mono">{network?.id ?? 4}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">SDK status</span>
              <StatusBadge variant="success">Online</StatusBadge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Auto-refresh</span>
              <span className="text-xs">every 30s</span>
            </div>
          </div>
        </GlassCard>
      </div>

      <GlassCard
        title="Recent transactions"
        description="Live history from your Sphere wallet"
        action={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void history.refetch()}
            disabled={history.isFetching}
            className="gap-2"
          >
            <Activity className="h-4 w-4" />
            {history.isFetching ? "Loading…" : "Refresh"}
          </Button>
        }
      >
        {history.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !history.data || history.data.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No transactions yet. Send your first testnet transfer to get
            started.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {history.data.slice(0, 6).map((tx) => (
              <li
                key={tx.id}
                className="flex items-center justify-between gap-4 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={
                      tx.direction === "in"
                        ? "grid h-9 w-9 place-items-center rounded-lg bg-success/15 text-success"
                        : "grid h-9 w-9 place-items-center rounded-lg bg-primary/15 text-primary"
                    }
                  >
                    {tx.direction === "in" ? (
                      <ArrowDownLeft className="h-4 w-4" />
                    ) : (
                      <ArrowUpRight className="h-4 w-4" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {tx.direction === "in" ? "Received" : "Sent"}
                    </p>
                    <p className="mono truncate text-xs text-muted-foreground">
                      {shortAddress(tx.counterparty ?? tx.hash ?? tx.id, 8, 6)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="mono text-sm font-semibold">
                    {tx.direction === "in" ? "+" : "−"}
                    {formatAmount(tx.amount)} {tx.symbol ?? ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatRelative(tx.timestamp)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </GlassCard>
    </div>
  );
}

function Info({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={mono ? "mono mt-0.5 truncate" : "mt-0.5 truncate"}>
        {value}
      </dd>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
