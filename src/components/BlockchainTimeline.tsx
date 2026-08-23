/**
 * BlockchainTimeline — animated vertical timeline for wallet history.
 * Groups entries by day (Today / Yesterday / date) and pairs them
 * with icons, relative timestamps and expandable details.
 */
import { ArrowDownLeft, ArrowUpRight, ChevronDown } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import { StatusBadge } from "@/components/StatusBadge";
import { cn } from "@/lib/utils";
import type { HistoryEntry } from "@/lib/sphere/types";
import { formatAmount, formatTimestamp, shortAddress } from "@/lib/format";

interface Props {
  entries: HistoryEntry[];
  extraEvents?: TimelineEvent[];
  emptyState?: ReactNode;
}

export interface TimelineEvent {
  id: string;
  timestamp: number;
  title: string;
  description?: string;
  variant?: "info" | "success" | "primary";
}

interface Item {
  key: string;
  timestamp: number;
  render: () => ReactNode;
}

export function BlockchainTimeline({ entries, extraEvents, emptyState }: Props) {
  const items = useMemo<Item[]>(() => {
    const txItems: Item[] = entries.map((t) => ({
      key: `tx-${t.id}`,
      timestamp: t.timestamp,
      render: () => <TxRow tx={t} />,
    }));
    const evItems: Item[] = (extraEvents ?? []).map((e) => ({
      key: `ev-${e.id}`,
      timestamp: e.timestamp,
      render: () => <EventRow ev={e} />,
    }));
    return [...txItems, ...evItems].sort((a, b) => b.timestamp - a.timestamp);
  }, [entries, extraEvents]);

  const grouped = useMemo(() => groupByDay(items), [items]);

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
        {emptyState ?? "No blockchain activity in this session yet."}
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Vertical rail */}
      <div
        aria-hidden
        className="absolute left-[19px] top-2 bottom-2 w-px"
        style={{
          background:
            "linear-gradient(to bottom, transparent, oklch(0.74 0.19 45 / 0.4) 15%, oklch(0.68 0.19 245 / 0.3) 70%, transparent)",
        }}
      />
      <ol className="space-y-8">
        {grouped.map((g) => (
          <li key={g.label}>
            <div className="mb-3 flex items-center gap-3 pl-12">
              <p className="mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
                {g.label}
              </p>
              <span className="h-px flex-1 bg-border/60" />
            </div>
            <ol className="space-y-3">
              {g.items.map((it, i) => (
                <li
                  key={it.key}
                  className="animate-fade-up"
                  style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
                >
                  {it.render()}
                </li>
              ))}
            </ol>
          </li>
        ))}
      </ol>
    </div>
  );
}

function TxRow({ tx }: { tx: HistoryEntry }) {
  const [open, setOpen] = useState(false);
  const incoming = tx.direction === "in";
  return (
    <div className="relative pl-12">
      <span
        className={cn(
          "absolute left-0 top-3 grid h-10 w-10 place-items-center rounded-full border",
          incoming
            ? "border-success/40 bg-success/15 text-success"
            : "border-primary/40 bg-primary/15 text-primary",
        )}
        style={{
          boxShadow: incoming
            ? "0 0 24px oklch(0.74 0.16 155 / 0.35)"
            : "0 0 24px oklch(0.74 0.19 45 / 0.4)",
        }}
      >
        {incoming ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
      </span>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="glass hover-lift block w-full rounded-2xl p-4 text-left"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium tracking-tight">
              {incoming ? "Received tokens" : "Sent tokens"}
            </p>
            <p className="mono mt-0.5 text-xs text-muted-foreground">
              {tx.counterparty ? shortAddress(tx.counterparty, 8, 6) : "unknown counterparty"} ·{" "}
              {formatTimestamp(tx.timestamp)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "mono text-base font-semibold",
                incoming ? "text-success" : "text-primary",
              )}
            >
              {incoming ? "+" : "−"}
              {formatAmount(tx.amount)} {tx.symbol ?? ""}
            </span>
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
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                open && "rotate-180",
              )}
            />
          </div>
        </div>
        {open && (
          <dl className="mt-4 grid grid-cols-1 gap-2 border-t border-border/60 pt-4 text-xs md:grid-cols-2">
            <Row label="Hash" value={tx.hash ?? tx.id} />
            <Row label="Counterparty" value={tx.counterparty ?? "—"} />
            <Row label="Coin" value={tx.coinId ?? tx.symbol ?? "—"} />
            <Row label="Memo" value={tx.memo ?? "—"} />
          </dl>
        )}
      </button>
    </div>
  );
}

function EventRow({ ev }: { ev: TimelineEvent }) {
  const tone =
    ev.variant === "primary"
      ? "border-primary/40 bg-primary/15 text-primary"
      : ev.variant === "success"
        ? "border-success/40 bg-success/15 text-success"
        : "border-secondary/40 bg-secondary/15 text-secondary";
  return (
    <div className="relative pl-12">
      <span
        className={cn(
          "absolute left-0 top-3 grid h-10 w-10 place-items-center rounded-full border",
          tone,
        )}
      >
        <span className="h-2 w-2 rounded-full bg-current" />
      </span>
      <div className="glass rounded-2xl p-4">
        <p className="text-sm font-medium tracking-tight">{ev.title}</p>
        {ev.description && <p className="mt-0.5 text-xs text-muted-foreground">{ev.description}</p>}
        <p className="mono mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
          {formatTimestamp(ev.timestamp)}
        </p>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mono max-w-[70%] break-all text-right">{value}</dd>
    </div>
  );
}

function groupByDay(items: Item[]) {
  const groups: { label: string; items: Item[] }[] = [];
  const now = new Date();
  const today = startOfDay(now);
  const yesterday = today - 86_400_000;
  for (const it of items) {
    const day = startOfDay(new Date(it.timestamp));
    const label =
      day === today
        ? "Today"
        : day === yesterday
          ? "Yesterday"
          : new Date(day).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            });
    let g = groups[groups.length - 1];
    if (!g || g.label !== label) {
      g = { label, items: [] };
      groups.push(g);
    }
    g.items.push(it);
  }
  return groups;
}

function startOfDay(d: Date) {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c.getTime();
}
