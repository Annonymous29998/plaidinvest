(function () {
  if (!document.body.classList.contains("dash-app")) return;

  var ICONS = {
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5z"/></svg>',
    deposit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/></svg>',
    bolt: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z"/></svg>',
    history: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 3 6.7"/><path d="M3 12h4M3 12l2.5-2.5"/><path d="M12 7v5l3 2"/></svg>',
    profile: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="8" r="4"/></svg>',
    chat: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3C7.03 3 3 6.58 3 11c0 2.02.9 3.86 2.38 5.24L4 21l4.93-1.64A9.8 9.8 0 0 0 12 19c4.97 0 9-3.58 9-8s-4.03-8-9-8z"/></svg>'
  };

  function currentTab() {
    var path = location.pathname.replace(/\/$/, "");
    if (path === "/dashboard" || path === "/dashboard.html" || path === "/dashboard/index.html") return "home";
    if (path.indexOf("/dashboard/deposits") !== -1) return "deposit";
    if (path.indexOf("/dashboard/accounthistory") !== -1) return "history";
    if (path.indexOf("/dashboard/withdrawals") !== -1 || path.indexOf("/dashboard/plans") !== -1) return "actions";
    return "";
  }

  function setActiveTab() {
    var tab = currentTab();
    document.querySelectorAll(".dash-bottom-nav [data-tab]").forEach(function (el) {
      var isActive = el.getAttribute("data-tab") === tab;
      el.classList.toggle("is-active", isActive);
    });
    var fabWrap = document.querySelector(".dash-tab-fab-wrap");
    if (fabWrap) fabWrap.classList.toggle("is-active", tab === "actions");
  }

  function closeProfileMenu() {
    var menu = document.getElementById("dash-profile-menu");
    if (menu) menu.classList.add("hidden");
    document.body.classList.remove("dash-profile-menu-open");
    var headerBtn = document.getElementById("dash-profile-btn");
    if (headerBtn) headerBtn.setAttribute("aria-expanded", "false");
  }

  function closeSheets() {
    document.querySelectorAll(".dash-sheet").forEach(function (el) {
      el.classList.add("hidden");
    });
    document.body.classList.remove("dash-sheet-open");
    closeProfileMenu();
  }

  function openSheet(id) {
    closeProfileMenu();
    document.querySelectorAll(".dash-sheet").forEach(function (el) {
      el.classList.add("hidden");
    });
    document.body.classList.remove("dash-sheet-open");
    var sheet = document.getElementById(id);
    if (!sheet) return;
    sheet.classList.remove("hidden");
    document.body.classList.add("dash-sheet-open");
  }

  function toggleProfileMenu(anchor) {
    var menu = document.getElementById("dash-profile-menu");
    if (!menu) return;
    var wasOpen = !menu.classList.contains("hidden") && menu.dataset.anchor === anchor;

    document.querySelectorAll(".dash-sheet").forEach(function (el) {
      el.classList.add("hidden");
    });
    document.body.classList.remove("dash-sheet-open");

    if (wasOpen) {
      closeProfileMenu();
      return;
    }

    menu.dataset.anchor = anchor || "header";
    menu.classList.remove("hidden");
    document.body.classList.add("dash-profile-menu-open");
    var headerBtn = document.getElementById("dash-profile-btn");
    if (headerBtn) headerBtn.setAttribute("aria-expanded", anchor === "header" ? "true" : "false");
  }

  function injectProfileMenu() {
    if (document.getElementById("dash-profile-menu")) return;

    var menu = document.createElement("div");
    menu.id = "dash-profile-menu";
    menu.className = "dash-profile-menu hidden";
    menu.setAttribute("role", "menu");
    menu.innerHTML =
      '<div class="dash-profile-menu__user">' +
        '<span class="dash-profile-menu__avatar" data-user-initials>JM</span>' +
        '<div class="dash-profile-menu__meta">' +
          '<strong class="dash-profile-menu__name" data-user-name>Jerry McMillan</strong>' +
          '<span class="dash-profile-menu__email" data-user-email>—</span>' +
        "</div>" +
      "</div>" +
      '<button type="button" class="dash-profile-menu__item" role="menuitem" data-profile-open>' +
        ICONS.profile + "<span>Profile</span></button>" +
      '<a href="/dashboard/accounthistory.html" class="dash-profile-menu__item" role="menuitem">' +
        ICONS.history + "<span>History</span></a>" +
      '<button type="button" class="dash-profile-menu__item dash-profile-menu__item--danger" role="menuitem" data-profile-logout>' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>' +
        "<span>Log out</span></button>";

    document.body.appendChild(menu);

    menu.querySelector("[data-profile-open]").addEventListener("click", function () {
      closeProfileMenu();
      openSheet("dash-profile-sheet");
    });

    menu.querySelector("[data-profile-logout]").addEventListener("click", function () {
      closeProfileMenu();
      SatVaultAuth.logout();
    });
  }

  function injectBottomNav() {
    if (document.getElementById("dash-bottom-nav")) return;

    var nav = document.createElement("nav");
    nav.id = "dash-bottom-nav";
    nav.className = "dash-bottom-nav";
    nav.setAttribute("aria-label", "Dashboard navigation");
    nav.innerHTML =
      '<a href="/dashboard.html" class="dash-tab" data-tab="home">' + ICONS.home + "<span>Home</span></a>" +
      '<a href="/dashboard/deposits.html" class="dash-tab" data-tab="deposit">' + ICONS.deposit + "<span>Deposit</span></a>" +
      '<div class="dash-tab-fab-wrap">' +
        '<button type="button" class="dash-tab-fab" id="dash-actions-btn" data-tab="actions" aria-label="Quick actions">' + ICONS.bolt + "</button>" +
        "<span>Actions</span>" +
      "</div>" +
      '<a href="/dashboard/accounthistory.html" class="dash-tab" data-tab="history">' + ICONS.history + "<span>History</span></a>" +
      '<button type="button" class="dash-tab dash-tab--profile" data-tab="profile" id="dash-profile-tab">' +
        '<span class="dash-tab-profile-icon">' + ICONS.chat + "</span><span>Profile</span></button>";

    document.body.appendChild(nav);

    document.getElementById("dash-actions-btn").addEventListener("click", function () {
      openSheet("dash-actions-sheet");
    });

    var profileTab = document.getElementById("dash-profile-tab");
    profileTab.addEventListener("click", function () {
      toggleProfileMenu("bottom");
    });

    var headerProfile = document.getElementById("dash-profile-btn");
    if (headerProfile) {
      headerProfile.setAttribute("aria-haspopup", "true");
      headerProfile.setAttribute("aria-expanded", "false");
      headerProfile.addEventListener("click", function (e) {
        e.stopPropagation();
        toggleProfileMenu("header");
      });
    }
  }

  function injectSheets() {
    if (document.getElementById("dash-actions-sheet")) return;

    var wrap = document.createElement("div");
    wrap.innerHTML =
      '<div id="dash-actions-sheet" class="dash-sheet hidden" role="dialog" aria-modal="true" aria-labelledby="dash-actions-title">' +
        '<div class="dash-sheet-backdrop" data-sheet-close></div>' +
        '<div class="dash-sheet-panel">' +
          '<h2 id="dash-actions-title" class="dash-sheet-title">Quick Actions</h2>' +
          '<div class="dash-sheet-links">' +
            '<a href="/dashboard/plans.html" class="dash-sheet-link"><span>⚡</span> View Investment Plans</a>' +
            '<a href="/dashboard/deposits.html" class="dash-sheet-link"><span>↓</span> Deposit Funds</a>' +
            '<a href="/dashboard/withdrawals.html" class="dash-sheet-link"><span>↑</span> Withdraw Funds</a>' +
            '<a href="/dashboard/accounthistory.html" class="dash-sheet-link"><span>◷</span> Transaction History</a>' +
          "</div>" +
          '<button type="button" class="dash-sheet-cancel" data-sheet-close>Cancel</button>' +
        "</div>" +
      "</div>" +
      '<div id="dash-profile-sheet" class="dash-sheet hidden" role="dialog" aria-modal="true" aria-labelledby="dash-profile-title">' +
        '<div class="dash-sheet-backdrop" data-sheet-close></div>' +
        '<div class="dash-sheet-panel">' +
          '<div class="dash-profile-card">' +
            '<div class="dash-profile-avatar-lg" data-user-initials>Je</div>' +
            '<h2 id="dash-profile-title" class="dash-profile-name" data-user-name>Jerry McMillan</h2>' +
            '<p class="dash-profile-email" data-user-email>—</p>' +
          "</div>" +
          '<button type="button" class="dash-sheet-link dash-sheet-link--danger" onclick="SatVaultAuth.logout()">Log out</button>' +
          '<button type="button" class="dash-sheet-cancel" data-sheet-close>Close</button>' +
        "</div>" +
      "</div>";

    document.body.appendChild(wrap.firstElementChild);
    document.body.appendChild(wrap.lastElementChild);

    document.querySelectorAll("[data-sheet-close]").forEach(function (el) {
      el.addEventListener("click", closeSheets);
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeSheets();
    });

    document.addEventListener("click", function (e) {
      var menu = document.getElementById("dash-profile-menu");
      if (!menu || menu.classList.contains("hidden")) return;
      if (menu.contains(e.target)) return;
      if (e.target.closest("#dash-profile-btn") || e.target.closest("#dash-profile-tab")) return;
      closeProfileMenu();
    });
  }

  function setUserMeta() {
    var name = window.SatVaultAuth ? SatVaultAuth.getDisplayName() : "Jerry McMillan";
    var initials = name.split(/\s+/).map(function (p) { return p[0]; }).join("").slice(0, 2).toUpperCase();

    document.querySelectorAll("[data-user-name]").forEach(function (el) {
      el.textContent = name;
    });
    document.querySelectorAll("[data-user-initials]").forEach(function (el) {
      el.textContent = initials;
    });

    var user = window.SatVaultAuth && SatVaultAuth.getUser();
    document.querySelectorAll("[data-user-email]").forEach(function (el) {
      el.textContent = (user && user.email) || "—";
    });
  }

  function initBalanceToggle() {
    var btn = document.getElementById("balance-hide-btn");
    if (!btn) return;
    var hidden = false;

    btn.addEventListener("click", function () {
      hidden = !hidden;
      document.body.classList.toggle("balance-hidden", hidden);
      btn.setAttribute("aria-pressed", hidden ? "true" : "false");
    });
  }

  function updateLastUpdated() {
    var el = document.getElementById("dash-last-updated");
    if (!el) return;
    var now = new Date();
    el.textContent = now.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
  }

  function renderMobileStats() {
    if (typeof renderDashboardStats === "function") {
      renderDashboardStats();
    }
  }

  function setDashboardDate() {
    var el = document.getElementById("dash-date");
    if (!el) return;
    el.textContent = new Date().toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric"
    });
  }

  injectProfileMenu();
  injectBottomNav();
  injectSheets();
  setActiveTab();
  setUserMeta();
  initBalanceToggle();
  setDashboardDate();
  updateLastUpdated();
  renderMobileStats();

  document.addEventListener("transactionsUpdated", renderMobileStats);
  window.refreshDashMobile = function () {
    updateLastUpdated();
    renderMobileStats();
  };

  if (window.BtcPrice) {
    var prevOnLive = BtcPrice.onLivePrice;
    BtcPrice.onLivePrice = function (price, prev) {
      if (typeof prevOnLive === "function") prevOnLive(price, prev);
      updateLastUpdated();
      renderMobileStats();
    };
  }
})();
