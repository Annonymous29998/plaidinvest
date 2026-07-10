(function () {
  var TIMEOUT_MS = 20 * 60 * 1000;
  var CHECK_MS = 30000;
  var ACTIVITY_KEY = "sessionLastActivity";

  function touchActivity() {
    try {
      sessionStorage.setItem(ACTIVITY_KEY, String(Date.now()));
    } catch (e) {}
  }

  function getLastActivity() {
    try {
      var stored = Number(sessionStorage.getItem(ACTIVITY_KEY));
      return stored > 0 ? stored : Date.now();
    } catch (e) {
      return Date.now();
    }
  }

  function checkTimeout() {
    if (!window.SatVaultAuth || !SatVaultAuth.isLoggedIn()) return;
    if (Date.now() - getLastActivity() >= TIMEOUT_MS) {
      SatVaultAuth.logout();
    }
  }

  function initSessionTimeout() {
    if (!window.SatVaultAuth || !SatVaultAuth.isLoggedIn()) return;

    if (!sessionStorage.getItem(ACTIVITY_KEY)) touchActivity();
    checkTimeout();

    ["mousedown", "keydown", "touchstart", "scroll", "click"].forEach(function (evt) {
      document.addEventListener(evt, touchActivity, { passive: true });
    });

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) touchActivity();
      else checkTimeout();
    });

    setInterval(checkTimeout, CHECK_MS);
  }

  window.__touchSessionActivity = touchActivity;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initSessionTimeout);
  } else {
    initSessionTimeout();
  }
})();
