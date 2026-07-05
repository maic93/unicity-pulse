import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { Send } from "lucide-react";
import { useState } from "react";
import { z } from "zod";

import { GlassCard } from "@/components/GlassCard";
import { ConnectGate } from "@/components/wallet/ConnectGate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useBalances,
  useSendTokens,
} from "@/lib/sphere/provider";

const sendSchema = z.object({
  recipient: z
    .string()
    .trim()
    .min(1, "Recipient is required")
    .max(200)
    .refine(
      (v) =>
        v.startsWith("@") || /^[0-9a-fA-F]{20,}$/.test(v) || v.includes(":"),
      "Enter a Sphere nametag (@name), address, or public key",
    ),
  amount: z
    .string()
    .trim()
    .min(1, "Amount is required")
    .refine((v) => /^\d+(\.\d+)?$/.test(v) && Number(v) > 0, "Enter a positive number"),
  coinId: z.string().min(1),
  memo: z.string().max(280).optional(),
});

type FormState = {
  recipient: string;
  amount: string;
  coinId: string;
  memo: string;
};

export const Route = createFileRoute("/send")({
  component: SendPage,
});

function SendPage() {
  return (
    <ClientOnly fallback={<Skeleton className="h-96 w-full" />}>
      <ConnectGate>
        <SendView />
      </ConnectGate>
    </ClientOnly>
  );
}

function SendView() {
  const balances = useBalances();
  const send = useSendTokens();
  const [form, setForm] = useState<FormState>({
    recipient: "",
    amount: "",
    coinId: "",
    memo: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>(
    {},
  );
  const [confirm, setConfirm] = useState(false);

  const coins = balances.data ?? [];
  const activeCoin = coins.find((c) => c.coinId === form.coinId) ?? coins[0];

  function validate(): boolean {
    const result = sendSchema.safeParse({
      ...form,
      coinId: form.coinId || activeCoin?.coinId || "",
    });
    if (!result.success) {
      const errs: Partial<Record<keyof FormState, string>> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof FormState;
        if (!errs[key]) errs[key] = issue.message;
      }
      setErrors(errs);
      return false;
    }
    setErrors({});
    return true;
  }

  async function submit() {
    const coinId = form.coinId || activeCoin?.coinId;
    if (!coinId) return;
    try {
      await send.mutateAsync({
        recipient: form.recipient.trim(),
        amount: form.amount.trim(),
        coinId,
        memo: form.memo || undefined,
      });
      setForm({ recipient: "", amount: "", coinId, memo: "" });
    } catch {
      /* toast handled by hook */
    } finally {
      setConfirm(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Send tokens</h1>
        <p className="text-sm text-muted-foreground">
          Signed and submitted by your Sphere wallet on Unicity Testnet.
        </p>
      </div>

      <GlassCard>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (validate()) setConfirm(true);
          }}
        >
          <div>
            <Label htmlFor="recipient">Recipient</Label>
            <Input
              id="recipient"
              placeholder="@alice or public key"
              value={form.recipient}
              onChange={(e) =>
                setForm((f) => ({ ...f, recipient: e.target.value }))
              }
              autoComplete="off"
            />
            {errors.recipient && (
              <p className="mt-1 text-xs text-destructive">{errors.recipient}</p>
            )}
          </div>

          <div className="grid grid-cols-[1fr_140px] gap-3">
            <div>
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                inputMode="decimal"
                placeholder="0.00"
                value={form.amount}
                onChange={(e) =>
                  setForm((f) => ({ ...f, amount: e.target.value }))
                }
              />
              {errors.amount && (
                <p className="mt-1 text-xs text-destructive">{errors.amount}</p>
              )}
            </div>
            <div>
              <Label>Token</Label>
              <Select
                value={form.coinId || activeCoin?.coinId || ""}
                onValueChange={(v) => setForm((f) => ({ ...f, coinId: v }))}
                disabled={coins.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="UCT" />
                </SelectTrigger>
                <SelectContent>
                  {coins.map((c) => (
                    <SelectItem key={c.coinId} value={c.coinId}>
                      {c.symbol}
                    </SelectItem>
                  ))}
                  {coins.length === 0 && (
                    <SelectItem value="UCT">UCT</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="memo">Memo (optional)</Label>
            <Input
              id="memo"
              placeholder="hello"
              value={form.memo}
              onChange={(e) => setForm((f) => ({ ...f, memo: e.target.value }))}
            />
          </div>

          {activeCoin && (
            <p className="text-xs text-muted-foreground">
              Available:{" "}
              <span className="mono text-foreground">
                {activeCoin.amount} {activeCoin.symbol}
              </span>
            </p>
          )}

          <Button
            type="submit"
            className="w-full gap-2"
            disabled={send.isPending}
          >
            <Send className="h-4 w-4" />
            {send.isPending ? "Awaiting wallet…" : "Review & send"}
          </Button>
        </form>
      </GlassCard>

      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm testnet transfer</DialogTitle>
            <DialogDescription>
              Your Sphere wallet will open to approve and sign this transaction.
            </DialogDescription>
          </DialogHeader>
          <dl className="space-y-2 text-sm">
            <Row label="Recipient" value={form.recipient} mono />
            <Row
              label="Amount"
              value={`${form.amount} ${activeCoin?.symbol ?? ""}`}
              mono
            />
            {form.memo && <Row label="Memo" value={form.memo} />}
            <Row label="Network" value="Unicity testnet2" />
          </dl>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(false)}>
              Cancel
            </Button>
            <Button onClick={() => void submit()} disabled={send.isPending}>
              {send.isPending ? "Sending…" : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={mono ? "mono max-w-[60%] break-all text-right" : "text-right"}>
        {value}
      </dd>
    </div>
  );
}
