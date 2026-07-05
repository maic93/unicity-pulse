import { Copy, LogOut, Wallet } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useSphere } from "@/lib/sphere/provider";
import { shortAddress } from "@/lib/format";

export function WalletButton() {
  const { identity, isConnected, isConnecting, connect, disconnect } =
    useSphere();

  if (!isConnected) {
    return (
      <Button
        onClick={() => {
          void connect();
        }}
        disabled={isConnecting}
        className="gap-2"
      >
        <Wallet className="h-4 w-4" />
        {isConnecting ? "Connecting…" : "Connect Sphere Wallet"}
      </Button>
    );
  }

  const address =
    identity?.nametag ?? identity?.directAddress ?? identity?.chainPubkey ?? "";

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard.writeText(address);
          toast.success("Address copied");
        }}
        className="mono flex items-center gap-2 rounded-lg border border-border bg-card/60 px-3 py-1.5 text-xs font-medium backdrop-blur transition-colors hover:border-primary/40"
        title={address}
      >
        <span className="h-2 w-2 rounded-full bg-success" />
        {shortAddress(address)}
        <Copy className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
      <Button
        variant="outline"
        size="icon"
        onClick={() => void disconnect()}
        title="Disconnect"
      >
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  );
}
