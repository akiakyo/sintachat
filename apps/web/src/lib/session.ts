export type MatchPreference = "male" | "female" | "anyone";
export type Profile = {
  nickname: string;
  campus: string;
  preference: MatchPreference;
  vibe: string;
  interests: string[];
  gender?: "male" | "female" | "unspecified";
};

const SESSION_KEY = "sintachat-v1-session";
const PROFILE_KEY = "sintachat-v1-profile";
const CONSENT_COOKIE = "sintachat_consent_session";
const MATCH_KEY = "sintachat-v1-pending-match";
const SOUND_KEY = "sintachat-v1-sounds";
const ADMIN_TOKEN_KEY = "sintachat-v1-admin-token";
const ADMIN_NICK_KEY = "sintachat-v1-admin-nickname";
const CHAT_VIEW_KEY = "sintachat-v1-chat-view";

const LEGACY = {
  session: ["sintachat-v4-session", "anonisko-v4-session"],
  profile: ["sintachat-v4-profile", "anonisko-v4-profile", "anonisko-profile"],
  match: ["sintachat-v4-pending-match", "anonisko-v4-pending-match"],
  sound: ["sintachat-v4-sounds", "anonisko-v4-sounds"],
  adminToken: ["sintachat-v4-admin-token", "anonisko-v4-admin-token"],
  adminNick: ["sintachat-v4-admin-nickname", "anonisko-v4-admin-nickname"],
  nickname: ["sintachat-v4-nickname", "anonisko-v4-nickname"]
};

function migrateStorage(storage: Storage, key: string, legacyKeys: string[]) {
  let value = storage.getItem(key);
  if (value !== null) return value;
  for (const legacyKey of legacyKeys) {
    value = storage.getItem(legacyKey);
    if (value !== null) {
      storage.setItem(key, value);
      return value;
    }
  }
  return null;
}

function getCookie(name: string) {
  if (typeof document === "undefined") return "";
  const prefix = `${encodeURIComponent(name)}=`;
  return document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix))
    ?.slice(prefix.length) || "";
}

export function getSessionId() {
  if (typeof window === "undefined") return "";
  let id = migrateStorage(localStorage, SESSION_KEY, LEGACY.session);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export function saveProfile(profile: Profile) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  localStorage.setItem("sintachat-v1-nickname", profile.nickname);
}

export function getProfile(): Profile | null {
  if (typeof window === "undefined") return null;
  const profileRaw = migrateStorage(localStorage, PROFILE_KEY, LEGACY.profile);
  try {
    const parsed = JSON.parse(profileRaw || "null");
    if (parsed?.nickname) return parsed;
  } catch {}
  const nickname = localStorage.getItem("sintachat-v1-nickname") || LEGACY.nickname.map(k=>localStorage.getItem(k)).find(Boolean);
  return nickname ? {
    nickname,
    campus: "",
    preference: "anyone",
    vibe: "",
    interests: []
  } : null;
}

export function resetProfile() {
  localStorage.removeItem(PROFILE_KEY);
  localStorage.removeItem("sintachat-v1-nickname");
}

export function hasConsent() {
  return Boolean(getCookie(CONSENT_COOKIE));
}

export async function acceptConsent() {
  const response = await fetch("/api/consent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      anonymousSessionId: getSessionId(),
      termsAccepted: true,
      ageConfirmed: true,
      locationConfirmed: true
    })
  });

  const data = await response.json().catch(() => null) as { ok?: boolean; error?: string } | null;
  if (!response.ok || !data?.ok) {
    throw new Error(data?.error || "Unable to save consent. Please try again.");
  }
}

export function soundsEnabled() {
  return typeof window === "undefined" ? true : migrateStorage(localStorage, SOUND_KEY, LEGACY.sound) !== "off";
}
export function setSoundsEnabled(value:boolean) {
  localStorage.setItem(SOUND_KEY, value ? "on" : "off");
}

export function savePendingMatch(value: unknown) { sessionStorage.setItem(MATCH_KEY, JSON.stringify(value)); }
export function getPendingMatch<T>() : T | null {
  try {
    const raw = migrateStorage(sessionStorage, MATCH_KEY, LEGACY.match);
    return JSON.parse(raw || "null") as T | null;
  } catch { return null; }
}
export function clearPendingMatch() {
  sessionStorage.removeItem(MATCH_KEY);
  LEGACY.match.forEach(key=>sessionStorage.removeItem(key));
}

export function showConversationView() {
  if (typeof window !== "undefined") sessionStorage.setItem(CHAT_VIEW_KEY, "yes");
}
export function hideConversationView() {
  if (typeof window !== "undefined") sessionStorage.removeItem(CHAT_VIEW_KEY);
}
export function shouldShowConversationView() {
  if (typeof window === "undefined") return false;
  const visible = sessionStorage.getItem(CHAT_VIEW_KEY) === "yes";
  const pending = getPendingMatch<unknown>();
  return visible && !!pending;
}

export function getAdminToken() {
  return typeof window === "undefined" ? "" : migrateStorage(sessionStorage, ADMIN_TOKEN_KEY, LEGACY.adminToken) || "";
}
export function isAdminMode() { return !!getAdminToken(); }
export function setAdminMode(token:string,nickname:string) {
  sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
  sessionStorage.setItem(ADMIN_NICK_KEY, nickname);
}
export function getAdminNickname() {
  return typeof window === "undefined" ? "" : migrateStorage(sessionStorage, ADMIN_NICK_KEY, LEGACY.adminNick) || "";
}
export function clearAdminMode() {
  sessionStorage.removeItem(ADMIN_TOKEN_KEY);
  sessionStorage.removeItem(ADMIN_NICK_KEY);
}

export function preferenceLabel(pref: MatchPreference) {
  if (pref === "male") return "Finding an Isko...";
  if (pref === "female") return "Finding an Iska...";
  return "Finding an Iska or Isko...";
}
