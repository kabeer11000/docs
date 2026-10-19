Backend services for Docs, deployed on Render.

- `auth-service` — Go authentication microservice (password, Google OAuth, WebAuthn/passkeys). Issues ES256-signed JWTs.
- `cloudstore-backend` — realtime database engine (Socket.io + MongoDB + Redis) backing document/folder/file storage.
- `yjs-host` — Hocuspocus/Yjs realtime collaboration server for the document editor.

Each service has its own `.env.example` listing required configuration. Real values are set as environment variables in Render, never committed.
