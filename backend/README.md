# Nexus Platform — Backend

Node.js + Express + SQLite backend for the Nexus investor/entrepreneur collaboration platform.

## Quick start

```bash
cd backend
npm install
cp .env.example .env   # fill in JWT_SECRET at minimum
npm run dev             # nodemon, restarts on change
# or
npm start                # plain node
```

Server boots on `http://localhost:5000`. SQLite database file `nexus.db` and uploaded files in `uploads/` are created automatically on first run.

## Environment variables

See `.env.example`. Notes:

- `JWT_SECRET` — required, use a long random string in production.
- `FRONTEND_URL` — comma-separated list of allowed origins for CORS, and used to build password-reset links. Set this to your deployed Vercel URL in production.
- `SMTP_*` — optional. If left blank, password-reset and 2FA emails are printed to the server console instead of actually being sent, so the whole flow is still testable without a real mail account.

## REST API

Import `Nexus.postman_collection.json` into Postman. It auto-captures the JWT from Register/Login into a collection variable so every other request is pre-authenticated.

| Area | Endpoints |
|---|---|
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/2fa/verify-login`, `POST /api/auth/2fa/toggle`, `POST /api/auth/forgot-password`, `POST /api/auth/reset-password/:token`, `POST /api/auth/change-password`, `GET /api/auth/me`, `POST /api/auth/logout` |
| Profiles | `GET /api/profiles/me`, `PUT /api/profiles/me`, `GET /api/profiles?role=investor`, `GET /api/profiles/:userId` |
| Meetings | `POST /api/meetings`, `GET /api/meetings`, `PUT /api/meetings/:id` (accept/reject) |
| Documents | `POST /api/documents/upload`, `GET /api/documents/my`, `GET /api/documents/all`, `POST /api/documents/:id/sign`, `DELETE /api/documents/:id` |
| Payments | `POST /api/transactions` (deposit/withdraw/transfer), `GET /api/transactions`, `PUT /api/transactions/:id` |
| Messages | `GET /api/messages/conversations`, `GET /api/messages/:userId`, `POST /api/messages/:userId` |

All endpoints except register/login/forgot-password/reset-password require `Authorization: Bearer <token>`.

### Notes on specific flows

**Two-factor authentication.** When a user enables 2FA (`POST /auth/2fa/toggle`), subsequent logins return `{ requiresOtp: true, userId }` instead of a token. The server emails (or console-logs, if SMTP isn't configured) a 6-digit code. Submit it to `POST /auth/2fa/verify-login` to receive the actual JWT.

**Payments.** `POST /api/transactions` is a **sandbox/mock gateway**, matching the brief's "Mock Integration" requirement — it's not wired to real Stripe/PayPal. Every transaction is created as `pending` and settles automatically 1.5–3s later (90% success / 10% simulated failure) to `completed`/`failed`. The settlement is pushed live over Socket.IO (`transaction:update`), not just polled.

**Document uploads.** Stored on local disk under `backend/uploads/` and served statically at `/uploads/<filename>`. ⚠️ On most free-tier PaaS hosts (Render free, Heroku) the filesystem is **ephemeral** — uploaded files disappear on redeploy/restart. Fine for a demo; for real production use, swap the multer disk storage in `src/routes/documents.js` for an S3-compatible bucket.

## WebSocket (Socket.IO) events

Connect with `io(SOCKET_URL, { auth: { token: <jwt> } })`. The server authenticates the socket using the same JWT as REST calls.

| Event | Direction | Payload | Purpose |
|---|---|---|---|
| `presence` | server → client (broadcast) | `{ userId, online }` | Online/offline status |
| `new_message` | server → client | full message row | Real-time chat delivery |
| `typing` / `stop_typing` | both | `{ recipientId }` / `{ fromUserId }` | Typing indicator |
| `transaction:update` | server → client | full transaction row | Live payment settlement |
| `call:invite` | both | `{ toUserId, offer, callType }` | WebRTC call offer |
| `call:answer` | both | `{ toUserId, answer }` | WebRTC answer |
| `call:ice-candidate` | both | `{ toUserId, candidate }` | WebRTC ICE exchange |
| `call:reject` / `call:end` | both | `{ toUserId }` | Call teardown |

`call:*` events implement WebRTC signaling only (SDP offer/answer + ICE candidates); actual audio/video flows peer-to-peer once connected, using Google's public STUN server (`stun:stun.l.google.com:19302`). No TURN server is configured, so calls between peers on restrictive/symmetric NATs may fail to connect — fine for same-network demos, not guaranteed on arbitrary public networks.

## Security features implemented

- Password hashing with bcrypt.
- JWT auth with configurable expiry.
- Rate limiting on all `/api/auth/*` routes (30 requests / 15 min / IP).
- Global request body sanitization to strip script tags / event-handler attributes / `javascript:` URIs (`src/middleware/sanitize.js`).
- `express-validator` on register/login payloads.
- Helmet default security headers.
- Role/ownership checks on meetings, documents, and transactions (users can only modify their own records).
- Password reset via time-limited, hashed single-use tokens (not stored in plaintext).
- Optional email-based 2FA.

## Deployment

Three deployment paths are documented. **Back4app Containers is recommended if you don't have a credit card** — Render and Fly.io both require one (Render: a $1 temporary authorization hold, no ongoing charge on the free instance type; Fly.io: real usage-based billing, no free tier as of 2024).

### Option A — Back4app Containers (no credit card required)

Deploys straight from `backend/Dockerfile` via GitHub. Free tier: 256MB RAM, 0.25 CPU, 600 active hours/month, no card at signup.

1. Push this repo to GitHub (the `backend/Dockerfile` and `.dockerignore` are already set up).
2. Sign up at [back4app.com](https://www.back4app.com) → **Containers as a Service**.
3. **Create new app** → connect your GitHub account → select the `Nexus` repo.
4. Set **Root Directory** to `backend` (the Dockerfile lives there, not at the repo root — the frontend is a separate app in the same repo).
5. Back4app detects the `Dockerfile` automatically and builds from it.
6. Set environment variables in the Back4app dashboard: `JWT_SECRET` (generate one: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`), `JWT_EXPIRE=7d`, `FRONTEND_URL` (your GitHub Pages URL), `NODE_ENV=production`. Don't set `PORT` — the platform injects it.
7. Deploy. Note the resulting URL and confirm it's live by visiting `<url>/api/health`.
8. Point the frontend at it: set `VITE_API_URL=<url>/api` and `VITE_SOCKET_URL=<url>` as GitHub Actions repo secrets (Settings → Secrets and variables → Actions), then re-run the deploy workflow.

⚠️ **Storage caveat:** we haven't been able to confirm whether Back4app's free container tier includes a persistent volume. The `Dockerfile` writes the SQLite DB and uploads to `/data` regardless, so if the platform does wipe the container filesystem on redeploy/restart, expect data loss there just like Render's free tier — same limitation, different platform. Worth testing directly: deploy, register a user, trigger a redeploy, and see if that user still exists.

### Option B — Render (needs a card, but no ongoing charge on Free tier)

A `render.yaml` and `Procfile` are included.

1. Push this repo to GitHub.
2. In Render: New → Blueprint → point at the repo (uses `render.yaml`), or New → Web Service manually with **Root Directory** `backend`, build command `npm install`, start command `node src/server.js`.
3. Set environment variables in the Render dashboard: `JWT_SECRET` (or let Render auto-generate it), `FRONTEND_URL` (your GitHub Pages URL), optionally `SMTP_*`.
4. Deploy. Note the resulting URL, e.g. `https://nexus-backend.onrender.com`.
5. Point the frontend at it the same way as Option A step 8.
6. Same ephemeral-filesystem caveat as above on the free instance type.

### Option C — Fly.io (needs a card, real usage-based billing)

Deploys from the same `backend/Dockerfile`. Install `flyctl`, run `fly launch` from the `backend/` directory (it'll detect the Dockerfile), `fly volumes create nexus_data --size 1` for real persistent storage mounted at `/data` (matching the Dockerfile's `DB_PATH`/`UPLOADS_DIR`), then `fly deploy`. This is the only one of the three with confirmed real persistent storage on a small paid tier.

## Database

SQLite via the `sqlite3` package (async, callback-based API — not `better-sqlite3`). Tables: `users`, `profiles`, `meetings`, `documents`, `transactions`, `messages`. Schema is created and lightly migrated (new columns added if missing) automatically on server start in `src/database.js`. No separate migration step is required.

`DB_PATH` and `UPLOADS_DIR` env vars override where the database file and uploaded documents are written (defaulting to `backend/nexus.db` and `backend/uploads/` for local dev) — used to point at a mounted volume path in production. See `src/database.js` and `src/server.js`.
