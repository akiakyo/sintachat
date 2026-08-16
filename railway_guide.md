# SintaChat Railway Backend Deployment

1. Create Railway project.
2. Deploy GitHub repository.
3. Set Root Directory:
apps/server

4. Variables:
PORT=3001
WEB_ORIGIN=https://your-vercel-domain.vercel.app
ADMIN_PASSWORD_HASH=<bcrypt hash>
ADMIN_TOKEN_SECRET=<random secret>

5. Build:
npm run build

6. Start:
npm start

7. Copy Railway URL to Vercel:
NEXT_PUBLIC_SOCKET_URL=https://your-railway-url

Generate hash:
node scripts/generate-admin-hash.js
