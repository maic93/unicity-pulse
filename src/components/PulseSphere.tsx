/**
 * PulseSphere — signature visual identity for Unicity Pulse.
 * A rotating, glowing, breathing sphere rendered entirely in SVG + CSS.
 * Reacts to blockchain activity via the `intensity` prop.
 */
import { useMemo } from "react";

interface PulseSphereProps {
  /** 0..1 — visual intensity based on activity (block ticks, tx count). */
  intensity?: number;
  /** Whether the wallet is connected (affects color). */
  active?: boolean;
  /** Pixel size of the sphere container. */
  size?: number;
  className?: string;
}

export function PulseSphere({
  intensity = 0.5,
  active = false,
  size = 360,
  className,
}: PulseSphereProps) {
  const clamped = Math.max(0, Math.min(1, intensity));
  const glow = 30 + clamped * 70;
  const ringScale = 1 + clamped * 0.08;

  // Deterministic longitude/latitude lines
  const longitudes = useMemo(
    () => [-70, -45, -22, 0, 22, 45, 70],
    [],
  );
  const latitudes = useMemo(() => [-60, -30, 0, 30, 60], []);

  return (
    <div
      className={"relative grid place-items-center " + (className ?? "")}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {/* Outer glow rings */}
      <div
        className="absolute inset-0 rounded-full animate-glow-ring"
        style={{
          background:
            "radial-gradient(circle, oklch(0.74 0.19 45 / 0.35), transparent 60%)",
          transform: `scale(${ringScale})`,
        }}
      />
      <div
        className="absolute inset-6 rounded-full animate-glow-ring"
        style={{
          background:
            "radial-gradient(circle, oklch(0.68 0.19 245 / 0.28), transparent 60%)",
          animationDelay: "1.2s",
        }}
      />

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
        }}
      >
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "radial-gradient(circle at 30% 25%, oklch(0.95 0.12 55), oklch(0.72 0.19 45) 40%, oklch(0.38 0.14 30) 80%, oklch(0.18 0.05 260) 100%)",
            boxShadow: `inset -30px -50px 80px oklch(0.1 0.02 260 / 0.9), inset 30px 40px 80px oklch(1 0.05 60 / 0.15), 0 0 ${glow}px oklch(0.74 0.19 45 / ${0.35 + clamped * 0.55})`,
          }}
        />
        {/* Grid overlay (wireframe) */}
        <svg
          viewBox="-100 -100 200 200"
          className="absolute inset-0 h-full w-full animate-sphere-rotate"
          style={{ animationDuration: "60s" }}
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
                stroke={
                  active
                    ? "oklch(0.95 0.15 55 / 0.35)"
                    : "oklch(0.85 0.05 260 / 0.2)"
                }
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
                  stroke={
                    active
                      ? "oklch(0.68 0.19 245 / 0.4)"
                      : "oklch(0.85 0.05 260 / 0.2)"
                  }
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

      {/* Floating orbiting dot */}
      <div
        className="absolute inset-0 animate-sphere-rotate"
        style={{ animationDuration: "12s" }}
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
          animationDuration: "18s",
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
    </div>
  );
}
