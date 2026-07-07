import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import {
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  Coins,
  Download,
  Layers,
  RefreshCcw,
  TrendingUp,
} from "lucide-react";
import { useMemo } from "react";

import { ConstellationGraph } from "@/components/ConstellationGraph";
import { GlassCard } from "@/components/GlassCard";
import { InsightCard } from "@/components/InsightCard";
import { JsonViewer } from "@/components/JsonViewer";
import { WalletIdentityCard } from "@/components/WalletIdentityCard";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { ConnectGate } from "@/components/wallet/ConnectGate";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useBalances, useHistory, useSphere } from "@/lib/sphere/provider";

export const Route = createFileRoute("/wallet")({
  component: WalletPage,
});

function WalletPage() {
  return (
    <ClientOnly fallback={<Skeleton className="h-96 w-full" />}>
      <ConnectGate>
        <WalletView />
      </ConnectGate>
    </ClientOnly>
  );
}

function WalletView() {
  const { identity, network, transport, sessionId, connectedAt } = useSphere();
  const balances = useBalances();
  const history = useHistory();

  const address =
    identity?.nametag ?? identity?.directAddress ?? identity?.chainPubkey ?? "";
  const primary = balances.data?.[0];
  const historyEntries = history.data ?? [];

  const stats = useMemo(() => computeWalletStats(historyEntries), [
    historyEntries,
  ]);

  const exportPayload = {
    identity,
    network,
    transport,
    sessionId,
    balances: balances.data ?? [],
    exportedAt: new Date().toISOString(),
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3 animate-fade-up">
        <div>
          <p className="mono text-[11px] uppercase tracking-[0.25em] text-secondary">
            Sphere identity
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            Your presence on Unicity
          </h1>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-full gap-2"
            onClick={() => downloadJson("wallet.json", exportPayload)}
          >
            <Download className="h-4 w-4" /> Export
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full gap-2"
            onClick={() => {
              void balances.refetch();
              void history.refetch();
            }}
          >
            <RefreshCcw className="h-4 w-4" /> Refresh
          </Button>
        </div>
      </div>

      <WalletIdentityCard
        address={address}
        nametag={identity?.nametag}
        network={network?.name}
        balance={primary ? Number(primary.amount) : undefined}
        symbol={primary?.symbol}
        balanceDecimals={Math.min(4, primary?.decimals ?? 0)}
        sessionStartedAt={connectedAt}
        lastSyncAt={balances.dataUpdatedAt}
        activityScore={stats.total}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <InsightCard
          label="Transactions"
          icon={<Layers className="h-4 w-4" />}
          value={<AnimatedCounter value={stats.total} />}
          hint={`${stats.incoming} in · ${stats.outgoing} out`}
          tone="primary"
        />
        <InsightCard
          label="Total volume"
          icon={<Coins className="h-4 w-4" />}
          value={
            <span className="mono">
              <AnimatedCounter
                value={stats.totalVolume}
                decimals={stats.totalVolume < 100 ? 2 : 0}
              />
            </span>
          }
          hint={primary?.symbol ?? ""}
          tone="secondary"
        />
        <InsightCard
          label="Largest transfer"
          icon={<TrendingUp className="h-4 w-4" />}
          value={
            <span className="mono">
              <AnimatedCounter
                value={stats.largest}
                decimals={stats.largest < 100 ? 2 : 0}
              />
            </span>
          }
          hint="Peak activity"
          tone="warning"
        />
        <InsightCard
          label="Active days"
          icon={<CalendarDays className="h-4 w-4" />}
          value={<AnimatedCounter value={stats.activeDays} />}
          hint={
            stats.mostActiveHour !== null
              ? `Peak hour · ${stats.mostActiveHour.toString().padStart(2, "0")}:00`
              : "—"
          }
          tone="success"
        />
      </div>

      <GlassCard
        title="Blockchain constellation"
        description="Every counterparty on this wallet, orbiting the connected identity"
        action={
          <span className="mono inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/60 px-2.5 py-1 text-[10px] uppercase tracking-widest text-muted-foreground">
            <Activity className="h-3 w-3" /> live · testnet2
          </span>
        }
      >
        <ConstellationGraph
          center={{ label: identity?.nametag ?? "You", address }}
          history={historyEntries}
          height={440}
        />
        <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-muted-foreground sm:grid-cols-4">
          <LegendChip icon={<ArrowDownLeft className="h-3 w-3" />} tone="success" label={`${stats.incoming} incoming`} />
          <LegendChip icon={<ArrowUpRight className="h-3 w-3" />} tone="primary" label={`${stats.outgoing} outgoing`} />
          <LegendChip label={`avg · ${stats.average.toFixed(2)}`} />
          <LegendChip label={`peers · ${stats.uniqueCounterparties}`} />
        </div>
      </GlassCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard
          title="Balances"
          description={
            balances.dataUpdatedAt
              ? `Updated ${new Date(balances.dataUpdatedAt).toLocaleTimeString()}`
              : "Not yet loaded"
          }
        >
          {balances.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : (balances.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Wallet reports no balances.
            </p>
          ) : (
            <ul className="divide-y divide-border/60">
              {(balances.data ?? []).map((b) => (
                <li
                  key={b.coinId}
                  className="flex items-center justify-between py-3"
                >
                  <div>
                    <p className="text-sm font-medium">{b.symbol}</p>
                    <p className="mono text-[11px] text-muted-foreground">
                      {b.coinId}
                    </p>
                  </div>
                  <p className="mono text-base font-semibold">
                    <AnimatedCounter
                      value={Number(b.amount)}
                      decimals={Math.min(4, b.decimals ?? 0)}
                    />
                  </p>
                </li>
              ))}
            </ul>
          )}
        </GlassCard>
        <GlassCard
          title="Raw SDK payload"
          description="Live snapshot from Sphere Connect"
        >
          <JsonViewer value={exportPayload} filename="wallet.json" maxHeight={280} />
        </GlassCard>
      </div>
    </div>
  );
}

function LegendChip({
  icon,
  label,
  tone,
}: {
  icon?: React.ReactNode;
  label: string;
  tone?: "success" | "primary";
}) {
  const toneClass =
    tone === "success"
      ? "text-success bg-success/10 border-success/30"
      : tone === "primary"
        ? "text-primary bg-primary/10 border-primary/30"
        : "text-muted-foreground bg-card/60 border-border/60";
  return (
    <span
      className={
        "mono inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] uppercase tracking-widest " +
        toneClass
      }
    >
      {icon}
      {label}
    </span>
  );
}

interface WalletStats {
  total: number;
  incoming: number;
  outgoing: number;
  totalVolume: number;
  largest: number;
  average: number;
  activeDays: number;
  mostActiveHour: number | null;
  uniqueCounterparties: number;
}

function computeWalletStats(
  history: import("@/lib/sphere/types").HistoryEntry[],
): WalletStats {
  if (history.length === 0) {
    return {
      total: 0,
      incoming: 0,
      outgoing: 0,
      totalVolume: 0,
      largest: 0,
      average: 0,
      activeDays: 0,
      mostActiveHour: null,
      uniqueCounterparties: 0,
    };
  }
  let incoming = 0;
  let outgoing = 0;
  let totalVolume = 0;
  let largest = 0;
  const days = new Set<string>();
  const hours = new Array<number>(24).fill(0);
  const peers = new Set<string>();
  for (const t of history) {
    const amt = Number(t.amount) || 0;
    if (t.direction === "in") incoming++;
    else if (t.direction === "out") outgoing++;
    totalVolume += amt;
    if (amt > largest) largest = amt;
    const d = new Date(t.timestamp);
    days.add(d.toISOString().slice(0, 10));
    hours[d.getHours()] = (hours[d.getHours()] ?? 0) + 1;
    if (t.counterparty) peers.add(t.counterparty);
  }
  const mostActiveHour = hours.reduce(
    (best, cur, i) => (cur > (hours[best] ?? -1) ? i : best),
    0,
  );
  return {
    total: history.length,
    incoming,
    outgoing,
    totalVolume,
    largest,
    average: totalVolume / history.length,
    activeDays: days.size,
    mostActiveHour,
    uniqueCounterparties: peers.size,
  };
}

function downloadJson(name: string, value: unknown) {
  if (typeof window === "undefined") return;
  const blob = new Blob([JSON.stringify(value, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
