/**
 * AmbientBackground — animated gradient + subtle grid + particle field.
 * Rendered once at the shell level, sits behind all content.
 */
import { useEffect, useState } from "react";

export function AmbientBackground() {
  const [particles, setParticles] = useState<
    { id: number; left: number; delay: number; duration: number; size: number }[]
  >([]);

  useEffect(() => {
    // Generate particles only on client to avoid SSR hydration mismatch.
    const seed = Array.from({ length: 28 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 20,
      duration: 18 + Math.random() * 22,
      size: 1 + Math.random() * 2.5,
    }));
    setParticles(seed);
  }, []);

  return (
    <div aria-hidden className="ambient-bg">
      {/* Base gradient wash */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(70% 55% at 15% 10%, oklch(0.74 0.19 45 / 0.14), transparent 60%), radial-gradient(65% 55% at 90% 20%, oklch(0.68 0.19 245 / 0.12), transparent 60%), radial-gradient(80% 60% at 50% 120%, oklch(0.5 0.15 260 / 0.18), transparent 65%)",
        }}
      />
      {/* Floating soft blobs */}
      <div
        className="absolute -left-40 top-10 h-[520px] w-[520px] rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, oklch(0.74 0.19 45 / 0.28), transparent 70%)",
          animation: "pulse-drift 14s ease-in-out infinite",
        }}
      />
      <div
        className="absolute -right-40 top-40 h-[560px] w-[560px] rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, oklch(0.68 0.19 245 / 0.24), transparent 70%)",
          animation: "pulse-drift-b 18s ease-in-out infinite",
        }}
      />
      <div
        className="absolute bottom-[-200px] left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, oklch(0.5 0.15 280 / 0.22), transparent 70%)",
          animation: "pulse-drift 22s ease-in-out infinite",
        }}
      />
      {/* Subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.055]"
        style={{
          backgroundImage:
            "linear-gradient(oklch(1 0 0 / 0.6) 1px, transparent 1px), linear-gradient(90deg, oklch(1 0 0 / 0.6) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          animation: "grid-slide 40s linear infinite",
          maskImage:
            "radial-gradient(ellipse at 50% 40%, black 30%, transparent 80%)",
        }}
      />
      {/* Particles */}
      {particles.map((p) => (
        <span
          key={p.id}
          className="pointer-events-none absolute bottom-[-10px] rounded-full"
          style={{
            left: `${p.left}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            background:
              p.id % 3 === 0
                ? "oklch(0.74 0.19 45 / 0.9)"
                : "oklch(0.85 0.02 260 / 0.7)",
            boxShadow:
              p.id % 3 === 0
                ? "0 0 8px oklch(0.74 0.19 45 / 0.9)"
                : "0 0 6px oklch(0.85 0.02 260 / 0.6)",
            animation: `particle ${p.duration}s linear ${p.delay}s infinite`,
          }}
        />
      ))}
      {/* Vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, transparent 40%, oklch(0.1 0.014 260 / 0.7) 100%)",
        }}
      />
    </div>
  );
}
