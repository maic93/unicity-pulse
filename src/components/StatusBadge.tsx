import { cn } from "@/lib/utils";

type Variant = "success" | "warning" | "destructive" | "muted" | "primary";

export function StatusBadge({
  children,
  variant = "muted",
  className,
}: {
  children: React.ReactNode;
  variant?: Variant;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        variantClasses(variant),
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", dotClasses(variant))} />
      {children}
    </span>
  );
}

function variantClasses(v: Variant): string {
  switch (v) {
    case "success":
      return "border-success/40 bg-success/10 text-success";
    case "warning":
      return "border-warning/40 bg-warning/10 text-warning";
    case "destructive":
      return "border-destructive/40 bg-destructive/10 text-destructive";
    case "primary":
      return "border-primary/40 bg-primary/10 text-primary";
    default:
      return "border-border bg-muted/40 text-muted-foreground";
  }
}

function dotClasses(v: Variant): string {
  switch (v) {
    case "success":
      return "bg-success";
    case "warning":
      return "bg-warning";
    case "destructive":
      return "bg-destructive";
    case "primary":
      return "bg-primary";
    default:
      return "bg-muted-foreground";
  }
}
