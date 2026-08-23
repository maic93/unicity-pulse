import { createFileRoute, ClientOnly, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  Blocks,
  CheckCircle2,
  Clock,
  Copy,
  Fingerprint,
  Gauge,
  Network,
  Package,
  Radio,
  RefreshCcw,
  Sparkles,
  Wallet as WalletIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { ActivityFeed } from "@/components/ActivityFeed";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { PulseSphere } from "@/components/PulseSphere";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useBalances,
  useGatewayHealth,
  useHistory,
  useLatestBlock,
  useSphere,
} from "@/lib/sphere/provider";
import {
  GATEWAY_URL,
  SDK_PACKAGE,
  SDK_VERSION,
  TESTNET_NETWORK,
} from "@/lib/sphere/client";
import { formatRelative, shortAddress } from "@/lib/format";

export const Route = createFileRoute("/")({
  component: PulsePage,
});

function PulsePage() {
  return (
    <ClientOnly fallback={<PulseSkeleton />}>
      <PulseHero />
    </ClientOnly>
  );
}

function PulseHero() {
  const {
    identity,
    network,
    transport,
    sessionId,
    connectedAt,
    isConnected,
    isLocked,
    isNetworkMismatch,
    connect,
    isConnecting,
  } = useSphere();
  const balances = useBalances();
  const history = useHistory();
  const gateway = useGatewayHealth();
  const latency = gateway.data?.latencyMs ?? null;
  const gatewayHealthy = gateway.data?.status === "healthy";

  // Real chain tip, read straight from the testnet2 gateway (public data).
  const latestBlock = useLatestBlock();

  const primary = balances.data?.[0];
  const address =
    identity?.nametag ?? identity?.directAddress ?? identity?.chainPubkey ?? "";
  const blockHeight = extractBlockHeight(latestBlock.data);
  const historyCount = history.data?.length ?? 0;

  // Compute pulse intensity from recent activity
  const intensity = useMemo(() => {
    if (!isConnected) return 0.25;
    const base = 0.35 + Math.min(0.35, historyCount / 30);
    // Fresh block bumps intensity briefly
    return Math.min(1, base + (latestBlock.isFetching ? 0.15 : 0));
  }, [isConnected, historyCount, latestBlock.isFetching]);

  const balanceNum = primary ? Number(primary.amount) : 0;

  // ---- Reactive pulse triggers (new block, new tx, connect, balance change)
  const [pulseKey, setPulseKey] = useState(0);
  const [pulseTone, setPulseTone] = useState<"primary" | "secondary" | "success">("primary");
  const bump = (tone: "primary" | "secondary" | "success") => {
    setPulseTone(tone);
    setPulseKey((k) => k + 1);
  };
  const prevBlock = useRef<number | null>(null);
  const prevTxId = useRef<string | null>(null);
  const prevBalance = useRef<number | null>(null);
  const prevConnected = useRef<boolean>(false);
  useEffect(() => {
    if (blockHeight !== null && prevBlock.current !== null && blockHeight !== prevBlock.current) {
      bump("secondary");
    }
    prevBlock.current = blockHeight;
  }, [blockHeight]);
  useEffect(() => {
    const top = history.data?.[0];
    const id = top ? `${top.hash ?? ""}-${top.timestamp ?? ""}` : null;
    if (id && prevTxId.current !== null && id !== prevTxId.current) {
      bump(top?.direction === "in" ? "success" : "primary");
    }
    prevTxId.current = id;
  }, [history.data]);
  useEffect(() => {
    if (primary && prevBalance.current !== null && balanceNum !== prevBalance.current) {
      bump("success");
    }
    prevBalance.current = primary ? balanceNum : null;
  }, [balanceNum, primary]);
  useEffect(() => {
    if (isConnected && !prevConnected.current) bump("primary");
    prevConnected.current = isConnected;
  }, [isConnected]);

  // ---- Easter egg: click sphere 5x → Pulse Mode
  const [pulseMode, setPulseMode] = useState(false);
  const clickCount = useRef(0);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSphereClick = () => {
    bump(pulseMode ? "secondary" : "primary");
    clickCount.current += 1;
    if (clickTimer.current) clearTimeout(clickTimer.current);
    clickTimer.current = setTimeout(() => {
      clickCount.current = 0;
    }, 1500);
    if (clickCount.current >= 5 && !pulseMode) {
      setPulseMode(true);
      clickCount.current = 0;
      toast.success("Pulse Mode Activated", {
        description: "The sphere burns brighter. Click again to disable.",
      });
    } else if (clickCount.current >= 5 && pulseMode) {
      setPulseMode(false);
      clickCount.current = 0;
      toast("Pulse Mode disabled");
    }
  };

  const refreshAll = () => {
    void balances.refetch();
    void history.refetch();
    void latestBlock.refetch();
    toast("Refreshing pulse…");
  };

  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-[2rem] border border-border/60">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 20% 20%, oklch(0.74 0.19 45 / 0.15), transparent 55%), radial-gradient(circle at 85% 30%, oklch(0.68 0.19 245 / 0.18), transparent 55%), linear-gradient(135deg, oklch(0.16 0.014 260 / 0.9), oklch(0.11 0.014 260 / 0.9))",
          }}
        />
        <div className="relative grid gap-10 p-8 md:p-12 lg:grid-cols-[1.1fr_1fr] lg:items-center">
          <div className="animate-fade-up">
            <div className="mono inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-[10px] uppercase tracking-[0.28em] text-primary">
              <Sparkles className="h-3 w-3" />
              Unicity Pulse
            </div>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              <span className="text-gradient-mix">Watch the blockchain</span>
              <br />
              <span className="text-foreground">breathe.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base text-muted-foreground">
              An immersive visualization platform for the Unicity Testnet.
              Real blockchain data, animated identity, live analytics — powered
              by the official Sphere SDK.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              {!isConnected ? (
                <Button
                  className="rounded-full px-6 glow-primary"
                  onClick={() => void connect()}
                  disabled={isConnecting}
                >
                  {isConnecting ? "Connecting…" : "Connect Sphere Wallet"}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="rounded-full gap-2 border-border/60"
                  onClick={refreshAll}
                >
                  <RefreshCcw className="h-4 w-4" />
                  Refresh pulse
                </Button>
              )}
              <Link
                to="/transactions"
                className="mono inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/40 px-4 py-2 text-xs uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
              >
                Timeline
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                to="/explorer"
                className="mono inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/40 px-4 py-2 text-xs uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
              >
                Explorer
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <MiniStat
                label="Latency"
                value={
                  latency === null ? "—" : `${latency}`
                }
                suffix={latency === null ? "" : "ms"}
              />
              <MiniStat
                label="Block"
                value={blockHeight !== null ? `#${blockHeight.toLocaleString()}` : "—"}
              />
              <MiniStat
                label="Session"
                value={sessionId ? shortAddress(sessionId, 4, 4) : "—"}
              />
              <MiniStat
                label="Transport"
                value={transport ?? "—"}
              />
            </div>
          </div>
          <div className="relative flex items-center justify-center">
            <PulseSphere
              intensity={intensity}
              active={isConnected}
              size={380}
              className="max-w-full"
              pulseKey={pulseKey}
              pulseTone={pulseTone}
              pulseMode={pulseMode}
              onClick={handleSphereClick}
            />
          </div>
        </div>
      </section>

      {/* Live Pulse Dashboard */}
      <section>
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <p className="mono text-[11px] uppercase tracking-[0.25em] text-secondary">
              Live command center
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">
              Real-time network pulse
            </h2>
          </div>
          {isConnected && (
            <Button
              variant="outline"
              size="sm"
              className="rounded-full gap-2"
              onClick={refreshAll}
            >
              <RefreshCcw className="h-3.5 w-3.5" />
              Refresh
            </Button>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <PulseStat
            icon={<Radio className="h-4 w-4" />}
            label="Network health"
            value={
              <span className="inline-flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full bg-success"
                  style={{ boxShadow: "0 0 12px oklch(0.74 0.16 155 / 0.9)" }}
                />
                Online
              </span>
            }
            hint={`gateway · ${latency ?? "—"} ms`}
            tone="success"
          />
          <PulseStat
            icon={<WalletIcon className="h-4 w-4" />}
            label="Connected wallet"
            value={
              isConnected ? (
                <button
                  type="button"
                  className="mono truncate text-left text-base hover:text-primary"
                  onClick={() => {
                    void navigator.clipboard.writeText(address);
                    toast.success("Address copied");
                  }}
                  title={address}
                >
                  {identity?.nametag ?? shortAddress(address, 8, 6)}
                </button>
              ) : (
                <span className="text-muted-foreground text-base">
                  Not connected
                </span>
              )
            }
            hint={
              isConnected ? (
                <span className="inline-flex items-center gap-1.5">
                  <Copy className="h-3 w-3" />
                  {shortAddress(address, 6, 6)}
                </span>
              ) : (
                "Approve in Sphere"
              )
            }
            tone="primary"
          />
          <PulseStat
            icon={<Blocks className="h-4 w-4" />}
            label="Current block"
            value={
              latestBlock.isLoading ? (
                <Skeleton className="h-7 w-24" />
              ) : blockHeight !== null ? (
                <span className="mono">
                  #<AnimatedCounter value={blockHeight} />
                </span>
              ) : (
                <span className="text-muted-foreground text-sm">
                  Not exposed
                </span>
              )
            }
            hint={
              latestBlock.error
                ? "sphere_getLatestBlock unavailable"
                : "auto-refresh 20s"
            }
            tone="secondary"
            action={
              <button
                type="button"
                onClick={() => void latestBlock.refetch()}
                className="rounded-md p-1 hover:bg-muted/50"
                aria-label="Refresh block"
              >
                <RefreshCcw
                  className={
                    latestBlock.isFetching
                      ? "h-3.5 w-3.5 animate-spin text-secondary"
                      : "h-3.5 w-3.5 text-muted-foreground"
                  }
                />
              </button>
            }
          />
          <PulseStat
            icon={<Gauge className="h-4 w-4" />}
            label="Balance"
            value={
              !isConnected ? (
                <span className="text-muted-foreground text-sm">—</span>
              ) : balances.isLoading ? (
                <Skeleton className="h-7 w-24" />
              ) : primary ? (
                <span className="mono">
                  <AnimatedCounter
                    value={balanceNum}
                    decimals={Math.min(4, primary.decimals ?? 0)}
                  />{" "}
                  <span className="text-sm text-muted-foreground">
                    {primary.symbol}
                  </span>
                </span>
              ) : (
                <span className="text-muted-foreground text-sm">Empty</span>
              )
            }
            hint={
              balances.dataUpdatedAt
                ? `synced ${formatRelative(balances.dataUpdatedAt)}`
                : "—"
            }
            tone="primary"
          />
          <PulseStat
            icon={<Network className="h-4 w-4" />}
            label="Network"
            value={
              <span className="mono">
                {network?.name ?? "testnet2"}
              </span>
            }
            hint={`id ${network?.id ?? 4} · ${GATEWAY_URL.replace(/^https?:\/\//, "")}`}
            tone="secondary"
          />
          <PulseStat
            icon={<Package className="h-4 w-4" />}
            label="SDK"
            value={
              <span className="mono">
                v{SDK_VERSION}
              </span>
            }
            hint={SDK_PACKAGE}
            tone="neutral"
          />
          <PulseStat
            icon={<Fingerprint className="h-4 w-4" />}
            label="Session duration"
            value={<SessionDuration since={connectedAt} />}
            hint={
              sessionId ? shortAddress(sessionId, 6, 6) : "no session"
            }
            tone="secondary"
          />
          <PulseStat
            icon={<Clock className="h-4 w-4" />}
            label="Latest activity"
            value={
              !isConnected ? (
                <span className="text-muted-foreground text-sm">—</span>
              ) : history.data && history.data.length > 0 ? (
                <span className="text-base">
                  {formatRelative(history.data[0].timestamp)}
                </span>
              ) : (
                <span className="text-muted-foreground text-sm">
                  No activity
                </span>
              )
            }
            hint={
              history.data
                ? `${history.data.length} transactions in cache`
                : "not loaded"
            }
            tone="primary"
          />
        </div>
      </section>

      {/* Feed + connection */}
      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="glass rounded-3xl p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="mono text-[10px] uppercase tracking-[0.25em] text-secondary">
                Live activity feed
              </p>
              <h3 className="mt-1 text-lg font-semibold tracking-tight">
                Every SDK heartbeat
              </h3>
            </div>
            <StatusBadge variant="success">Streaming</StatusBadge>
          </div>
          <ActivityFeed limit={8} />
        </div>
        <div className="glass rounded-3xl p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="mono text-[10px] uppercase tracking-[0.25em] text-secondary">
                Connection status
              </p>
              <h3 className="mt-1 text-lg font-semibold tracking-tight">
                Sphere Connect
              </h3>
            </div>
            {isConnected ? (
              <StatusBadge variant="success">Live</StatusBadge>
            ) : (
              <StatusBadge variant="warning">Offline</StatusBadge>
            )}
          </div>
          <dl className="space-y-3 text-sm">
            <Row
              label="Status"
              value={
                <span className="inline-flex items-center gap-2">
                  <CheckCircle2
                    className={
                      isConnected
                        ? "h-4 w-4 text-success"
                        : "h-4 w-4 text-muted-foreground"
                    }
                  />
                  {isConnected ? "Connected" : "Disconnected"}
                </span>
              }
            />
            <Row label="Transport" value={transport ?? "—"} mono />
            <Row label="Network" value={network?.name ?? "testnet2"} mono />
            <Row
              label="Session"
              value={sessionId ? shortAddress(sessionId, 8, 8) : "—"}
              mono
            />
            <Row
              label="Established"
              value={connectedAt ? formatRelative(connectedAt) : "—"}
              mono
            />
          </dl>
        </div>
      </section>
    </div>
  );
}

function MiniStat({
  label,
  value,
  suffix,
}: {
  label: string;
  value: string;
  suffix?: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/40 px-3 py-2">
      <p className="mono text-[9px] uppercase tracking-[0.25em] text-muted-foreground">
        {label}
      </p>
      <p className="mono mt-0.5 truncate text-sm font-medium">
        {value}
        {suffix && (
          <span className="ml-1 text-xs text-muted-foreground">{suffix}</span>
        )}
      </p>
    </div>
  );
}

function PulseStat({
  icon,
  label,
  value,
  hint,
  tone,
  action,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone: "primary" | "secondary" | "success" | "neutral";
  action?: ReactNode;
}) {
  const toneClass =
    tone === "success"
      ? "bg-success/15 text-success"
      : tone === "secondary"
        ? "bg-secondary/15 text-secondary"
        : tone === "neutral"
          ? "bg-muted text-muted-foreground"
          : "bg-primary/15 text-primary";
  return (
    <div className="glass hover-lift rounded-2xl p-5 animate-fade-up">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span
            className={"grid h-7 w-7 place-items-center rounded-lg " + toneClass}
          >
            {icon}
          </span>
          <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            {label}
          </p>
        </div>
        {action}
      </div>
      <div className="mt-3 text-xl font-semibold tracking-tight">{value}</div>
      {hint && (
        <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/40 pb-3 last:border-0 last:pb-0">
      <dt className="text-[11px] uppercase tracking-widest text-muted-foreground">
        {label}
      </dt>
      <dd
        className={
          mono
            ? "mono max-w-[65%] break-all text-right text-xs"
            : "max-w-[65%] break-all text-right text-sm"
        }
      >
        {value}
      </dd>
    </div>
  );
}

function SessionDuration({ since }: { since: number | null }) {
  const now = useNowTick(since ? 1000 : 0);
  if (!since)
    return <span className="text-muted-foreground text-sm">—</span>;
  const s = Math.max(0, Math.floor((now - since) / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return (
    <span className="mono">
      {h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${sec.toString().padStart(2, "0")}s` : `${sec}s`}
    </span>
  );
}

function useNowTick(interval: number) {
  const [now, setNow] = useState(() => Date.now());
  const ref = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (!interval) return;
    ref.current = setInterval(() => setNow(Date.now()), interval);
    return () => {
      if (ref.current) clearInterval(ref.current);
    };
  }, [interval]);
  return now;
}

function extractBlockHeight(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "number") return raw;
  if (typeof raw === "string" && /^\d+$/.test(raw)) return Number(raw);
  if (typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    for (const key of ["height", "number", "block", "blockNumber", "index"]) {
      const v = o[key];
      if (typeof v === "number") return v;
      if (typeof v === "string" && /^\d+$/.test(v)) return Number(v);
    }
  }
  return null;
}

function PulseSkeleton() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-[420px] w-full rounded-[2rem]" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
