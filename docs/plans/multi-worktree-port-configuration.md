# Multi-Worktree Port Configuration Plan

## Context

When running multiple worktrees simultaneously (e.g., working on feature branches in parallel), the dev servers conflict on ports 3000 (Express), 8080 (Vite), and 9229 (Node inspector). We need a way to run each worktree on different ports while sharing the same MongoDB instance.

## Current State

- **Vite port**: configurable via `VITE_DEV_PORT` env var (default 8080) — `packages/web/vite.config.mts`
- **Express port**: configurable via `PORT` env var (default 3000) — `packages/server/src/config/index.mts`
- **Node inspector**: hardcoded to `9229` in `packages/server/package.json` dev script
- **`getApiBaseUrl.mts`**: hardcodes port 3000 — breaks if Express runs on a different port
- **`.env` files are tracked in git** — so worktrees share the same values
- **Socket.io** connects directly to `getApiBaseUrl()` (port 3000), bypassing the Vite proxy that's already configured for `/socket.io`

## Plan

### 1. Fix `getApiBaseUrl.mts` to use Vite proxy in dev

Since Vite already proxies both `/api` and `/socket.io` (with `ws: true`), the frontend should connect through the Vite server in dev instead of directly to Express. This eliminates the hardcoded port 3000 dependency entirely.

**File**: `packages/web/src/utils/getApiBaseUrl.mts`

Change to return `window.location.origin` in dev (the Vite server), or `import.meta.env.VITE_API_URL` if explicitly set. This way the frontend only needs to know the Vite port, and the proxy handles the rest.

```typescript
export function getApiBaseUrl(): string {
  // In dev, use the current origin (Vite dev server) which proxies /api and /socket.io
  if (import.meta.env.DEV) {
    return import.meta.env.VITE_API_URL || window.location.origin;
  }
  // In production, use configured API URL or same origin
  return import.meta.env.VITE_API_URL || window.location.origin;
}
```

### 2. Make Node inspector port configurable

**File**: `packages/server/package.json`

Change the dev script to read from `INSPECT_PORT` env var:
```
"dev": "nodemon --exec \"tsx --inspect=${INSPECT_PORT:-9229} --watch src/index.mts\""
```

### 3. Update server config to load `.env.local` overrides

**File**: `packages/server/src/config/index.mts`

Load `.env.local` after `.env` so local overrides take precedence:
```typescript
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env.local'), override: true });
```

Vite already loads `.env.local` automatically with higher priority — no changes needed there.

### 4. Add `.env.local` to `.gitignore`

**File**: `.gitignore`

Add `.env.local` so per-worktree overrides aren't tracked.

### 5. Create worktree port setup script

**File**: `scripts/setup-worktree-ports.sh`

A simple script that generates `.env.local` files with offset ports:

```bash
#!/bin/bash
# Usage: ./scripts/setup-worktree-ports.sh <offset>
# Example: ./scripts/setup-worktree-ports.sh 10
#   -> Express on 3010, Vite on 8090, Inspector on 9239

OFFSET=${1:?Usage: setup-worktree-ports.sh <offset>}
API_PORT=$((3000 + OFFSET))
VITE_PORT=$((8080 + OFFSET))
INSPECT_PORT=$((9229 + OFFSET))

cat > packages/server/.env.local << EOF
PORT=$API_PORT
EOF

cat > packages/web/.env.local << EOF
VITE_DEV_PORT=$VITE_PORT
VITE_API_URL=http://localhost:$API_PORT
EOF

echo "Ports configured with offset $OFFSET:"
echo "  Express API: $API_PORT"
echo "  Vite Dev:    $VITE_PORT"
echo "  Inspector:   $INSPECT_PORT"
echo ""
echo "Run with: INSPECT_PORT=$INSPECT_PORT npm run dev"
```

## Files to Modify

1. `packages/web/src/utils/getApiBaseUrl.mts` — use Vite proxy instead of hardcoded port
2. `packages/server/package.json` — configurable inspector port
3. `packages/server/src/config/index.mts` — load `.env.local` overrides
4. `.gitignore` — add `.env.local`
5. `scripts/setup-worktree-ports.sh` — new script (create)

## Usage

```bash
# Main worktree (default ports, no changes needed)
npm run dev

# Second worktree (offset 10)
./scripts/setup-worktree-ports.sh 10
INSPECT_PORT=9239 npm run dev
# -> Express on 3010, Vite on 8090

# Third worktree (offset 20)
./scripts/setup-worktree-ports.sh 20
INSPECT_PORT=9249 npm run dev
# -> Express on 3020, Vite on 8100
```

## Verification

1. Run main worktree on default ports — confirm everything works as before
2. Run `setup-worktree-ports.sh 10` in a second worktree, start dev, confirm no port conflicts
3. Confirm socket.io works through the Vite proxy (this is the main risk — test real-time features like chat or token movement)
4. Confirm API calls work through the proxy
5. Confirm both instances can read/write to the same MongoDB
