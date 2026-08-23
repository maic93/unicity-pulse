/**
 * PulseSphere — signature visual identity for Unicity Pulse.
 * A rotating, glowing, breathing sphere rendered entirely in SVG + CSS.
 * Reacts to blockchain events via `pulseKey` (bump to trigger a ripple + burst),
 * and to sustained activity via `intensity`. Click 5x to activate Pulse Mode
 * (higher glow + more particles) — handled by parent via `onClick`.
 */
import { useEffect, useMemo, useRef, useState } from "react";

interface PulseSphereProps {
  /** 0..1 — visual intensity based on activity (block ticks, tx count). */
  intensity?: number;
  /** Whether the wallet is connected (affects color). */
  active?: boolean;
  /** Pixel size of the sphere container. */
  size?: number;
  className?: string;
  /**
   * Bumping this value triggers a one-shot ripple + particle burst
   * (use for new-block / new-tx / connect events).
   */
  pulseKey?: number;
  /** Optional accent for the pulse (e.g. "in" green, "out" orange). */
  pulseTone?: "primary" | "secondary" | "success";
  /** When true, boosts glow, particle density, ambient lighting. */
  pulseMode?: boolean;
  onClick?: () => void;
}

const TONES = {
  primary: "oklch(0.74 0.19 45)",
  secondary: "oklch(0.68 0.19 245)",
  success: "oklch(0.74 0.16 155)",
} as const;

export function PulseSphere({
  intensity = 0.5,
  active = false,
  size = 360,
  className,
  pulseKey = 0,
  pulseTone = "primary",
  pulseMode = false,
  onClick,
}: PulseSphereProps) {
  const clamped = Math.max(0, Math.min(1, intensity));
  const boost = pulseMode ? 0.25 : 0;
  const effective = Math.min(1, clamped + boost);
  const glow = 30 + effective * 90;
  const ringScale = 1 + effective * 0.08;

  // Deterministic longitude/latitude lines
  const longitudes = useMemo(() => [-70, -45, -22, 0, 22, 45, 70], []);
  const latitudes = useMemo(() => [-60, -30, 0, 30, 60], []);

  // Ripples/bursts stack — pushed on pulseKey change
  const [ripples, setRipples] = useState<
    { id: number; tone: string; particles: { dx: number; dy: number; delay: number }[] }[]
  >([]);
  const seq = useRef(0);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const id = ++seq.current;
    const count = pulseMode ? 14 : 8;
    const particles = Array.from({ length: count }).map((_, i) => {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
      const dist = 90 + Math.random() * 70;
      return {
        dx: Math.cos(angle) * dist,
        dy: Math.sin(angle) * dist,
        delay: Math.random() * 0.15,
      };
    });
    setRipples((prev) => [...prev, { id, tone: TONES[pulseTone], particles }]);
    const t = setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    }, 1800);
    return () => clearTimeout(t);
  }, [pulseKey, pulseTone, pulseMode]);

  const containerProps = onClick
    ? {
        role: "button" as const,
        tabIndex: 0,
        onClick,
        onKeyDown: (e: React.KeyboardEvent) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick();
          }
        },
        "aria-label": "Pulse sphere",
        style: { width: size, height: size, cursor: "pointer" },
      }
    : { "aria-hidden": true, style: { width: size, height: size } };

  return (
    <div
      className={"relative grid place-items-center select-none " + (className ?? "")}
      {...containerProps}
    >
      {/* Reactive ripples */}
      {ripples.map((r) => (
        <div
          key={r.id}
          className="pointer-events-none absolute inset-0 animate-sphere-ripple rounded-full"
          style={{
            border: `2px solid ${r.tone}`,
            boxShadow: `0 0 40px ${r.tone}`,
          }}
        />
      ))}
      {/* Reactive particle bursts */}
      {ripples.map((r) => (
        <div
          key={`burst-${r.id}`}
          className="pointer-events-none absolute left-1/2 top-1/2 h-0 w-0"
        >
          {r.particles.map((p, i) => (
            <span
              key={i}
              className="absolute h-1.5 w-1.5 animate-sphere-burst rounded-full"
              style={
                {
                  background: r.tone,
                  boxShadow: `0 0 12px ${r.tone}`,
                  ["--dx" as string]: `${p.dx}px`,
                  ["--dy" as string]: `${p.dy}px`,
                  animationDelay: `${p.delay}s`,
                } as React.CSSProperties
              }
            />
          ))}
        </div>
      ))}

      {/* Outer glow rings */}
      <div
        className="absolute inset-0 rounded-full animate-glow-ring"
        style={{
          background: "radial-gradient(circle, oklch(0.74 0.19 45 / 0.35), transparent 60%)",
          transform: `scale(${ringScale})`,
        }}
      />
      <div
        className="absolute inset-6 rounded-full animate-glow-ring"
        style={{
          background: "radial-gradient(circle, oklch(0.68 0.19 245 / 0.28), transparent 60%)",
          animationDelay: "1.2s",
        }}
      />
      {pulseMode && (
        <div
          className="absolute -inset-6 rounded-full animate-glow-ring"
          style={{
            background: "radial-gradient(circle, oklch(0.9 0.19 60 / 0.25), transparent 65%)",
            animationDuration: "3s",
          }}
        />
      )}

      {/* Orbit rings */}
      <div
        className="absolute inset-0 rounded-full border animate-sphere-rotate"
        style={{
          borderColor: "oklch(0.74 0.19 45 / 0.25)",
          transform: "rotateX(72deg)",
        }}
      />
      <div
        className="absolute inset-4 rounded-full border"
        style={{
          borderColor: "oklch(0.68 0.19 245 / 0.2)",
          transform: "rotateX(58deg) rotateZ(35deg)",
          animation: "sphere-rotate 55s linear infinite reverse",
        }}
      />
      <div
        className="absolute inset-10 rounded-full border"
        style={{
          borderColor: "oklch(1 0 0 / 0.08)",
          transform: "rotateX(70deg) rotateZ(-20deg)",
          animation: "sphere-rotate 80s linear infinite",
        }}
      />

      {/* The sphere itself */}
      <div
        className="relative animate-sphere-pulse"
        style={{
          width: "72%",
          height: "72%",
          animationDuration: pulseMode ? "3s" : "4.5s",
        }}
      >
        <div
          key={`flash-${pulseKey}`}
          className={`absolute inset-0 rounded-full ${ripples.length > 0 ? "animate-sphere-flash" : ""}`}
          style={{
            background:
              "radial-gradient(circle at 30% 25%, oklch(0.95 0.12 55), oklch(0.72 0.19 45) 40%, oklch(0.38 0.14 30) 80%, oklch(0.18 0.05 260) 100%)",
            boxShadow: `inset -30px -50px 80px oklch(0.1 0.02 260 / 0.9), inset 30px 40px 80px oklch(1 0.05 60 / 0.15), 0 0 ${glow}px oklch(0.74 0.19 45 / ${0.35 + effective * 0.6})`,
          }}
        />
        {/* Grid overlay (wireframe) */}
        <svg
          viewBox="-100 -100 200 200"
          className="absolute inset-0 h-full w-full animate-sphere-rotate"
          style={{ animationDuration: pulseMode ? "35s" : "60s" }}
        >
          <defs>
            <clipPath id="sphere-clip">
              <circle r="99" />
            </clipPath>
            <radialGradient id="sphere-shine" cx="30%" cy="25%" r="60%">
              <stop offset="0%" stopColor="oklch(1 0.05 60 / 0.35)" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
          </defs>
          <g clipPath="url(#sphere-clip)" fill="none" strokeWidth="0.6">
            {longitudes.map((deg) => (
              <ellipse
                key={`lon-${deg}`}
                cx="0"
                cy="0"
                rx={Math.max(2, Math.abs(Math.cos((deg * Math.PI) / 180) * 99))}
                ry="99"
                stroke={active ? "oklch(0.95 0.15 55 / 0.35)" : "oklch(0.85 0.05 260 / 0.2)"}
              />
            ))}
            {latitudes.map((deg) => {
              const r = Math.cos((deg * Math.PI) / 180) * 99;
              const y = -Math.sin((deg * Math.PI) / 180) * 99;
              return (
                <ellipse
                  key={`lat-${deg}`}
                  cx="0"
                  cy={y}
                  rx={r}
                  ry={r * 0.15}
                  stroke={active ? "oklch(0.68 0.19 245 / 0.4)" : "oklch(0.85 0.05 260 / 0.2)"}
                />
              );
            })}
          </g>
          <circle r="99" fill="url(#sphere-shine)" />
        </svg>
        {/* Highlight */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "radial-gradient(ellipse 40% 35% at 30% 22%, oklch(1 0.05 60 / 0.45), transparent 70%)",
          }}
        />
      </div>

      {/* Floating orbiting dots */}
      <div
        className="absolute inset-0 animate-sphere-rotate"
        style={{ animationDuration: pulseMode ? "8s" : "12s" }}
      >
        <span
          className="absolute left-1/2 top-0 h-2.5 w-2.5 -translate-x-1/2 rounded-full"
          style={{
            background: "oklch(0.68 0.19 245)",
            boxShadow: "0 0 20px oklch(0.68 0.19 245 / 0.9)",
          }}
        />
      </div>
      <div
        className="absolute inset-2 animate-sphere-rotate"
        style={{
          animationDuration: pulseMode ? "12s" : "18s",
          animationDirection: "reverse",
        }}
      >
        <span
          className="absolute left-1/2 top-0 h-1.5 w-1.5 -translate-x-1/2 rounded-full"
          style={{
            background: "oklch(0.9 0.16 55)",
            boxShadow: "0 0 16px oklch(0.9 0.16 55 / 0.9)",
          }}
        />
      </div>
      {pulseMode && (
        <div className="absolute inset-8 animate-sphere-rotate" style={{ animationDuration: "6s" }}>
          <span
            className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 rounded-full"
            style={{
              background: "oklch(0.9 0.19 60)",
              boxShadow: "0 0 18px oklch(0.9 0.19 60 / 0.9)",
            }}
          />
        </div>
      )}
    </div>
  );
}
