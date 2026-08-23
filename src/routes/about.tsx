import { createFileRoute } from "@tanstack/react-router";
import { BookOpen, Github, Globe, Package, Sparkles, Terminal } from "lucide-react";

import { GlassCard } from "@/components/GlassCard";
import { StatusBadge } from "@/components/StatusBadge";
import { SDK_PACKAGE, SDK_VERSION } from "@/lib/sphere/client";

export const Route = createFileRoute("/about")({
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="mono text-[11px] uppercase tracking-widest text-primary">About</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Unicity Dev Console</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          A developer console for exploring and interacting with the Unicity Testnet using the
          official Sphere SDK. Not a wallet — a dashboard, playground and log inspector aimed at
          engineers integrating Unicity into their applications.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <GlassCard
          title="Powered by"
          action={<StatusBadge variant="primary">official</StatusBadge>}
        >
          <div className="space-y-2 text-sm">
            <Row
              icon={<Package className="h-4 w-4" />}
              label={SDK_PACKAGE}
              value={`v${SDK_VERSION}`}
            />
            <Row icon={<Globe className="h-4 w-4" />} label="Network" value="testnet2 · id 4" />
            <Row
              icon={<Terminal className="h-4 w-4" />}
              label="Protocol"
              value="Sphere Connect v2"
            />
          </div>
        </GlassCard>

        <GlassCard title="What you can do">
          <ul className="space-y-2 text-sm text-muted-foreground">
            <Feature>Inspect your live Sphere Connect session</Feature>
            <Feature>Fire real SDK calls from the API Playground</Feature>
            <Feature>Watch every request in the live log timeline</Feature>
            <Feature>Search wallets & transactions in the explorer</Feature>
            <Feature>Export SDK responses as JSON</Feature>
          </ul>
        </GlassCard>
      </div>

      <GlassCard title="References">
        <ul className="space-y-3 text-sm">
          <LinkRow
            href="https://sphere.unicity.network"
            icon={<Globe className="h-4 w-4" />}
            label="Sphere Wallet"
            hint="sphere.unicity.network"
          />
          <LinkRow
            href="https://github.com/unicity-sphere/sphere-sdk"
            icon={<Github className="h-4 w-4" />}
            label="Sphere SDK on GitHub"
            hint="@unicitylabs/sphere-sdk"
          />
          <LinkRow
            href="https://github.com/unicity-sphere/sphere-sdk/blob/main/docs/CONNECT.md"
            icon={<BookOpen className="h-4 w-4" />}
            label="Sphere Connect protocol"
            hint="docs/CONNECT.md"
          />
        </ul>
      </GlassCard>

      <GlassCard title="Design notes">
        <p className="text-sm text-muted-foreground">
          Built with TanStack Start, TanStack Query, Tailwind CSS v4 and shadcn/ui. All blockchain
          data flows through the official Sphere SDK — this app never signs or transmits
          transactions on its own. Every RPC is logged in memory so developers can inspect the wire
          behaviour of the wallet in real time.
        </p>
      </GlassCard>
    </div>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="flex items-center gap-2 text-muted-foreground">
        <span className="grid h-6 w-6 place-items-center rounded-md bg-primary/10 text-primary">
          {icon}
        </span>
        {label}
      </span>
      <span className="mono">{value}</span>
    </div>
  );
}

function Feature({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
      <span>{children}</span>
    </li>
  );
}

function LinkRow({
  href,
  icon,
  label,
  hint,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  hint: string;
}) {
  return (
    <li>
      <a
        href={href}
        target="_blank"
        rel="noreferrer noopener"
        className="flex items-center justify-between rounded-lg border border-border bg-card/60 px-3 py-2 transition-colors hover:border-primary/40 hover:bg-primary/5"
      >
        <span className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/15 text-primary">
            {icon}
          </span>
          <span>
            <span className="block text-sm font-medium">{label}</span>
            <span className="mono block text-[11px] text-muted-foreground">{hint}</span>
          </span>
        </span>
        <span className="mono text-xs text-primary">open ↗</span>
      </a>
    </li>
  );
}
