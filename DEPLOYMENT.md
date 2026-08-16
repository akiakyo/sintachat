# SintaChat V4 - Deployment Guide

This guide covers deploying SintaChat to Vercel (frontend) and Railway (backend).

## Overview

- **Frontend**: Next.js app deployed on Vercel
- **Backend**: Express.js + Socket.IO server deployed on Railway
- **Database**: PostgreSQL on Neon (supports serverless + direct connections)

## Prerequisites

1. GitHub account with the repository
2. Vercel account (free tier available)
3. Railway account (free tier available)
4. Neon PostgreSQL database account (free tier available)

---

## Step 1: Database Setup (Neon PostgreSQL)

1. Go to https://neon.tech
2. Sign up or log in
3. Create a new project
4. Copy your connection strings:
   - **Pooled connection URL** (for serverless/runtime queries) - `DATABASE_URL`
   - **Direct connection URL** (for Prisma migrations) - `DIRECT_URL`

---

## Step 2: Backend Deployment (Railway)

### 2.1 Create Railway Project

1. Go to https://railway.app
2. Create a new project
3. Deploy from GitHub repository
4. Select the SintaChat repository

### 2.2 Configure Railway Build & Start Commands

In Railway project settings:

**Build Command:**
```bash
npm run build -w apps/server
```

**Start Command:**
```bash
npm start -w apps/server
```

**Root Directory:** `apps/server`

### 2.3 Add Environment Variables

In Railway project settings, add the following:

```
PORT=3001
WEB_ORIGIN=https://your-vercel-domain.vercel.app

# Generate these using:
# node apps/server/scripts/generate-admin-hash.js "your-password"
ADMIN_PASSWORD_HASH=<bcrypt-hash-from-script>
ADMIN_TOKEN_SECRET=<long-random-secret-min-32-chars>
```

### 2.4 Copy Railway URL

After deployment, copy your Railway URL (e.g., `https://sintachat-production.up.railway.app`) - you'll need this for Vercel.

---

## Step 3: Frontend Deployment (Vercel)

### 3.1 Push Code to GitHub

```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

### 3.2 Create Vercel Project

1. Go to https://vercel.com
2. Import your GitHub repository
3. Select the SintaChat project
4. Framework preset: **Next.js**
5. Root directory: `apps/web`

### 3.3 Add Environment Variables

In Vercel project settings, add the following:

```
# Required: Backend API URL from Railway
NEXT_PUBLIC_SOCKET_URL=https://your-railway-domain.up.railway.app

# Database URLs from Neon
DATABASE_URL=postgresql://...?sslmode=require
DIRECT_URL=postgresql://...?sslmode=require

# Update as needed (usually YYYY-MM-DD)
CONSENT_POLICY_VERSION=2026-08-17
```

### 3.4 Deploy

1. Click "Deploy"
2. Vercel will automatically build and deploy from the `main` branch
3. After deployment succeeds, copy your Vercel URL (e.g., `https://sintachat.vercel.app`)

### 3.5 Update Backend WEB_ORIGIN

Go back to Railway project settings and update:
```
WEB_ORIGIN=https://your-vercel-domain.vercel.app
```

---

## Step 4: Database Migrations

After initial deployment:

```bash
# From your local machine (or use Railway/Vercel shell)
cd apps/web
npm run db:migrate
```

Or configure Vercel to run migrations automatically:

In `vercel.json`, add build command that runs migrations:

```json
{
  "buildCommand": "npm run db:generate && npm run db:migrate && next build"
}
```

---

## Step 5: Admin Setup

### Generate Admin Password Hash

```bash
cd apps/server
node scripts/generate-admin-hash.js "your-secure-password"
```

This outputs a bcrypt hash. Add this hash to your Railway environment variables as `ADMIN_PASSWORD_HASH`.

### Access Admin Panel

1. Navigate to `https://your-vercel-domain.vercel.app/admin`
2. Enter your nickname and password
3. Admin session is stored in `sessionStorage` (cleared on tab close)

---

## Troubleshooting

### Frontend can't connect to backend

- Verify `NEXT_PUBLIC_SOCKET_URL` is set correctly in Vercel
- Check Railway server is running: `https://your-railway-url/health` should return a response
- Ensure Railway's `WEB_ORIGIN` matches your Vercel domain

### Database connection errors

- Verify `DATABASE_URL` and `DIRECT_URL` are correct in Vercel
- Test connection locally: `DATABASE_URL="your-url" npm run db:generate`
- Ensure Neon connection pooling is enabled for serverless

### Build failures

- Check Vercel build logs for TypeScript errors
- Ensure all dependencies are installed: `npm install`
- Verify `next.config.ts` and `tsconfig.json` are properly configured

---

## Local Development

```bash
# Install all dependencies
npm install

# Configure environment
cp apps/server/.env.example apps/server/.env
cp apps/web/.env.local.example apps/web/.env.local

# Update .env files with your local/dev values

# Run both frontend and backend
npm start

# Or run individually
npm run dev -w apps/web
npm run dev -w apps/server
```

Frontend: `http://localhost:3000`  
Backend: `http://localhost:3001`

---

## Environment Variables Reference

### Backend (apps/server/.env)

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | Yes | Server port (default: 3001) |
| `WEB_ORIGIN` | Yes | Frontend URL for CORS |
| `ADMIN_PASSWORD_HASH` | No | Bcrypt hash for admin login |
| `ADMIN_TOKEN_SECRET` | No | Secret for admin JWT tokens |

### Frontend (apps/web/.env.local)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SOCKET_URL` | Yes | Backend API URL |
| `DATABASE_URL` | Yes (Vercel) | Pooled PostgreSQL connection |
| `DIRECT_URL` | Yes (Vercel) | Direct PostgreSQL connection for migrations |
| `CONSENT_POLICY_VERSION` | No | Current consent policy version (YYYY-MM-DD) |

---

## Next Steps

1. Set up monitoring and logs on Vercel and Railway
2. Configure custom domain (if desired)
3. Set up GitHub Actions for CI/CD
4. Monitor error tracking (optional: Sentry integration)
5. Set up automated backups for database

---

## Support

For issues or questions:
1. Check build logs on Vercel and Railway
2. Review error messages in browser console (Frontend)
3. Check Railway logs for backend errors
4. Verify environment variables are set correctly
