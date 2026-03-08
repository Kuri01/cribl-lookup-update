# Cribl Stream on Docker Compose

This repo boots a **4-node distributed Cribl Stream topology**:

- `leader1` (primary candidate)
- `leader2` (standby failover candidate)
- `worker1`
- `worker2`
- `mock-cmdb` (mock Jira Insight CMDB API)

## What this setup does

- Runs 2 Leaders in **failover resiliency** mode.
- Uses a shared Docker volume (`leaders_failover`) as the failover volume.
- Connects both Workers to one Leader endpoint (`leader1` by default).
- Exposes a mock CMDB API for workers at `http://mock-cmdb:3000/insight/objects`.

## Prerequisites

- Docker + Docker Compose plugin (`docker compose`)
- Enough memory/CPU for 4 Cribl containers + 1 mock API container

## Start

```bash
docker compose up -d
```

## Turborepo

Root workspace now uses Turborepo with `mock-cmdb` as a package.

```bash
npm install
npm run build
npm run dev
```

Open UIs:

- Leader 1: http://localhost:19000
- Leader 2: http://localhost:19001
- Worker 1: http://localhost:19100
- Worker 2: http://localhost:19101

Mock CMDB endpoint from host:

- http://localhost:13000/insight/objects

Mock CMDB endpoint from Cribl containers:

- `http://mock-cmdb:3000/insight/objects`

## Environment knobs

Optional overrides:

- `CRIBL_IMAGE` (default: `cribl/cribl:latest`)
- `CRIBL_DIST_TOKEN` (default: `criblmaster`)
- `CRIBL_WORKER_LEADER_HOST` (default: `leader1`)

Example:

```bash
CRIBL_DIST_TOKEN=mytoken CRIBL_WORKER_LEADER_HOST=leader1 docker compose up -d
```

## Important HA note

In Cribl failover, only one Leader is active at a time. In real environments, Workers should target a stable VIP/DNS/load-balancer endpoint for Leader connectivity. This compose file defaults workers to `leader1` for local bootstrap simplicity.

## Verify Mock CMDB From Worker

If `curl` is available in the worker image:

```bash
docker compose exec worker1 curl -sS http://mock-cmdb:3000/insight/objects
```

If `curl` is not available, run a one-off container on the same network:

```bash
docker run --rm --network cribl_default curlimages/curl:8.12.1 -sS http://mock-cmdb:3000/insight/objects
```

## Stop and clean

```bash
docker compose down
```

To also remove volumes:

```bash
docker compose down -v
```
