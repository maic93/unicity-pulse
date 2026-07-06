import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { useMemo, useState, useSyncExternalStore } from "react";
import {
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { GlassCard } from "@/components/GlassCard";
import { JsonViewer } from "@/components/JsonViewer";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sdkLog, type SdkLogEntry } from "@/lib/sphere/log";
import { formatTimestamp } from "@/lib/format";

export const Route = createFileRoute("/logs")({
  component: LogsPage,
});

function LogsPage() {
  return (
    <ClientOnly fallback={null}>
      <LogsView />
    </ClientOnly>
  );
}

function useLogs(): SdkLogEntry[] {
  return useSyncExternalStore(
    (cb) => sdkLog.subscribe(cb),
    () => sdkLog.list(),
    () => [],
  );
}

function LogsView() {
  const logs = useLogs();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "ok" | "error" | "pending">("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return logs.filter((l) => {
      if (status !== "all" && l.status !== status) return false;
      if (!query) return true;
      const q = query.toLowerCase();
      return (
        l.method.toLowerCase().includes(q) ||
        JSON.stringify(l.params ?? "").toLowerCase().includes(q)
      );
    });
  }, [logs, query, status]);

  const timeline = useMemo(() => buildTimeline(logs), [logs]);

  return (
    <div className="space-y-6">
      <div>
        <p className="mono text-[11px] uppercase tracking-widest text-primary">
          Dev console · observability
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Logs</h1>
        <p className="text-sm text-muted-foreground">
          Every SDK call, intent and lifecycle event captured in real time.
        </p>
      </div>

      <GlassCard title="Request timeline" description="Session events">
        {timeline.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No events recorded yet.
          </p>
        ) : (
          <ol className="relative space-y-3 pl-4 before:absolute before:left-1 before:top-1 before:bottom-1 before:w-px before:bg-border">
            {timeline.map((t) => (
              <li key={t.id} className="relative">
                <span
                  className={
                    "absolute -left-[9px] top-1.5 h-2.5 w-2.5 rounded-full " +
                    (t.status === "error"
                      ? "bg-destructive"
                      : t.status === "pending"
                        ? "bg-warning"
                        : "bg-success")
                  }
                />
                <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
                  <span className="mono text-foreground">{t.method}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatTimestamp(t.startedAt)}
                  </span>
                  {t.duration !== undefined && (
                    <span className="mono text-[11px] text-muted-foreground">
                      · {t.duration}ms
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </GlassCard>

      <GlassCard
        title="Request log"
        description={`${filtered.length} of ${logs.length} entries`}
        action={
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                void navigator.clipboard.writeText(JSON.stringify(logs, null, 2));
                toast.success("Logs copied");
              }}
              className="gap-1.5"
            >
              <Copy className="h-3.5 w-3.5" /> Copy
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => downloadJson("sdk-logs.json", logs)}
              className="gap-1.5"
            >
              <Download className="h-3.5 w-3.5" /> Export
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                sdkLog.clear();
                toast("Logs cleared");
              }}
              className="gap-1.5 text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" /> Clear
            </Button>
          </div>
        }
      >
        <div className="mb-3 flex flex-wrap gap-2">
          <Input
            placeholder="Filter by method or params…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="max-w-sm"
          />
          <div className="flex gap-1 rounded-md border border-border bg-card/60 p-1">
            {(["all", "ok", "error", "pending"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={
                  status === s
                    ? "rounded-sm bg-primary px-3 py-1 text-xs font-medium text-primary-foreground"
                    : "rounded-sm px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
                }
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No matching entries.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((entry) => {
              const isOpen = expanded === entry.id;
              return (
                <li key={entry.id}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 py-2.5 text-left hover:bg-muted/20"
                    onClick={() => setExpanded(isOpen ? null : entry.id)}
                  >
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span
                      className={
                        "mono rounded-md px-1.5 py-0.5 text-[10px] uppercase " +
                        kindClass(entry.kind)
                      }
                    >
                      {entry.kind}
                    </span>
                    <span className="mono flex-1 truncate text-sm">
                      {entry.method}
                    </span>
                    <span className="mono text-[11px] text-muted-foreground">
                      {entry.duration !== undefined ? `${entry.duration}ms` : "…"}
                    </span>
                    <StatusBadge
                      variant={
                        entry.status === "ok"
                          ? "success"
                          : entry.status === "error"
                            ? "destructive"
                            : "warning"
                      }
                    >
                      {entry.status}
                    </StatusBadge>
                    <span className="hidden text-xs text-muted-foreground sm:inline">
                      {formatTimestamp(entry.startedAt)}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="space-y-3 pb-4 pl-8 pr-3">
                      <Section label="Request">
                        <JsonViewer
                          value={{ method: entry.method, params: entry.params ?? null }}
                          filename={`${entry.method}-request.json`}
                          maxHeight={200}
                        />
                      </Section>
                      <Section label="Response">
                        <JsonViewer
                          value={entry.response ?? entry.error ?? null}
                          filename={`${entry.method}-response.json`}
                          emptyMessage="No response captured"
                          maxHeight={280}
                        />
                      </Section>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </GlassCard>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mono mb-1 flex items-center gap-1 text-[10px] uppercase tracking-widest text-muted-foreground">
        <ArrowRight className="h-3 w-3" /> {label}
      </p>
      {children}
    </div>
  );
}

function kindClass(kind: SdkLogEntry["kind"]) {
  switch (kind) {
    case "query":
      return "border border-primary/40 bg-primary/10 text-primary";
    case "intent":
      return "border border-amber-500/40 bg-amber-500/10 text-amber-300";
    case "connect":
    case "disconnect":
      return "border border-success/40 bg-success/10 text-success";
    case "event":
      return "border border-border text-muted-foreground";
  }
}

interface TimelineItem {
  id: string;
  method: string;
  startedAt: number;
  duration?: number;
  status: SdkLogEntry["status"];
}

function buildTimeline(logs: SdkLogEntry[]): TimelineItem[] {
  const seen = new Set<string>();
  const out: TimelineItem[] = [];
  for (const l of logs) {
    if (seen.has(l.method) && l.status === "ok") continue;
    seen.add(l.method);
    out.push({
      id: l.id,
      method: l.method,
      startedAt: l.startedAt,
      duration: l.duration,
      status: l.status,
    });
    if (out.length >= 15) break;
  }
  return out;
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
