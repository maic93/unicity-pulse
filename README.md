# Unicity Dev Console

A developer console for exploring and interacting with the Unicity Testnet
using the official Sphere SDK.

Not a wallet — the Dev Console is an inspection tool aimed at engineers
integrating Unicity into their applications. It uses your Sphere Wallet as
the signing backend and exposes every SDK response, request and lifecycle
event so you can see exactly how the wire protocol behaves.

## Features

- **Dashboard** — wallet, balance, network, latest block, SDK version,
  connection status, session ID, last sync, gateway latency.
- **Wallet** — full identity/balances view with copy & JSON export.
- **Explorer** — search wallet addresses or transaction hashes and inspect
  their raw payloads.
- **API Playground** — Postman-style panel for the Sphere SDK. One-click
  presets for `sphere_getIdentity`, `sphere_getBalance`, `sphere_getHistory`,
  `sphere_getNetwork`, `sphere_getLatestBlock`, wallet-info composite and a
  safe 0 UCT self-transfer, plus a custom query / intent runner with a JSON
  params editor.
- **Network** — live gateway status, transport, latency and auto-refresh
  cadence.
- **Transactions** — searchable, filterable list of the wallet's history
  with copyable hashes.
- **Logs** — live timeline of every SDK request, response, error and wallet
  lifecycle event. Copy / clear / export as JSON.
- **Settings** — auto-refresh interval, default landing page, developer
  mode. Persisted to `localStorage`.
- **About** — links to the official Sphere resources.

## Architecture

- **Framework:** TanStack Start v1 (Vite 7, React 19) with file-based
  routing under `src/routes/`.
- **Data:** TanStack Query for all Sphere reads with configurable
  auto-refresh.
- **Wallet:** `@unicitylabs/sphere-sdk/connect/browser` via `autoConnect`.
  All SDK access flows through `src/lib/sphere/client.ts` — the only module
  in the app that imports the SDK.
- **Observability:** every query, intent and lifecycle event is pushed
  through the in-memory `sdkLog` store (`src/lib/sphere/log.ts`) and
  streamed to the Logs page via `useSyncExternalStore`.
- **Styling:** Tailwind v4 + shadcn/ui, dark-first with Unicity orange
  accents and glassmorphism cards.

## SDK integration

The console targets Unicity **testnet2** (network id `4`) through the
official Sphere Connect protocol:

- Reference: https://github.com/unicity-sphere/sphere-sdk
- Protocol: https://github.com/unicity-sphere/sphere-sdk/blob/main/docs/CONNECT.md

Methods called by the app:

| Feature       | RPC / intent               |
| ------------- | -------------------------- |
| Identity      | `sphere_getIdentity`       |
| Balances      | `sphere_getBalance`        |
| History       | `sphere_getHistory`        |
| Network       | `sphere_getNetwork`        |
| Latest block  | `sphere_getLatestBlock` (best-effort across providers) |
| Send tokens   | `intent:send`              |

The playground can additionally invoke any `sphere_*` query or intent
action supplied by the developer.

## Usage

1. Install and run the dev server:

   ```bash
   bun install
   bun run dev
   ```

2. Open the app in a browser that has the [Sphere
   Wallet](https://sphere.unicity.network) available (extension or popup
   transport).
3. Click **Connect Sphere Wallet** — the session is persisted in
   `localStorage` so refreshes reconnect silently.
4. Explore the Dashboard, then head to **API Playground** to fire real
   SDK calls and **Logs** to watch them stream.

## Deployment

Standard TanStack Start / Vite build — deploys to Vercel with no code
changes:

```bash
bun run build
```

## Screenshots

_(Placeholders — capture from the running app.)_

- `docs/screenshots/dashboard.png`
- `docs/screenshots/playground.png`
- `docs/screenshots/logs.png`
