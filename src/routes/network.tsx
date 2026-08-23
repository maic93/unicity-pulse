import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Activity, Zap } from "lucide-react";

import { GlassCard } from "@/components/GlassCard";
import { StatusBadge } from "@/components/StatusBadge";
import { ConnectGate } from "@/components/wallet/ConnectGate";
import { Skeleton } from "@/components/ui/skeleton";
import { useSphere, useHistory } from "@/lib/sphere/provider";

export const Route = createFileRoute("/network")({
  component: NetworkPage,
});

function NetworkPage() {
  return (
    <ClientOnly fallback={<Skeleton className="h-96 w-full" />}>
      <ConnectGate>
        <NetworkView />
      </ConnectGate>
    </ClientOnly>
  );
}

function NetworkView() {
  const { network, transport } = useSphere();
  const history = useHistory();
  const [latency, setLatency] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function ping() {
      const start = performance.now();
      try {
        const res = await fetch("https://gateway.testnet2.unicity.network", {
          method: "HEAD",
          mode: "no-cors",
        });
        void res;
      } catch {
        /* no-cors will still resolve on reachable hosts */
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

  const latest = history.data?.[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Network</h1>
        <p className="text-sm text-muted-foreground">
          Live status of the Unicity Testnet connection.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <GlassCard title="Network" description="From the Sphere handshake">
          <dl className="space-y-3 text-sm">
            <Row label="Name" value={network?.name ?? "testnet2"} mono />
            <Row label="Network ID" value={String(network?.id ?? 4)} mono />
            <Row label="Gateway" value="gateway.testnet2.unicity.network" mono />
            <Row label="Status" value={<StatusBadge variant="success">Live</StatusBadge>} />
          </dl>
        </GlassCard>

        <GlassCard title="SDK" description="@unicitylabs/sphere-sdk">
          <dl className="space-y-3 text-sm">
            <Row label="Protocol" value="sphere-connect v2" mono />
            <Row label="Transport" value={transport ?? "—"} mono />
            <Row
              label="Latency"
              value={
                latency === null ? (
                  <span className="text-muted-foreground">measuring…</span>
                ) : (
                  <span className="mono">{latency} ms</span>
                )
              }
            />
            <Row label="Ready" value={<StatusBadge variant="success">Connected</StatusBadge>} />
          </dl>
        </GlassCard>

        <GlassCard title="Latest activity" description="Newest confirmed transfer">
          {history.isLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : latest ? (
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary">
                <Activity className="h-5 w-5" />
              </span>
              <div>
                <p className="mono text-sm">
                  {latest.direction === "in" ? "+" : "−"}
                  {latest.amount} {latest.symbol ?? ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(latest.timestamp).toLocaleString()}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No activity yet.</p>
          )}
        </GlassCard>

        <GlassCard title="Auto-refresh" description="Query cadence">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary">
              <Zap className="h-5 w-5" />
            </span>
            <div>
              <p className="mono text-sm">30s</p>
              <p className="text-xs text-muted-foreground">
                Balances and history refresh in the background
              </p>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={mono ? "mono truncate" : ""}>{value}</dd>
    </div>
  );
}
