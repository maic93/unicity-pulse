// Sphere Connect protocol types (subset used by this dashboard).
// The wire format matches the official @unicitylabs/sphere-sdk Connect protocol.

export interface SphereIdentity {
  chainPubkey: string;
  directAddress?: string;
  nametag?: string;
}

export interface SphereNetworkInfo {
  id: number;
  name?: string;
}

// The Sphere getBalance RPC returns a map of coin symbol -> decimal string,
// or an object with a coins array. We accept both shapes defensively.
export interface CoinBalance {
  coinId: string;
  symbol: string;
  amount: string; // decimal string, base units
  decimals?: number;
}

export interface HistoryEntry {
  id: string;
  hash?: string;
  direction: "in" | "out" | "self";
  counterparty?: string;
  amount: string;
  coinId?: string;
  symbol?: string;
  status: "completed" | "pending" | "failed" | string;
  timestamp: number; // ms epoch
  memo?: string;
}

export interface SendParams {
  recipient: string;
  amount: string;
  coinId: string;
  memo?: string;
}

export interface SendResult {
  status: string;
  transferId?: string;
  deliveryPending?: boolean;
}
