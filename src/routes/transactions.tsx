import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { ArrowDownLeft, ArrowUpRight, Copy, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { GlassCard } from "@/components/GlassCard";
import { StatusBadge } from "@/components/StatusBadge";
import { ConnectGate } from "@/components/wallet/ConnectGate";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useHistory } from "@/lib/sphere/provider";
import {
  formatAmount,
  formatTimestamp,
  shortAddress,
} from "@/lib/format";

type Filter = "all" | "in" | "out";

export const Route = createFileRoute("/transactions")({
  component: TransactionsPage,
});

function TransactionsPage() {
  return (
    <ClientOnly fallback={<Skeleton className="h-96 w-full" />}>
      <ConnectGate>
        <TransactionsView />
      </ConnectGate>
    </ClientOnly>
  );
}

function TransactionsView() {
  const history = useHistory();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Transactions</h1>
        <p className="text-sm text-muted-foreground">
          Real transaction history retrieved via <code className="mono">sphere_getHistory</code>.
        </p>
      </div>

      <GlassCard>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by hash, address, memo…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-1 rounded-md border border-border bg-card/60 p-1">
            {(["all", "in", "out"] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={
                  filter === f
                    ? "rounded-sm bg-primary px-3 py-1 text-xs font-medium text-primary-foreground"
                    : "rounded-sm px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
                }
              >
                {f === "all" ? "All" : f === "in" ? "Incoming" : "Outgoing"}
              </button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void history.refetch()}
          >
            Refresh
          </Button>
        </div>

        {history.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            No transactions match your filters.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="pb-3 font-medium">Type</th>
                  <th className="pb-3 font-medium">Hash</th>
                  <th className="pb-3 font-medium">Amount</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((tx) => (
                  <tr key={tx.id} className="hover:bg-muted/20">
                    <td className="py-3">
                      <span
                        className={
                          tx.direction === "in"
                            ? "inline-flex items-center gap-2 text-success"
                            : "inline-flex items-center gap-2 text-primary"
                        }
                      >
                        {tx.direction === "in" ? (
                          <ArrowDownLeft className="h-4 w-4" />
                        ) : (
                          <ArrowUpRight className="h-4 w-4" />
                        )}
                        {tx.direction === "in" ? "In" : "Out"}
                      </span>
                    </td>
                    <td className="py-3">
                      <button
                        className="mono inline-flex items-center gap-1.5 text-xs hover:text-primary"
                        onClick={() => {
                          void navigator.clipboard.writeText(
                            tx.hash ?? tx.id,
                          );
                          toast.success("Hash copied");
                        }}
                      >
                        {shortAddress(tx.hash ?? tx.id, 8, 6)}
                        <Copy className="h-3 w-3" />
                      </button>
                    </td>
                    <td className="py-3 mono">
                      {tx.direction === "in" ? "+" : "−"}
                      {formatAmount(tx.amount)} {tx.symbol ?? ""}
                    </td>
                    <td className="py-3">
                      <StatusBadge
                        variant={
                          tx.status === "completed" || tx.status === "delivered"
                            ? "success"
                            : tx.status === "failed"
                              ? "destructive"
                              : "warning"
                        }
                      >
                        {tx.status}
                      </StatusBadge>
                    </td>
                    <td className="py-3 text-xs text-muted-foreground">
                      {formatTimestamp(tx.timestamp)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
