# Nexus — Investor & Entrepreneur Collaboration Platform

**Nexus** is a full-stack web platform that connects entrepreneurs and investors in one place — profiles, real-time chat, video calls, meeting scheduling, a document chamber with e-signatures, and a sandbox payment gateway, all wrapped in role-based dashboards with production-grade security.

It was built as a 3-week full-stack development internship deliverable, then hardened past the original brief: every core module was fixed, tested against a live backend, and reviewed for the kind of gaps a real code review would catch (broken async DB calls, silent UI failures, missing input validation, unprotected secrets, and more).

> 🔗 **Live demo:** [nexus-iota-five.vercel.app](https://nexus-iota-five.vercel.app/login)
> 📦 **Source:** [github.com/Asakusa-k/Nexus](https://github.com/Asakusa-k/Nexus)

---

## Table of contents

- [Overview](#overview)
- [Features](#features)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [API documentation](#api-documentation)
- [WebSocket events](#websocket-events)
- [Security](#security)
- [Deployment](#deployment)
- [Known limitations](#known-limitations)
- [Topics](#topics)
- [License](#license)

---

## Overview

Nexus solves a simple problem: entrepreneurs and investors need a single workspace to find each other, talk, meet, share documents, and move money — instead of juggling email, a separate video tool, a separate e-signature service, and a spreadsheet for tracking who they've talked to.

The platform has two user roles from the moment someone signs up:

- **Entrepreneurs** create a startup profile (pitch summary, funding needed, industry, team size), browse and message investors, and manage documents/payments for their raise.
- **Investors** create an investment profile (interests, stage preference, ticket size, portfolio), browse and message startups, and track deal-related payments.

Every feature that looks interactive in the UI is backed by a real API call — there's no mock data or fake local state pretending to be a backend. Messages persist and arrive in real time over WebSockets. Payments go through a simulated settlement pipeline that mimics a real payment gateway's pending → completed/failed lifecycle. Video calls use real WebRTC peer connections, not a canned animation.

## Features

### 🔐 Authentication & profiles
- JWT-based auth with bcrypt password hashing
- Role-based registration and dashboards (entrepreneur vs. investor)
- Editable profiles with role-specific fields (startup details / investment criteria)
- Email-based two-factor authentication (OTP sent on login when enabled)
- Forgot/reset password flow with time-limited, hashed single-use tokens
- Authenticated "change password" flow

### 🤝 Discovery & connections
- Browse real, live directories of registered investors and entrepreneurs
- Search and filter by industry, investment stage, and interests
- Detailed public profile pages for every user

### 💬 Real-time messaging
- Persistent conversation history, delivered live over Socket.IO
- Online/offline presence indicators
- Typing indicators
- Unread counts surfaced in the notifications bell and sidebar

### 📞 Video & audio calling
- Peer-to-peer WebRTC calls, signaled over the same Socket.IO connection as chat
- Invite, accept, reject, and end-call flows
- In-call mute and camera toggle

### 📅 Meeting scheduling
- Calendar view (`react-calendar`) with meeting-day markers
- Conflict detection — you can't double-book a time slot
- Request → accept/decline workflow
- "Schedule Meeting" available directly from any profile

### 📁 Document chamber
- Drag-and-drop or click-to-browse upload (PDF, DOC, DOCX, PNG, JPG — 10MB limit, enforced both client- and server-side)
- Inline preview for PDFs and images
- Canvas-based e-signature pad — signatures are stored per document
- Delete with ownership checks

### 💳 Payments (sandbox)
- Deposit / withdraw / transfer transaction types
- Simulated gateway settlement: every transaction starts `pending` and asynchronously resolves to `completed` or `failed`, pushed to the client live over WebSockets — mirroring how a real Stripe/PayPal webhook would behave
- Full transaction history with running balance

### 🔔 Notifications
- Real-time, driven by the same socket events that power chat, payments, and calls
- Unread badges on the navbar bell and sidebar

### 🛡️ Security
- Rate limiting (stricter on auth endpoints, general limiter on everything else)
- Global request-body sanitization against XSS payloads
- `express-validator` input validation on every write endpoint
- Ownership/authorization checks on every resource (users can only modify their own meetings, documents, and transactions)
- Helmet security headers
- Client-input errors return proper 4xx codes (not 500s)
- React error boundary so a single component crash doesn't white-screen the app

## Tech stack

**Frontend**
| | |
|---|---|
| Framework | React 18 + TypeScript |
| Build tool | Vite |
| Styling | Tailwind CSS |
| Routing | React Router v6 |
| Real-time | Socket.IO Client |
| Calendar | react-calendar |
| File upload | react-dropzone |
| Notifications | react-hot-toast |
| Icons | lucide-react |

**Backend**
| | |
|---|---|
| Runtime | Node.js + Express |
| Database | SQLite (`sqlite3`, async/callback API) |
| Real-time | Socket.IO |
| Auth | JSON Web Tokens + bcrypt |
| Validation | express-validator |
| Security | Helmet, express-rate-limit, custom XSS sanitizer |
| File uploads | Multer |
| Email | Nodemailer (falls back to console logging in dev — no SMTP account required to test 2FA/password reset) |

**Infrastructure**
- Frontend deploys to **GitHub Pages** (`.github/workflows/deploy.yml` + `.github/workflows/ci.yml` included)
- Backend deploys via **Docker** — works on Back4app Containers (no credit card required), Fly.io, or Render (`backend/Dockerfile`, `backend/render.yaml`, `backend/Procfile` all included, pick one)

## Architecture

```
┌─────────────────┐         REST (JWT)        ┌──────────────────┐
│                  │ ────────────────────────▶ │                  │
│  React Frontend  │                            │  Express Backend │
│  (Vite + TS)     │ ◀──────────────────────── │  (Node.js)       │
│                  │                            │                  │
│                  │      Socket.IO (WS)        │                  │
│                  │ ◀═══════════════════════▶ │                  │
└─────────────────┘   chat · presence · calls   └────────┬─────────┘
                       payment settlement                 │
                                                            ▼
                                                     ┌─────────────┐
                                                     │   SQLite    │
                                                     │  (nexus.db) │
                                                     └─────────────┘
```

Two channels connect client and server:
1. **REST**, authenticated with a JWT bearer token, for all CRUD operations (profiles, meetings, documents, transactions, message history).
2. **Socket.IO**, authenticated with the same JWT at handshake time, for everything that needs to be instant: new messages, presence, typing indicators, WebRTC signaling (call invite/answer/ICE candidates), and live payment settlement updates.

## Project structure

```
Nexus/
├── src/                        # React frontend
│   ├── components/
│   │   ├── chat/                # Chat message bubbles, video call modal
│   │   ├── documents/           # E-signature pad
│   │   ├── entrepreneur/        # Entrepreneur card
│   │   ├── investor/            # Investor card
│   │   ├── layout/               # Navbar, Sidebar, DashboardLayout
│   │   ├── meetings/             # Schedule meeting modal
│   │   ├── system/               # Error boundary
│   │   └── ui/                   # Button, Card, Input, Badge, Avatar…
│   ├── context/                 # Auth, Socket, Notifications providers
│   ├── pages/                   # One folder per route (auth, dashboard,
│   │                             #   chat, meetings, documents, payments,
│   │                             #   investors, entrepreneurs, settings…)
│   ├── services/api.ts          # Typed fetch wrapper for every endpoint
│   └── types/                   # Shared TypeScript interfaces
│
├── backend/                     # Express API
│   ├── src/
│   │   ├── controllers/         # Business logic per resource
│   │   ├── routes/              # Route definitions + validation wiring
│   │   ├── middleware/          # auth, validation, sanitize
│   │   ├── utils/                # password hashing, mailer
│   │   ├── database.js          # Schema + lightweight auto-migration
│   │   ├── socket.js            # Socket.IO auth + event handlers
│   │   └── server.js            # App entry point
│   ├── Nexus.postman_collection.json
│   └── README.md                # Backend-specific docs
│
├── render.yaml / Procfile       # Backend deployment (in /backend)
├── vercel.json                  # Frontend deployment
└── README.md                    # This file
```

## Getting started

### Prerequisites
- Node.js 18+
- npm

### 1. Clone and install

```bash
git clone https://github.com/Asakusa-k/Nexus.git
cd Nexus
npm install
cd backend && npm install && cd ..
```

### 2. Configure environment variables

```bash
# Backend
cp backend/.env.example backend/.env
# at minimum, set JWT_SECRET to a long random string

# Frontend (optional — defaults to localhost:5000)
cp .env.example .env
```

See [Environment variables](#environment-variables) for details.

### 3. Run it

```bash
# Terminal 1 — backend, starts on :5000
cd backend
npm run dev

# Terminal 2 — frontend, starts on :5173
npm run dev
```

Open `http://localhost:5173`. Use the "Demo Accounts" buttons on the login page to auto-provision a sample entrepreneur/investor account, or register your own.

## Environment variables

**`backend/.env`**

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | Defaults to `5000` |
| `JWT_SECRET` | **Yes** | Long random string used to sign JWTs |
| `JWT_EXPIRE` | No | Token lifetime, e.g. `7d` |
| `FRONTEND_URL` | Production | Comma-separated allowed CORS origins; also used to build password-reset links |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | No | Real email delivery for 2FA/password-reset. If unset, emails are printed to the server console instead — the full flow still works for local testing |

**`.env` (frontend root)**

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | No | Backend REST base URL, defaults to `http://localhost:5000/api` |
| `VITE_SOCKET_URL` | No | Backend base URL for Socket.IO + static uploads, defaults to `http://localhost:5000` |

## API documentation

The full REST API is documented and importable as a Postman collection: [`backend/Nexus.postman_collection.json`](backend/Nexus.postman_collection.json). It auto-captures the JWT from Register/Login so every other request is pre-authenticated.

Quick reference:

| Resource | Endpoints |
|---|---|
| Auth | `POST /api/auth/register` · `login` · `2fa/verify-login` · `2fa/toggle` · `forgot-password` · `reset-password/:token` · `change-password` · `GET me` · `POST logout` |
| Profiles | `GET /api/profiles/me` · `PUT /api/profiles/me` · `GET /api/profiles?role=` · `GET /api/profiles/:userId` |
| Meetings | `POST /api/meetings` · `GET /api/meetings` · `PUT /api/meetings/:id/status` |
| Documents | `POST /api/documents/upload` · `GET /api/documents/my` · `GET /api/documents/all` · `POST /api/documents/:id/sign` · `DELETE /api/documents/:id` |
| Payments | `POST /api/transactions` · `GET /api/transactions` · `PUT /api/transactions/:id/status` |
| Messages | `GET /api/messages/conversations` · `GET /api/messages/:userId` · `POST /api/messages/:userId` |

Full details, request/response shapes, and behavioral notes (2FA flow, mock payment settlement, upload storage caveats) are in [`backend/README.md`](backend/README.md).

## WebSocket events

Connect with `io(SOCKET_URL, { auth: { token: <jwt> } })`.

| Event | Direction | Purpose |
|---|---|---|
| `presence` | server → client | Online/offline broadcast |
| `new_message` | server → client | Real-time chat delivery |
| `typing` / `stop_typing` | both | Typing indicator |
| `transaction:update` | server → client | Live payment settlement |
| `call:invite` / `call:answer` / `call:ice-candidate` / `call:reject` / `call:end` | both | WebRTC signaling |

## Security

- Passwords hashed with bcrypt; JWTs signed with a configurable secret and expiry
- Rate limiting: strict on `/api/auth/*`, general limiter on all other routes
- Global request-body sanitization strips script tags, event-handler attributes, and `javascript:` URIs
- `express-validator` on every write endpoint (auth, meetings, transactions, messages, document signing)
- Ownership checks on meetings, documents, and transactions — users can only read/modify their own
- File uploads restricted by MIME type and size (10MB) both client- and server-side
- Secrets, the SQLite database, and uploaded files are gitignored at both the root and backend level
- `trust proxy` enabled in production so rate limiting sees real client IPs behind Render's/Heroku's reverse proxy

## Deployment

**Backend — three options, pick based on whether you have a credit card:**
- **No card:** [Back4app Containers](https://www.back4app.com) — deploys from `backend/Dockerfile`, free tier with no card at signup. Recommended default.
- **Have a card, want it free:** Render — `backend/render.yaml` + `backend/Procfile`, a one-time $1 verification hold but no ongoing charge on the free instance type.
- **Have a card, want real persistent storage:** Fly.io — same `backend/Dockerfile`, add a volume with `fly volumes create`, real usage-based billing.

**Frontend (GitHub Pages)** — `.github/workflows/deploy.yml` builds and deploys `dist/` automatically on push to `main`. Set `VITE_API_URL` and `VITE_SOCKET_URL` as GitHub Actions repo secrets (Settings → Secrets and variables → Actions) pointing at your deployed backend URL, then push/re-run the workflow. `.github/workflows/ci.yml` runs type-check/lint/build/backend-smoke-test on every PR.

Full step-by-step instructions for all three backend options are in [`backend/README.md`](backend/README.md#deployment).

## Known limitations

- **Uploaded documents and the SQLite database live on local disk**, not S3/a managed database. On platforms with an ephemeral filesystem (Render free tier, and possibly Back4app's free tier — unconfirmed) files/data are lost on redeploy/restart. Fly.io with a mounted volume is the only one of the three deployment options with confirmed real persistence. Fine for a demo either way, not for durable production use without upgrading this.
- **WebRTC has no TURN server**, only public STUN. Calls work reliably on the same network or straightforward NATs; some symmetric/corporate NATs may fail to connect.
- **Payments are a simulated sandbox**, not a live Stripe/PayPal integration — intentional, matching the "mock integration" scope of the project.
- **2FA/password-reset emails** print to the server console unless real SMTP credentials are configured.

## Topics

`react` `typescript` `nodejs` `express` `sqlite` `socket-io` `webrtc` `jwt-authentication` `real-time-chat` `video-calling` `e-signature` `payment-gateway-simulation` `two-factor-authentication` `full-stack` `vite` `tailwindcss` `rest-api` `websockets` `startup-investor-platform` `collaboration-platform` `saas`

## License

This project was built as an educational full-stack development internship deliverable. No license has been formally assigned — contact the repository owner before reuse.
