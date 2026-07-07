/**
 * InsightCard — animated statistic tile used across Wallet + Analytics.
 */
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface Props {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: "primary" | "secondary" | "success" | "warning" | "neutral";
  className?: string;
}

export function InsightCard({
  label,
  value,
  hint,
  icon,
  tone = "primary",
  className,
}: Props) {
  const toneClass =
    tone === "success"
      ? "bg-success/15 text-success"
      : tone === "warning"
        ? "bg-warning/15 text-warning"
        : tone === "secondary"
          ? "bg-secondary/15 text-secondary"
          : tone === "neutral"
            ? "bg-muted text-muted-foreground"
            : "bg-primary/15 text-primary";
  return (
    <div
      className={cn(
        "glass hover-lift relative overflow-hidden rounded-2xl p-5",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        {icon && (
          <span
            className={cn(
              "grid h-9 w-9 place-items-center rounded-xl",
              toneClass,
            )}
          >
            {icon}
          </span>
        )}
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          {label}
        </p>
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight">{value}</p>
      {hint && (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}
