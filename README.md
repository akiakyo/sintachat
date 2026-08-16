# SintaChat V4.4

SintaChat is an anonymous student conversation platform built as a TypeScript monorepo.

## Stack

- `apps/web` — Next.js + React + TypeScript
- `apps/server` — Node.js + Express + Socket.IO + TypeScript
- `legacy-v3` — preserved legacy implementation for migration/reference

## Quick Start

### Local Development

```powershell
npm install
copy apps\server\.env.example apps\server\.env
copy apps\web\.env.local.example apps\web\.env.local
npm start
```

Frontend: `http://localhost:3000`  
Realtime backend: `http://localhost:3001`

### Production Deployment

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for complete instructions on deploying to:
- **Frontend**: Vercel
- **Backend**: Railway  
- **Database**: Neon PostgreSQL

## Admin mode

Open:

```text
http://localhost:3000/admin
```

Configure the password **only** in `apps/server/.env`:

```env
ADMIN_PASSWORD=your-private-password
ADMIN_TOKEN_SECRET=use-a-long-random-secret
```

The admin password is validated on the backend. It is not placed in React, `NEXT_PUBLIC_*`, or committed to GitHub. An authenticated admin may use any non-empty nickname up to 48 characters. Admin authentication is stored in `sessionStorage`, so closing the tab/session clears admin mode.

## GitHub

The repository includes `.gitignore` rules for:

- `node_modules/`
- `.next/`, `dist/`, `out/`
- `.env` and `.env.*`
- TypeScript build caches and logs

Before pushing:

```powershell
git init
git add .
git commit -m "SintaChat V4.4"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
git push -u origin main
```

Never commit `apps/server/.env` or real passwords/secrets.

## Chat changes in V4.4

- Messenger-style emoji panel with search, categories, quick reactions, and responsive mobile placement.
- Long-press reactions and animated swipe-right-to-reply.
- Voice recording now has a dedicated recording state with timer, animated waveform, Cancel, and Send controls.
- Voice messages use a custom Messenger-like player instead of the browser's large default audio control.
- Microphone capture requests echo cancellation, noise suppression, and automatic gain control when supported.
- Conversation-ended state remains in chat with `Conversation Ended`, who ended it, and `Next?`.
- Cleaner three-dot menu and chat sound control.
- Next.js development indicator is disabled in `next.config.ts`.

## Production

```powershell
npm run build
npm run start:production
```

For a Vercel + separate realtime backend deployment, set `NEXT_PUBLIC_SOCKET_URL` to your deployed Socket.IO backend URL.

Voice recording duration is tracked with a recorder ref so the sent duration remains accurate even when React state updates asynchronously.


## V4.5 Legacy V3 parity pass

- `/admin` remains available, but there is no Admin link, badge, button, or visible admin entry point on normal pages.
- Returning to Home automatically ends any active conversation and clears matchmaking state.
- Conversation navigation/unload uses the legacy `sendBeacon`/`keepalive` pattern so partners are disconnected even when the tab closes or the user follows a site link.
- Ended chats show a chat-system message plus the Conversation Ended card and Next button.
- Conversation Feedback is restored after ending.
- Conversation-length notices and the privacy reminder are restored.
- Emoji picker now uses the full categorized emoji catalog from legacy V3: frequent, smileys & people, animals, food & drink, activities, travel & places, objects, and symbols.
- Voice recording waveform now reacts to the real microphone analyser instead of using a fake repeating animation.
- Voice messages retain the compact custom player and waveform/progress styling.
- Long press reactions, swipe-to-reply, reply previews, typing, activities, voice, icebreakers, light/dark mode, mobile composer layout, and ended-state behavior are retained.


## V4.6 Chat parity / profile-header fix

- Partner header now matches the legacy hierarchy: `CHATTING WITH` → nickname + optional `ADMIN` + online dot → campus.
- `ADMIN` is supplied by authenticated backend profile state and stays inline with the nickname on desktop and mobile.
- Existing active matches no longer return `You are already in a conversation.` The backend returns/resumes the current partner and Finding displays `You are connected with <nickname>.`
- End no longer opens a confirmation modal. The End button animates briefly, ends the socket match, and both users receive the ended-chat message/state.
- Composer order is now: `End · Message · Voice · Emoji · Game`, matching the supplied AnimoChat-style reference.
- Icebreaker remains its own strip and changes only through the Icebreaker control.
- Games no longer replace the Icebreaker. Activities are sent/rendered as activity cards in the conversation.
- Emoji catalog is fully initialized/categorized; no undefined emoji category access.
- Long-hold shows reactions/action controls and swipe-right visibly moves the bubble toward Reply.
- Voice messages keep the legacy compact waveform player.

## V4.7 profile / icebreaker / hold fix

- Uses the requested Flaticon User icon for regular profiles and Add Friend icon for admin profiles.
- Admin badge no longer stretches across the partner header.
- Authenticated admin mode shows `ADMIN` beside the SintaChat brand while `/admin` remains hidden from normal navigation.
- Clicking Icebreaker rolls a new prompt for both participants; clicking the prompt sends it.
- Feedback confirms selection with `Thanks for your feedback.`
- Long-hold uses one combined reaction + Reply/Copy sheet instead of overlapping detached popups.


## V4.8 anonymous moderation + End confirmation

- Desktop Activities and Emoji popovers are anchored inside the conversation shell so they do not render partially off-screen.
- End button now animates in-place: `End` → `Sure?` → end conversation. `Sure?` resets automatically after a few seconds if not confirmed.
- `/admin` now includes an anonymous moderation dashboard:
  - active conversation IDs
  - anonymous session IDs
  - nicknames
  - campus selection
  - conversation start time
  - ban / unban
  - suspend / unsuspend
  - force-end active conversation
- Authenticated admins also get Moderation tools inside an active chat.
- No IP addresses, device fingerprints, real names, emails, or other unnecessary identifiers are collected/displayed by these moderation tools.
- Moderation is scoped to anonymous session IDs.


## V4.9 moderation buttons

- Fixed Ban, Unban, Suspend, and Unsuspend request handling.
- Added visible loading, success, and error states.
- Expired admin sessions now show a clear login-again message.
- Dashboard records update immediately and are refreshed from the backend afterward.
- Ban clears suspension; Suspend clears ban so moderation state stays unambiguous.


## V5.2
- Fixed getAdminToken runtime error in conversation moderation tools.
- Appeal removed from navbar and moved to Terms.
- Added requested Terms & Conditions.
- Reworked Consent, Home, matchmaking presentation, intro logo animation, and emoji picker.
- Freedom Wall moderation approval remains available under /admin.

## V5.3 Consent gate + Prisma/Neon

The Next.js app now requires consent before Home and other app pages during each browser session.

- `/consent`, `/terms`, `/safety`, `/privacy`, `/faq`, `/about`, and `/admin` remain reachable without consent.
- Accepting consent writes an anonymous acceptance record to PostgreSQL through Prisma ORM.
- The response sets a session cookie named `sintachat_consent_session` with no persistent expiry, so a new browser session is gated again.
- The previous permanent `localStorage` consent flag is no longer used for gating.
- No IP address or device fingerprint is stored by the consent API.

### Neon + Prisma setup

Create a Neon PostgreSQL database and place its pooled connection string in `apps/web/.env.local`:

```env
DATABASE_URL=postgresql://USER:PASSWORD@POOLER_HOST/DBNAME?sslmode=require
DIRECT_URL=postgresql://USER:PASSWORD@DIRECT_HOST/DBNAME?sslmode=require
CONSENT_POLICY_VERSION=2026-08-17
```

Then install dependencies and apply the included migration:

```powershell
npm install
npm run db:generate
npm run db:migrate
```

For Vercel, set the project Root Directory to `apps/web` if you are deploying the Next.js frontend as its own project. Add `DATABASE_URL`, `DIRECT_URL`, `CONSENT_POLICY_VERSION`, and your production `NEXT_PUBLIC_SOCKET_URL` in Vercel Environment Variables. The `apps/web` build script runs `prisma generate` before `next build`.

The current `apps/server` realtime service still owns Socket.IO matchmaking/chat state. Prisma/Neon in this update persists consent acceptance only; the existing realtime in-memory Maps have not been migrated to PostgreSQL.
