Backend services for Docs, deployed on Render.

- `auth-service` — Go authentication microservice (password, Google OAuth, WebAuthn/passkeys). Issues ES256-signed JWTs.
- `cloudstore-backend` — realtime database engine (Socket.io + MongoDB + Redis) backing document/folder/file storage.
- `yjs-host` — Hocuspocus/Yjs realtime collaboration server for the document editor.

Each service has its own `.env.example` listing required configuration. Real values are set as environment variables in Render, never committed.

## Running locally

```bash
# auth-service (Go)
cd auth-service
cp .env.example .env   # fill in MONGODB_URI, JWT_PRIVATE_KEY/PUBLIC_KEY (or *_PATH), REDIS_URL
go run main.go          # localhost:8080 by default (SERVER_PORT)

# cloudstore-backend (Bun/TS)
cd cloudstore-backend
cp .env.example .env   # MONGODB_URI, REDIS_URI
bun install && bun run src/index.ts   # localhost:8080

# yjs-host (Bun/TS)
cd yjs-host
bun install && bun run index.ts       # localhost:1234
```

Point `client@web/.env.local` (see `.env.local.example`) at whichever of these you're running, or at the deployed Render URLs to skip running a given service locally.

### Things to know

- Mongo/Redis credentials are shared with the live deployment (same Atlas cluster / Upstash instance). Anything written locally lands in the same database unless you point `MONGODB_URI` at a different database name.
- `auth-service` signs JWTs with ES256. `cloudstore-backend` only accepts a token if its tenant's public key is registered in Redis under that `tenant_id` (`SET <tenant_id> <public-key-pem>`, with real newlines escaped as literal `\n`). Regenerating keys means re-registering.
- The `cloudstore` npm client forces WebSocket-only transport (`upgrade: false`), so browsers can't attach the `Authorization` header to the handshake (a native WebSocket limitation, not fixable from JS). Auth goes through the `authorization` query param instead — see `cloudstore-backend/src/controllers/authorization.ts`.
