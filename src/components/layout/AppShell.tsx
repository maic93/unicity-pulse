import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Wallet,
  Compass,
  Terminal,
  Radio,
  ListOrdered,
  ScrollText,
  Settings,
  Info,
  ArrowUpRight,
  Menu,
  X,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";
import { WalletButton } from "@/components/wallet/WalletButton";

type NavGroup = {
  label: string;
  items: {
    to: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[];
};

const NAV: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { to: "/", label: "Dashboard", icon: LayoutDashboard },
      { to: "/wallet", label: "Wallet", icon: Wallet },
      { to: "/explorer", label: "Explorer", icon: Compass },
    ],
  },
  {
    label: "Developer",
    items: [
      { to: "/playground", label: "API Playground", icon: Terminal },
      { to: "/network", label: "Network", icon: Radio },
      { to: "/transactions", label: "Transactions", icon: ListOrdered },
      { to: "/logs", label: "Logs", icon: ScrollText },
    ],
  },
  {
    label: "System",
    items: [
      { to: "/send", label: "Send tokens", icon: ArrowUpRight },
      { to: "/settings", label: "Settings", icon: Settings },
      { to: "/about", label: "About", icon: Info },
    ],
  },
];

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  return (
    <div className="dark min-h-screen text-foreground">
      {/* Sidebar (desktop) */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-border bg-sidebar/60 backdrop-blur-xl lg:flex">
        <Brand />
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {NAV.map((group) => (
            <div key={group.label} className="mb-4">
              <p className="mono px-3 pb-1.5 text-[10px] uppercase tracking-widest text-muted-foreground/70">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavItem
                    key={item.to}
                    to={item.to}
                    label={item.label}
                    icon={item.icon}
                    active={isActive(pathname, item.to)}
                  />
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
          <aside className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-sidebar lg:hidden">
            <Brand onClose={() => setMobileOpen(false)} />
            <nav className="flex-1 overflow-y-auto px-3 py-4">
              {NAV.map((group) => (
                <div key={group.label} className="mb-4">
                  <p className="mono px-3 pb-1.5 text-[10px] uppercase tracking-widest text-muted-foreground/70">
                    {group.label}
                  </p>
                  <div className="space-y-0.5">
                    {group.items.map((item) => (
                      <NavItem
                        key={item.to}
                        to={item.to}
                        label={item.label}
                        icon={item.icon}
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
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-border bg-background/70 px-4 backdrop-blur-xl sm:px-6">
          <button
            type="button"
            className="rounded-md border border-border p-2 lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-4 w-4" />
          </button>
          <div className="hidden items-center gap-2 lg:flex">
            <span className="mono rounded-md border border-primary/40 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              TESTNET
            </span>
            <span className="text-sm text-muted-foreground">
              Unicity Dev Console · sphere-connect v2
            </span>
          </div>
          <WalletButton />
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}

function Brand({ onClose }: { onClose?: () => void }) {
  return (
    <div className="flex h-16 items-center justify-between border-b border-border px-5">
      <Link to="/" className="flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground shadow-lg shadow-primary/30">
          <span className="mono text-sm font-bold">U</span>
        </span>
        <div className="leading-tight">
          <p className="text-sm font-semibold tracking-tight">
            Unicity <span className="text-primary">Dev Console</span>
          </p>
          <p className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
            developer tools · testnet2
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

function NavItem({
  to,
  label,
  icon: Icon,
  active,
  onClick,
}: {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-primary/15 text-primary"
          : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}

function Footer() {
  return (
    <div className="border-t border-border px-5 py-4 text-xs text-muted-foreground">
      <p>Powered by</p>
      <p className="mono mt-0.5 text-foreground">@unicitylabs/sphere-sdk</p>
    </div>
  );
}

function isActive(pathname: string, to: string) {
  if (to === "/") return pathname === "/";
  return pathname === to || pathname.startsWith(to + "/");
}
