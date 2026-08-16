(() => {
  const CONSENT_KEY = "anonisko-terms-agreed-v1";
  const AGE_KEY = "anonisko-age18-confirmed-v1";

  const termsCheckbox = document.getElementById("termsCheckbox");
  const age18Checkbox = document.getElementById("age18Checkbox");
  const agreeButton = document.getElementById("agreeButton");

  if (!termsCheckbox || !age18Checkbox || !agreeButton) return;

  function hasConsent() {
    try {
      return localStorage.getItem(CONSENT_KEY) === "yes"
        && localStorage.getItem(AGE_KEY) === "yes";
    } catch {
      return false;
    }
  }

  function syncConsentState() {
    const ready = Boolean(termsCheckbox.checked && age18Checkbox.checked);
    agreeButton.disabled = !ready;
    agreeButton.setAttribute("aria-disabled", String(!ready));
    agreeButton.classList.toggle("is-ready", ready);
  }

  if (hasConsent()) {
    window.location.replace("/home");
    return;
  }

  termsCheckbox.addEventListener("change", syncConsentState);
  age18Checkbox.addEventListener("change", syncConsentState);

  agreeButton.addEventListener("click", (event) => {
    event.preventDefault();

    if (!(termsCheckbox.checked && age18Checkbox.checked)) {
      syncConsentState();
      return;
    }

    agreeButton.disabled = true;
    agreeButton.textContent = "Continuing...";

    try {
      localStorage.setItem(CONSENT_KEY, "yes");
      localStorage.setItem(AGE_KEY, "yes");
    } catch (error) {
      console.warn("Could not store consent:", error);
    }

    document.body.classList.add("consent-leaving");

    window.setTimeout(() => {
      window.location.href = "/home";
    }, 180);
  });

  syncConsentState();
})();