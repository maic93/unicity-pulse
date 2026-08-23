/**
 * Sphere SDK wrapper.
 *
 * All interaction with the Unicity Testnet goes through the official
 * `@unicitylabs/sphere-sdk` Connect protocol (Sphere Connect v2.1). This
 * module is the ONLY place in the app that touches the SDK — UI components
 * consume the `useSphere()` hook (see provider.tsx), never the SDK directly.
 *
 * Every SDK query, intent and lifecycle event is recorded in the in-memory
 * `sdkLog` so the /logs page can render a live timeline.
 *
 * Connect protocol reference:
 *   https://github.com/unicity-sphere/sphere-sdk/blob/main/docs/CONNECT.md
 */

import {
  ALL_PERMISSIONS,
  ERROR_CODES,
  INTENT_ACTIONS,
  RPC_METHODS,
  SPHERE_NETWORKS,
  WALLET_EVENTS,
  type NetworkInfo,
  type PermissionScope,
  type PublicIdentity,
} from "@unicitylabs/sphere-sdk/connect";

import { sdkLog } from "./log";
import type {
  CoinBalance,
  HistoryEntry,
  SendParams,
  SendResult,
  SphereIdentity,
  SphereNetworkInfo,
} from "./types";

export { GATEWAY_URL, getGatewayHealth, getLatestBlock } from "./gateway";

/** Injected at build time from the installed @unicitylabs/sphere-sdk package. */
declare const __SPHERE_SDK_VERSION__: string;

export const SDK_PACKAGE = "@unicitylabs/sphere-sdk";
export const SDK_VERSION: string =
  typeof __SPHERE_SDK_VERSION__ === "string" ? __SPHERE_SDK_VERSION__ : "unknown";

/** Sphere Connect protocol version this SDK build speaks. */
export const CONNECT_PROTOCOL_VERSION = "2.1";

/** Current Unicity Testnet, sourced from the SDK network registry. */
export const TESTNET_NETWORK: NetworkInfo = SPHERE_NETWORKS.testnet2;

/** Public Sphere wallet URL used for the popup transport fallback. */
const SPHERE_WALLET_URL = "https://sphere.unicity.network";

const SESSION_KEY = "sphere-connect:sessionId";

/** Every scope the console can make use of; the wallet grants a subset. */
const REQUESTED_PERMISSIONS = [...ALL_PERMISSIONS] as PermissionScope[];

type ConnectClientLike = {
  readonly isConnected: boolean;
  readonly walletIdentity: PublicIdentity | null;
  readonly walletNetwork: NetworkInfo | null;
  readonly walletProtocol: string | null;
  readonly walletLocked: boolean;
  readonly permissions: readonly PermissionScope[];
  query<T>(method: string, params?: Record<string, unknown>): Promise<T>;
  intent<T>(action: string, params: Record<string, unknown>): Promise<T>;
  disconnect(): Promise<void>;
  on(event: string, handler: (data: unknown) => void): () => void;
};

type AutoConnectResultShape = {
  client: ConnectClientLike;
  connection: {
    sessionId: string;
    permissions: readonly PermissionScope[];
    identity: PublicIdentity;
    locked?: boolean;
  };
  transport: string;
  disconnect: () => Promise<void>;
};

let active: AutoConnectResultShape | null = null;
let connectingPromise: Promise<AutoConnectResultShape> | null = null;
let connectedAt: number | null = null;
let locked = false;

/** Lifecycle notifications for the React provider. */
export type SphereLifecycleEvent =
  | { type: "locked" }
  | { type: "unlocked"; identity: SphereIdentity | null }
  | { type: "disconnected" }
  | { type: "identityChanged"; identity: SphereIdentity | null }
  | { type: "activity"; event: string; data: unknown };

type LifecycleListener = (event: SphereLifecycleEvent) => void;
const lifecycleListeners = new Set<LifecycleListener>();

export function onSphereLifecycle(listener: LifecycleListener): () => void {
  lifecycleListeners.add(listener);
  return () => lifecycleListeners.delete(listener);
}

function emit(event: SphereLifecycleEvent) {
  for (const l of lifecycleListeners) {
    try {
      l(event);
    } catch {
      /* listener errors must not break the SDK */
    }
  }
}

/** Wallet-pushed activity events the console listens to (auto-subscribed by the SDK). */
const ACTIVITY_EVENTS = ["transfer:incoming", "transfer:outgoing", "balance:changed"] as const;

// --- error handling ----------------------------------------------------------

function errorCode(err: unknown): number | null {
  if (err && typeof err === "object" && "code" in err) {
    const c = (err as { code: unknown }).code;
    if (typeof c === "number") return c;
  }
  return null;
}

/** Turn any Connect / SDK failure into an actionable, user-facing message. */
export function describeSphereError(err: unknown): string {
  const code = errorCode(err);
  const raw = err instanceof Error ? err.message : String(err);
  switch (code) {
    case ERROR_CODES.NOT_CONNECTED:
      return "Not connected to a Sphere wallet. Connect first.";
    case ERROR_CODES.PERMISSION_DENIED:
      return "Your Sphere wallet did not grant the permission this action needs.";
    case ERROR_CODES.USER_REJECTED:
      return "Connection rejected in the Sphere wallet.";
    case ERROR_CODES.SESSION_EXPIRED:
      return "The wallet session expired. Reconnect to continue.";
    case ERROR_CODES.ORIGIN_BLOCKED:
      return "This origin is blocked by the Sphere wallet.";
    case ERROR_CODES.RATE_LIMITED:
      return "The wallet is rate-limiting requests. Try again shortly.";
    case ERROR_CODES.UNSUPPORTED_PROTOCOL_VERSION:
      return `Your Sphere wallet speaks an incompatible Connect version. This app uses Connect ${CONNECT_PROTOCOL_VERSION} (SDK v${SDK_VERSION}). Update Sphere.`;
    case ERROR_CODES.INCOMPATIBLE_NETWORK:
      return `Wrong network: switch your Sphere wallet to ${TESTNET_NETWORK.name} (id ${TESTNET_NETWORK.id}).`;
    case ERROR_CODES.WALLET_LOCKED:
      return "Your Sphere wallet is locked. Unlock it — the session stays alive.";
    case ERROR_CODES.INSUFFICIENT_BALANCE:
      return "Insufficient balance for this transfer.";
    case ERROR_CODES.INVALID_RECIPIENT:
      return "The wallet could not resolve that recipient.";
    case ERROR_CODES.TRANSFER_FAILED:
      return `Transfer failed: ${raw}`;
    case ERROR_CODES.INTENT_CANCELLED:
      return "Transaction rejected in the Sphere wallet.";
    case ERROR_CODES.INTENT_OUTCOME_UNKNOWN:
      return "Outcome unknown — the wallet lost track of this transfer. Do NOT retry; verify on-chain before resending.";
    default:
      break;
  }
  if (/timeout|timed out/i.test(raw)) {
    return "Timed out waiting for the Sphere wallet. Make sure the wallet window is open and responsive.";
  }
  if (/popup|blocked|window\.open/i.test(raw)) {
    return "The Sphere wallet window could not be opened. Allow pop-ups for this site, or install the Sphere extension.";
  }
  if (/no wallet|not installed|extension/i.test(raw)) {
    return "No Sphere wallet detected. Install the Sphere extension or use the hosted wallet at sphere.unicity.network.";
  }
  return raw || "Unknown Sphere error";
}

function toErrorShape(err: unknown): {
  message: string;
  code?: number;
  stack?: string;
} {
  const code = errorCode(err);
  return {
    message: describeSphereError(err),
    ...(code !== null ? { code } : {}),
    ...(err instanceof Error && err.stack ? { stack: err.stack } : {}),
  };
}

// --- connection lifecycle ----------------------------------------------------

async function loadAutoConnect() {
  const mod = await import("@unicitylabs/sphere-sdk/connect/browser");
  return mod.autoConnect;
}

function toIdentity(id: PublicIdentity | null | undefined): SphereIdentity | null {
  if (!id) return null;
  return {
    chainPubkey: id.chainPubkey,
    directAddress: id.directAddress,
    nametag: id.nametag,
  };
}

function wireEvents(result: AutoConnectResultShape) {
  const bind = (event: string, handler: (data: unknown) => void) => {
    try {
      result.client.on(event, handler);
    } catch {
      /* wallet may not support this event */
    }
  };

  bind(WALLET_EVENTS.LOCKED, (data) => {
    locked = true;
    sdkLog.event(WALLET_EVENTS.LOCKED, data);
    emit({ type: "locked" });
  });

  bind(WALLET_EVENTS.UNLOCKED, (data) => {
    locked = false;
    sdkLog.event(WALLET_EVENTS.UNLOCKED, data);
    const payload = data as { identity?: PublicIdentity } | undefined;
    emit({
      type: "unlocked",
      identity: toIdentity(payload?.identity ?? result.client.walletIdentity),
    });
  });

  bind(WALLET_EVENTS.DISCONNECTED, (data) => {
    sdkLog.event(WALLET_EVENTS.DISCONNECTED, data);
    clearSession();
    emit({ type: "disconnected" });
  });

  bind(WALLET_EVENTS.IDENTITY_CHANGED, (data) => {
    sdkLog.event(WALLET_EVENTS.IDENTITY_CHANGED, data);
    emit({
      type: "identityChanged",
      identity: toIdentity(result.client.walletIdentity),
    });
  });

  for (const ev of ACTIVITY_EVENTS) {
    bind(ev, (data) => {
      sdkLog.event(ev, data);
      emit({ type: "activity", event: ev, data });
    });
  }
}

function clearSession() {
  active = null;
  connectedAt = null;
  locked = false;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(SESSION_KEY);
    } catch {
      /* ignore */
    }
  }
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
    params: {
      network: TESTNET_NETWORK,
      permissions: REQUESTED_PERMISSIONS,
      silent,
      hasSession: !!resumeSessionId,
      sdkVersion: SDK_VERSION,
      connectVersion: CONNECT_PROTOCOL_VERSION,
    },
  });

  try {
    const result = (await autoConnect({
      dapp: {
        name: "Unicity Pulse",
        description: "Live visualisation console for the Unicity Testnet",
        url: window.location.origin,
      },
      walletUrl: SPHERE_WALLET_URL,
      network: TESTNET_NETWORK,
      permissions: REQUESTED_PERMISSIONS,
      resumeSessionId,
      silent,
    })) as unknown as AutoConnectResultShape;

    active = result;
    connectedAt = Date.now();
    locked = !!(result.connection.locked ?? result.client.walletLocked);

    wireEvents(result);

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
        permissions: result.connection.permissions,
        identity: result.client.walletIdentity,
        network: result.client.walletNetwork,
        walletProtocol: result.client.walletProtocol,
        locked,
      },
    });
    return result;
  } catch (err) {
    sdkLog.finish(entry.id, { status: "error", error: toErrorShape(err) });
    throw err;
  }
}

export async function connectWallet(): Promise<SphereIdentity> {
  if (connectingPromise) await connectingPromise;
  if (active?.client.isConnected) return toIdentity(active.client.walletIdentity)!;
  connectingPromise = doConnect(false);
  try {
    const r = await connectingPromise;
    const identity = toIdentity(r.client.walletIdentity);
    if (!identity) {
      throw new Error("The wallet completed the handshake without an identity.");
    }
    return identity;
  } finally {
    connectingPromise = null;
  }
}

/**
 * Silent reconnect using a persisted session id. Returns null when the wallet
 * has not previously approved this origin (no UI is ever shown).
 */
export async function reconnectWallet(): Promise<SphereIdentity | null> {
  if (typeof window === "undefined") return null;
  if (active?.client.isConnected) return toIdentity(active.client.walletIdentity);
  const sessionId = window.localStorage.getItem(SESSION_KEY);
  if (!sessionId) return null;
  try {
    const r = await doConnect(true);
    return toIdentity(r.client.walletIdentity);
  } catch {
    // A silent resume that fails simply means "not approved / session gone".
    clearSession();
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
    clearSession();
  }
}

export function getIdentitySync(): SphereIdentity | null {
  return toIdentity(active?.client.walletIdentity ?? null);
}

export function getNetworkSync(): SphereNetworkInfo | null {
  const n = active?.client.walletNetwork;
  return n ? { id: n.id, name: n.name } : null;
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

export function getPermissionsSync(): string[] {
  return [...(active?.client.permissions ?? [])];
}

export function getWalletProtocolSync(): string | null {
  return active?.client.walletProtocol ?? null;
}

export function isLockedSync(): boolean {
  return locked || !!active?.client.walletLocked;
}

export function isConnectedSync(): boolean {
  return !!active?.client.isConnected;
}

/** True when the wallet's active network is not the network this dApp targets. */
export function isNetworkMismatchSync(): boolean {
  const n = active?.client.walletNetwork;
  if (!n) return false;
  return n.id !== TESTNET_NETWORK.id;
}

function requireClient(): ConnectClientLike {
  if (!active?.client.isConnected) {
    throw new Error("Wallet is not connected");
  }
  return active.client;
}

// --- logged RPC --------------------------------------------------------------

async function loggedQuery<T>(method: string, params?: Record<string, unknown>): Promise<T> {
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

async function loggedIntent<T>(action: string, params: Record<string, unknown>): Promise<T> {
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

/** Every query method the current Connect protocol exposes. */
export const CONNECT_RPC_METHODS = RPC_METHODS;
/** Every intent action the current Connect protocol exposes. */
export const CONNECT_INTENT_ACTIONS = INTENT_ACTIONS;

export async function getIdentity(): Promise<SphereIdentity> {
  const raw = await loggedQuery<PublicIdentity>(RPC_METHODS.GET_IDENTITY);
  const identity = toIdentity(raw);
  if (!identity) throw new Error("Wallet returned no identity");
  return identity;
}

/** Fetch balances. The wallet returns provider-specific shapes; we normalise. */
export async function getBalances(): Promise<CoinBalance[]> {
  const raw = await loggedQuery<unknown>(RPC_METHODS.GET_BALANCE);
  return normaliseBalances(raw);
}

export async function getAssets(): Promise<unknown> {
  return loggedQuery<unknown>(RPC_METHODS.GET_ASSETS);
}

export async function getTokens(): Promise<unknown> {
  return loggedQuery<unknown>(RPC_METHODS.GET_TOKENS);
}

export async function getHistory(): Promise<HistoryEntry[]> {
  const raw = await loggedQuery<unknown>(RPC_METHODS.GET_HISTORY, { limit: 100 });
  return normaliseHistory(raw);
}

/** Resolve a nametag / address to a chain identity via the wallet. */
export async function resolvePeer(query: string): Promise<unknown> {
  return loggedQuery<unknown>(RPC_METHODS.RESOLVE, { query });
}

export async function sendTokens(params: SendParams): Promise<SendResult> {
  const raw = await loggedIntent<unknown>(INTENT_ACTIONS.SEND, {
    recipient: params.recipient,
    amount: params.amount,
    coinId: params.coinId,
    ...(params.memo ? { memo: params.memo } : {}),
  });
  return normaliseSendResult(raw);
}

/** Raw playground call: developer-supplied method + params. */
export async function rawQuery(method: string, params?: Record<string, unknown>): Promise<unknown> {
  return loggedQuery<unknown>(method, params);
}

export async function rawIntent(action: string, params: Record<string, unknown>): Promise<unknown> {
  return loggedIntent<unknown>(action, params);
}

/** Subscribe to a wallet event (the SDK auto-subscribes on the wire). */
export function onWalletEvent(event: string, handler: (data: unknown) => void): () => void {
  if (!active) return () => undefined;
  return active.client.on(event, handler);
}

// --- normalisation helpers ---------------------------------------------------

function normaliseSendResult(raw: unknown): SendResult {
  if (!raw || typeof raw !== "object") {
    return { status: "submitted" };
  }
  const o = raw as Record<string, unknown>;
  const status = String(o.status ?? (o.success === false ? "failed" : "submitted"));
  return {
    status,
    transferId: (o.transferId ?? o.id ?? o.txId ?? o.hash) as string | undefined,
    deliveryPending: typeof o.deliveryPending === "boolean" ? o.deliveryPending : undefined,
    recipient: o.recipient as string | undefined,
    amount: o.amount !== undefined ? String(o.amount) : undefined,
    coinId: o.coinId as string | undefined,
    raw,
  };
}

function normaliseBalances(raw: unknown): CoinBalance[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map((b) => coerceBalance(b)).filter((b): b is CoinBalance => !!b);
  }
  if (typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    for (const key of ["coins", "balances", "assets"]) {
      if (Array.isArray(obj[key])) {
        return (obj[key] as unknown[]).map(coerceBalance).filter((b): b is CoinBalance => !!b);
      }
    }
    // symbol -> amount map
    const out: CoinBalance[] = [];
    for (const [symbol, amount] of Object.entries(obj)) {
      if (typeof amount === "string" || typeof amount === "number") {
        out.push({ coinId: symbol, symbol, amount: String(amount) });
      } else if (amount && typeof amount === "object") {
        const coerced = coerceBalance({ symbol, ...(amount as object) });
        if (coerced) out.push(coerced);
      }
    }
    return out;
  }
  return [];
}

function coerceBalance(v: unknown): CoinBalance | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const symbol = (o.symbol ?? o.coinId ?? o.id ?? o.coin ?? o.name) as string | undefined;
  const amount = (o.amount ?? o.balance ?? o.value ?? o.total) as string | number | undefined;
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
      counterparty: (o.counterparty ?? o.from ?? o.to ?? o.recipient) as string | undefined,
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
