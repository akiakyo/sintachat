(() => {
  const CONSENT_KEY = "anonisko-terms-agreed-v1";
  const AGE_KEY = "anonisko-age18-confirmed-v1";

  function accepted() {
    try {
      return localStorage.getItem(CONSENT_KEY) === "yes"
        && localStorage.getItem(AGE_KEY) === "yes";
    } catch {
      return false;
    }
  }

  if (!accepted() && location.pathname !== "/consent") {
    location.replace("/consent");
  }
})();