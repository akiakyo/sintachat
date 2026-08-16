(() => {
const storageKey = "anonisko-session";
const profileKey = "anonisko-profile";
const pendingMatchKey = "anonisko-pending-match";
function uuid() {
if (crypto.randomUUID) return crypto.randomUUID();
return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
const r = Math.random() * 16 | 0;
const v = c === "x" ? r : (r & 0x3 | 0x8);
return v.toString(16);
});
}
const sessionUuid = localStorage.getItem(storageKey) || uuid();
localStorage.setItem(storageKey, sessionUuid);
const socket = io({
auth: { sessionUuid },
transports: ["websocket", "polling"]
});
const setupView = document.getElementById("setupView");
const waitingView = document.getElementById("waitingView");
const animationView = document.getElementById("matchAnimationView");
const profileForm = document.getElementById("profileForm");
const nicknameInput = document.getElementById("nickname");
const campusSelect = document.getElementById("campus");
const preferenceSelect = document.getElementById("preference");
const formMessage = document.getElementById("formMessage");
const cancelSearchButton = document.getElementById("cancelSearchButton");
const waitingText = document.getElementById("waitingText");
const onlineCount = document.getElementById("onlineCount");
const animationKicker = document.getElementById("matchAnimationKicker");
const animationTitle = document.getElementById("matchAnimationTitle");
const animationText = document.getElementById("matchAnimationText");
let currentProfile = null;
let searching = false;
let redirecting = false;
function show(view) {
[setupView, waitingView, animationView].filter(Boolean).forEach((el) => el.classList.add("hidden"));
if (view) view.classList.remove("hidden");
}
function targetWord(profile) {
return profile?.gender === "female" ? "Isko" : "Iska";
}
function showFindingAnimation() {
animationKicker.textContent = "Matchmaking";
animationTitle.textContent = `Finding an ${targetWord(currentProfile)}...`;
animationText.textContent = "Searching for someone compatible with your preferences.";
animationView.classList.remove("connected");
show(animationView);
}
function showConnectedAnimation(partner) {
animationView.classList.add("connected");
animationKicker.textContent = "Connected";
animationTitle.textContent = `You found ${partner.nickname}.`;
animationText.textContent = "Opening your anonymous conversation...";
show(animationView);
}
async function loadConfig() {
const response = await fetch("/api/config");
const config = await response.json();
for (const campus of config.campuses) {
const option = document.createElement("option");
option.value = campus;
option.textContent = campus;
campusSelect.appendChild(option);
}
const saved = JSON.parse(localStorage.getItem(profileKey) || "null");
if (saved) {
nicknameInput.value = saved.nickname || "";
campusSelect.value = saved.campus || "";
preferenceSelect.value = saved.preference || "anyone";
const genderInput = document.querySelector(`input[name="gender"][value="${saved.gender}"]`);
if (genderInput) genderInput.checked = true;
}
}
profileForm.addEventListener("submit", (event) => {
event.preventDefault();
formMessage.textContent = "";
const gender = profileForm.querySelector('input[name="gender"]:checked')?.value;
const profile = {
nickname: nicknameInput.value.trim(),
gender,
campus: campusSelect.value,
preference: preferenceSelect.value
};
if (profile.nickname.length < 3 || !profile.gender || !profile.campus) {
formMessage.textContent = "Please complete your anonymous profile.";
return;
}
currentProfile = profile;
localStorage.setItem(profileKey, JSON.stringify(profile));
socket.emit("set-profile", profile, (result) => {
if (!result?.ok) {
formMessage.textContent = result?.error || "Could not save your anonymous profile.";
return;
}
searching = true;
showFindingAnimation();
socket.emit("find-match", (matchResult) => {
if (!matchResult?.ok) {
searching = false;
show(setupView);
formMessage.textContent = matchResult?.error || "Matchmaking failed.";
}
});
});
});
cancelSearchButton.addEventListener("click", () => {
searching = false;
socket.emit("cancel-search");
show(setupView);
});
socket.on("queue-status", ({ waiting }) => {
searching = Boolean(waiting);
if (waiting && currentProfile) showFindingAnimation();
});
socket.on("matched", ({ matchUuid, partner }) => {
if (redirecting) return;
redirecting = true;
searching = false;
sessionStorage.setItem(pendingMatchKey, JSON.stringify({
matchUuid,
partner,
matchedAt: Date.now()
}));
showConnectedAnimation(partner);
setTimeout(() => {
window.location.href = "/conversation";
}, 1450);
});
socket.on("stats", ({ online }) => {
if (onlineCount) onlineCount.textContent = `${online} online`;
});
loadConfig().catch(() => {
formMessage.textContent = "Could not load the campus list.";
});
})();