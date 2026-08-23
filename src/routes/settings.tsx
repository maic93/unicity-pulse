import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { RotateCcw, Save } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { settingsStore, useSettings, type DevConsoleSettings } from "@/lib/settings";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <ClientOnly fallback={null}>
      <SettingsView />
    </ClientOnly>
  );
}

const REFRESH_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 0, label: "Off (manual)" },
  { value: 5_000, label: "5 seconds" },
  { value: 15_000, label: "15 seconds" },
  { value: 30_000, label: "30 seconds" },
  { value: 60_000, label: "1 minute" },
  { value: 300_000, label: "5 minutes" },
];

const LANDING_OPTIONS: Array<{ value: DevConsoleSettings["defaultLanding"]; label: string }> = [
  { value: "/", label: "Dashboard" },
  { value: "/wallet", label: "Wallet" },
  { value: "/playground", label: "API Playground" },
  { value: "/logs", label: "Logs" },
  { value: "/explorer", label: "Explorer" },
];

function SettingsView() {
  const settings = useSettings();
  const [draft, setDraft] = useState<DevConsoleSettings>(settings);
  const dirty = JSON.stringify(draft) !== JSON.stringify(settings);

  function save() {
    settingsStore.set(draft);
    toast.success("Settings saved");
  }

  function reset() {
    settingsStore.reset();
    setDraft(settingsStore.get());
    toast("Settings reset");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="mono text-[11px] uppercase tracking-widest text-primary">
          Dev console · configuration
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Preferences are stored in your browser's local storage.
        </p>
      </div>

      <GlassCard title="Appearance">
        <Row
          label="Dark mode"
          hint="Unicity Dev Console is dark-first. Light mode isn't available yet."
        >
          <Switch checked disabled />
        </Row>
      </GlassCard>

      <GlassCard title="Data">
        <Row
          label="Auto-refresh interval"
          hint="How often to poll sphere_getBalance and sphere_getHistory."
        >
          <Select
            value={String(draft.autoRefreshMs)}
            onValueChange={(v) => setDraft((d) => ({ ...d, autoRefreshMs: Number(v) }))}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REFRESH_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={String(o.value)}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Row>
        <Row label="Default landing page" hint="The route the sidebar 'U' logo points to.">
          <Select
            value={draft.defaultLanding}
            onValueChange={(v) =>
              setDraft((d) => ({
                ...d,
                defaultLanding: v as DevConsoleSettings["defaultLanding"],
              }))
            }
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANDING_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Row>
      </GlassCard>

      <GlassCard title="Developer">
        <Row
          label="Developer mode"
          hint="Shows extra diagnostic panels and unfiltered SDK payloads."
        >
          <Switch
            checked={draft.developerMode}
            onCheckedChange={(v) => setDraft((d) => ({ ...d, developerMode: v }))}
          />
        </Row>
      </GlassCard>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={reset} className="gap-2">
          <RotateCcw className="h-4 w-4" /> Reset
        </Button>
        <Button onClick={save} disabled={!dirty} className="gap-2">
          <Save className="h-4 w-4" /> Save changes
        </Button>
      </div>
    </div>
  );
}

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-3 last:border-none last:pb-0">
      <div className="min-w-0">
        <Label className="text-sm">{label}</Label>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
