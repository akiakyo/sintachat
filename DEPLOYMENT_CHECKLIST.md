# Pre-Deployment Checklist

Use this checklist to ensure SintaChat is ready for production deployment to Vercel and Railway.

## Code Quality

- [x] Frontend builds without errors: `npm run build -w apps/web`
- [x] Backend builds without errors: `npm run build -w apps/server`
- [x] TypeScript compilation passes: `npm run typecheck`
- [x] No console errors in browser
- [x] No unresolved imports or dependencies
- [x] All environment variables are properly typed

## Configuration Files

- [x] `vercel.json` exists and is configured
- [x] `apps/web/next.config.ts` is optimized
- [x] `apps/web/tsconfig.json` is correct
- [x] `apps/server/tsconfig.json` is correct
- [x] `package.json` scripts are correct for deployment
- [x] `.gitignore` excludes sensitive files (.env, node_modules, build outputs)

## Environment Variables

### Backend (Railway)
- [ ] `PORT` is set (default: 3001)
- [ ] `WEB_ORIGIN` matches your Vercel domain
- [ ] `ADMIN_PASSWORD_HASH` is generated from script
- [ ] `ADMIN_TOKEN_SECRET` is a long random string (min 32 chars)

### Frontend (Vercel)
- [ ] `NEXT_PUBLIC_SOCKET_URL` points to Railway backend
- [ ] `DATABASE_URL` is set (Neon pooled connection)
- [ ] `DIRECT_URL` is set (Neon direct connection for migrations)
- [ ] `CONSENT_POLICY_VERSION` is current

## Database

- [ ] Neon PostgreSQL account created
- [ ] Database schema is set up
- [ ] Pooled and direct connection URLs obtained
- [ ] Migrations will run on first deployment (via build command)

## Git & GitHub

- [ ] Repository is initialized: `git init`
- [ ] All files are staged: `git add .`
- [ ] Initial commit created: `git commit -m "..."`
- [ ] Main branch is set: `git branch -M main`
- [ ] Remote added: `git remote add origin https://github.com/...`
- [ ] Pushed to GitHub: `git push -u origin main`
- [ ] No `.env` files are committed (verify in `.gitignore`)
- [ ] No `node_modules/` directories are committed
- [ ] No build outputs (`.next/`, `dist/`) are committed

## Vercel Setup

- [ ] Vercel account created
- [ ] GitHub repository connected to Vercel
- [ ] Project imported and configured
- [ ] Root directory set to `apps/web`
- [ ] Build command: `npm run build -w apps/web`
- [ ] Output directory: `.next`
- [ ] Environment variables added
- [ ] Deployment successful

## Railway Setup

- [ ] Railway account created
- [ ] GitHub repository connected to Railway
- [ ] Project created and deployed
- [ ] Root directory set to `apps/server`
- [ ] Build command: `npm run build -w apps/server`
- [ ] Start command: `npm start -w apps/server`
- [ ] Environment variables added
- [ ] Backend server running and accessible
- [ ] Railway domain copied

## Cross-Service Configuration

- [ ] Railway `WEB_ORIGIN` updated to Vercel domain
- [ ] Vercel `NEXT_PUBLIC_SOCKET_URL` updated to Railway domain
- [ ] CORS is properly configured on backend
- [ ] Socket.IO connection works from frontend

## Testing

- [ ] Frontend loads without errors
- [ ] Can access `/` (home)
- [ ] Can access `/consent` (consent gate)
- [ ] Can access `/admin` (admin panel)
- [ ] Backend API calls work: `fetch("https://railway-url/api/...")`
- [ ] WebSocket connection established: check DevTools console
- [ ] Conversations can be initiated
- [ ] Messages send and receive
- [ ] Voice recording works
- [ ] Emojis load
- [ ] Games load
- [ ] Admin login works (if configured)

## Performance & Security

- [ ] Production build is optimized (no dev dependencies included)
- [ ] Helmet security headers are enabled on backend
- [ ] CORS is restricted to your domain
- [ ] Admin password is hashed and stored securely
- [ ] No sensitive data in frontend environment variables
- [ ] No API keys or secrets in client-side code

## Monitoring & Logs

- [ ] Vercel deployment logs are accessible
- [ ] Railway logs are accessible
- [ ] Can monitor build status
- [ ] Error tracking is set up (optional: Sentry)
- [ ] Performance metrics can be monitored

## Custom Domain (Optional)

- [ ] Custom domain registered
- [ ] DNS records configured
- [ ] SSL certificate auto-generated
- [ ] Domain verified in Vercel
- [ ] Domain verified in Railway (if using custom backend URL)

## Final Steps

- [ ] All team members have access to deployment platforms
- [ ] Documentation is complete and accessible
- [ ] Backup strategy for database is in place
- [ ] Emergency rollback plan is documented
- [ ] Post-deployment testing is scheduled

## Post-Deployment

- [ ] Monitor error logs for 24 hours
- [ ] Verify all features work in production
- [ ] Test on multiple devices and browsers
- [ ] Collect user feedback
- [ ] Set up automated backups if not already done
- [ ] Document any issues encountered

---

## Quick Reference

**Verify builds locally before deployment:**
```bash
npm install
npm run build
npm run typecheck
```

**Generate admin password hash:**
```bash
cd apps/server
node scripts/generate-admin-hash.js "your-password"
```

**Push to GitHub:**
```bash
git add .
git commit -m "Ready for production"
git push origin main
```

**Monitor deployments:**
- Vercel: https://vercel.com/dashboard
- Railway: https://railway.app
- Neon: https://neon.tech/console
