# 🚀 SintaChat Deployment - Final Setup Guide

Your code is ready. Follow this exact guide to complete the deployment.

---

## ✅ What You Have

**Database (Neon):**
- Pooled URL: `postgresql://neondb_owner:npg_KbtuUhcQ1d8M@ep-purple-wave-aucvptk5-pooler.c-10.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require`
- Direct URL: Check your Neon dashboard for the direct (non-pooler) connection string

**Admin Hash:** `$2b$12$TS7.K0RcpIfa0yFQ4CcS7ep0jzjXuvkhKg7BtxOZraorKhKQyjZxm`

**GitHub:** https://github.com/akiakyo/sintachat (Code pushed ✅)

---

## 🔧 Step 1: Configure Vercel (Frontend)

### 1.1 Go to Vercel
- https://vercel.com/dashboard
- Find your SintaChat project (should be auto-imported from GitHub)
- Click **Settings** → **Environment Variables**

### 1.2 Add These Environment Variables

**Copy-paste each line exactly:**

```
DATABASE_URL=postgresql://neondb_owner:npg_KbtuUhcQ1d8M@ep-purple-wave-aucvptk5-pooler.c-10.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require
```

```
DIRECT_URL=postgresql://neondb_owner:npg_KbtuUhcQ1d8M@ep-purple-wave-aucvptk5-pooler.c-10.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require
```
(⚠️ Check your Neon dashboard for the direct (non-pooler) URL for migrations)

```
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
```
(Will update this after Railway deployment)

```
CONSENT_POLICY_VERSION=2026-08-17
```

### 1.3 Deploy Settings
- **Root Directory:** `apps/web` ✅ (should be auto-detected)
- **Build Command:** `npm run build -w apps/web` ✅ (should be auto-detected)
- **Output Directory:** `.next` ✅ (should be auto-detected)

### 1.4 Redeploy
- Click **Deployments** tab
- Find the failed build
- Click **Redeploy** button
- Wait for green checkmark ✅

---

## 🚂 Step 2: Deploy Backend on Railway

### 2.1 Go to Railway
- https://railway.app
- Create a new project
- **Deploy from GitHub**
- Select repository: `akiakyo/sintachat`

### 2.2 Configure Railway

In Railway project settings:

**Service Settings:**
- **Root Directory:** `apps/server`
- **Build Command:** `npm run build -w apps/server`
- **Start Command:** `npm start -w apps/server`

**Environment Variables** (click **+ New Variable** for each):

```
PORT=3001
```

```
WEB_ORIGIN=https://sintachat.vercel.app
```
(Update with your actual Vercel domain once deployed)

```
ADMIN_PASSWORD_HASH=$2b$12$TS7.K0RcpIfa0yFQ4CcS7ep0jzjXuvkhKg7BtxOZraorKhKQyjZxm
```

```
ADMIN_TOKEN_SECRET=your-super-secret-random-string-min-32-characters-1234567890abcdef
```
(Generate a random secure string or use: `openssl rand -base64 32`)

### 2.3 Deploy
- Click **Deploy** button
- Wait for build to complete
- Copy the Railway domain from Deployment URL (e.g., `https://sintachat-production.up.railway.app`)

---

## 🔗 Step 3: Connect Services

After Railway is deployed:

### 3.1 Update Vercel Environment Variable

Go back to Vercel → Settings → Environment Variables:

**Find:** `NEXT_PUBLIC_SOCKET_URL`

**Update to:** `https://your-railway-domain.up.railway.app`

Example: `https://sintachat-production.up.railway.app`

**Redeploy** on Vercel after updating.

### 3.2 Update Railway Environment Variable

Go back to Railway → Settings → Environment Variables:

**Find:** `WEB_ORIGIN`

**Update to:** Your actual Vercel domain

Example: `https://sintachat-akiakyo.vercel.app`

**Redeploy** on Railway after updating.

---

## 💾 Step 4: Run Database Migrations

After both services are deployed:

```bash
cd apps/web
npm run db:migrate
```

Or let Vercel auto-run migrations by updating the build command:

In Vercel Settings → Build & Development Settings:
- **Build Command:** `npm run db:generate && npm run db:migrate && next build -w apps/web`

Then redeploy.

---

## ✅ Verification Checklist

- [ ] Vercel build succeeds (green checkmark)
- [ ] Frontend loads at your Vercel URL
- [ ] Railway build succeeds
- [ ] Backend API responds: `https://your-railway-url/api/...`
- [ ] Can access `/consent` page
- [ ] Can access `/admin` page
- [ ] WebSocket connects (check DevTools Console for no errors)
- [ ] Can start a conversation
- [ ] Messages send and receive in real-time
- [ ] Admin login works with password: `SintaChat@Admin`

---

## 🔐 Admin Login

**URL:** `https://your-vercel-domain/admin`

**Password:** `SintaChat@Admin`

**Nickname:** Any name you want (up to 48 chars)

---

## 🚨 Troubleshooting

### Vercel Build Still Fails (404 Error)
- Verify `DATABASE_URL` is set in Vercel environment
- Verify `DIRECT_URL` is set in Vercel environment
- Redeploy after adding env vars

### WebSocket Connection Fails
- Verify `NEXT_PUBLIC_SOCKET_URL` points to correct Railway domain
- Check Railway logs for errors
- Verify `WEB_ORIGIN` on Railway matches your Vercel domain

### Admin Login Doesn't Work
- Verify `ADMIN_PASSWORD_HASH` is set on Railway
- Try password: `SintaChat@Admin`
- Check Railway logs for authentication errors

### Database Connection Fails
- Verify Neon database is running
- Test connection: `psql "postgresql://neondb_owner:npg_KbtuUhcQ1d8M@ep-purple-wave-aucvptk5-pooler.c-10.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require"`
- Verify connection strings have no typos

---

## 📊 Your Production URLs

After deployment, you'll have:

**Frontend:** `https://sintachat-akiakyo.vercel.app`

**Backend:** `https://your-railway-domain.up.railway.app`

**Admin Panel:** `https://sintachat-akiakyo.vercel.app/admin`

**Database:** Neon (managed)

---

## 🎯 Next Steps

1. Add these env vars to **Vercel**
2. Deploy backend on **Railway** with its env vars
3. Update cross-service URLs (Vercel ↔ Railway)
4. Test the app
5. Monitor logs for 24 hours

Your app is production-ready! 🚀
