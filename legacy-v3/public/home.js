(() => {
const cards = [...document.querySelectorAll(".reveal-card")];
if (!("IntersectionObserver" in window)) {
cards.forEach((card) => card.classList.add("visible"));
return;
}
const observer = new IntersectionObserver((entries) => {
for (const entry of entries) {
if (entry.isIntersecting) {
entry.target.classList.add("visible");
observer.unobserve(entry.target);
}
}
}, { threshold: 0.18 });
cards.forEach((card, i) => {
card.style.transitionDelay = `${i * 90}ms`;
observer.observe(card);
});
})();
(() => {
const modal = document.getElementById("homeChatModal");
const openButton = document.getElementById("openChatModal");
const closeButton = document.getElementById("closeHomeChatModal");
if (!modal || !openButton || !closeButton) return;
openButton.addEventListener("click", () => {
modal.showModal();
document.body.classList.add("modal-open");
requestAnimationFrame(() => {
modal.classList.add("modal-pop-in");
});
});
closeButton.addEventListener("click", () => {
modal.close();
});
modal.addEventListener("close", () => {
document.body.classList.remove("modal-open");
});
modal.addEventListener("click", (event) => {
const rect = modal.getBoundingClientRect();
const isBackdrop =
event.clientX < rect.left ||
event.clientX > rect.right ||
event.clientY < rect.top ||
event.clientY > rect.bottom;
if (isBackdrop) modal.close();
});
})();
(() => {
const intro = document.getElementById("siteIntro");
if (!intro) {
  document.body.classList.remove("home-entering");
  return;
}

let introTimer = null;

function finishHomeIntro() {
  clearTimeout(introTimer);
  intro.classList.remove("intro-active");
  intro.classList.add("intro-complete");
  document.body.classList.remove("home-entering");
}

function runHomeIntro() {
  clearTimeout(introTimer);

  // Always reset old/bfcache animation state first.
  document.body.classList.remove("home-entering");
  intro.classList.remove("intro-active", "intro-complete");

  // The page itself stays fully visible; only the logo overlay animates.
  requestAnimationFrame(() => {
    intro.classList.add("intro-active");
  });

  introTimer = setTimeout(finishHomeIntro, 1450);
}

// Hard fail-safe: never allow stale intro state to dim or block the page.
window.setTimeout(() => {
  document.body.classList.remove("home-entering");
  if (intro.classList.contains("intro-active")) finishHomeIntro();
}, 1900);

window.addEventListener("pageshow", runHomeIntro);
window.addEventListener("pagehide", () => {
  document.body.classList.remove("home-entering");
  intro.classList.remove("intro-active");
});
})();


