require("dotenv").config();

const path = require("path");
const crypto = require("crypto");
const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const http = require("http");
const { Server } = require("socket.io");
const mysql = require("mysql2/promise");
const { v4: uuidv4 } = require("uuid");

const app = express();

// v3.6.31 production hardening
app.disable("x-powered-by");
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Permissions-Policy", "camera=(), geolocation=()");
  next();
});

app.disable("x-powered-by");
app.set("trust proxy", 1);
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: false },
  maxHttpBufferSize: 3e6
});

const PORT = Number(process.env.PORT || 3000);
const SESSION_SALT = process.env.SESSION_SALT || "change-me";

const pool = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "anonisko",
  charset: "utf8mb4",
  connectionLimit: 10,
  waitForConnections: true
});

const CAMPUS_LIST = [
  'Other school / Rather not say',
  "PUP Main Campus - Sta. Mesa",
  "PUP Taguig",
  "PUP Quezon City",
  "PUP San Juan",
  "PUP Parañaque",
  "PUP Bataan",
  "PUP Sta. Rosa",
  "PUP Biñan",
  "PUP San Pedro",
  "PUP Cabuyao",
  "PUP Calauan",
  "PUP Lopez",
  "PUP Mulanay",
  "PUP Unisan",
  "PUP Ragay",
  "PUP Sto. Tomas",
  "PUP Maragondon",
  "Other school in the Philippines"
];

const INTEREST_LIST = [
  "Gaming",
  "School",
  "Relationships",
  "Music",
  "Movies",
  "Tech",
  "Sports",
  "Memes",
  "Study",
  "Random"
];

const VIBE_LIST = [
  "Chill",
  "Need Advice",
  "Rant",
  "Study Talk",
  "Make Friends",
  "Random"
];

const ICEBREAKERS = [
  "What is something you have been into lately?",
  "What is your most memorable school moment?",
  "What song have you had on repeat recently?",
  "What is one thing you want to learn this year?",
  "What is your go-to comfort food?",
  "What is the best advice someone has given you?",
  "What is something small that made your day better?",
  "If you had a free day tomorrow, how would you spend it?",
  "What subject or topic can you talk about for hours?",
  "What is one place in the Philippines you want to visit?"
];

const ACTIVITY_PROMPTS = {
  icebreaker: ICEBREAKERS,
  would_you_rather: [
    "Would you rather have unlimited free food on campus or unlimited free transportation?",
    "Would you rather always be 10 minutes early or 20 minutes late?",
    "Would you rather lose your phone for a week or your favorite app for a month?",
    "Would you rather study all night or wake up at 4 AM to study?",
    "Would you rather travel anywhere for free or eat anywhere for free?"
  ],
  this_or_that: [
    "Coffee or milk tea?",
    "Morning classes or night classes?",
    "Group project or solo project?",
    "Beach or mountains?",
    "Chatting or voice messages?",
    "Gaming or movies?",
    "Stay in or go out?"
  ],
  quick_question: [
    "What is one thing you are looking forward to this week?",
    "What is your current favorite song?",
    "What is the funniest thing that happened to you in school?",
    "What is a skill you wish you had?",
    "What is your comfort food?",
    "What is one place you want to visit?"
  ]
};



const queue = new Map();
const socketState = new Map();
const activeMatches = new Map();
const conversationFeedback = new Map();
const reactionState = new Map();
const ALLOWED_REACTIONS = new Set(["❤️", "😆", "😮", "😢", "😭", "😡", "👍"]);
const sessionToSocket = new Map();
const sessionProfiles = new Map();

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "ws:", "wss:"],
      imgSrc: ["'self'", "data:", "blob:"],
      mediaSrc: ["'self'", "blob:"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"]
    }
  },
  referrerPolicy: { policy: "no-referrer" },
  frameguard: { action: "deny" }
}));
app.use(express.json({ limit: "20kb" }));
app.use(express.urlencoded({ extended: false, limit: "10kb" }));

const apiLimiter = rateLimit({
  windowMs: 60_000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please slow down." }
});

app.use("/api", apiLimiter);

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "home.html"));
});

app.get("/home", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "home.html"));
});

app.get("/consent", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "consent.html"));
});

app.get("/about", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "about.html"));
});

app.get("/terms", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "terms.html"));
});

app.get("/chat", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "chat.html"));
});

app.get("/conversation", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "conversation.html"));
});

app.get("/finding", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "finding.html"));
});

app.post("/api/end-chat-beacon", async (req, res) => {
  try {
    const sessionUuid = String(req.body?.sessionUuid || "").trim().slice(0, 80);
    if (!sessionUuid) return res.status(204).end();

    queue.delete(sessionUuid);

    if (activeMatches.has(sessionUuid)) {
      await endMatchForSession(sessionUuid, sessionUuid, "partner-left");
      broadcastStats();
    }

    res.status(204).end();
  } catch (error) {
    console.error("end-chat beacon error:", error);
    // unload requests should not get stuck retrying because of an error response
    res.status(204).end();
  }
});

app.use((req, res, next) => {
  res.setHeader("X-SintaChat-Build", "3.6.32");
  // development: always serve fresh frontend files
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Surrogate-Control", "no-store");
  next();
});

app.use(express.static(path.join(__dirname, "public"), {
  index: false,
  etag: false,
  maxAge: 0
}));

function allowSocketAction(state, key, limit, windowMs) {
  const now = Date.now();
  state.socketLimits = state.socketLimits || {};
  const bucket = (state.socketLimits[key] || []).filter((time) => now - time < windowMs);

  if (bucket.length >= limit) {
    state.socketLimits[key] = bucket;
    return false;
  }

  bucket.push(now);
  state.socketLimits[key] = bucket;
  return true;
}

function sanitizeNickname(value) {
  return String(value || "")
    .replace(/[^\p{L}\p{N}_\-. ]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 24);
}

function sanitizeInterests(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value)]
    .filter((item) => INTEREST_LIST.includes(item))
    .slice(0, 3);
}

function sanitizeVibe(value) {
  return VIBE_LIST.includes(value) ? value : "Random";
}

function sanitizeReply(value) {
  if (!value || typeof value !== "object") return null;

  const id = String(value.id || "").slice(0, 64);
  const text = sanitizeMessage(value.text).slice(0, 160);
  const sender = value.sender === "partner" ? "partner" : "you";

  if (!id || !text) return null;
  return { id, text, sender };
}

function sanitizeMessage(value) {
  return String(value || "")
    .replace(/\u0000/g, "")
    .trim()
    .slice(0, 1000);
}

function makeFingerprint(sessionUuid) {
  return crypto
    .createHash("sha256")
    .update(`${sessionUuid}:${SESSION_SALT}`)
    .digest("hex");
}

function isValidProfile(profile) {
  return (
    profile &&
    typeof profile === "object" &&
    sanitizeNickname(profile.nickname).length >= 3 &&
    ["male", "female"].includes(profile.gender) &&
    ["anyone", "male", "female"].includes(profile.preference) &&
    CAMPUS_LIST.includes(profile.campus) &&
    Array.isArray(profile.interests) &&
    profile.interests.length <= 3 &&
    profile.interests.every((item) => INTEREST_LIST.includes(item)) &&
    VIBE_LIST.includes(profile.vibe)
  );
}

function compatible(a, b) {
  const aWantsB = a.preference === "anyone" || a.preference === b.gender;
  const bWantsA = b.preference === "anyone" || b.preference === a.gender;
  return aWantsB && bWantsA;
}

async function isBlockedEitherWay(a, b) {
  const [rows] = await pool.execute(
    `SELECT id
       FROM blocks
      WHERE (blocker_session_uuid = ? AND blocked_session_uuid = ?)
         OR (blocker_session_uuid = ? AND blocked_session_uuid = ?)
      LIMIT 1`,
    [a, b, b, a]
  );
  return rows.length > 0;
}

async function upsertSession(sessionUuid, profile) {
  await pool.execute(
    `INSERT INTO anonymous_sessions
      (session_uuid, nickname, gender, campus, preference, last_seen_at)
     VALUES (?, ?, ?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE
       nickname = VALUES(nickname),
       gender = VALUES(gender),
       campus = VALUES(campus),
       preference = VALUES(preference),
       last_seen_at = NOW()`,
    [
      sessionUuid,
      sanitizeNickname(profile.nickname),
      profile.gender,
      profile.campus,
      profile.preference
    ]
  );
}

async function endMatchForSession(sessionUuid, endedBy, reason = "ended") {
  const matchUuid = activeMatches.get(sessionUuid);
  if (!matchUuid) return;

  const peerSession = [...activeMatches.entries()]
    .find(([sid, mid]) => mid === matchUuid && sid !== sessionUuid)?.[0];

  activeMatches.delete(sessionUuid);
  if (peerSession) activeMatches.delete(peerSession);

  for (const key of reactionState.keys()) {
    if (key.startsWith(`${matchUuid}:`)) reactionState.delete(key);
  }

  await pool.execute(
    `UPDATE matches
        SET ended_by = ?, ended_at = NOW()
      WHERE match_uuid = ? AND ended_at IS NULL`,
    [endedBy || sessionUuid, matchUuid]
  );

  // emit through session rooms so the event survives socket reconnects
  io.to(`session:${sessionUuid}`).emit("chat-ended", {
    reason,
    endedBySelf: endedBy === sessionUuid
  });

  if (peerSession) {
    io.to(`session:${peerSession}`).emit("chat-ended", {
      reason: reason === "partner-left" ? "partner-left" : "ended",
      endedBySelf: false
    });
  }
}

async function attemptMatch(socket) {
  const state = socketState.get(socket.id);
  if (!state || !state.profile || !state.sessionUuid) return;

  queue.set(state.sessionUuid, {
    sessionUuid: state.sessionUuid,
    socketId: socket.id,
    profile: state.profile,
    joinedAt: Date.now()
  });

  const candidates = [];

  for (const [candidateId, candidate] of queue.entries()) {
    if (candidateId === state.sessionUuid) continue;

    const candidateSockets = await io.in(`session:${candidate.sessionUuid}`).fetchSockets();
    if (!candidateSockets.length) {
      queue.delete(candidateId);
      continue;
    }

    if (!compatible(state.profile, candidate.profile)) continue;
    if (await isBlockedEitherWay(state.sessionUuid, candidate.sessionUuid)) continue;

    const sharedInterests = (state.profile.interests || [])
      .filter((interest) => (candidate.profile.interests || []).includes(interest)).length;
    const waitBonus = Math.min(2, Math.floor((Date.now() - candidate.joinedAt) / 15000));

    candidates.push({
      candidate,
      score: sharedInterests * 3 + waitBonus
    });
  }

  if (candidates.length) {
    candidates.sort((a, b) => b.score - a.score || a.candidate.joinedAt - b.candidate.joinedAt);
    const candidate = candidates[0].candidate;

    queue.delete(state.sessionUuid);
    queue.delete(candidate.sessionUuid);

    const matchUuid = uuidv4();

    activeMatches.set(state.sessionUuid, matchUuid);
    activeMatches.set(candidate.sessionUuid, matchUuid);
    sessionProfiles.set(state.sessionUuid, state.profile);
    sessionProfiles.set(candidate.sessionUuid, candidate.profile);

    await pool.execute(
      `INSERT INTO matches (match_uuid, session_a, session_b)
       VALUES (?, ?, ?)`,
      [matchUuid, state.sessionUuid, candidate.sessionUuid]
    );

    socket.emit("matched", {
      matchUuid,
      partner: {
        nickname: candidate.profile.nickname,
        gender: candidate.profile.gender,
        campus: candidate.profile.campus,
        interests: candidate.profile.interests || [],
        vibe: candidate.profile.vibe || "Random"
      }
    });

    io.to(`session:${candidate.sessionUuid}`).emit("matched", {
      matchUuid,
      partner: {
        nickname: state.profile.nickname,
        gender: state.profile.gender,
        campus: state.profile.campus,
        interests: state.profile.interests || [],
        vibe: state.profile.vibe || "Random"
      }
    });

    broadcastStats();
    return;
  }

  socket.emit("queue-status", { waiting: true });
  broadcastStats();
}

function broadcastStats() {
  io.emit("stats", {
    online: sessionToSocket.size,
    waiting: queue.size
  });
}

app.get("/api/config", (req, res) => {
  res.json({
    campuses: CAMPUS_LIST,
    interests: INTEREST_LIST,
    vibes: VIBE_LIST,
    maxInterests: 3,
    maxNicknameLength: 24,
    maxMessageLength: 1000
  });
});

app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true });
  } catch {
    res.status(503).json({ ok: false });
  }
});

io.use((socket, next) => {
  const origin = socket.handshake.headers.origin;
  const host = socket.handshake.headers.host;

  if (origin && host) {
    try {
      const parsed = new URL(origin);
      if (parsed.host !== host) return next(new Error("Origin not allowed."));
    } catch {
      return next(new Error("Invalid origin."));
    }
  }

  next();
});

io.use((socket, next) => {
  const rawSession = String(socket.handshake.auth?.sessionUuid || "");
  if (!/^[0-9a-f-]{36}$/i.test(rawSession)) {
    return next(new Error("Invalid session."));
  }
  next();
});

io.on("connection", (socket) => {
  const sessionUuid = socket.handshake.auth.sessionUuid;

  // one stable room per anonymous session so reconnects don't break delivery
  socket.join(`session:${sessionUuid}`);
  sessionToSocket.set(sessionUuid, socket.id);
  socketState.set(socket.id, {
    sessionUuid,
    profile: sessionProfiles.get(sessionUuid) || null,
    lastMessageAt: 0,
    messageBurst: [],
    socketLimits: {}
  });

  broadcastStats();

  if (activeMatches.has(sessionUuid)) {
    const matchUuid = activeMatches.get(sessionUuid);
    const peerSession = [...activeMatches.entries()]
      .find(([sid, mid]) => mid === matchUuid && sid !== sessionUuid)?.[0];
    const peerProfile = peerSession ? sessionProfiles.get(peerSession) : null;

    if (peerSession && peerProfile) {
      setTimeout(() => {
        if (socket.connected && activeMatches.get(sessionUuid) === matchUuid) {
          socket.emit("resume-match", {
            matchUuid,
            partner: {
              nickname: peerProfile.nickname,
              gender: peerProfile.gender,
              campus: peerProfile.campus
            }
          });
        }
      }, 120);
    }
  }



  socket.on("set-profile", async (profile, done = () => {}) => {
    try {
      const cleaned = {
        nickname: sanitizeNickname(profile?.nickname),
        aboutMe: String(profile?.aboutMe || "").trim().slice(0, 120),
        gender: profile?.gender,
        campus: profile?.campus,
        preference: profile?.preference || "anyone",
        interests: sanitizeInterests(profile?.interests),
        vibe: sanitizeVibe(profile?.vibe)
      };

      if (!isValidProfile(cleaned)) {
        return done({ ok: false, error: "Please complete your profile correctly." });
      }

      await upsertSession(sessionUuid, cleaned);
      const state = socketState.get(socket.id);
      state.profile = cleaned;
      sessionProfiles.set(sessionUuid, cleaned);
      done({ ok: true, fingerprint: makeFingerprint(sessionUuid) });
    } catch (error) {
      console.error(error);
      done({ ok: false, error: "Could not save your anonymous profile." });
    }
  });

  socket.on("find-match", async (done = () => {}) => {
    try {
      const state = socketState.get(socket.id);
      if (!allowSocketAction(state, "find", 15, 60_000)) return done({ ok: false, error: "Please wait before searching again." });
      if (!state?.profile) {
        return done({ ok: false, error: "Create your anonymous profile first." });
      }

      if (activeMatches.has(sessionUuid)) {
        return done({ ok: false, error: "You are already in a conversation." });
      }

      await attemptMatch(socket);
      done({ ok: true });
    } catch (error) {
      console.error(error);
      done({ ok: false, error: "Matchmaking failed." });
    }
  });

  socket.on("cancel-search", () => {
    queue.delete(sessionUuid);
    socket.emit("queue-status", { waiting: false });
    broadcastStats();
  });

  socket.on("send-message", async (payload, done = () => {}) => {
    try {
      const state = socketState.get(socket.id);
      const matchUuid = activeMatches.get(sessionUuid);
      if (!matchUuid) return done({ ok: false, error: "No active conversation." });

      const text = sanitizeMessage(payload?.text);
      if (!text) return done({ ok: false, error: "Message is empty." });

      const now = Date.now();
      state.messageBurst = state.messageBurst.filter((t) => now - t < 10_000);
      if (state.messageBurst.length >= 12) {
        return done({ ok: false, error: "You are sending messages too quickly." });
      }
      if (now - state.lastMessageAt < 250) {
        return done({ ok: false, error: "Please slow down." });
      }

      state.lastMessageAt = now;
      state.messageBurst.push(now);

      await pool.execute(
        `INSERT INTO messages (match_uuid, sender_session_uuid, message_text)
         VALUES (?, ?, ?)`,
        [matchUuid, sessionUuid, text]
      );

      const peerSession = [...activeMatches.entries()]
        .find(([sid, mid]) => mid === matchUuid && sid !== sessionUuid)?.[0];

      const event = {
        id: uuidv4(),
        clientId: String(payload?.clientId || "").slice(0, 80),
        text,
        reply: sanitizeReply(payload?.reply),
        sentAt: new Date().toISOString()
      };

      socket.emit("message-sent", event);

      if (peerSession) {
        io.to(`session:${peerSession}`).emit("message-received", event);
      }

      done({ ok: true });
    } catch (error) {
      console.error(error);
      done({ ok: false, error: "Message could not be sent." });
    }
  });




  socket.on("react-message", (payload, done = () => {}) => {
    try {
      const matchUuid = activeMatches.get(sessionUuid);
      if (!matchUuid) return done({ ok: false, error: "No active conversation." });

      const messageId = String(payload?.messageId || "").slice(0, 80);
      const reaction = String(payload?.reaction || "").slice(0, 20);

      if (!messageId || !/^[A-Za-z0-9_-]+$/.test(messageId)) {
        return done({ ok: false, error: "Invalid message." });
      }

      if (!ALLOWED_REACTIONS.has(reaction)) {
        return done({ ok: false, error: "Invalid reaction." });
      }

      const key = `${matchUuid}:${messageId}`;
      const reactions = reactionState.get(key) || new Map();
      const previous = reactions.get(sessionUuid);

      if (previous === reaction) {
        reactions.delete(sessionUuid);
      } else {
        reactions.set(sessionUuid, reaction);
      }

      if (reactions.size) reactionState.set(key, reactions);
      else reactionState.delete(key);

      const counts = {};
      for (const value of reactions.values()) {
        counts[value] = (counts[value] || 0) + 1;
      }

      const peerSession = [...activeMatches.entries()]
        .find(([sid, mid]) => mid === matchUuid && sid !== sessionUuid)?.[0];

      const emitUpdate = (targetSession) => {
        if (!targetSession) return;
        io.to(`session:${targetSession}`).emit("reaction-update", {
          messageId,
          reactions: counts,
          mineReaction: reactions.get(targetSession) || null
        });
      };

      emitUpdate(sessionUuid);
      emitUpdate(peerSession);
      done({ ok: true });
    } catch (error) {
      console.error("reaction error:", error);
      done({ ok: false, error: "Reaction could not be updated." });
    }
  });

  socket.on("ack-message", (payload) => {
    const matchUuid = activeMatches.get(sessionUuid);
    if (!matchUuid) return;

    const messageId = String(payload?.id || "").slice(0, 64);
    if (!messageId) return;

    const peerSession = [...activeMatches.entries()]
      .find(([sid, mid]) => mid === matchUuid && sid !== sessionUuid)?.[0];

    if (!peerSession) return;

    io.to(`session:${peerSession}`).emit("delivery-update", {
      id: messageId,
      status: "delivered"
    });
  });

  socket.on("send-voice", async (payload, done = () => {}) => {
    try {
      const state = socketState.get(socket.id);
      if (!allowSocketAction(state, "voice", 8, 60_000)) {
        return done({ ok: false, error: "Too many voice messages. Please wait." });
      }

      const matchUuid = activeMatches.get(sessionUuid);
      if (!matchUuid) {
        return done({ ok: false, error: "No active conversation." });
      }

      const duration = Math.max(0, Math.min(Number(payload?.duration || 0), 90));
      const mimeType = String(payload?.mimeType || "audio/webm").slice(0, 100);
      const rawAudio = payload?.audio;

      let audioBuffer = null;

      if (Buffer.isBuffer(rawAudio)) {
        audioBuffer = rawAudio;
      } else if (rawAudio instanceof ArrayBuffer) {
        audioBuffer = Buffer.from(rawAudio);
      } else if (ArrayBuffer.isView(rawAudio)) {
        audioBuffer = Buffer.from(rawAudio.buffer, rawAudio.byteOffset, rawAudio.byteLength);
      } else if (rawAudio?.type === "Buffer" && Array.isArray(rawAudio.data)) {
        audioBuffer = Buffer.from(rawAudio.data);
      }

      if (!audioBuffer || audioBuffer.length < 32) {
        return done({ ok: false, error: "Voice recording is empty or invalid." });
      }

      if (audioBuffer.length > 1_500_000) {
        return done({ ok: false, error: "Voice message is too large. Keep it shorter." });
      }

      if (!/^audio\/[a-z0-9.+-]+(?:;.*)?$/i.test(mimeType)) {
        return done({ ok: false, error: "Unsupported voice format." });
      }

      const peerSession = [...activeMatches.entries()]
        .find(([sid, mid]) => mid === matchUuid && sid !== sessionUuid)?.[0];

      if (!peerSession) {
        return done({ ok: false, error: "Partner is no longer connected." });
      }

      const peerRoom = `session:${peerSession}`;
      const peerSockets = await io.in(peerRoom).fetchSockets();

      // don't touch the active match if the partner is reconnecting
      if (!peerSockets.length) {
        return done({ ok: false, error: "Partner is reconnecting. Try again in a moment." });
      }

      const event = {
        id: uuidv4(),
        audio: audioBuffer,
        mimeType,
        duration,
        sentAt: new Date().toISOString()
      };

      socket.emit("voice-sent", event);
      io.to(`session:${peerSession}`).emit("voice-received", event);

      done({ ok: true });
    } catch (error) {
      console.error("voice send error:", error);
      done({ ok: false, error: "Voice message could not be sent." });
    }
  });


  socket.on("request-activity", (payload, done = () => {}) => {
    const matchUuid = activeMatches.get(sessionUuid);
    if (!matchUuid) return done({ ok: false, error: "No active conversation." });

    const peerSession = [...activeMatches.entries()]
      .find(([sid, mid]) => mid === matchUuid && sid !== sessionUuid)?.[0];

    if (!peerSession) return done({ ok: false, error: "Partner not found." });

    const type = String(payload?.type || "icebreaker");
    const prompts = ACTIVITY_PROMPTS[type] || ACTIVITY_PROMPTS.icebreaker;
    const prompt = prompts[Math.floor(Math.random() * prompts.length)];

    const labels = {
      icebreaker: "icebreaker",
      would_you_rather: "would you rather",
      this_or_that: "this or that",
      quick_question: "quick question"
    };

    const event = {
      type,
      label: labels[type] || "icebreaker",
      prompt,
      sentAt: new Date().toISOString()
    };

    io.to(`session:${sessionUuid}`).emit("activity-prompt", event);
    io.to(`session:${peerSession}`).emit("activity-prompt", event);
    done({ ok: true });
  });

  socket.on("request-icebreaker", (done = () => {}) => {
    const matchUuid = activeMatches.get(sessionUuid);
    if (!matchUuid) return done({ ok: false, error: "No active conversation." });

    const peerSession = [...activeMatches.entries()]
      .find(([sid, mid]) => mid === matchUuid && sid !== sessionUuid)?.[0];

    if (!peerSession) return done({ ok: false, error: "Partner not found." });

    const prompt = ICEBREAKERS[Math.floor(Math.random() * ICEBREAKERS.length)];
    const event = {
      type: "icebreaker",
      label: "icebreaker",
      prompt,
      sentAt: new Date().toISOString()
    };

    io.to(`session:${sessionUuid}`).emit("activity-prompt", event);
    io.to(`session:${peerSession}`).emit("activity-prompt", event);
    done({ ok: true });
  });

  socket.on("typing", (payload) => {
    const matchUuid = activeMatches.get(sessionUuid);
    if (!matchUuid) return;

    const peerSession = [...activeMatches.entries()]
      .find(([sid, mid]) => mid === matchUuid && sid !== sessionUuid)?.[0];

    if (!peerSession) return;

    io.to(`session:${peerSession}`).emit("partner-typing", {
      typing: Boolean(payload?.typing)
    });
  });

  socket.on("next", async (done = () => {}) => {
    try {
      if (activeMatches.has(sessionUuid)) {
        await endMatchForSession(sessionUuid, sessionUuid, "next");
      }
      const state = socketState.get(socket.id);
      if (!state?.profile) {
        return done({ ok: false, error: "Profile not found." });
      }
      await attemptMatch(socket);
      done({ ok: true });
    } catch (error) {
      console.error(error);
      done({ ok: false, error: "Could not find the next conversation." });
    }
  });

  socket.on("end-chat", async (done = () => {}) => {
    try {
      queue.delete(sessionUuid);
      await endMatchForSession(sessionUuid, sessionUuid, "ended");
      done({ ok: true });
      broadcastStats();
    } catch (error) {
      console.error(error);
      done({ ok: false, error: "Could not end the conversation." });
    }
  });

  socket.on("report", async (payload, done = () => {}) => {
    try {
      const state = socketState.get(socket.id);
      if (!allowSocketAction(state, "report", 5, 60_000)) return done({ ok: false, error: "Too many reports. Please wait." });
      const matchUuid = activeMatches.get(sessionUuid);
      if (!matchUuid) {
        return done({ ok: false, error: "No active conversation." });
      }

      const peerSession = [...activeMatches.entries()]
        .find(([sid, mid]) => mid === matchUuid && sid !== sessionUuid)?.[0];

      if (!peerSession) {
        return done({ ok: false, error: "Partner not found." });
      }

      const allowedReasons = [
        "harassment",
        "sexual_content",
        "spam",
        "hate",
        "personal_info",
        "other"
      ];

      const reason = allowedReasons.includes(payload?.reason) ? payload.reason : "other";
      const details = String(payload?.details || "").trim().slice(0, 500);

      await pool.execute(
        `INSERT INTO reports
          (reporter_session_uuid, reported_session_uuid, match_uuid, reason, details)
         VALUES (?, ?, ?, ?, ?)`,
        [sessionUuid, peerSession, matchUuid, reason, details || null]
      );

      done({ ok: true });
    } catch (error) {
      console.error(error);
      done({ ok: false, error: "Report could not be submitted." });
    }
  });

  socket.on("block", async (done = () => {}) => {
    try {
      const state = socketState.get(socket.id);
      if (!allowSocketAction(state, "block", 8, 60_000)) return done({ ok: false, error: "Please slow down." });
      const matchUuid = activeMatches.get(sessionUuid);
      if (!matchUuid) {
        return done({ ok: false, error: "No active conversation." });
      }

      const peerSession = [...activeMatches.entries()]
        .find(([sid, mid]) => mid === matchUuid && sid !== sessionUuid)?.[0];

      if (!peerSession) {
        return done({ ok: false, error: "Partner not found." });
      }

      await pool.execute(
        `INSERT IGNORE INTO blocks (blocker_session_uuid, blocked_session_uuid)
         VALUES (?, ?)`,
        [sessionUuid, peerSession]
      );

      await endMatchForSession(sessionUuid, sessionUuid, "blocked");
      done({ ok: true });
      broadcastStats();
    } catch (error) {
      console.error(error);
      done({ ok: false, error: "Could not block this user." });
    }
  });

    socket.on("conversation-feedback", ({ rating } = {}) => {
    if (!["good", "okay", "bad"].includes(rating)) return;

    const matchUuid = activeMatches.get(sessionUuid) || `recent:${sessionUuid}`;
    const feedback = conversationFeedback.get(matchUuid) || {};
    feedback[sessionUuid] = rating;
    conversationFeedback.set(matchUuid, feedback);
  });

socket.on("disconnect", async () => {
    queue.delete(sessionUuid);

    sessionToSocket.delete(sessionUuid);
    socketState.delete(socket.id);

    // a disconnect does not end the conversation.
    // the same anonymous session can reconnect later and resume the match.
    try {
      await pool.execute(
        `UPDATE anonymous_sessions SET last_seen_at = NOW() WHERE session_uuid = ?`,
        [sessionUuid]
      );
    } catch (error) {
      console.error(error);
    }

    broadcastStats();
  });
});

server.listen(PORT, () => {
  console.log(`SintaChat running at http://localhost:${PORT}`);
});