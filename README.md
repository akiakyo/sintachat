# SintaChat

<p align="left">

<a href="https://sintachat.com">
<img src="https://img.shields.io/badge/Website-sintachat.com-FF6B9D?style=social&logo=googlechrome"/>
</a>

</p>

SintaChat is a real-time anonymous chat and matching platform built for student communities. It allows users to connect with strangers, start conversations, exchange messages, react in chat, send voice notes, and safely move on after every match.

---

## About the Product

SintaChat is designed to feel lightweight, anonymous, and social. The platform focuses on quick, respectful interactions without requiring users to create a heavy profile.

Features include:

- Anonymous match-based conversations
- Real-time text chat with reactions and emojis
- Voice message recording and playback
- In-chat activities and games
- Public Freedom Wall
- Admin moderation tools for safety

The product is optimized for a privacy-first experience with clear consent flows and a clean mobile-friendly interface.

---

## Project Structure

This repository is organized as a monorepo:

```text
apps/web       → Next.js frontend
apps/server    → Express + Socket.IO realtime backend
legacy-v3      → Archived older version kept for reference
```

---

## Tech Stack

<p align="left">

<img src="https://img.shields.io/badge/Next.js_15-000000?style=plastic&logo=nextdotjs&logoColor=white"/>
<img src="https://img.shields.io/badge/React_19-61DAFB?style=plastic&logo=react&logoColor=black"/>
<img src="https://img.shields.io/badge/TypeScript-3178C6?style=plastic&logo=typescript&logoColor=white"/>

<br>

<img src="https://img.shields.io/badge/Socket.IO-010101?style=plastic&logo=socketdotio&logoColor=white"/>
<img src="https://img.shields.io/badge/Express.js-000000?style=plastic&logo=express&logoColor=white"/>
<img src="https://img.shields.io/badge/Prisma-2D3748?style=plastic&logo=prisma&logoColor=white"/>

<br>

<img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=plastic&logo=postgresql&logoColor=white"/>
<img src="https://img.shields.io/badge/Neon-00E599?style=plastic&logo=postgresql&logoColor=white"/>

<br>

<img src="https://img.shields.io/badge/Vercel-000000?style=plastic&logo=vercel&logoColor=white"/>
<img src="https://img.shields.io/badge/Railway-0B0D0E?style=plastic&logo=railway&logoColor=white"/>
<img src="https://img.shields.io/badge/bcrypt-338?style=plastic&logo=security&logoColor=white"/>

</p>

---

## Product Pages

<p align="left">

<img src="https://img.shields.io/badge/Home-Matching-FF6B9D?style=plastic"/>
<img src="https://img.shields.io/badge/Chat-Realtime-5865F2?style=plastic"/>
<img src="https://img.shields.io/badge/Freedom_Wall-Social-00C853?style=plastic"/>
<img src="https://img.shields.io/badge/Admin-Moderation-FF9800?style=plastic"/>

</p>

Included pages:

- Home / Matching
- Consent
- Privacy Policy
- Terms
- Safety
- FAQ
- About
- Conversation Room
- Freedom Wall
- Admin Dashboard

---

## Local Development

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

---

## Production Deployment

<p align="left">

<img src="https://img.shields.io/badge/Production-sintachat.com-FF6B9D?style=plastic&logo=googlechrome"/>
<img src="https://img.shields.io/badge/Frontend-Vercel-000000?style=plastic&logo=vercel"/>
<img src="https://img.shields.io/badge/Backend-Railway-0B0D0E?style=plastic&logo=railway"/>

</p>

Live production site:

```text
https://sintachat.com
```

The realtime backend is hosted separately on Railway and connects to the frontend through the Socket.IO URL.

Important deployment rules:

- Only the main Vercel project named `sintachat` should be used for production.
- Do not keep duplicate production projects such as `sintachatv2` active.
- Duplicate deployments may cause routing conflicts and unexpected 404 errors.

---

## Environment Variables

The application uses environment variables for:

- Prisma / Neon database connection
- Consent policy version
- Frontend Socket.IO URL
- Admin password hash
- Authentication token secret

Never commit real secrets to GitHub.

---

## Admin Access

<p align="left">

<img src="https://img.shields.io/badge/Admin_Dashboard-Available-FF9800?style=plastic&logo=security"/>

</p>

Admin dashboard:

```text
https://sintachat.com/admin
```

Admin credentials are stored securely in backend environment variables and hashed before comparison.

---

## Safety and Moderation

SintaChat includes moderation and safety features to maintain respectful conversations.

Admin tools include:

- User bans
- User unbans
- Account suspension
- Conversation termination
- Active session review

---

## Social

<p align="left">

<a href="https://sintachat.com">
<img src="https://img.shields.io/badge/SintaChat-sintachat.com-FF6B9D?style=social&logo=googlechrome"/>
</a>

</p>

---

## Notes

SintaChat is built as a focused, production-ready anonymous chat experience with a clean architecture, real-time communication system, and privacy-focused moderation workflow.
