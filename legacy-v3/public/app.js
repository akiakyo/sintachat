(() => {
const storageKey = "anonisko-session";
const profileKey = "anonisko-profile";
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
const chatView = document.getElementById("chatView");
const profileForm = document.getElementById("profileForm");
const nicknameInput = document.getElementById("nickname");
const campusSelect = document.getElementById("campus");
const preferenceSelect = document.getElementById("preference");
const formMessage = document.getElementById("formMessage");
const onlineCount = document.getElementById("onlineCount");
const waitingCount = document.getElementById("waitingCount");
const waitingText = document.getElementById("waitingText");
const partnerNickname = document.getElementById("partnerNickname");
const partnerDetails = document.getElementById("partnerDetails");
const messages = document.getElementById("messages");
const messageForm = document.getElementById("messageForm");
const messageInput = document.getElementById("messageInput");
const typingStatus = document.getElementById("typingStatus");
const conversationClock = document.getElementById("conversationClock");
const voiceButton = document.getElementById("voiceButton");
const voiceRecorder = document.getElementById("voiceRecorder");
const voiceTimer = document.getElementById("voiceTimer");
const cancelVoiceButton = document.getElementById("cancelVoiceButton");
const sendVoiceButton = document.getElementById("sendVoiceButton");
const cancelSearchButton = document.getElementById("cancelSearchButton");
const nextButton = document.getElementById("nextButton");
const reportButton = document.getElementById("reportButton");
const blockButton = document.getElementById("blockButton");
const endButton = document.getElementById("endButton");
const reportDialog = document.getElementById("reportDialog");
const reportForm = document.getElementById("reportForm");
const reportReason = document.getElementById("reportReason");
const reportDetails = document.getElementById("reportDetails");
const closeReport = document.getElementById("closeReport");
const cancelReport = document.getElementById("cancelReport");
let currentProfile = null;
let currentPartner = null;
let typingTimer = null;
let searching = false;
let conversationClockTimer = null;
let mediaRecorder = null;
let voiceChunks = [];
let voiceStream = null;
let voiceStartedAt = 0;
let voiceTimerInterval = null;
let pendingVoiceBlob = null;
const endOverlay = document.getElementById("endOverlay");
const endOverlayTitle = document.getElementById("endOverlayTitle");
const endOverlayText = document.getElementById("endOverlayText");
const endOverlayButton = document.getElementById("endOverlayButton");
let audioContext = null;
function getAudioContext() {
if (!audioContext) {
const AudioCtx = window.AudioContext || window.webkitAudioContext;
if (AudioCtx) audioContext = new AudioCtx();
}
return audioContext;
}
function tone(frequency, duration = 0.08, gainValue = 0.035, delay = 0) {
const ctx = getAudioContext();
if (!ctx) return;
const start = ctx.currentTime + delay;
const oscillator = ctx.createOscillator();
const gain = ctx.createGain();
oscillator.type = "sine";
oscillator.frequency.setValueAtTime(frequency, start);
gain.gain.setValueAtTime(0.0001, start);
gain.gain.exponentialRampToValueAtTime(gainValue, start + 0.01);
gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
oscillator.connect(gain);
gain.connect(ctx.destination);
oscillator.start(start);
oscillator.stop(start + duration + 0.02);
}
function playSound(name) {
if (name === "send") {
tone(520, 0.06, 0.022);
} else if (name === "receive") {
tone(660, 0.07, 0.03);
tone(820, 0.07, 0.018, 0.055);
} else if (name === "match") {
tone(440, 0.08, 0.025);
tone(660, 0.09, 0.025, 0.07);
tone(880, 0.12, 0.02, 0.15);
} else if (name === "end") {
tone(520, 0.08, 0.025);
tone(390, 0.11, 0.022, 0.08);
tone(260, 0.14, 0.018, 0.18);
}
}
function showEndOverlay(title, text) {
endOverlayTitle.textContent = title;
endOverlayText.textContent = text;
endOverlay.classList.remove("hidden");
requestAnimationFrame(() => endOverlay.classList.add("visible"));
}
function hideEndOverlay() {
endOverlay.classList.remove("visible");
setTimeout(() => endOverlay.classList.add("hidden"), 220);
}
function formatConversationClock(date = new Date()) {
const mm = String(date.getMonth() + 1).padStart(2, "0");
const hh = String(date.getHours()).padStart(2, "0");
const dd = String(date.getDate()).padStart(2, "0");
return `${mm}/${hh}/${dd}`;
}
function startConversationClock() {
stopConversationClock();
if (!conversationClock) return;
const update = () => {
conversationClock.textContent = formatConversationClock(new Date());
};
update();
conversationClockTimer = setInterval(update, 1000);
}
function stopConversationClock() {
if (conversationClockTimer) {
clearInterval(conversationClockTimer);
conversationClockTimer = null;
}
}
function formatVoiceDuration(seconds) {
const safe = Math.max(0, Math.floor(seconds || 0));
const mins = String(Math.floor(safe / 60)).padStart(2, "0");
const secs = String(safe % 60).padStart(2, "0");
return `${mins}:${secs}`;
}
function addVoiceMessage(dataUrl, duration, type) {
const wrapper = document.createElement("div");
wrapper.className = `voice-message ${type}`;
const play = document.createElement("button");
play.type = "button";
play.className = "voice-play-button";
play.setAttribute("aria-label", "Play voice message");
play.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7Z"/></svg>`;
const waveform = document.createElement("div");
waveform.className = "voice-waveform";
for (let i = 0; i < 18; i++) {
const bar = document.createElement("span");
bar.style.height = `${8 + ((i * 7) % 18)}px`;
waveform.appendChild(bar);
}
const time = document.createElement("span");
time.className = "voice-duration";
time.textContent = formatVoiceDuration(duration);
const audio = new Audio(dataUrl);
play.addEventListener("click", async () => {
if (audio.paused) {
document.querySelectorAll("audio").forEach((a) => {
if (a !== audio) a.pause();
});
try {
await audio.play();
play.classList.add("playing");
} catch {}
} else {
audio.pause();
play.classList.remove("playing");
}
});
audio.addEventListener("ended", () => play.classList.remove("playing"));
audio.addEventListener("pause", () => play.classList.remove("playing"));
wrapper.append(play, waveform, time, audio);
messages.appendChild(wrapper);
messages.scrollTop = messages.scrollHeight;
}
function resetVoiceRecorder() {
clearInterval(voiceTimerInterval);
voiceTimerInterval = null;
pendingVoiceBlob = null;
voiceChunks = [];
if (voiceStream) {
voiceStream.getTracks().forEach((track) => track.stop());
voiceStream = null;
}
mediaRecorder = null;
if (voiceRecorder) voiceRecorder.classList.add("hidden");
if (voiceTimer) voiceTimer.textContent = "00:00";
}
async function startVoiceRecording() {
if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
addMessage("Voice recording is not supported by this browser.", "system");
return;
}
try {
voiceStream = await navigator.mediaDevices.getUserMedia({ audio: true });
voiceChunks = [];
pendingVoiceBlob = null;
const preferredTypes = [
"audio/webm;codecs=opus",
"audio/webm",
"audio/ogg;codecs=opus"
];
const mimeType = preferredTypes.find((type) => MediaRecorder.isTypeSupported(type));
mediaRecorder = mimeType
? new MediaRecorder(voiceStream, { mimeType })
: new MediaRecorder(voiceStream);
mediaRecorder.addEventListener("dataavailable", (event) => {
if (event.data && event.data.size > 0) voiceChunks.push(event.data);
});
mediaRecorder.addEventListener("stop", () => {
pendingVoiceBlob = new Blob(voiceChunks, {
type: mediaRecorder?.mimeType || "audio/webm"
});
});
mediaRecorder.start();
voiceStartedAt = Date.now();
voiceRecorder.classList.remove("hidden");
voiceTimer.textContent = "00:00";
voiceTimerInterval = setInterval(() => {
const seconds = Math.floor((Date.now() - voiceStartedAt) / 1000);
voiceTimer.textContent = formatVoiceDuration(seconds);
if (seconds >= 120 && mediaRecorder?.state === "recording") {
mediaRecorder.stop();
clearInterval(voiceTimerInterval);
voiceTimerInterval = null;
}
}, 250);
} catch {
addMessage("Microphone permission was denied or unavailable.", "system");
resetVoiceRecorder();
}
}
function stopVoiceRecordingForSend() {
return new Promise((resolve) => {
if (!mediaRecorder || mediaRecorder.state === "inactive") {
resolve(pendingVoiceBlob);
return;
}
mediaRecorder.addEventListener("stop", () => resolve(pendingVoiceBlob), { once: true });
mediaRecorder.stop();
});
}
function blobToDataUrl(blob) {
return new Promise((resolve, reject) => {
const reader = new FileReader();
reader.onload = () => resolve(reader.result);
reader.onerror = reject;
reader.readAsDataURL(blob);
});
}
function show(view) {
[setupView, waitingView, chatView].forEach((el) => el.classList.add("hidden"));
view.classList.remove("hidden");
}
function setFormMessage(text) {
formMessage.textContent = text || "";
}
function addMessage(text, type) {
const el = document.createElement("div");
if (type === "system") {
el.className = "system-message";
} else {
el.className = `message ${type}`;
}
el.textContent = text;
messages.appendChild(el);
messages.scrollTop = messages.scrollHeight;
}
function clearChat() {
messages.replaceChildren();
typingStatus.textContent = "";
}
function partnerLabel(gender) {
return gender === "female" ? "Female" : "Male";
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
async function saveProfileAndSearch(profile) {
return new Promise((resolve) => {
socket.emit("set-profile", profile, (result) => {
if (!result?.ok) return resolve(result);
currentProfile = profile;
localStorage.setItem(profileKey, JSON.stringify(profile));
socket.emit("find-match", (matchResult) => resolve(matchResult));
});
});
}
profileForm.addEventListener("submit", async (event) => {
event.preventDefault();
setFormMessage("");
const gender = profileForm.querySelector('input[name="gender"]:checked')?.value;
const profile = {
nickname: nicknameInput.value.trim(),
gender,
campus: campusSelect.value,
preference: preferenceSelect.value
};
if (profile.nickname.length < 3) {
setFormMessage("Nickname must be at least 3 characters.");
return;
}
if (!profile.gender || !profile.campus) {
setFormMessage("Please complete all required fields.");
return;
}
searching = true;
show(waitingView);
waitingText.textContent = "Searching for a compatible PUP student.";
const result = await saveProfileAndSearch(profile);
if (!result?.ok) {
searching = false;
show(setupView);
setFormMessage(result?.error || "Could not start matchmaking.");
}
});
cancelSearchButton.addEventListener("click", () => {
socket.emit("cancel-search");
searching = false;
show(setupView);
});
nextButton.addEventListener("click", () => {
searching = true;
clearChat();
show(waitingView);
waitingText.textContent = "Finding your next conversation.";
socket.emit("next", (result) => {
if (!result?.ok) {
searching = false;
show(setupView);
setFormMessage(result?.error || "Could not find another conversation.");
}
});
});
endButton.addEventListener("click", () => {
searching = false;
socket.emit("end-chat", () => {
currentPartner = null;
});
});
blockButton.addEventListener("click", () => {
if (!currentPartner) return;
const confirmed = window.confirm(`Block ${currentPartner.nickname}? You will not be matched with this person again.`);
if (!confirmed) return;
socket.emit("block", (result) => {
if (result?.ok) {
currentPartner = null;
} else {
addMessage(result?.error || "Could not block this user.", "system");
}
});
});
if (voiceButton) {
voiceButton.addEventListener("click", () => {
if (mediaRecorder?.state === "recording") return;
startVoiceRecording();
});
}
if (cancelVoiceButton) {
cancelVoiceButton.addEventListener("click", () => {
if (mediaRecorder?.state === "recording") {
mediaRecorder.stop();
}
resetVoiceRecorder();
});
}
if (sendVoiceButton) {
sendVoiceButton.addEventListener("click", async () => {
const seconds = Math.max(1, Math.round((Date.now() - voiceStartedAt) / 1000));
const blob = await stopVoiceRecordingForSend();
if (!blob || blob.size === 0) {
resetVoiceRecorder();
return;
}
try {
const dataUrl = await blobToDataUrl(blob);
socket.emit("send-voice", {
dataUrl,
duration: seconds
}, (result) => {
if (!result?.ok) {
addMessage(result?.error || "Voice message could not be sent.", "system");
}
});
} catch {
addMessage("Voice message could not be prepared.", "system");
} finally {
resetVoiceRecorder();
}
});
}
reportButton.addEventListener("click", () => {
if (currentPartner) reportDialog.showModal();
});
closeReport.addEventListener("click", () => reportDialog.close());
cancelReport.addEventListener("click", () => reportDialog.close());
reportForm.addEventListener("submit", (event) => {
event.preventDefault();
socket.emit("report", {
reason: reportReason.value,
details: reportDetails.value.trim()
}, (result) => {
if (result?.ok) {
reportDetails.value = "";
reportDialog.close();
addMessage("Report submitted. Thank you for helping keep SintaChat safer.", "system");
} else {
addMessage(result?.error || "Report could not be submitted.", "system");
reportDialog.close();
}
});
});
messageForm.addEventListener("submit", (event) => {
event.preventDefault();
const text = messageInput.value.trim();
if (!text) return;
socket.emit("send-message", { text }, (result) => {
if (!result?.ok) {
addMessage(result?.error || "Message could not be sent.", "system");
}
});
messageInput.value = "";
messageInput.style.height = "auto";
socket.emit("typing", { typing: false });
});
messageInput.addEventListener("input", () => {
messageInput.style.height = "auto";
messageInput.style.height = `${Math.min(messageInput.scrollHeight, 150)}px`;
socket.emit("typing", { typing: true });
clearTimeout(typingTimer);
typingTimer = setTimeout(() => {
socket.emit("typing", { typing: false });
}, 900);
});
messageInput.addEventListener("keydown", (event) => {
if (event.key === "Enter" && !event.shiftKey) {
event.preventDefault();
messageForm.requestSubmit();
}
});
socket.on("connect_error", () => {
setFormMessage("Could not connect to SintaChat. Please refresh the page.");
});
socket.on("queue-status", ({ waiting }) => {
searching = Boolean(waiting);
});
socket.on("matched", ({ partner }) => {
searching = false;
currentPartner = partner;
partnerNickname.textContent = partner.nickname;
partnerDetails.textContent = `${partnerLabel(partner.gender)} · ${partner.campus}`;
clearChat();
addMessage(
`You are now connected with ${partner.nickname}. Stay respectful and avoid sharing sensitive personal information.`,
"system"
);
show(chatView);
startConversationClock();
playSound("match");
messageInput.focus();
});
socket.on("message-sent", ({ text }) => {
addMessage(text, "mine");
playSound("send");
});
socket.on("message-received", ({ text }) => {
addMessage(text, "theirs");
playSound("receive");
});
socket.on("voice-sent", ({ dataUrl, duration }) => {
addVoiceMessage(dataUrl, duration, "mine");
playSound("send");
});
socket.on("voice-received", ({ dataUrl, duration }) => {
addVoiceMessage(dataUrl, duration, "theirs");
playSound("receive");
});
socket.on("partner-typing", ({ typing }) => {
typingStatus.textContent = typing ? "Partner is typing..." : "";
});
socket.on("chat-ended", ({ reason }) => {
if (searching && reason === "next") return;
currentPartner = null;
typingStatus.textContent = "";
stopConversationClock();
resetVoiceRecorder();
playSound("end");
if (reason === "partner-left") {
showEndOverlay(
"Your conversation has ended.",
"The other person ended or left the chat. You can meet someone new."
);
return;
}
if (reason === "blocked") {
showEndOverlay(
"Conversation ended.",
"This conversation is closed. You can return and find another match."
);
return;
}
showEndOverlay(
"Conversation ended.",
"The chat is now closed for both people."
);
});
endOverlayButton.addEventListener("click", () => {
hideEndOverlay();
clearChat();
searching = false;
show(setupView);
});
socket.on("stats", ({ online, waiting }) => {
onlineCount.textContent = `${online} online`;
waitingCount.textContent = `${waiting} waiting`;
});
document.addEventListener("pointerdown", () => {
const ctx = getAudioContext();
if (ctx && ctx.state === "suspended") ctx.resume();
}, { once: true });
loadConfig().catch(() => {
setFormMessage("Could not load the campus list.");
});
})();