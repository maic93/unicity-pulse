/**
 * Direct read-only access to the current Unicity Testnet (testnet2) gateway.
 *
 * The Sphere Connect protocol intentionally exposes only wallet-scoped RPCs
 * (identity / balance / tokens / history / resolve). Chain-level data such as
 * block height is NOT available over Connect, so it is read straight from the
 * public testnet2 gateway. Every call is real — nothing here is mocked.
 */

import { sdkLog } from "./log";

/** Current Unicity Testnet gateway (testnet2, networkId 4). */
export const GATEWAY_URL = "https://gateway.testnet2.unicity.network";

/** testnet2 runs 8 BFT shards, addressed by 3-bit binary bitstrings. */
const SHARD_IDS = ["000", "001", "010", "011", "100", "101", "110", "111"];

export interface GatewayHealth {
  status: string;
  database?: string;
  aggregators: Record<string, string>;
  latencyMs: number;
}

export interface ShardHeight {
  shardId: string;
  blockNumber: number | null;
  error?: string;
}

export interface LatestBlock {
  /** Highest block number observed across all shards. */
  blockNumber: number;
  shards: ShardHeight[];
  fetchedAt: number;
}

async function rpc<T>(method: string, params: Record<string, unknown>): Promise<T> {
  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params }),
  });
  const json = (await res.json()) as {
    result?: T;
    error?: unknown;
  };
  if (json.error !== undefined || json.result === undefined) {
    throw new Error(
      typeof json.error === "string"
        ? json.error
        : JSON.stringify(json.error ?? "Gateway returned no result"),
    );
  }
  return json.result;
}

/** Real gateway health probe (also used for latency). */
export async function getGatewayHealth(): Promise<GatewayHealth> {
  const entry = sdkLog.start({
    method: "gateway:/health",
    kind: "query",
    params: { url: GATEWAY_URL },
  });
  const started = performance.now();
  try {
    const res = await fetch(`${GATEWAY_URL}/health`, { method: "GET" });
    if (!res.ok) throw new Error(`Gateway responded ${res.status}`);
    const body = (await res.json()) as Omit<GatewayHealth, "latencyMs">;
    const health: GatewayHealth = {
      ...body,
      aggregators: body.aggregators ?? {},
      latencyMs: Math.round(performance.now() - started),
    };
    sdkLog.finish(entry.id, { status: "ok", response: health });
    return health;
  } catch (err) {
    sdkLog.finish(entry.id, {
      status: "error",
      error: { message: err instanceof Error ? err.message : String(err) },
    });
    throw err;
  }
}

/** Real chain tip across every testnet2 shard. */
export async function getLatestBlock(): Promise<LatestBlock> {
  const entry = sdkLog.start({
    method: "gateway:get_block_height",
    kind: "query",
    params: { shards: SHARD_IDS.length },
  });
  try {
    const shards = await Promise.all(
      SHARD_IDS.map(async (shardId): Promise<ShardHeight> => {
        try {
          const r = await rpc<{ blockNumber: string | number }>("get_block_height", { shardId });
          return { shardId, blockNumber: Number(r.blockNumber) };
        } catch (err) {
          return {
            shardId,
            blockNumber: null,
            error: err instanceof Error ? err.message : String(err),
          };
        }
      }),
    );
    const heights = shards
      .map((s) => s.blockNumber)
      .filter((n): n is number => typeof n === "number" && Number.isFinite(n));
    if (heights.length === 0) {
      throw new Error("No testnet2 shard returned a block height");
    }
    const result: LatestBlock = {
      blockNumber: Math.max(...heights),
      shards,
      fetchedAt: Date.now(),
    };
    sdkLog.finish(entry.id, { status: "ok", response: result });
    return result;
  } catch (err) {
    sdkLog.finish(entry.id, {
      status: "error",
      error: { message: err instanceof Error ? err.message : String(err) },
    });
    throw err;
  }
}
