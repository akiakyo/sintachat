(() => {
  const storageKey = "anonisko-session";
  const profileKey = "anonisko-profile";

  function uuid() {
    if (crypto.randomUUID) return crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
      const random = Math.random() * 16 | 0;
      const value = char === "x" ? random : (random & 0x3 | 0x8);
      return value.toString(16);
    });
  }

  const sessionUuid = localStorage.getItem(storageKey) || uuid();
  localStorage.setItem(storageKey, sessionUuid);

  const socket = io({ auth: { sessionUuid }, transports: ["websocket", "polling"] });

  const form = document.getElementById("homeMatchForm");
  if (!form) return;

  const nicknameInput = document.getElementById("nickname");
  const campusSelect = document.getElementById("campus");
  const vibeOptions = document.getElementById("vibeOptions");
  const interestOptions = document.getElementById("interestOptions");
  const aboutMe = document.getElementById("aboutMe");
  const aboutMeCount = document.getElementById("aboutMeCount");
  const formMessage = document.getElementById("formMessage");
  const preferenceButtons = [...document.querySelectorAll("[data-preference]")];
  const preferenceText = document.getElementById("matchPreferenceText");
  const findButton = document.getElementById("findSomeoneButton");

  const campusStage = document.getElementById("campusStage");
  const vibeStage = document.getElementById("vibeStage");
  const interestsStage = document.getElementById("interestsStage");
  const aboutStage = document.getElementById("aboutStage");

  let config = null;
  let selectedVibe = "";
  let selectedPreference = "";
  const selectedInterests = new Set();

  function revealStage(element) {
    if (!element || !element.classList.contains("is-hidden-stage")) return;
    element.classList.remove("is-hidden-stage");
    element.classList.add("is-revealing-stage");
    requestAnimationFrame(() => {
      element.classList.add("is-visible-stage");
    });
    setTimeout(() => element.classList.remove("is-revealing-stage"), 420);
  }

  function updatePreferenceText() {
    if (!preferenceText) return;

    if (selectedPreference === "male") {
      preferenceText.textContent = "Finding an Isko...";
    } else if (selectedPreference === "female") {
      preferenceText.textContent = "Finding an Iska...";
    } else if (selectedPreference === "anyone") {
      preferenceText.textContent = "Finding an Iska or Isko...";
    } else {
      preferenceText.textContent = "Choose who you want to match with.";
    }
  }

  function setPreference(value) {
    selectedPreference = value;

    preferenceButtons.forEach((button) => {
      const active = button.dataset.preference === value;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });

    updatePreferenceText();

    if (value) {
      revealStage(campusStage);
      setTimeout(() => campusSelect?.focus({ preventScroll: true }), 220);
    }
  }

  preferenceButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setPreference(button.dataset.preference || "anyone");
    });
  });

  function syncVibes() {
    vibeOptions.querySelectorAll(".vibe-chip").forEach((item) => {
      item.setAttribute("aria-pressed", String(item.dataset.value === selectedVibe));
    });
  }

  function renderVibes(vibes) {
    vibeOptions.replaceChildren();

    for (const vibe of vibes) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "option-chip vibe-chip";
      button.textContent = vibe;
      button.dataset.value = vibe;

      button.addEventListener("click", () => {
        selectedVibe = vibe;
        syncVibes();
        revealStage(interestsStage);
      });

      vibeOptions.appendChild(button);
    }

    syncVibes();
  }

  function renderInterests(interests) {
    interestOptions.replaceChildren();

    for (const interest of interests) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "option-chip interest-chip";
      button.textContent = interest;
      button.dataset.value = interest;

      const sync = () => {
        button.setAttribute("aria-pressed", String(selectedInterests.has(interest)));
      };

      button.addEventListener("click", () => {
        if (selectedInterests.has(interest)) {
          selectedInterests.delete(interest);
        } else {
          if (selectedInterests.size >= (config?.maxInterests || 3)) {
            formMessage.textContent = `Choose up to ${config?.maxInterests || 3} interests.`;
            return;
          }

          selectedInterests.add(interest);
        }

        formMessage.textContent = "";
        sync();

        // About Me opens after the first interaction with Interests.
        revealStage(aboutStage);
        revealStage(findButton);
      });

      sync();
      interestOptions.appendChild(button);
    }
  }

  campusSelect?.addEventListener("change", () => {
    if (campusSelect.value) {
      revealStage(vibeStage);
    }
  });

  aboutMe?.addEventListener("input", () => {
    if (aboutMeCount) aboutMeCount.textContent = String(aboutMe.value.length);
    revealStage(findButton);
  });

  async function loadConfig() {
    const response = await fetch("/api/config", { credentials: "same-origin" });
    if (!response.ok) throw new Error("config");

    config = await response.json();

    campusSelect.replaceChildren(new Option("Select your campus", ""));

    const campusList = [...(config.campuses || [])];
    const specialCampus = 'Other school / Rather not say';

    campusList.sort((a, b) => {
      if (a === specialCampus) return -1;
      if (b === specialCampus) return 1;
      return String(a).localeCompare(String(b));
    });

    for (const campus of campusList) {
      campusSelect.appendChild(new Option(campus, campus));
    }

    renderVibes(config.vibes || []);
    renderInterests(config.interests || []);

    const saved = JSON.parse(localStorage.getItem(profileKey) || "null");

    if (saved) {
      nicknameInput.value = saved.nickname || "";
      campusSelect.value = saved.campus || "";
      selectedVibe = config.vibes?.includes(saved.vibe) ? saved.vibe : "";
      selectedPreference = ["male", "female", "anyone"].includes(saved.preference)
        ? saved.preference
        : "";

      selectedInterests.clear();
      for (const interest of saved.interests || []) {
        if (config.interests?.includes(interest)) selectedInterests.add(interest);
      }

      aboutMe.value = saved.aboutMe || "";
      aboutMeCount.textContent = String(aboutMe.value.length);

      renderVibes(config.vibes || []);
      renderInterests(config.interests || []);

      if (selectedPreference) {
        setPreference(selectedPreference);
        revealStage(campusStage);
      }

      if (campusSelect.value) revealStage(vibeStage);
      if (selectedVibe) revealStage(interestsStage);
      if (selectedInterests.size || aboutMe.value) {
        revealStage(aboutStage);
        revealStage(findButton);
      }
    }
  }

  function validateForm() {
    const nickname = nicknameInput.value.trim();

    if (nickname.length < 3 || nickname.length > 24) {
      formMessage.textContent = "Nickname must be 3 to 24 characters.";
      nicknameInput.focus();
      return false;
    }

    if (!selectedPreference) {
      formMessage.textContent = "Choose Male, Female, or Any.";
      return false;
    }

    if (!campusSelect.value) {
      formMessage.textContent = "Choose your university or campus.";
      campusSelect.focus();
      return false;
    }

    if (!selectedVibe) {
      formMessage.textContent = "Choose a conversation vibe.";
      return false;
    }

    return true;
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    formMessage.textContent = "";

    if (!validateForm()) return;

    // The Home flow intentionally asks only who the user wants to match with.
    // The backend still requires a valid profile gender value, so use a neutral
    // compatibility value accepted by the current server profile validator.
    const profile = {
      nickname: nicknameInput.value.trim(),
      aboutMe: aboutMe.value.trim().slice(0, 120),
      gender: "male",
      campus: campusSelect.value,
      preference: selectedPreference,
      vibe: selectedVibe,
      interests: [...selectedInterests]
    };

    findButton.disabled = true;
    findButton.textContent =
      selectedPreference === "male"
        ? "Finding an Isko..."
        : selectedPreference === "female"
          ? "Finding an Iska..."
          : "Finding an Iska or Isko...";

    socket.emit("set-profile", profile, (result) => {
      if (!result?.ok) {
        formMessage.textContent =
          result?.error === "Please complete your profile correctly."
            ? "Please check your nickname, campus, and conversation vibe."
            : (result?.error || "Could not save your anonymous profile.");

        findButton.disabled = false;
        findButton.textContent = "Find someone";
        return;
      }

      localStorage.setItem(profileKey, JSON.stringify(profile));
      localStorage.setItem(
        "anonisko-match-preference",
        selectedPreference === "male"
          ? "male"
          : selectedPreference === "female"
            ? "female"
            : "anyone"
      );

      window.location.href = "/finding";
    });
  });

  updatePreferenceText();

  loadConfig().catch(() => {
    formMessage.textContent = "Could not load the matching options.";
  });
})();