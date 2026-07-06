import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Compass,
  Copy,
  Search,
} from "lucide-react";
import { toast } from "sonner";

import { GlassCard } from "@/components/GlassCard";
import { JsonViewer } from "@/components/JsonViewer";
import { StatusBadge } from "@/components/StatusBadge";
import { ConnectGate } from "@/components/wallet/ConnectGate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useBalances, useHistory, useSphere } from "@/lib/sphere/provider";
import { formatAmount, formatTimestamp, shortAddress } from "@/lib/format";
import type { HistoryEntry } from "@/lib/sphere/types";

export const Route = createFileRoute("/explorer")({
  component: ExplorerPage,
});

function ExplorerPage() {
  return (
    <ClientOnly fallback={<Skeleton className="h-96 w-full" />}>
      <ConnectGate>
        <ExplorerView />
      </ConnectGate>
    </ClientOnly>
  );
}

type SearchResult =
  | { kind: "wallet"; address: string; tx: HistoryEntry[] }
  | { kind: "tx"; entry: HistoryEntry }
  | { kind: "empty"; query: string }
  | null;

function ExplorerView() {
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState<string | null>(null);
  const history = useHistory();
  const balances = useBalances();
  const { identity } = useSphere();
  const ownAddress =
    identity?.nametag ?? identity?.directAddress ?? identity?.chainPubkey ?? "";

  const result = useMemo<SearchResult>(() => {
    if (!submitted) return null;
    const q = submitted.trim().toLowerCase();
    if (!q) return null;
    const items = history.data ?? [];
    const tx = items.find(
      (t) =>
        (t.hash ?? "").toLowerCase() === q ||
        (t.id ?? "").toLowerCase() === q,
    );
    if (tx) return { kind: "tx", entry: tx };

    const isAddress =
      q === ownAddress.toLowerCase() ||
      q.startsWith("@") ||
      /^[0-9a-f]{20,}$/i.test(q);
    if (isAddress) {
      const related = items.filter(
        (t) =>
          (t.counterparty ?? "").toLowerCase() === q ||
          q === ownAddress.toLowerCase(),
      );
      return { kind: "wallet", address: submitted, tx: related };
    }
    return { kind: "empty", query: submitted };
  }, [submitted, history.data, ownAddress]);

  return (
    <div className="space-y-6">
      <div>
        <p className="mono text-[11px] uppercase tracking-widest text-primary">
          Dev console · explorer
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Explorer</h1>
        <p className="text-sm text-muted-foreground">
          Search wallet addresses and transaction hashes seen on this session.
        </p>
      </div>

      <GlassCard>
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setSubmitted(query);
          }}
        >
          <div className="relative flex-1 min-w-[240px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
              placeholder="Wallet address, @nametag or transaction hash"
              autoComplete="off"
            />
          </div>
          <Button type="submit" className="gap-2">
            <Compass className="h-4 w-4" /> Search
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setQuery(ownAddress);
              setSubmitted(ownAddress);
            }}
          >
            My wallet
          </Button>
        </form>
      </GlassCard>

      {!result && (
        <p className="text-center text-sm text-muted-foreground">
          Enter an address or hash to inspect it.
        </p>
      )}

      {result?.kind === "empty" && (
        <GlassCard title="No match" description={`Nothing found for “${result.query}”`}>
          <p className="text-sm text-muted-foreground">
            The explorer only indexes transactions from your current Sphere
            session. Try connecting a wallet that has interacted with this
            address, or send a testnet transaction from the{" "}
            <span className="text-foreground">Send</span> page.
          </p>
        </GlassCard>
      )}

      {result?.kind === "wallet" && (
        <div className="space-y-4">
          <GlassCard
            title="Wallet"
            action={<StatusBadge variant="primary">TESTNET</StatusBadge>}
          >
            <div className="grid gap-3 md:grid-cols-3">
              <Stat label="Address" value={shortAddress(result.address, 8, 6)} mono />
              <Stat
                label="Transactions"
                value={String(result.tx.length)}
              />
              <Stat
                label="Primary balance"
                value={
                  balances.data?.[0]
                    ? `${formatAmount(balances.data[0].amount, balances.data[0].decimals ?? 0)} ${balances.data[0].symbol}`
                    : "—"
                }
              />
            </div>
          </GlassCard>
          <GlassCard title="Recent activity">
            {result.tx.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No recorded activity for this address.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {result.tx.slice(0, 20).map((t) => (
                  <TxRow key={t.id} tx={t} />
                ))}
              </ul>
            )}
          </GlassCard>
        </div>
      )}

      {result?.kind === "tx" && (
        <div className="space-y-4">
          <GlassCard
            title="Transaction"
            action={
              <StatusBadge
                variant={
                  result.entry.status === "completed"
                    ? "success"
                    : result.entry.status === "failed"
                      ? "destructive"
                      : "warning"
                }
              >
                {result.entry.status}
              </StatusBadge>
            }
          >
            <dl className="grid gap-3 md:grid-cols-2">
              <Stat label="Hash" value={result.entry.hash ?? result.entry.id} mono copyable />
              <Stat
                label="Direction"
                value={result.entry.direction === "in" ? "Incoming" : "Outgoing"}
              />
              <Stat
                label="Amount"
                value={`${formatAmount(result.entry.amount)} ${result.entry.symbol ?? ""}`}
              />
              <Stat label="Timestamp" value={formatTimestamp(result.entry.timestamp)} />
              <Stat
                label="Counterparty"
                value={result.entry.counterparty ?? "—"}
                mono
              />
            </dl>
          </GlassCard>
          <GlassCard title="Raw payload">
            <JsonViewer value={result.entry} filename={`tx-${result.entry.id}.json`} />
          </GlassCard>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  mono,
  copyable,
}: {
  label: string;
  value: string;
  mono?: boolean;
  copyable?: boolean;
}) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </dt>
      <dd
        className={
          mono
            ? "mono mt-1 break-all text-sm"
            : "mt-1 text-sm"
        }
      >
        {copyable ? (
          <button
            type="button"
            className="inline-flex items-center gap-1.5 hover:text-primary"
            onClick={() => {
              void navigator.clipboard.writeText(value);
              toast.success("Copied");
            }}
          >
            {value}
            <Copy className="h-3 w-3 shrink-0" />
          </button>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}

function TxRow({ tx }: { tx: HistoryEntry }) {
  return (
    <li className="flex items-center justify-between gap-3 py-3">
      <div className="flex items-center gap-3 min-w-0">
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
            {shortAddress(tx.hash ?? tx.id, 8, 6)}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="mono text-sm">
          {tx.direction === "in" ? "+" : "−"}
          {formatAmount(tx.amount)} {tx.symbol ?? ""}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatTimestamp(tx.timestamp)}
        </p>
      </div>
    </li>
  );
}
