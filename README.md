# Nexus — Investor & Entrepreneur Collaboration Platform

Full-stack platform connecting entrepreneurs and investors: authentication, profiles, meeting scheduling, real-time chat, WebRTC video/audio calls, a document chamber with e-signatures, a sandbox payment gateway, and security hardening (2FA, rate limiting, XSS sanitization).

## Stack

- **Frontend:** React + TypeScript + Vite + Tailwind, deployed to Vercel
- **Backend:** Node.js + Express + SQLite (`sqlite3`), deployed to Render
- **Real-time:** Socket.IO (chat delivery, presence, WebRTC signaling)

## Running locally

**Backend** (starts on `:5000`):
```bash
cd backend
npm install
cp .env.example .env   # set JWT_SECRET
npm run dev
```

**Frontend** (starts on `:5173`):
```bash
npm install
npm run dev
```

The frontend defaults to `http://localhost:5000` for both the API and Socket.IO — see `.env.example` in the project root to point it elsewhere (e.g. a deployed Render backend).

## Feature status vs. the internship brief

| Milestone | Status |
|---|---|
| Backend setup (Express + SQLite), frontend↔backend connection | ✅ |
| JWT auth, role-based dashboards, profile CRUD | ✅ |
| Meeting scheduling with conflict detection | ✅ |
| Video calling (WebRTC signaling over Socket.IO) | ✅ — join/leave, mute audio, toggle camera, accept/decline. No TURN server, so calls across restrictive NATs aren't guaranteed (fine for demo/same-network use) |
| Document upload/storage, preview, e-signature | ✅ — PDF/image inline preview, canvas-based signature pad, signature stored per document |
| Real-time messaging | ✅ — persisted history + Socket.IO live delivery + presence |
| Payments (mock Stripe/PayPal-style sandbox) | ✅ — deposit/withdraw/transfer, async settlement (pending → completed/failed), live status push |
| Security: bcrypt, JWT, input sanitization, 2FA, rate limiting | ✅ |
| API documentation | ✅ — `backend/Nexus.postman_collection.json` + `backend/README.md` (REST + WebSocket event reference) |
| Deployment config | ✅ — `backend/render.yaml` + `Procfile`; frontend already has `vercel.json` |

## Known limitations (read before demoing)

- **Uploaded documents are stored on local disk**, not S3. On Render's free tier the filesystem is ephemeral — files uploaded before a redeploy/restart will disappear. Fine for a live demo in one sitting; not durable for real production use.
- **WebRTC has no TURN server** — only a public STUN server. Calls between two peers behind the same network/browser tab (or straightforward NATs) work fine; calls across some symmetric/corporate NATs may fail to establish a peer connection.
- **2FA and password reset emails** fall back to being printed in the backend server console when no `SMTP_*` env vars are set, rather than actually emailing. Set real SMTP credentials in `backend/.env` to send real emails.
- **Payments are a simulated sandbox**, not real Stripe/PayPal — this matches the brief's "Mock Integration" wording for Milestone 6, not a live payment processor.

## Repository layout

```
/              React frontend (this is the repo root)
/backend       Express + SQLite backend
/backend/Nexus.postman_collection.json   API collection for Postman
/backend/README.md                        Backend-specific docs (endpoints, WebSocket events, deployment)
```
