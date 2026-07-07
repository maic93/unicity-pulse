/**
 * WalletIdentityCard — beautiful identity presentation.
 * Derives a deterministic gradient "avatar" from the address, plus stats.
 */
import { Copy, Wallet } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { AnimatedCounter } from "@/components/AnimatedCounter";
import { StatusBadge } from "@/components/StatusBadge";
import { formatRelative, shortAddress } from "@/lib/format";

interface Props {
  address: string;
  nametag?: string;
  network?: string;
  balance?: number;
  symbol?: string;
  balanceDecimals?: number;
  sessionStartedAt?: number | null;
  lastSyncAt?: number | null;
  activityScore?: number;
}

export function WalletIdentityCard({
  address,
  nametag,
  network,
  balance,
  symbol,
  balanceDecimals = 0,
  sessionStartedAt,
  lastSyncAt,
  activityScore,
}: Props) {
  const gradient = useMemo(() => buildGradient(address || nametag || "sphere"), [address, nametag]);
  const sessionDuration = useDuration(sessionStartedAt);

  return (
    <section className="glass-strong hover-lift relative overflow-hidden rounded-3xl p-6">
      {/* Ambient corner glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, oklch(0.74 0.19 45 / 0.35), transparent 70%)",
        }}
      />
      <div className="relative flex flex-wrap items-start gap-6">
        <div
          className="relative grid h-24 w-24 shrink-0 place-items-center rounded-2xl"
          style={{ background: gradient }}
        >
          <Wallet className="h-8 w-8 text-white/90" />
          <span
            className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/25"
            aria-hidden
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="mono text-[11px] uppercase tracking-[0.2em] text-secondary">
              Sphere identity
            </p>
            <StatusBadge variant="primary">TESTNET · {network ?? "testnet2"}</StatusBadge>
          </div>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-gradient-primary">
            {nametag ?? "Sphere Wallet"}
          </h2>
          <button
            type="button"
            className="mono mt-1 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
            onClick={() => {
              void navigator.clipboard.writeText(address);
              toast.success("Address copied");
            }}
            title={address}
          >
            {shortAddress(address, 14, 10)}
            <Copy className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="relative mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatBlock
          label="Balance"
          value={
            balance === undefined ? (
              <span className="text-muted-foreground">—</span>
            ) : (
              <>
                <AnimatedCounter value={balance} decimals={balanceDecimals} />
                <span className="ml-1 text-sm text-muted-foreground">
                  {symbol}
                </span>
              </>
            )
          }
        />
        <StatBlock label="Session" value={sessionDuration ?? "—"} />
        <StatBlock
          label="Activity"
          value={
            <span className="inline-flex items-center gap-2">
              <span className="mono">
                <AnimatedCounter value={activityScore ?? 0} />
              </span>
              <span className="h-1.5 w-14 overflow-hidden rounded-full bg-muted">
                <span
                  className="block h-full rounded-full bg-primary transition-all duration-700"
                  style={{
                    width: `${Math.min(100, ((activityScore ?? 0) / 50) * 100)}%`,
                  }}
                />
              </span>
            </span>
          }
        />
        <StatBlock
          label="Last sync"
          value={
            lastSyncAt ? (
              <span className="mono text-sm">{formatRelative(lastSyncAt)}</span>
            ) : (
              <span className="text-muted-foreground">—</span>
            )
          }
        />
      </div>
    </section>
  );
}

function StatBlock({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/50 p-3">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function useDuration(startedAt?: number | null) {
  const now = useNow(startedAt ? 1000 : 0);
  if (!startedAt) return null;
  const seconds = Math.max(0, Math.floor((now - startedAt) / 1000));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s.toString().padStart(2, "0")}s`;
  return `${s}s`;
}

function useNow(interval: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!interval) return;
    const id = setInterval(() => setNow(Date.now()), interval);
    return () => clearInterval(id);
  }, [interval]);
  return now;
}

function buildGradient(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const a = h % 360;
  const b = (a + 60 + ((h >> 8) % 90)) % 360;
  return `linear-gradient(135deg, oklch(0.72 0.18 ${a}), oklch(0.55 0.17 ${b}))`;
}



