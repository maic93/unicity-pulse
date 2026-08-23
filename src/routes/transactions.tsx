import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { BlockchainTimeline, type TimelineEvent } from "@/components/BlockchainTimeline";
import { ConnectGate } from "@/components/wallet/ConnectGate";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useHistory, useSphere } from "@/lib/sphere/provider";
import { sdkLog } from "@/lib/sphere/log";

type Filter = "all" | "in" | "out";

export const Route = createFileRoute("/transactions")({
  component: TimelinePage,
});

function TimelinePage() {
  return (
    <ClientOnly fallback={<Skeleton className="h-96 w-full" />}>
      <ConnectGate>
        <TimelineView />
      </ConnectGate>
    </ClientOnly>
  );
}

function TimelineView() {
  const history = useHistory();
  const { connectedAt } = useSphere();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [logTick, setLogTick] = useState(0);

  useEffect(() => sdkLog.subscribe(() => setLogTick((n) => n + 1)), []);

  const rows = useMemo(() => {
    const items = history.data ?? [];
    return items.filter((t) => {
      if (filter !== "all" && t.direction !== filter) return false;
      if (!query) return true;
      const q = query.toLowerCase();
      return (
        (t.hash ?? "").toLowerCase().includes(q) ||
        (t.counterparty ?? "").toLowerCase().includes(q) ||
        (t.memo ?? "").toLowerCase().includes(q)
      );
    });
  }, [history.data, query, filter]);

  const events = useMemo<TimelineEvent[]>(() => {
    const evs: TimelineEvent[] = [];
    if (connectedAt) {
      evs.push({
        id: "session-start",
        timestamp: connectedAt,
        title: "Sphere Connect established",
        description: "Wallet approved this dapp on the Unicity Testnet.",
        variant: "primary",
      });
    }
    // Include recent SDK connect / disconnect / event entries
    const entries = sdkLog.list().slice(0, 25);
    for (const e of entries) {
      if (e.kind === "connect" && e.status === "ok") {
        evs.push({
          id: `log-${e.id}`,
          timestamp: e.startedAt,
          title: "Session synced",
          description: `Transport · ${(e.response as { transport?: string })?.transport ?? "auto"}`,
          variant: "success",
        });
      }
      if (e.kind === "event") {
        evs.push({
          id: `log-${e.id}`,
          timestamp: e.startedAt,
          title: e.method,
          description: "Wallet lifecycle event",
          variant: "info",
        });
      }
    }
    return evs;
  }, [connectedAt, logTick]);

  return (
    <div className="space-y-8">
      <div className="animate-fade-up">
        <p className="mono text-[11px] uppercase tracking-[0.25em] text-secondary">
          Blockchain timeline
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Every heartbeat, in order.</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Real transactions retrieved via <code className="mono">sphere_getHistory</code> on the
          Unicity Testnet, interleaved with wallet lifecycle events from the live SDK log.
        </p>
      </div>

      <div className="glass rounded-2xl p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search hash, address, memo…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="rounded-full pl-9"
            />
          </div>
          <div className="flex gap-1 rounded-full border border-border/60 bg-card/60 p-1">
            {(["all", "in", "out"] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={
                  filter === f
                    ? "mono rounded-full bg-primary px-3 py-1 text-[11px] font-medium uppercase tracking-widest text-primary-foreground"
                    : "mono rounded-full px-3 py-1 text-[11px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
                }
              >
                {f === "all" ? "All" : f === "in" ? "In" : "Out"}
              </button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => void history.refetch()}
          >
            Refresh
          </Button>
        </div>
      </div>

      {history.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
      ) : (
        <BlockchainTimeline
          entries={rows}
          extraEvents={events}
          emptyState={
            query || filter !== "all"
              ? "No activity matches these filters."
              : "No on-chain activity yet — send a transaction to see it appear here."
          }
        />
      )}
    </div>
  );
}
