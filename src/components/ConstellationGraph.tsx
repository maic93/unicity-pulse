/**
 * ConstellationGraph — signature visualization for Unicity Pulse.
 * The connected wallet sits at the center; every transaction counterparty
 * is a glowing satellite node. Transactions become animated beams.
 *
 * If network-wide topology is not exposed by the SDK, we still visualize
 * the connected wallet and its transactions — the architecture is
 * extensible to additional nodes.
 */
import { useMemo, useState } from "react";

import { shortAddress } from "@/lib/format";
import type { HistoryEntry } from "@/lib/sphere/types";

interface Props {
  center: {
    label: string;
    address: string;
  };
  history: HistoryEntry[];
  height?: number;
}

interface Node {
  key: string;
  address: string;
  label: string;
  totalIn: number;
  totalOut: number;
  count: number;
  angle: number;
  radius: number;
}

export function ConstellationGraph({ center, history, height = 420 }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);

  const nodes = useMemo<Node[]>(() => {
    const byAddr = new Map<string, Node>();
    for (const t of history) {
      const key = t.counterparty ?? "unknown";
      const amount = Number(t.amount) || 0;
      const existing = byAddr.get(key);
      if (existing) {
        if (t.direction === "in") existing.totalIn += amount;
        else existing.totalOut += amount;
        existing.count += 1;
      } else {
        byAddr.set(key, {
          key,
          address: key,
          label: key === "unknown" ? "Unknown" : shortAddress(key, 5, 4),
          totalIn: t.direction === "in" ? amount : 0,
          totalOut: t.direction === "out" ? amount : 0,
          count: 1,
          angle: 0,
          radius: 0,
        });
      }
    }
    const arr = Array.from(byAddr.values()).slice(0, 24);
    arr.forEach((n, i) => {
      n.angle = (i / Math.max(1, arr.length)) * Math.PI * 2 - Math.PI / 2;
      const layer = i % 3;
      n.radius = 130 + layer * 55;
    });
    return arr;
  }, [history]);

  const selected = nodes.find((n) => n.key === hovered);

  return (
    <div
      className="relative overflow-hidden rounded-3xl border border-border/60"
      style={{ height }}
    >
      {/* backdrop */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, oklch(0.2 0.02 260 / 0.9), oklch(0.11 0.014 260) 70%)",
        }}
      />
      <svg
        viewBox="-300 -220 600 440"
        preserveAspectRatio="xMidYMid meet"
        className="absolute inset-0 h-full w-full"
      >
        <defs>
          <radialGradient id="core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="oklch(1 0.05 60)" />
            <stop offset="60%" stopColor="oklch(0.74 0.19 45)" />
            <stop offset="100%" stopColor="oklch(0.4 0.14 30 / 0)" />
          </radialGradient>
          <radialGradient id="node-in" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="oklch(0.88 0.16 155)" />
            <stop offset="100%" stopColor="oklch(0.4 0.1 155 / 0)" />
          </radialGradient>
          <radialGradient id="node-out" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="oklch(0.85 0.18 45)" />
            <stop offset="100%" stopColor="oklch(0.4 0.12 30 / 0)" />
          </radialGradient>
          <linearGradient id="beam" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="oklch(0.74 0.19 45 / 0.9)" />
            <stop offset="100%" stopColor="oklch(0.68 0.19 245 / 0)" />
          </linearGradient>
        </defs>

        {/* Orbit guides */}
        {[130, 185, 240].map((r) => (
          <circle
            key={r}
            cx="0"
            cy="0"
            r={r}
            fill="none"
            stroke="oklch(1 0 0 / 0.05)"
            strokeDasharray="3 6"
          />
        ))}

        {/* Beams to nodes */}
        {nodes.map((n, i) => {
          const x = Math.cos(n.angle) * n.radius;
          const y = Math.sin(n.angle) * n.radius;
          return (
            <line
              key={`beam-${n.key}`}
              x1="0"
              y1="0"
              x2={x}
              y2={y}
              stroke="url(#beam)"
              strokeWidth={hovered === n.key ? 2 : 1}
              strokeDasharray="4 6"
              strokeDashoffset="200"
              style={{
                animation: `beam 3.5s ${(i * 0.15).toFixed(2)}s ease-out infinite`,
              }}
            />
          );
        })}

        {/* Nodes */}
        {nodes.map((n) => {
          const x = Math.cos(n.angle) * n.radius;
          const y = Math.sin(n.angle) * n.radius;
          const incoming = n.totalIn >= n.totalOut;
          return (
            <g
              key={n.key}
              transform={`translate(${x} ${y})`}
              onMouseEnter={() => setHovered(n.key)}
              onMouseLeave={() => setHovered((h) => (h === n.key ? null : h))}
              style={{ cursor: "pointer" }}
            >
              <circle r="22" fill={incoming ? "url(#node-in)" : "url(#node-out)"} opacity="0.55" />
              <circle
                r={Math.min(9, 4 + n.count * 0.8)}
                fill={incoming ? "oklch(0.85 0.16 155)" : "oklch(0.85 0.18 45)"}
                stroke="oklch(1 0 0 / 0.4)"
                strokeWidth="0.8"
              />
              {hovered === n.key && (
                <text
                  y="-16"
                  textAnchor="middle"
                  className="mono"
                  fontSize="9"
                  fill="oklch(0.95 0.005 260)"
                >
                  {n.label}
                </text>
              )}
            </g>
          );
        })}

        {/* Center core */}
        <g>
          <circle r="60" fill="url(#core)" opacity="0.6" />
          <circle
            r="24"
            fill="oklch(0.74 0.19 45)"
            stroke="oklch(1 0.05 60)"
            strokeWidth="1"
            style={{
              filter: "drop-shadow(0 0 20px oklch(0.74 0.19 45 / 0.8))",
            }}
          />
          <text
            y="4"
            textAnchor="middle"
            fontSize="9"
            className="mono"
            fill="oklch(0.15 0.02 45)"
            fontWeight="600"
          >
            YOU
          </text>
        </g>
      </svg>

      {/* Legend / detail */}
      <div className="pointer-events-none absolute left-4 top-4 flex flex-col gap-2">
        <div className="glass mono inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px]">
          <span className="h-2 w-2 rounded-full bg-primary" />
          {shortAddress(center.address, 8, 6)}
        </div>
        <p className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {nodes.length} counterparties
        </p>
      </div>
      {selected && (
        <div className="glass pointer-events-none absolute bottom-4 right-4 max-w-[260px] rounded-xl p-3 text-xs">
          <p className="mono text-muted-foreground">Counterparty</p>
          <p className="mono mt-0.5 break-all text-foreground">
            {shortAddress(selected.address, 10, 8)}
          </p>
          <div className="mt-2 flex justify-between text-[11px]">
            <span className="text-success">in {selected.totalIn.toLocaleString()}</span>
            <span className="text-primary">out {selected.totalOut.toLocaleString()}</span>
          </div>
          <p className="mono mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
            {selected.count} transaction{selected.count === 1 ? "" : "s"}
          </p>
        </div>
      )}
    </div>
  );
}
