# GitHub Upload Guide

Follow these steps to push your SintaChat project to GitHub.

## Step 1: Create a GitHub Repository

1. Go to https://github.com/new
2. Repository name: `sintachat` (or your preferred name)
3. Description: `Anonymous student conversation platform - Next.js + Express`
4. Select **Public** (or Private if you prefer)
5. **Do NOT initialize with README** (we already have one)
6. Click **Create repository**

## Step 2: Configure Git Locally

Run these commands in your SintaChat directory:

```powershell
# Initialize Git (if not already done)
git init

# Configure your Git user (if not already configured)
git config user.name "Your Name"
git config user.email "your.email@example.com"

# Stage all files
git add .

# Create initial commit
git commit -m "SintaChat V4.1.1 - Ready for Vercel deployment"

# Rename branch to main (if needed)
git branch -M main

# Add GitHub as remote
git remote add origin https://github.com/YOUR_USERNAME/sintachat.git

# Push to GitHub
git push -u origin main
```

## Step 3: Verify on GitHub

1. Go to https://github.com/YOUR_USERNAME/sintachat
2. Verify all files are uploaded
3. Check that `.env` files are NOT present (should be in `.gitignore`)
4. Verify `DEPLOYMENT.md`, `DEPLOYMENT_CHECKLIST.md`, and `vercel.json` are present

---

## Typical Error Solutions

### Error: "fatal: not a git repository"
```powershell
cd C:\Users\aquio\Downloads\SintaChat
git init
```

### Error: "fatal: refname refs/heads/main does not exist"
```powershell
git branch -M main
```

### Error: "fatal: could not read Username for 'https://github.com': No such file or directory"

You need to authenticate with GitHub. Use one of:

**Option A: GitHub Personal Access Token (Recommended)**
1. Go to https://github.com/settings/tokens
2. Click "Generate new token" → "Generate new token (classic)"
3. Check: `repo` (full control), `delete_repo`
4. Generate and copy the token
5. When Git asks for password, paste the token

**Option B: SSH Key Setup**
1. Generate SSH key: `ssh-keygen -t ed25519 -C "your-email@example.com"`
2. Add to ssh-agent: `ssh-add ~/.ssh/id_ed25519`
3. Add to GitHub: https://github.com/settings/keys
4. Use SSH URL instead: `git remote add origin git@github.com:YOUR_USERNAME/sintachat.git`

### Error: "Updates were rejected because the tip of your current branch is behind"
```powershell
# This happens if GitHub repo has files you don't have locally
# Solution: Pull first, then push
git pull origin main --allow-unrelated-histories
git push -u origin main
```

---

## Verify Your Upload

Check that these files are on GitHub:

**Documentation:**
- ✅ README.md
- ✅ DEPLOYMENT.md
- ✅ DEPLOYMENT_CHECKLIST.md
- ✅ DEPLOYMENT_SUMMARY.md
- ✅ railway_guide.md

**Configuration:**
- ✅ vercel.json
- ✅ package.json
- ✅ package-lock.json
- ✅ .gitignore

**Environment Examples (should be present):**
- ✅ .env.example
- ✅ apps/server/.env.example
- ✅ apps/web/.env.local.example
- ✅ apps/web/.env.socket.example

**Environment Files (should NOT be present):**
- ❌ .env (should NOT appear)
- ❌ apps/server/.env (should NOT appear)
- ❌ apps/web/.env (should NOT appear)
- ❌ apps/web/.env.local (should NOT appear)

**Source Code:**
- ✅ apps/web/src/**
- ✅ apps/server/src/**
- ✅ apps/web/prisma/**
- ✅ apps/web/public/**

**Build Outputs (should NOT be present - ignored by .gitignore):**
- ❌ apps/web/.next/ (should NOT appear)
- ❌ apps/server/dist/ (should NOT appear)
- ❌ node_modules/ (should NOT appear)

---

## Next Steps After Upload

1. ✅ Code is on GitHub
2. Go to https://vercel.com
3. Click "Import Project"
4. Select your GitHub repository
5. Follow [DEPLOYMENT.md](./DEPLOYMENT.md) for full setup

---

## Common Commands for Future Updates

```powershell
# Check status
git status

# View recent commits
git log --oneline -10

# Add new files
git add .
git commit -m "Description of changes"
git push

# Switch branches
git checkout -b feature/new-feature
git push -u origin feature/new-feature

# Create pull request on GitHub.com
```

---

## Troubleshooting

### I accidentally committed .env files

```powershell
# Remove .env files from Git tracking
git rm --cached .env
git rm --cached apps/server/.env
git rm --cached apps/web/.env*
git commit -m "Remove env files from tracking"
git push
```

Then delete the actual .env files locally.

### I need to change the commit message

```powershell
git commit --amend -m "New message"
git push -u origin main --force-with-lease
```

---

## Summary

After running the Git commands, your project will be:
- ✅ Backed up on GitHub
- ✅ Ready to import into Vercel
- ✅ Ready to deploy to production
- ✅ Version controlled for team collaboration

All secrets (`.env` files) remain local and are never exposed on GitHub.
