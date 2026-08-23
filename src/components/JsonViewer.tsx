import { Copy, Download } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function JsonViewer({
  value,
  filename = "response.json",
  className,
  emptyMessage = "No data",
  maxHeight = 400,
}: {
  value: unknown;
  filename?: string;
  className?: string;
  emptyMessage?: string;
  maxHeight?: number;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const text = useMemo(() => safeStringify(value), [value]);

  if (value === undefined || value === null) {
    return (
      <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={cn("rounded-lg border border-border bg-card/60", className)}>
      <div className="flex items-center justify-between border-b border-border px-3 py-2 text-xs">
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="mono text-muted-foreground hover:text-foreground"
        >
          {collapsed ? "▶ Expand" : "▼ Collapse"}{" "}
          <span className="ml-1 text-[10px] uppercase tracking-wider">
            application/json · {text.length} chars
          </span>
        </button>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              void navigator.clipboard.writeText(text);
              toast.success("JSON copied");
            }}
            className="h-7 gap-1.5 text-xs"
          >
            <Copy className="h-3 w-3" /> Copy
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => downloadJson(filename, text)}
            className="h-7 gap-1.5 text-xs"
          >
            <Download className="h-3 w-3" /> Download
          </Button>
        </div>
      </div>
      {!collapsed && (
        <pre className="mono overflow-auto p-3 text-xs leading-relaxed" style={{ maxHeight }}>
          <code dangerouslySetInnerHTML={{ __html: highlight(text) }} />
        </pre>
      )}
    </div>
  );
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value, (_k, v) => (typeof v === "bigint" ? v.toString() : v), 2);
  } catch {
    return String(value);
  }
}

function downloadJson(name: string, text: string) {
  if (typeof window === "undefined") return;
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Very small JSON syntax highlighter using semantic token classes. */
function highlight(json: string): string {
  const escaped = escapeHtml(json);
  return escaped.replace(
    /("(\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g,
    (match) => {
      let cls = "text-primary";
      if (/^"/.test(match)) {
        cls = /:$/.test(match) ? "text-[hsl(var(--success))]" : "text-amber-300";
      } else if (/true|false/.test(match)) {
        cls = "text-sky-300";
      } else if (/null/.test(match)) {
        cls = "text-muted-foreground";
      } else {
        cls = "text-purple-300";
      }
      return `<span class="${cls}">${match}</span>`;
    },
  );
}
