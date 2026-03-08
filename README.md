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

Lookup update endpoint from host:

- `POST http://localhost:13000/cribl/lookups/update`

Mock CMDB endpoint from Cribl containers:

- `http://mock-cmdb:3000/insight/objects`

Lookup update endpoint from Cribl containers:

- `http://mock-cmdb:3000/cribl/lookups/update`

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

## Update Cribl Lookup from Mock CMDB

The mock service can run the Cribl lookup update flow (`PUT /system/lookups` then `PATCH /system/lookups/{id}`) using `mock-cmdb/data.json` converted to CSV.

Required:

- Valid Cribl API token
- Existing in-memory lookup file (default id: `jira_cmdb_mock.csv`)

Quick dry run (shows URLs and CSV preview, no Cribl changes):

```bash
curl -sS -X POST http://localhost:13000/cribl/lookups/update \
  -H 'Content-Type: application/json' \
  -d '{"dryRun": true}' | jq
```

Real update:

```bash
curl -sS -X POST http://localhost:13000/cribl/lookups/update \
  -H 'Content-Type: application/json' \
  -d '{
    "token": "YOUR_CRIBL_BEARER_TOKEN",
    "groupName": "default",
    "lookupId": "jira_cmdb_mock.csv"
  }' | jq
```

You can also set defaults in `docker-compose.yml` via:

- `CRIBL_API_BASE_URL` (default: `http://leader1:9000/api/v1`)
- `CRIBL_GROUP_NAME` (default: `default`)
- `CRIBL_LOOKUP_ID` (default: `jira_cmdb_mock.csv`)
- `CRIBL_API_TOKEN` (optional, if you do not want to pass `token` in the request body)

## Stop and clean

```bash
docker compose down
```

To also remove volumes:

```bash
docker compose down -v
```
