import { Wallet } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { useSphere } from "@/lib/sphere/provider";

export function ConnectGate({ children }: { children: ReactNode }) {
  const { isConnected, isConnecting, connect, lastError } = useSphere();
  if (isConnected) return <>{children}</>;
  return (
    <div className="glass-strong mx-auto flex max-w-lg flex-col items-center rounded-3xl px-6 py-16 text-center animate-fade-up">
      <div
        className="relative grid h-16 w-16 place-items-center rounded-2xl text-primary-foreground"
        style={{
          background:
            "conic-gradient(from 220deg, oklch(0.74 0.19 45), oklch(0.68 0.19 245), oklch(0.74 0.19 45))",
          boxShadow: "0 0 40px oklch(0.74 0.19 45 / 0.6)",
        }}
      >
        <Wallet className="h-7 w-7" />
      </div>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight">
        Connect your Sphere Wallet
      </h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Unicity Pulse talks to the real Unicity Testnet via the official
        Sphere Connect protocol. Approve the connection in your Sphere
        wallet to begin.
      </p>
      <Button
        className="mt-7 rounded-full px-6 glow-primary"
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
