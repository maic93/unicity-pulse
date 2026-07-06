import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import {
  Play,
  Terminal,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { GlassCard } from "@/components/GlassCard";
import { JsonViewer } from "@/components/JsonViewer";
import { StatusBadge } from "@/components/StatusBadge";
import { ConnectGate } from "@/components/wallet/ConnectGate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  getBalances,
  getHistory,
  getIdentity,
  getLatestBlock,
  getNetworkStatus,
  rawIntent,
  rawQuery,
  sendTokens,
} from "@/lib/sphere/client";
import { useSphere } from "@/lib/sphere/provider";

export const Route = createFileRoute("/playground")({
  component: PlaygroundPage,
});

function PlaygroundPage() {
  return (
    <ClientOnly fallback={<Skeleton className="h-96 w-full" />}>
      <ConnectGate>
        <Playground />
      </ConnectGate>
    </ClientOnly>
  );
}

type Result =
  | { status: "idle" }
  | { status: "pending" }
  | { status: "ok"; response: unknown; duration: number; label: string }
  | { status: "error"; error: { message: string; stack?: string }; duration: number; label: string };

interface Preset {
  key: string;
  label: string;
  description: string;
  run: (ctx: { identity: ReturnType<typeof useSphere>["identity"] }) => Promise<unknown>;
}

const PRESETS: Preset[] = [
  {
    key: "getIdentity",
    label: "Get identity",
    description: "sphere_getIdentity — connected wallet metadata",
    run: () => getIdentity(),
  },
  {
    key: "getBalance",
    label: "Get balance",
    description: "sphere_getBalance — normalised coin balances",
    run: () => getBalances(),
  },
  {
    key: "getHistory",
    label: "Get history",
    description: "sphere_getHistory — last 100 transactions",
    run: () => getHistory(),
  },
  {
    key: "getNetwork",
    label: "Get network status",
    description: "sphere_getNetwork — network handshake info",
    run: () => getNetworkStatus(),
  },
  {
    key: "getLatestBlock",
    label: "Get latest block",
    description: "sphere_getLatestBlock (best-effort across providers)",
    run: () => getLatestBlock(),
  },
  {
    key: "walletInfo",
    label: "Get wallet information",
    description: "Composite: identity + balance + network",
    run: async () => {
      const [id, balance, network] = await Promise.all([
        getIdentity(),
        getBalances(),
        getNetworkStatus().catch((e) => ({ error: String(e) })),
      ]);
      return { identity: id, balance, network };
    },
  },
  {
    key: "sendTest",
    label: "Send test transaction",
    description: "intent:send — 0 UCT self-transfer (safe smoke test)",
    run: async ({ identity }) => {
      const recipient =
        identity?.nametag ?? identity?.directAddress ?? identity?.chainPubkey;
      if (!recipient) throw new Error("Wallet identity unavailable");
      return sendTokens({
        recipient,
        amount: "0",
        coinId: "UCT",
        memo: "unicity-dev-console:test",
      });
    },
  },
];

function Playground() {
  const { identity } = useSphere();
  const [result, setResult] = useState<Result>({ status: "idle" });
  const [customMethod, setCustomMethod] = useState("");
  const [customParams, setCustomParams] = useState("{}");
  const [customKind, setCustomKind] = useState<"query" | "intent">("query");

  async function execute(label: string, fn: () => Promise<unknown>) {
    setResult({ status: "pending" });
    const started = performance.now();
    try {
      const response = await fn();
      setResult({
        status: "ok",
        response,
        duration: Math.round(performance.now() - started),
        label,
      });
      toast.success(`${label} · ok`);
    } catch (err) {
      const e =
        err instanceof Error
          ? { message: err.message, stack: err.stack }
          : { message: String(err) };
      setResult({
        status: "error",
        error: e,
        duration: Math.round(performance.now() - started),
        label,
      });
      toast.error(`${label} · ${e.message}`);
    }
  }

  async function runCustom() {
    const method = customMethod.trim();
    if (!method) {
      toast.error("Enter an RPC method name");
      return;
    }
    let params: Record<string, unknown> | undefined;
    if (customParams.trim()) {
      try {
        const parsed = JSON.parse(customParams);
        if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
          throw new Error("Params must be a JSON object");
        }
        params = parsed as Record<string, unknown>;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Invalid JSON");
        return;
      }
    }
    await execute(
      `${customKind}:${method}`,
      () =>
        customKind === "query"
          ? rawQuery(method, params)
          : rawIntent(method, params ?? {}),
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="mono text-[11px] uppercase tracking-widest text-primary">
          Dev console · playground
        </p>
        <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Terminal className="h-6 w-6 text-primary" /> API Playground
        </h1>
        <p className="text-sm text-muted-foreground">
          Fire real Sphere Connect calls against the Unicity Testnet and inspect
          the raw responses.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard
          title="Presets"
          description="One-click calls to the official SDK methods"
        >
          <div className="grid gap-2 sm:grid-cols-2">
            {PRESETS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => void execute(p.label, () => p.run({ identity }))}
                disabled={result.status === "pending"}
                className="group rounded-lg border border-border bg-card/60 p-3 text-left transition-colors hover:border-primary/50 hover:bg-primary/5 disabled:opacity-50"
              >
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Play className="h-3.5 w-3.5 text-primary" /> {p.label}
                </div>
                <p className="mono mt-1 text-[11px] text-muted-foreground">
                  {p.description}
                </p>
              </button>
            ))}
          </div>
        </GlassCard>

        <GlassCard
          title="Custom call"
          description="Any sphere_* method or intent action"
        >
          <div className="space-y-3">
            <div>
              <Label>Kind</Label>
              <div className="mt-1 inline-flex overflow-hidden rounded-md border border-border">
                {(["query", "intent"] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setCustomKind(k)}
                    className={
                      customKind === k
                        ? "bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
                        : "px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                    }
                  >
                    {k}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label htmlFor="rpc-method">Method / action</Label>
              <Input
                id="rpc-method"
                placeholder="sphere_getIdentity"
                value={customMethod}
                onChange={(e) => setCustomMethod(e.target.value)}
                className="mono"
              />
            </div>
            <div>
              <Label htmlFor="rpc-params">Params (JSON object)</Label>
              <Textarea
                id="rpc-params"
                value={customParams}
                onChange={(e) => setCustomParams(e.target.value)}
                rows={5}
                className="mono text-xs"
              />
            </div>
            <Button
              onClick={() => void runCustom()}
              disabled={result.status === "pending"}
              className="w-full gap-2"
            >
              <Zap className="h-4 w-4" />
              {result.status === "pending" ? "Executing…" : "Execute"}
            </Button>
          </div>
        </GlassCard>
      </div>

      <GlassCard
        title="Response"
        description={
          result.status === "idle"
            ? "No call executed yet"
            : result.status === "pending"
              ? "Awaiting response…"
              : `${result.label} · ${result.duration}ms`
        }
        action={
          result.status === "ok" ? (
            <StatusBadge variant="success">ok</StatusBadge>
          ) : result.status === "error" ? (
            <StatusBadge variant="destructive">error</StatusBadge>
          ) : null
        }
      >
        {result.status === "idle" && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Click a preset above or send a custom request.
          </p>
        )}
        {result.status === "pending" && <Skeleton className="h-40 w-full" />}
        {result.status === "ok" && (
          <JsonViewer value={result.response} filename={`${result.label}.json`} />
        )}
        {result.status === "error" && (
          <div className="space-y-3">
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3">
              <p className="mono text-xs font-semibold text-destructive">
                {result.error.message}
              </p>
              {result.error.stack && (
                <pre className="mono mt-2 max-h-40 overflow-auto text-[11px] text-destructive/70">
                  {result.error.stack}
                </pre>
              )}
            </div>
            <ErrorHint message={result.error.message} />
          </div>
        )}
      </GlassCard>
    </div>
  );
}

function ErrorHint({ message }: { message: string }) {
  const m = message.toLowerCase();
  const hint =
    m.includes("not connected")
      ? "Reconnect the Sphere wallet using the button in the header."
      : m.includes("unauthorized") || m.includes("denied")
        ? "The wallet rejected this request. Approve it in the Sphere popup."
        : m.includes("timeout")
          ? "The gateway did not respond in time. Try again in a few seconds."
          : m.includes("json") || m.includes("parse")
            ? "Double-check the JSON syntax of your params."
            : "See the /logs tab for the full request payload and stack.";
  return (
    <p className="text-xs text-muted-foreground">
      <span className="mono uppercase tracking-widest text-foreground">
        suggested fix:
      </span>{" "}
      {hint}
    </p>
  );
}
