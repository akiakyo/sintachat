(() => {
  const sessionUuid = localStorage.getItem("anonisko-session");
  const profile = JSON.parse(localStorage.getItem("anonisko-profile") || "null");

  if (!sessionUuid || !profile) {
    window.location.replace("/");
    return;
  }

  const socket = io({
    auth: { sessionUuid },
    transports: ["websocket", "polling"]
  });

  const title = document.getElementById("findingTitle");
  const heading = document.getElementById("findingPreferenceHeading");
  const text = document.getElementById("findingText");
  const vibeText = document.getElementById("findingVibe");
  const interestsText = document.getElementById("findingInterests");
  const matchReveal = document.getElementById("matchReveal");
  const matchRevealName = document.getElementById("matchRevealName");
  const matchRevealMeta = document.getElementById("matchRevealMeta");
  const introLayer = document.getElementById("findingIntroLayer");
  const introTitle = document.getElementById("findingIntroTitle");
  const cancelButton = document.getElementById("cancelFindButton");

  let searchStarted = false;
  let redirecting = false;

  function normalizePreference() {
    const stored = String(
      profile.preference ||
      localStorage.getItem("anonisko-match-preference") ||
      "anyone"
    ).toLowerCase();

    if (stored === "male") return "male";
    if (stored === "female") return "female";
    return "anyone";
  }

  const preference = normalizePreference();

  const labels = {
    male: {
      heading: "Finding an Isko...",
      phrase: "looking for an Isko..."
    },
    female: {
      heading: "Finding an Iska...",
      phrase: "looking for an Iska..."
    },
    anyone: {
      heading: "Finding an Iska or Isko...",
      phrase: "looking for an Iska or Isko..."
    }
  };

  const currentLabel = labels[preference];

  // Keep local storage canonical for refreshes/back-forward navigation.
  localStorage.setItem("anonisko-match-preference", preference);

  if (heading) heading.textContent = currentLabel.heading;
  if (introTitle) introTitle.textContent = currentLabel.heading;

  requestAnimationFrame(() => {
    document.body.classList.add("finding-intro-active");
  });

  setTimeout(() => {
    introLayer?.classList.add("finding-intro-complete");
    document.body.classList.remove("finding-entering");
  }, 1200);

  const searchPhrases = [
    "checking who is around...",
    currentLabel.phrase,
    "matching your vibe and interests...",
    "still looking. the right chat might take a second..."
  ];

  let phraseIndex = 0;

  if (text) text.textContent = searchPhrases[0];

  const phraseTimer = setInterval(() => {
    if (!text) return;

    phraseIndex = (phraseIndex + 1) % searchPhrases.length;
    text.classList.remove("phrase-in");

    requestAnimationFrame(() => {
      text.textContent = searchPhrases[phraseIndex];
      text.classList.add("phrase-in");
    });
  }, 3800);

  if (vibeText) {
    vibeText.textContent = profile.vibe ? `vibe: ${profile.vibe}` : "";
  }

  if (interestsText) {
    interestsText.textContent = profile.interests?.length
      ? `interests: ${profile.interests.join(", ")}`
      : "";
  }

  socket.on("connect", () => {
    if (searchStarted) return;
    searchStarted = true;

    socket.emit("set-profile", profile, (profileResult) => {
      if (!profileResult?.ok) {
        searchStarted = false;
        window.location.replace("/");
        return;
      }

      socket.emit("find-match", (result) => {
        if (!result?.ok) {
          searchStarted = false;
          if (text) {
            text.textContent =
              result?.error || "Could not start matchmaking.";
          }
        }
      });
    });
  });

  socket.on("matched", ({ partner }) => {
    if (redirecting) return;

    redirecting = true;
    searchStarted = false;

    sessionStorage.setItem(
      "anonisko-pending-match",
      JSON.stringify({
        partner,
        matchedAt: Date.now()
      })
    );

    clearInterval(phraseTimer);
    document.body.classList.add("match-found");

    // Once actually matched, replacing the full heading is intentional.
    if (title) title.textContent = "found someone.";
    if (text) text.textContent = "opening your conversation...";

    if (matchRevealName) matchRevealName.textContent = partner.nickname;
    if (matchRevealMeta) {
      matchRevealMeta.textContent = [
        partner.vibe,
        ...(partner.interests || []).slice(0, 2)
      ].filter(Boolean).join(" · ");
    }

    matchReveal?.classList.remove("hidden");

    if (navigator.vibrate) {
      navigator.vibrate([18, 35, 18]);
    }

    setTimeout(() => {
      window.location.replace("/conversation");
    }, 1450);
  });

  cancelButton?.addEventListener("click", () => {
    cancelButton.disabled = true;
    searchStarted = true;

    document.body.classList.add("finding-canceling");
    socket.emit("cancel-search");

    setTimeout(() => {
      clearInterval(phraseTimer);
      socket.disconnect();
      window.location.href = "/home";
    }, 650);
  });
})();
