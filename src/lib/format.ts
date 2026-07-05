/** Format a long address / pubkey as `abcd…wxyz`. */
export function shortAddress(addr: string, head = 6, tail = 4): string {
  if (!addr) return "";
  if (addr.startsWith("@")) return addr; // nametag is already short
  if (addr.length <= head + tail + 3) return addr;
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`;
}

/** Format a base-unit amount for display. Accepts decimal strings safely. */
export function formatAmount(amount: string, decimals = 0): string {
  if (!amount) return "0";
  const negative = amount.startsWith("-");
  const raw = negative ? amount.slice(1) : amount;
  if (decimals <= 0) return (negative ? "-" : "") + groupThousands(raw);
  const padded = raw.padStart(decimals + 1, "0");
  const whole = padded.slice(0, padded.length - decimals);
  const frac = padded.slice(padded.length - decimals).replace(/0+$/, "");
  const out = frac ? `${groupThousands(whole)}.${frac}` : groupThousands(whole);
  return (negative ? "-" : "") + out;
}

function groupThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function formatTimestamp(ms: number): string {
  try {
    return new Date(ms).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return "—";
  }
}

export function formatRelative(ms: number): string {
  const diff = Date.now() - ms;
  const s = Math.round(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}
