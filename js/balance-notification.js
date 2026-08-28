(function () {
  if (!document.body.classList.contains("dash-app")) return;

  function getProfile() {
    return window.SatVaultAuth && SatVaultAuth.getActiveProfile
      ? SatVaultAuth.getActiveProfile()
      : null;
  }

  function getNotificationConfig() {
    var profile = getProfile();
    return profile && profile.balanceNotification ? profile.balanceNotification : null;
  }

  function readKey(notifyId) {
    var profileId = window.SatVaultAuth && SatVaultAuth.getProfileId
      ? SatVaultAuth.getProfileId()
      : "jerry";
    return "acct:" + profileId + ":notifyRead:" + notifyId;
  }

  function isRead(notifyId) {
    try {
      return localStorage.getItem(readKey(notifyId)) === "1";
    } catch (e) {
      return false;
    }
  }

  function markRead(notifyId) {
    try {
      localStorage.setItem(readKey(notifyId), "1");
    } catch (e) {}
  }

  function formatBalance() {
    var profile = getProfile();
    var usd = typeof getPortfolioUsd === "function"
      ? getPortfolioUsd()
      : (profile && profile.balanceUsd) || (window.SITE && SITE.balanceUsd) || 0;
    if (profile && profile.currency === "USDT") {
      return Number(usd).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " USDT";
    }
    return "$" + Number(usd).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function formatAdded(amount) {
    return "$" + Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function closePanel() {
    var panel = document.getElementById("dash-notify-panel");
    var btn = document.getElementById("dash-notify-btn");
    if (panel) panel.classList.add("hidden");
    if (btn) btn.setAttribute("aria-expanded", "false");
    document.body.classList.remove("dash-notify-open");
  }

  function openPanel() {
    var cfg = getNotificationConfig();
    if (!cfg) return;
    var panel = document.getElementById("dash-notify-panel");
    var btn = document.getElementById("dash-notify-btn");
    if (!panel || !btn) return;

    var amountEl = document.getElementById("dash-notify-amount");
    var balanceEl = document.getElementById("dash-notify-balance");
    if (amountEl) amountEl.textContent = formatAdded(cfg.amountUsd);
    if (balanceEl) balanceEl.textContent = formatBalance();

    panel.classList.remove("hidden");
    btn.setAttribute("aria-expanded", "true");
    document.body.classList.add("dash-notify-open");
  }

  function hideBadge() {
    var badge = document.querySelector(".dash-notify-badge");
    if (badge) badge.classList.add("hidden");
  }

  function dismissNotification() {
    var cfg = getNotificationConfig();
    if (cfg && cfg.id) markRead(cfg.id);
    hideBadge();
    closePanel();
  }

  function injectNotification() {
    var cfg = getNotificationConfig();
    if (!cfg || !cfg.id || !cfg.amountUsd) return;
    if (document.getElementById("dash-notify-btn")) return;

    var actions = document.querySelector(".dash-header-actions");
    if (!actions) return;

    actions.classList.add("dash-header-actions--notify");

    var wrap = document.createElement("div");
    wrap.className = "dash-notify-wrap";
    wrap.innerHTML =
      '<button type="button" id="dash-notify-btn" class="dash-notify-btn" aria-label="Notifications" aria-expanded="false" aria-haspopup="true">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
          '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/>' +
          '<path d="M13.73 21a2 2 0 0 1-3.46 0"/>' +
        "</svg>" +
        '<span class="dash-notify-badge' + (isRead(cfg.id) ? " hidden" : "") + '">1</span>' +
      "</button>" +
      '<div id="dash-notify-panel" class="dash-notify-panel hidden" role="dialog" aria-labelledby="dash-notify-title">' +
        '<p class="dash-notify-panel__eyebrow">Balance update</p>' +
        '<h3 id="dash-notify-title" class="dash-notify-panel__title">Your balance has been increased</h3>' +
        '<p class="dash-notify-panel__body">' +
          '<strong id="dash-notify-amount"></strong> has been added to your account. Your wallet balance has been increased.' +
        "</p>" +
        '<p class="dash-notify-panel__balance-label">Your wallet balance is now</p>' +
        '<p id="dash-notify-balance" class="dash-notify-panel__balance"></p>' +
        '<button type="button" id="dash-notify-dismiss" class="btn-primary w-full mt-4">Dismiss</button>' +
      "</div>";

    actions.insertBefore(wrap, actions.firstChild);

    document.getElementById("dash-notify-btn").addEventListener("click", function (e) {
      e.stopPropagation();
      var panel = document.getElementById("dash-notify-panel");
      if (panel && panel.classList.contains("hidden")) openPanel();
      else closePanel();
    });

    document.getElementById("dash-notify-dismiss").addEventListener("click", dismissNotification);
  }

  function init() {
    injectNotification();

    document.addEventListener("click", function (e) {
      if (!document.body.classList.contains("dash-notify-open")) return;
      if (e.target.closest(".dash-notify-wrap")) return;
      closePanel();
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closePanel();
    });

    document.addEventListener("transactionsUpdated", function () {
      var balanceEl = document.getElementById("dash-notify-balance");
      if (balanceEl) balanceEl.textContent = formatBalance();
    });
  }

  if (window.AccountSync && typeof AccountSync.whenReady === "function") {
    AccountSync.whenReady(init);
  } else {
    init();
  }
})();
