# Unicity Pulse

> Watch the blockchain breathe.

**Unicity Pulse** is an immersive visualization platform for the Unicity Testnet. It combines real blockchain data, premium motion design, analytics and the official Sphere SDK into a modern interactive experience.

## Features

- **Pulse Sphere** — animated 3D-feel identity for the network that reacts to wallet state and block activity
- **Live command center** — real-time balance, block, latency, session, network and SDK metrics
- **Wallet identity card** — deterministic gradient avatar, session duration, activity score, last sync
- **Blockchain timeline** — animated day-grouped feed of real transactions and wallet lifecycle events
- **Blockchain constellation** — signature visualization of counterparties orbiting the connected wallet
- **Analytics** — cumulative volume, hourly cadence, incoming vs outgoing, active-day and peak-hour insights
- **Explorer, Playground, SDK Logs** — inspect any address / hash and every SDK request in real time
- **Send tokens** — Zod-validated intent dispatch through Sphere Connect
- **Ambient design** — animated gradient background, particle field, soft grid, glassmorphism throughout

## Screenshots

_Placeholder — add captures of the Pulse hero, timeline, and constellation._

## Architecture

- **Framework** — TanStack Start (React 19 + Vite 7) with file-based routing
- **Wallet** — [`@unicitylabs/sphere-sdk`](https://www.npmjs.com/package/@unicitylabs/sphere-sdk) via Sphere Connect (`autoConnect`)
- **State** — TanStack Query with auto-refreshing balances / history and session persistence
- **UI** — Tailwind v4 (CSS-first) + shadcn/ui + Lucide icons, dark-only design system
- **Motion** — CSS keyframe animations tuned for 60fps (rotation, pulse, glow ring, fade-up, particle drift)

## SDK Integration

Every interaction with the Unicity Testnet flows through `src/lib/sphere/client.ts`, which is the single wrapper around the official SDK. Every query, intent and lifecycle event is recorded in an in-memory log (`src/lib/sphere/log.ts`) and streamed to the UI:

- `sphere_getIdentity`, `sphere_getBalance`, `sphere_getHistory`, `sphere_getLatestBlock`
- `intent:send`
- Wallet events: `identityChanged`, `networkChanged`, `locked`, `disconnected`

Gateway: `https://gateway.testnet2.unicity.network` · Network: `testnet2` (id `4`).

## Installation

```bash
bun install
bun run dev
```

## Deployment

The project builds to a standard Vite output and deploys to Vercel with zero configuration:

```bash
bun run build
```

## Usage

1. Open the app and click **Connect Sphere Wallet**.
2. Approve the connection in Sphere (`https://sphere.unicity.network`).
3. Explore the Pulse, Timeline, Analytics, Explorer, Network, Playground and Logs.

No mock data — every metric reflects live state from the real Unicity Testnet.
