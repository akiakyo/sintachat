(() => {
const storageKey = "anonisko-theme";
const root = document.documentElement;
const toggle = document.querySelector("[data-theme-toggle]");

const icons = {
  light: `
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="1.8"/>
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4"
        stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    </svg>`,
  dark: `
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path d="M20 15.2A8 8 0 0 1 8.8 4 8 8 0 1 0 20 15.2Z"
        stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`
};

function getPreferredTheme() {
  const saved = localStorage.getItem(storageKey);
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function updateToggle(theme) {
  if (!toggle) return;
  toggle.innerHTML = icons[theme];
  toggle.setAttribute("aria-label", theme === "light" ? "Switch to dark mode" : "Switch to light mode");
  toggle.setAttribute("title", theme === "light" ? "Dark mode" : "Light mode");
}

function applyTheme(theme, animate = false) {
  if (animate) {
    root.classList.add("theme-transitioning");
  }

  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  updateToggle(theme);

  if (animate) {
    window.setTimeout(() => {
      root.classList.remove("theme-transitioning");
    }, 420);
  }
}

applyTheme(getPreferredTheme(), false);

toggle?.addEventListener("click", () => {
  const next = root.dataset.theme === "dark" ? "light" : "dark";
  localStorage.setItem(storageKey, next);
  applyTheme(next, true);
});

window.matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", (event) => {
  if (localStorage.getItem(storageKey)) return;
  applyTheme(event.matches ? "dark" : "light", true);
});
})();