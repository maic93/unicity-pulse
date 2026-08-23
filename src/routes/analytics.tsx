import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import {
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  Coins,
  Layers,
  TrendingUp,
} from "lucide-react";
import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AnimatedCounter } from "@/components/AnimatedCounter";
import { GlassCard } from "@/components/GlassCard";
import { InsightCard } from "@/components/InsightCard";
import { ConnectGate } from "@/components/wallet/ConnectGate";
import { Skeleton } from "@/components/ui/skeleton";
import { useHistory } from "@/lib/sphere/provider";
import type { HistoryEntry } from "@/lib/sphere/types";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — Unicity Pulse" },
      {
        name: "description",
        content:
          "Wallet analytics for the Unicity Testnet: volume, hourly cadence, incoming vs outgoing.",
      },
    ],
  }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  return (
    <ClientOnly fallback={<Skeleton className="h-96 w-full" />}>
      <ConnectGate>
        <AnalyticsView />
      </ConnectGate>
    </ClientOnly>
  );
}

function AnalyticsView() {
  const history = useHistory();
  const entries = history.data ?? [];

  const stats = useMemo(() => computeStats(entries), [entries]);

  return (
    <div className="space-y-8">
      <div className="animate-fade-up">
        <p className="mono text-[11px] uppercase tracking-[0.25em] text-secondary">
          Wallet analytics
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          Read the rhythm of your wallet.
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Every metric is derived from real <code className="mono">sphere_getHistory</code> data on
          the Unicity Testnet.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <InsightCard
          label="Total transactions"
          icon={<Layers className="h-4 w-4" />}
          value={<AnimatedCounter value={stats.total} />}
          hint={`${stats.incoming} in · ${stats.outgoing} out`}
          tone="primary"
        />
        <InsightCard
          label="Total volume"
          icon={<Coins className="h-4 w-4" />}
          value={
            <AnimatedCounter value={stats.totalVolume} decimals={stats.totalVolume < 100 ? 2 : 0} />
          }
          hint="base units"
          tone="secondary"
        />
        <InsightCard
          label="Average transfer"
          icon={<BarChart3 className="h-4 w-4" />}
          value={<AnimatedCounter value={stats.average} decimals={2} />}
          hint="mean amount"
          tone="warning"
        />
        <InsightCard
          label="Largest transfer"
          icon={<TrendingUp className="h-4 w-4" />}
          value={<AnimatedCounter value={stats.largest} decimals={stats.largest < 100 ? 2 : 0} />}
          hint="peak activity"
          tone="success"
        />
      </div>

      <GlassCard title="Cumulative volume" description="Running total across your history">
        {entries.length === 0 ? (
          <Empty />
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.cumulative}>
                <defs>
                  <linearGradient id="vol" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.74 0.19 45)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="oklch(0.74 0.19 45)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="oklch(1 0 0 / 0.05)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "oklch(0.7 0.02 260)", fontSize: 10 }}
                  tickLine={false}
                  axisLine={{ stroke: "oklch(1 0 0 / 0.08)" }}
                />
                <YAxis
                  tick={{ fill: "oklch(0.7 0.02 260)", fontSize: 10 }}
                  tickLine={false}
                  axisLine={{ stroke: "oklch(1 0 0 / 0.08)" }}
                />
                <Tooltip
                  contentStyle={{
                    background: "oklch(0.16 0.014 260)",
                    border: "1px solid oklch(1 0 0 / 0.1)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="oklch(0.9 0.16 55)"
                  fill="url(#vol)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </GlassCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard title="Hourly cadence" description="When your wallet is most active">
          {entries.length === 0 ? (
            <Empty />
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.hourly}>
                  <CartesianGrid stroke="oklch(1 0 0 / 0.05)" vertical={false} />
                  <XAxis
                    dataKey="hour"
                    tick={{ fill: "oklch(0.7 0.02 260)", fontSize: 10 }}
                    tickLine={false}
                    axisLine={{ stroke: "oklch(1 0 0 / 0.08)" }}
                  />
                  <YAxis
                    tick={{ fill: "oklch(0.7 0.02 260)", fontSize: 10 }}
                    tickLine={false}
                    axisLine={{ stroke: "oklch(1 0 0 / 0.08)" }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    cursor={{ fill: "oklch(1 0 0 / 0.05)" }}
                    contentStyle={{
                      background: "oklch(0.16 0.014 260)",
                      border: "1px solid oklch(1 0 0 / 0.1)",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="count" fill="oklch(0.68 0.19 245)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </GlassCard>
        <GlassCard title="Flow breakdown" description="Incoming vs outgoing volume">
          <div className="space-y-4">
            <FlowRow
              label="Incoming"
              icon={<ArrowDownLeft className="h-4 w-4" />}
              value={stats.incomingVolume}
              max={Math.max(stats.incomingVolume, stats.outgoingVolume, 1)}
              tone="success"
              count={stats.incoming}
            />
            <FlowRow
              label="Outgoing"
              icon={<ArrowUpRight className="h-4 w-4" />}
              value={stats.outgoingVolume}
              max={Math.max(stats.incomingVolume, stats.outgoingVolume, 1)}
              tone="primary"
              count={stats.outgoing}
            />
            <div className="grid grid-cols-2 gap-3 pt-2 text-xs text-muted-foreground">
              <div className="rounded-xl border border-border/60 bg-card/40 p-3">
                <p className="mono text-[10px] uppercase tracking-widest">Active days</p>
                <p className="mt-1 text-lg text-foreground">
                  <AnimatedCounter value={stats.activeDays} />
                </p>
              </div>
              <div className="rounded-xl border border-border/60 bg-card/40 p-3">
                <p className="mono text-[10px] uppercase tracking-widest">Peak hour</p>
                <p className="mono mt-1 text-lg text-foreground">
                  {stats.mostActiveHour !== null
                    ? `${stats.mostActiveHour.toString().padStart(2, "0")}:00`
                    : "—"}
                </p>
              </div>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

function FlowRow({
  label,
  icon,
  value,
  max,
  tone,
  count,
}: {
  label: string;
  icon: React.ReactNode;
  value: number;
  max: number;
  tone: "success" | "primary";
  count: number;
}) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  const barClass = tone === "success" ? "bg-success" : "bg-primary";
  const chipClass =
    tone === "success" ? "text-success bg-success/15" : "text-primary bg-primary/15";
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="inline-flex items-center gap-2">
          <span className={"grid h-7 w-7 place-items-center rounded-lg " + chipClass}>{icon}</span>
          {label}
          <span className="mono text-[11px] text-muted-foreground">· {count} tx</span>
        </span>
        <span className="mono text-base font-semibold">
          <AnimatedCounter value={value} decimals={value < 100 ? 2 : 0} />
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={"h-full rounded-full transition-all duration-700 " + barClass}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function Empty() {
  return (
    <div className="grid h-56 place-items-center rounded-xl border border-dashed border-border/60 text-sm text-muted-foreground">
      <div className="text-center">
        <Activity className="mx-auto h-6 w-6 opacity-40" />
        <p className="mt-2">No transactions yet — analytics will populate as data arrives.</p>
      </div>
    </div>
  );
}

interface Stats {
  total: number;
  incoming: number;
  outgoing: number;
  incomingVolume: number;
  outgoingVolume: number;
  totalVolume: number;
  largest: number;
  average: number;
  activeDays: number;
  mostActiveHour: number | null;
  hourly: { hour: string; count: number }[];
  cumulative: { label: string; value: number }[];
}

function computeStats(history: HistoryEntry[]): Stats {
  const hours = new Array(24).fill(0);
  let incoming = 0;
  let outgoing = 0;
  let incomingVolume = 0;
  let outgoingVolume = 0;
  let largest = 0;
  const days = new Set<string>();
  const sorted = [...history].sort((a, b) => a.timestamp - b.timestamp);
  const cumulative: { label: string; value: number }[] = [];
  let running = 0;
  for (const t of sorted) {
    const amt = Number(t.amount) || 0;
    if (t.direction === "in") {
      incoming++;
      incomingVolume += amt;
    } else if (t.direction === "out") {
      outgoing++;
      outgoingVolume += amt;
    }
    if (amt > largest) largest = amt;
    const d = new Date(t.timestamp);
    days.add(d.toISOString().slice(0, 10));
    hours[d.getHours()]++;
    running += amt;
    cumulative.push({
      label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      value: running,
    });
  }
  const total = history.length;
  const totalVolume = incomingVolume + outgoingVolume;
  const mostActiveHour = total
    ? hours.reduce((best, cur, i) => (cur > (hours[best] ?? -1) ? i : best), 0)
    : null;
  return {
    total,
    incoming,
    outgoing,
    incomingVolume,
    outgoingVolume,
    totalVolume,
    largest,
    average: total ? totalVolume / total : 0,
    activeDays: days.size,
    mostActiveHour,
    hourly: hours.map((count, i) => ({
      hour: i.toString().padStart(2, "0"),
      count,
    })),
    cumulative: cumulative.slice(-30),
  };
}
// Silence unused import warning
