import { Wallet } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { useSphere } from "@/lib/sphere/provider";

export function ConnectGate({ children }: { children: ReactNode }) {
  const { isConnected, isConnecting, connect } = useSphere();
  if (isConnected) return <>{children}</>;
  return (
    <div className="glass mx-auto flex max-w-lg flex-col items-center rounded-2xl px-6 py-16 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/15 text-primary">
        <Wallet className="h-7 w-7" />
      </div>
      <h1 className="mt-5 text-xl font-semibold tracking-tight">
        Connect your Sphere Wallet
      </h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        This dashboard talks to the real Unicity Testnet via the official Sphere
        Connect protocol. Approve the connection in your Sphere wallet to
        continue.
      </p>
      <Button
        className="mt-6"
        disabled={isConnecting}
        onClick={() => void connect()}
      >
        {isConnecting ? "Connecting…" : "Connect Sphere Wallet"}
      </Button>
      <p className="mt-6 text-xs text-muted-foreground">
        Don't have Sphere?{" "}
        <a
          href="https://sphere.unicity.network"
          target="_blank"
          rel="noreferrer noopener"
          className="text-primary hover:underline"
        >
          Get it at sphere.unicity.network
        </a>
      </p>
    </div>
  );
}
