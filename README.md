# SintaChat

<p align="left">

<a href="https://sintachat.com">
<img src="https://img.shields.io/badge/Website-sintachat.com-FF6B9D?style=plastic&logo=googlechrome&logoColor=white"/>
</a>

<a href="https://github.com/akiakyo/sintachat">
<img src="https://img.shields.io/badge/GitHub-Repository-181717?style=plastic&logo=github&logoColor=white"/>
</a>

</p>

SintaChat is a real-time anonymous chat and matching platform built for student communities across the Philippines.

The platform allows users to connect with people who share similar interests, start anonymous conversations, exchange messages, send voice notes, react in chat, participate in community activities, and safely end conversations.

SintaChat focuses on privacy, safety, and meaningful digital connections.

---

# Features

<p align="left">

<img src="https://img.shields.io/badge/Anonymous_Matching-FF6B9D?style=plastic"/>
<img src="https://img.shields.io/badge/Realtime_Chat-5865F2?style=plastic"/>
<img src="https://img.shields.io/badge/Voice_Notes-00C853?style=plastic"/>
<img src="https://img.shields.io/badge/Freedom_Wall-FF9800?style=plastic"/>

</p>

Features include:

- Anonymous match-based conversations
- Real-time messaging with reactions and emojis
- Voice message recording and playback
- Interactive chat activities
- Public Freedom Wall community
- Admin moderation tools
- Consent and privacy management
- Mobile-friendly interface

---

# Project Structure

SintaChat uses a monorepo architecture.

```text
sintachat

apps/
├── web
│   └── Next.js frontend application
│
└── server
    └── Express + Socket.IO backend

legacy-v3
└── Archived previous version
```

---

# Tech Stack

<p align="left">

<img src="https://img.shields.io/badge/Next.js_15-000000?style=plastic&logo=nextdotjs&logoColor=white"/>
<img src="https://img.shields.io/badge/React_19-61DAFB?style=plastic&logo=react&logoColor=black"/>
<img src="https://img.shields.io/badge/TypeScript-3178C6?style=plastic&logo=typescript&logoColor=white"/>

<br>

<img src="https://img.shields.io/badge/Node.js-339933?style=plastic&logo=nodedotjs&logoColor=white"/>
<img src="https://img.shields.io/badge/Express.js-000000?style=plastic&logo=express&logoColor=white"/>
<img src="https://img.shields.io/badge/Socket.IO-010101?style=plastic&logo=socketdotio&logoColor=white"/>

<br>

<img src="https://img.shields.io/badge/Prisma-2D3748?style=plastic&logo=prisma&logoColor=white"/>
<img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=plastic&logo=postgresql&logoColor=white"/>
<img src="https://img.shields.io/badge/Neon-00E599?style=plastic&logo=postgresql&logoColor=white"/>

<br>

<img src="https://img.shields.io/badge/Vercel-000000?style=plastic&logo=vercel&logoColor=white"/>
<img src="https://img.shields.io/badge/Railway-0B0D0E?style=plastic&logo=railway&logoColor=white"/>

</p>

---

# Getting Started

## Clone Repository

Clone the project locally:

```bash
git clone https://github.com/akiakyo/sintachat.git

cd sintachat
```

---

# Installation

Install dependencies:

```bash
npm install
```

For individual applications:

Frontend:

```bash
cd apps/web
npm install
```

Backend:

```bash
cd apps/server
npm install
```

---

# Running Locally

## Frontend

```bash
cd apps/web

npm run dev
```

Available at:

```text
http://localhost:3000
```

---

## Backend

Open another terminal:

```bash
cd apps/server

npm run dev
```

Available at:

```text
http://localhost:3001
```

---

# Git Workflow

## Create a New Branch

Always create a branch before making changes.

```bash
git checkout -b feature/feature-name
```

Example:

```bash
git checkout -b feature/chat-reactions
```

---

## Commit Changes

Check modified files:

```bash
git status
```

Add changes:

```bash
git add .
```

Commit:

```bash
git commit -m "Add chat reaction feature"
```

---

## Push Changes

Push your branch:

```bash
git push origin feature/chat-reactions
```

Create a Pull Request on GitHub after pushing.

---

# Updating Local Repository

Before starting new work:

```bash
git checkout main

git pull origin main
```

---

# Environment Variables

Create the required environment files:

Frontend:

```text
apps/web/.env.local
```

Backend:

```text
apps/server/.env
```

Required variables include:

- Database connection settings
- Prisma configuration
- Socket.IO URL
- Authentication secrets
- Admin credentials
- Consent configuration

Never commit environment files or production secrets.

---

# Production Deployment

<p align="left">

<img src="https://img.shields.io/badge/Frontend-Vercel-000000?style=plastic&logo=vercel&logoColor=white"/>
<img src="https://img.shields.io/badge/Backend-Railway-0B0D0E?style=plastic&logo=railway&logoColor=white"/>
<img src="https://img.shields.io/badge/Database-Neon-00E599?style=plastic"/>

</p>

Production Website:

<a href="https://sintachat.com">
<img src="https://img.shields.io/badge/Open-sintachat.com-FF6B9D?style=plastic&logo=googlechrome&logoColor=white"/>
</a>

Architecture:

```text
User
 |
 v
Vercel
 |
 v
Next.js Application
 |
 v
Socket.IO Connection
 |
 v
Railway Backend
 |
 v
Neon PostgreSQL
```

---

# Application Pages

<p align="left">

<img src="https://img.shields.io/badge/Home-Matching-FF6B9D?style=plastic"/>
<img src="https://img.shields.io/badge/Chat-Realtime-5865F2?style=plastic"/>
<img src="https://img.shields.io/badge/Freedom_Wall-Community-00C853?style=plastic"/>
<img src="https://img.shields.io/badge/Admin-Moderation-FF9800?style=plastic"/>

</p>

Available routes:

- Home / Matching
- Consent
- Conversation Room
- Freedom Wall
- FAQ
- Safety
- Privacy Policy
- Terms and Conditions
- Admin Dashboard

---

# Safety and Moderation

SintaChat includes moderation features designed to maintain respectful interactions.

Moderation tools include:

- User banning
- User suspension
- Conversation termination
- Session monitoring
- Administrative review

---

# Contributing

Contributions are welcome.

Steps:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Commit your changes
5. Push your branch
6. Submit a Pull Request

---

# Social

<p align="left">

<a href="https://sintachat.com">
<img src="https://img.shields.io/badge/Website-sintachat.com-FF6B9D?style=social&logo=googlechrome"/>
</a>

<a href="https://github.com/akiakyo/sintachat">
<img src="https://img.shields.io/badge/GitHub-akiakyo-181717?style=social&logo=github"/>
</a>

</p>

---

# License

This project is currently maintained by the Computer Engineering students @ Polytechnic University of the Philippines.

---

SintaChat is built as a production-ready anonymous communication platform focused on real-time interaction, student communities, privacy, and safe online conversations.
