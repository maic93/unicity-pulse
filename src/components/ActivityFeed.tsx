/**
 * ActivityFeed — real-time log of session events derived from the SDK log.
 * Never mocks data: entries come from `sdkLog` which records every real
 * SDK call, intent and wallet lifecycle event.
 */
import { useEffect, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  CheckCircle2,
  Radio,
  Link2,
  XCircle,
} from "lucide-react";

import { sdkLog, type SdkLogEntry } from "@/lib/sphere/log";
import { formatRelative } from "@/lib/format";

export function ActivityFeed({ limit = 8 }: { limit?: number }) {
  const [entries, setEntries] = useState<SdkLogEntry[]>([]);

  useEffect(() => sdkLog.subscribe(setEntries), []);

  const visible = entries.slice(0, limit);

  if (visible.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Waiting for the first SDK event…
      </p>
    );
  }

  return (
    <ol className="space-y-3">
      {visible.map((e, i) => (
        <li
          key={e.id}
          className="flex items-start gap-3 rounded-xl border border-border/60 bg-card/40 p-3 animate-fade-up"
          style={{ animationDelay: `${Math.min(i, 6) * 50}ms` }}
        >
          <span
            className={
              "mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg " +
              badgeClass(e)
            }
          >
            {iconFor(e)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <p className="mono truncate text-sm">{prettyMethod(e)}</p>
              <span className="mono shrink-0 text-[10px] uppercase tracking-widest text-muted-foreground">
                {formatRelative(e.startedAt)}
              </span>
            </div>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {subtitleFor(e)}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function iconFor(e: SdkLogEntry) {
  if (e.status === "error") return <XCircle className="h-4 w-4" />;
  if (e.kind === "connect") return <Link2 className="h-4 w-4" />;
  if (e.kind === "disconnect") return <Link2 className="h-4 w-4" />;
  if (e.kind === "intent") return <ArrowUpRight className="h-4 w-4" />;
  if (e.kind === "event") return <Radio className="h-4 w-4" />;
  if (e.status === "ok") return <CheckCircle2 className="h-4 w-4" />;
  return <Activity className="h-4 w-4" />;
}

function badgeClass(e: SdkLogEntry) {
  if (e.status === "error")
    return "bg-destructive/15 text-destructive";
  if (e.kind === "intent") return "bg-primary/15 text-primary";
  if (e.kind === "connect" || e.kind === "disconnect")
    return "bg-secondary/15 text-secondary";
  if (e.kind === "event") return "bg-warning/15 text-warning";
  return "bg-success/15 text-success";
}

function prettyMethod(e: SdkLogEntry) {
  if (e.kind === "event") return e.method;
  return e.method;
}

function subtitleFor(e: SdkLogEntry) {
  if (e.status === "error") return e.error?.message ?? "Failed";
  if (e.kind === "intent") return "Intent dispatched to wallet";
  if (e.kind === "connect") return "Sphere Connect session established";
  if (e.kind === "disconnect") return "Session closed";
  if (e.kind === "event") return "Wallet lifecycle event";
  return e.duration !== undefined
    ? `${e.duration}ms · RPC query`
    : "RPC query";
}
