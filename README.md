# SintaChat

SintaChat is a real-time anonymous chat and matching platform built for student communities. It lets users connect with a stranger, start a conversation, exchange messages, react in chat, send voice notes, and safely move on after each match.

## About the product

SintaChat is designed to feel lightweight, anonymous, and social. The app focuses on quick, respectful interaction without requiring users to create a heavy profile. It includes:

- anonymous match-based conversations
- text chat with reactions and emojis
- voice message recording and playback
- in-chat activities and games
- a public Freedom Wall
- admin moderation tools for safety

The product is optimized for a privacy-first experience with clear consent flows and a clean mobile-friendly interface.

## Project structure

This repository is organized as a monorepo:

- apps/web — Next.js frontend
- apps/server — Express + Socket.IO realtime backend
- legacy-v3 — archived older version kept for reference

## Tech stack

- Next.js 15
- React 19
- TypeScript
- Socket.IO
- Prisma + PostgreSQL (Neon)
- Vercel for frontend hosting
- Railway for backend hosting
- bcrypt for admin password hashing

## Product pages

- Home / matching
- Consent, privacy, terms, safety, FAQ, and about pages
- Conversation room
- Freedom Wall
- Admin dashboard

## Local development

From the project root:

```bash
npm install
npm run dev
```

Frontend:

```text
http://localhost:3000
```

Backend:

```text
http://localhost:3001
```

## Production deployment

The live production site is:

```text
https://sintachat.vercel.app
```

The realtime backend is hosted separately on Railway and connects to the frontend through the Socket.IO URL.

Important deployment rule:

- Only the main Vercel project named sintachat should be used for production.
- Do not keep duplicate production projects like sintachatv2 active for the same app.
- A duplicate project can cause deployment confusion and 404 issues.

## Environment variables

The app uses environment variables for:

- Prisma / Neon database access
- consent policy version
- the frontend socket URL
- admin password hash and token secret

Do not commit real secrets to GitHub.

## Admin access

The admin area is available at:

```text
https://sintachat.vercel.app/admin
```

Admin credentials are stored in backend environment variables and hashed before comparison.

## Safety and moderation

SintaChat includes moderation and safety tools to help keep chats respectful and safe. Admin tools can handle:

- bans
- unbans
- suspensions
- conversation termination
- active session review

## Notes

This project is intended to remain a focused, production-ready anonymous chat experience with a clean architecture and safe moderation system.
