import { Link, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Compass,
  Info,
  Menu,
  Radio,
  ScrollText,
  Settings,
  Sparkles,
  Terminal,
  Timer,
  Wallet,
  X,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";
import { WalletButton } from "@/components/wallet/WalletButton";

type NavItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

type NavGroup = { label: string; items: NavItem[] };

const NAV: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { to: "/", label: "Pulse", icon: Activity },
      { to: "/explorer", label: "Explorer", icon: Compass },
      { to: "/wallet", label: "Wallet", icon: Wallet },
      { to: "/transactions", label: "Timeline", icon: Timer },
      { to: "/analytics", label: "Analytics", icon: BarChart3 },
      { to: "/network", label: "Network", icon: Radio },
    ],
  },
  {
    label: "Developer",
    items: [
      { to: "/playground", label: "API Playground", icon: Terminal },
      { to: "/logs", label: "SDK Logs", icon: ScrollText },
      { to: "/send", label: "Send tokens", icon: ArrowUpRight },
    ],
  },
  {
    label: "System",
    items: [
      { to: "/settings", label: "Settings", icon: Settings },
      { to: "/about", label: "About", icon: Info },
    ],
  },
];

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  return (
    <div className="relative min-h-screen text-foreground">
      {/* Sidebar (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border/60 bg-sidebar/60 backdrop-blur-2xl lg:flex">
        <Brand />
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {NAV.map((group) => (
            <div key={group.label} className="mb-5">
              <p className="mono px-3 pb-2 text-[10px] uppercase tracking-[0.25em] text-muted-foreground/70">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink key={item.to} item={item} active={isActive(pathname, item.to)} />
                ))}
              </div>
            </div>
          ))}
        </nav>
        <Footer />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <button
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          />
          <aside className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-border/60 bg-sidebar/95 backdrop-blur-2xl lg:hidden">
            <Brand onClose={() => setMobileOpen(false)} />
            <nav className="flex-1 overflow-y-auto px-3 py-4">
              {NAV.map((group) => (
                <div key={group.label} className="mb-5">
                  <p className="mono px-3 pb-2 text-[10px] uppercase tracking-[0.25em] text-muted-foreground/70">
                    {group.label}
                  </p>
                  <div className="space-y-0.5">
                    {group.items.map((item) => (
                      <NavLink
                        key={item.to}
                        item={item}
                        active={isActive(pathname, item.to)}
                        onClick={() => setMobileOpen(false)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </nav>
            <Footer />
          </aside>
        </>
      )}

      {/* Main */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-border/60 bg-background/40 px-4 backdrop-blur-2xl sm:px-6">
          <button
            type="button"
            className="rounded-xl border border-border/60 bg-card/40 p-2 lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-4 w-4" />
          </button>
          <div className="hidden items-center gap-3 lg:flex">
            <span className="mono inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-widest text-primary">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
              </span>
              Live · testnet2
            </span>
            <span className="text-sm text-muted-foreground">Watch the blockchain breathe</span>
          </div>
          <WalletButton />
        </header>
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-10">{children}</main>
      </div>
    </div>
  );
}

function Brand({ onClose }: { onClose?: () => void }) {
  return (
    <div className="flex h-16 items-center justify-between border-b border-border/60 px-5">
      <Link to="/" className="group flex items-center gap-3">
        <span
          className="relative grid h-9 w-9 place-items-center rounded-xl text-primary-foreground"
          style={{
            background:
              "conic-gradient(from 200deg, oklch(0.74 0.19 45), oklch(0.68 0.19 245), oklch(0.74 0.19 45))",
            boxShadow: "0 0 24px oklch(0.74 0.19 45 / 0.55)",
          }}
        >
          <Sparkles className="h-4 w-4" />
          <span
            aria-hidden
            className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/30"
          />
        </span>
        <div className="leading-tight">
          <p className="text-sm font-semibold tracking-tight">
            Unicity <span className="text-gradient-primary">Pulse</span>
          </p>
          <p className="mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            watch the blockchain breathe
          </p>
        </div>
      </Link>
      {onClose && (
        <button
          onClick={onClose}
          className="rounded-md border border-border p-1.5"
          aria-label="Close menu"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function NavLink({
  item,
  active,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  onClick?: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      onClick={onClick}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-300",
        active
          ? "bg-primary/12 text-primary shadow-[inset_0_0_0_1px_oklch(0.74_0.19_45/0.35)]"
          : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
      )}
    >
      {active && (
        <span
          aria-hidden
          className="absolute -left-3 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-primary shadow-[0_0_16px_oklch(0.74_0.19_45/0.9)]"
        />
      )}
      <Icon
        className={cn(
          "h-4 w-4 transition-transform duration-300",
          active ? "scale-110" : "group-hover:scale-110",
        )}
      />
      {item.label}
    </Link>
  );
}

function Footer() {
  return (
    <div className="border-t border-border/60 px-5 py-4 text-xs text-muted-foreground">
      <p>Powered by</p>
      <p className="mono mt-0.5 text-foreground">@unicitylabs/sphere-sdk</p>
    </div>
  );
}

function isActive(pathname: string, to: string) {
  if (to === "/") return pathname === "/";
  return pathname === to || pathname.startsWith(to + "/");
}
