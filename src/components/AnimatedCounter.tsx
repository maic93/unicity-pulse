/**
 * AnimatedCounter — tweens a numeric value over ~1s using requestAnimationFrame.
 * Handles both integers and decimal strings; falls back gracefully.
 */
import { useEffect, useRef, useState } from "react";

interface AnimatedCounterProps {
  value: number;
  decimals?: number;
  duration?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
}

export function AnimatedCounter({
  value,
  decimals = 0,
  duration = 900,
  className,
  prefix,
  suffix,
}: AnimatedCounterProps) {
  const [display, setDisplay] = useState(value);
  const from = useRef(value);
  const started = useRef<number | null>(null);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    from.current = display;
    started.current = null;
    const step = (ts: number) => {
      if (started.current === null) started.current = ts;
      const elapsed = ts - started.current;
      const t = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = from.current + (value - from.current) * eased;
      setDisplay(next);
      if (t < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  const formatted = Number.isFinite(display)
    ? display.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })
    : "—";

  return (
    <span className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
