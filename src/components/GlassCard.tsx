import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function GlassCard({
  children,
  className,
  title,
  action,
  description,
}: {
  children: ReactNode;
  className?: string;
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section
      className={cn(
        "glass relative overflow-hidden rounded-2xl p-5 shadow-xl shadow-black/20",
        className,
      )}
    >
      {(title || action) && (
        <header className="mb-4 flex items-start justify-between gap-4">
          <div>
            {title && <h2 className="text-sm font-semibold tracking-tight">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}
