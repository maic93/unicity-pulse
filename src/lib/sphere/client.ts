/**
 * Sphere SDK wrapper.
 *
 * All interaction with the Unicity Testnet goes through the official
 * `@unicitylabs/sphere-sdk` Connect protocol. This module is the ONLY
 * place in the app that touches the SDK — UI components consume the
 * `useSphere()` hook (see provider.tsx), never the SDK directly.
 *
 * Every SDK query, intent and lifecycle event is recorded in the
 * in-memory `sdkLog` so the /logs page can render a live timeline.
 *
 * Connect protocol reference:
 *   https://github.com/unicity-sphere/sphere-sdk/blob/main/docs/CONNECT.md
 */

import { sdkLog } from "./log";
import type {
  CoinBalance,
  HistoryEntry,
  SendParams,
  SendResult,
  SphereIdentity,
  SphereNetworkInfo,
} from "./types";

// Load the browser Connect entrypoint lazily so the module can be imported
// from SSR contexts without hitting `window` at import time.
type AutoConnectResultShape = {
  client: {
    isConnected: boolean;
    walletIdentity: SphereIdentity | null;
    walletNetwork: SphereNetworkInfo | null;
    query<T>(method: string, params?: Record<string, unknown>): Promise<T>;
    intent<T>(action: string, params: Record<string, unknown>): Promise<T>;
    disconnect(): Promise<void>;
    on(event: string, handler: (data: unknown) => void): () => void;
  };
  connection: { sessionId: string };
  transport: string;
  disconnect: () => Promise<void>;
};

// Public Sphere wallet URL used for the popup transport fallback.
const SPHERE_WALLET_URL = "https://sphere.unicity.network";

// testnet2 is the current Unicity testnet (networkId 4).
const TESTNET_NETWORK: SphereNetworkInfo = { id: 4, name: "testnet2" };

const SESSION_KEY = "sphere-connect:sessionId";

// Version of the SDK we depend on. Kept in sync with package.json manually
// because pkg imports don't survive the SSR bundler cleanly.
export const SDK_VERSION = "0.11.3";
export const SDK_PACKAGE = "@unicitylabs/sphere-sdk";
export const GATEWAY_URL = "https://gateway.testnet2.unicity.network";

let active: AutoConnectResultShape | null = null;
let connectingPromise: Promise<AutoConnectResultShape> | null = null;
let connectedAt: number | null = null;

async function loadAutoConnect() {
  const mod = await import("@unicitylabs/sphere-sdk/connect/browser");
  return mod.autoConnect;
}

async function doConnect(silent: boolean): Promise<AutoConnectResultShape> {
  if (typeof window === "undefined") {
    throw new Error("Sphere wallet is only available in the browser.");
  }
  const autoConnect = await loadAutoConnect();
  const resumeSessionId = window.localStorage.getItem(SESSION_KEY) ?? undefined;

  const entry = sdkLog.start({
    method: silent ? "sphere.reconnect" : "sphere.connect",
    kind: "connect",
    params: { network: TESTNET_NETWORK, silent, hasSession: !!resumeSessionId },
  });

  try {
    const result = (await autoConnect({
      dapp: {
        name: "Unicity Dev Console",
        description: "Developer console for the Unicity Testnet",
        url: window.location.origin,
      },
      walletUrl: SPHERE_WALLET_URL,
      network: TESTNET_NETWORK,
      resumeSessionId,
      silent,
    })) as unknown as AutoConnectResultShape;

    active = result;
    connectedAt = Date.now();

    // Forward wallet lifecycle events into the log for developer visibility.
    for (const ev of ["identityChanged", "networkChanged", "locked", "disconnected"]) {
      try {
        result.client.on(ev, (data) => sdkLog.event(`wallet:${ev}`, data));
      } catch {
        /* not all events may be supported */
      }
    }

    try {
      window.localStorage.setItem(SESSION_KEY, result.connection.sessionId);
    } catch {
      /* ignore storage failure */
    }
    sdkLog.finish(entry.id, {
      status: "ok",
      response: {
        transport: result.transport,
        sessionId: result.connection.sessionId,
        identity: result.client.walletIdentity,
        network: result.client.walletNetwork,
      },
    });
    return result;
  } catch (err) {
    sdkLog.finish(entry.id, {
      status: "error",
      error: toErrorShape(err),
    });
    throw err;
  }
}

export async function connectWallet(): Promise<SphereIdentity> {
  if (connectingPromise) await connectingPromise;
  if (active?.client.isConnected) return active.client.walletIdentity!;
  connectingPromise = doConnect(false);
  try {
    const r = await connectingPromise;
    return r.client.walletIdentity!;
  } finally {
    connectingPromise = null;
  }
}

/** Silent reconnect using a persisted session id. Returns null when the
 * wallet has not previously approved this origin. */
export async function reconnectWallet(): Promise<SphereIdentity | null> {
  if (typeof window === "undefined") return null;
  if (active?.client.isConnected) return active.client.walletIdentity;
  const sessionId = window.localStorage.getItem(SESSION_KEY);
  if (!sessionId) return null;
  try {
    const r = await doConnect(true);
    return r.client.walletIdentity;
  } catch {
    return null;
  }
}

export async function disconnectWallet(): Promise<void> {
  const entry = sdkLog.start({ method: "sphere.disconnect", kind: "disconnect" });
  try {
    await active?.disconnect();
    sdkLog.finish(entry.id, { status: "ok" });
  } catch (err) {
    sdkLog.finish(entry.id, { status: "error", error: toErrorShape(err) });
  } finally {
    active = null;
    connectedAt = null;
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(SESSION_KEY);
      } catch {
        /* ignore */
      }
    }
  }
}

export function getIdentitySync(): SphereIdentity | null {
  return active?.client.walletIdentity ?? null;
}

export function getNetworkSync(): SphereNetworkInfo | null {
  return active?.client.walletNetwork ?? null;
}

export function getTransportSync(): string | null {
  return active?.transport ?? null;
}

export function getSessionIdSync(): string | null {
  return active?.connection.sessionId ?? null;
}

export function getConnectedAtSync(): number | null {
  return connectedAt;
}

export function isConnectedSync(): boolean {
  return !!active?.client.isConnected;
}

function requireClient() {
  if (!active?.client.isConnected) {
    throw new Error("Wallet is not connected");
  }
  return active.client;
}

async function loggedQuery<T>(
  method: string,
  params?: Record<string, unknown>,
): Promise<T> {
  const c = requireClient();
  const entry = sdkLog.start({ method, kind: "query", params });
  try {
    const response = await c.query<T>(method, params);
    sdkLog.finish(entry.id, { status: "ok", response });
    return response;
  } catch (err) {
    sdkLog.finish(entry.id, { status: "error", error: toErrorShape(err) });
    throw err;
  }
}

async function loggedIntent<T>(
  action: string,
  params: Record<string, unknown>,
): Promise<T> {
  const c = requireClient();
  const entry = sdkLog.start({ method: `intent:${action}`, kind: "intent", params });
  try {
    const response = await c.intent<T>(action, params);
    sdkLog.finish(entry.id, { status: "ok", response });
    return response;
  } catch (err) {
    sdkLog.finish(entry.id, { status: "error", error: toErrorShape(err) });
    throw err;
  }
}

export async function getIdentity(): Promise<SphereIdentity> {
  return loggedQuery<SphereIdentity>("sphere_getIdentity");
}

/** Fetch balances. The SDK returns provider-specific shapes; we normalise. */
export async function getBalances(): Promise<CoinBalance[]> {
  const raw = await loggedQuery<unknown>("sphere_getBalance");
  return normaliseBalances(raw);
}

export async function getHistory(): Promise<HistoryEntry[]> {
  const raw = await loggedQuery<unknown>("sphere_getHistory", { limit: 100 });
  return normaliseHistory(raw);
}

export async function getNetworkStatus(): Promise<unknown> {
  return loggedQuery<unknown>("sphere_getNetwork");
}

export async function getLatestBlock(): Promise<unknown> {
  // The exact RPC name is provider-specific; we try common ones and
  // return the first non-null response for the developer to inspect.
  const candidates = ["sphere_getLatestBlock", "sphere_getBlock", "sphere_getChainTip"];
  let lastError: unknown = null;
  for (const m of candidates) {
    try {
      return await loggedQuery<unknown>(m);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError ?? new Error("No block RPC available on this provider");
}

export async function sendTokens(params: SendParams): Promise<SendResult> {
  return loggedIntent<SendResult>("send", {
    recipient: params.recipient,
    amount: params.amount,
    coinId: params.coinId,
    ...(params.memo ? { memo: params.memo } : {}),
  });
}

/** Raw playground call: developer-supplied method + params. */
export async function rawQuery(
  method: string,
  params?: Record<string, unknown>,
): Promise<unknown> {
  return loggedQuery<unknown>(method, params);
}

export async function rawIntent(
  action: string,
  params: Record<string, unknown>,
): Promise<unknown> {
  return loggedIntent<unknown>(action, params);
}

/** Subscribe to wallet events (identity change, lock). Returns unsubscribe. */
export function onWalletEvent(
  event: string,
  handler: (data: unknown) => void,
): () => void {
  if (!active) return () => undefined;
  return active.client.on(event, handler);
}

function toErrorShape(err: unknown): { message: string; stack?: string } {
  if (err instanceof Error) return { message: err.message, stack: err.stack };
  return { message: String(err) };
}

// --- normalisation helpers ---------------------------------------------------

function normaliseBalances(raw: unknown): CoinBalance[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map((b) => coerceBalance(b)).filter((b): b is CoinBalance => !!b);
  }
  if (typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.coins)) {
      return (obj.coins as unknown[])
        .map(coerceBalance)
        .filter((b): b is CoinBalance => !!b);
    }
    if (Array.isArray(obj.balances)) {
      return (obj.balances as unknown[])
        .map(coerceBalance)
        .filter((b): b is CoinBalance => !!b);
    }
    // symbol -> amount map
    const out: CoinBalance[] = [];
    for (const [symbol, amount] of Object.entries(obj)) {
      if (typeof amount === "string" || typeof amount === "number") {
        out.push({ coinId: symbol, symbol, amount: String(amount) });
      }
    }
    return out;
  }
  return [];
}

function coerceBalance(v: unknown): CoinBalance | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const symbol = (o.symbol ?? o.coinId ?? o.id ?? o.coin) as string | undefined;
  const amount = (o.amount ?? o.balance ?? o.value) as
    | string
    | number
    | undefined;
  if (!symbol || amount === undefined) return null;
  return {
    coinId: String(o.coinId ?? symbol),
    symbol: String(symbol),
    amount: String(amount),
    decimals: typeof o.decimals === "number" ? o.decimals : undefined,
  };
}

function normaliseHistory(raw: unknown): HistoryEntry[] {
  const list = extractArray(raw);
  const out: HistoryEntry[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const direction = (o.direction ?? o.kind ?? "out") as string;
    const ts = o.timestamp ?? o.time ?? o.createdAt ?? o.date;
    out.push({
      id: String(o.id ?? o.hash ?? o.transferId ?? cryptoRandomId()),
      hash: (o.hash ?? o.transferId ?? o.txHash) as string | undefined,
      direction:
        direction === "in" || direction === "out" || direction === "self"
          ? direction
          : direction === "incoming"
            ? "in"
            : "out",
      counterparty: (o.counterparty ?? o.from ?? o.to ?? o.recipient) as
        | string
        | undefined,
      amount: String(o.amount ?? "0"),
      coinId: (o.coinId ?? o.coin) as string | undefined,
      symbol: (o.symbol ?? o.coin) as string | undefined,
      status: String(o.status ?? "completed"),
      timestamp:
        typeof ts === "number"
          ? ts
          : typeof ts === "string"
            ? Date.parse(ts) || Date.now()
            : Date.now(),
      memo: o.memo as string | undefined,
    });
  }
  return out;
}

function extractArray(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    for (const key of ["history", "items", "entries", "transactions"]) {
      if (Array.isArray(o[key])) return o[key] as unknown[];
    }
  }
  return [];
}

function cryptoRandomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}
