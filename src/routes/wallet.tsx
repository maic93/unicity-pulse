import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { Copy, Download, RefreshCcw, Wallet } from "lucide-react";
import { toast } from "sonner";

import { GlassCard } from "@/components/GlassCard";
import { JsonViewer } from "@/components/JsonViewer";
import { StatusBadge } from "@/components/StatusBadge";
import { ConnectGate } from "@/components/wallet/ConnectGate";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useBalances,
  useHistory,
  useSphere,
} from "@/lib/sphere/provider";
import { formatAmount, formatRelative } from "@/lib/format";

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
  const { identity, network, transport, sessionId } = useSphere();
  const balances = useBalances();
  const history = useHistory();

  const address =
    identity?.nametag ?? identity?.directAddress ?? identity?.chainPubkey ?? "";

  const exportPayload = {
    identity,
    network,
    transport,
    sessionId,
    balances: balances.data ?? [],
    exportedAt: new Date().toISOString(),
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mono text-[11px] uppercase tracking-widest text-primary">
            Dev console · wallet
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Wallet</h1>
          <p className="text-sm text-muted-foreground">
            Everything Sphere Connect reports about the current identity.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => downloadJson("wallet.json", exportPayload)}
          >
            <Download className="h-4 w-4" /> Export
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => void balances.refetch()}
          >
            <RefreshCcw className="h-4 w-4" /> Refresh
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <GlassCard
          title="Identity"
          action={<StatusBadge variant="primary">TESTNET</StatusBadge>}
        >
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/15 text-primary">
              <Wallet className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Nametag</p>
              <p className="mono text-sm">{identity?.nametag ?? "—"}</p>
            </div>
          </div>
          <dl className="mt-4 space-y-3 text-sm">
            <FieldRow label="Direct address" value={identity?.directAddress} />
            <FieldRow label="Chain pubkey" value={identity?.chainPubkey} />
            <FieldRow label="Network" value={network?.name ?? "testnet2"} />
            <FieldRow label="Transport" value={transport ?? "—"} />
            <FieldRow label="Session ID" value={sessionId ?? "—"} />
          </dl>
          <div className="mt-4">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => {
                void navigator.clipboard.writeText(address);
                toast.success("Address copied");
              }}
            >
              <Copy className="h-4 w-4" /> Copy address
            </Button>
          </div>
        </GlassCard>

        <GlassCard
          title="Balances"
          description={
            balances.dataUpdatedAt
              ? `Updated ${formatRelative(balances.dataUpdatedAt)}`
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
            <ul className="divide-y divide-border">
              {(balances.data ?? []).map((b) => (
                <li key={b.coinId} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="text-sm font-medium">{b.symbol}</p>
                    <p className="mono text-[11px] text-muted-foreground">
                      {b.coinId}
                    </p>
                  </div>
                  <p className="mono text-sm">
                    {formatAmount(b.amount, b.decimals ?? 0)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </GlassCard>
      </div>

      <GlassCard title="Raw wallet payload" description="Live SDK response snapshot">
        <JsonViewer value={exportPayload} filename="wallet.json" />
      </GlassCard>

      <GlassCard
        title="Recent activity"
        description={`${(history.data ?? []).length} transactions in cache`}
      >
        <JsonViewer
          value={(history.data ?? []).slice(0, 10)}
          filename="history-preview.json"
          maxHeight={300}
        />
      </GlassCard>
    </div>
  );
}

function FieldRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-xs uppercase tracking-widest text-muted-foreground">
        {label}
      </dt>
      <dd className="mono max-w-[60%] break-all text-right text-xs">
        {value ?? "—"}
      </dd>
    </div>
  );
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
