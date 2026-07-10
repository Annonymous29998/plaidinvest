window.SatVaultAuth = {
  SESSION_KEY: "authSession",

  isLoggedIn: function () {
    try {
      var session = JSON.parse(localStorage.getItem(this.SESSION_KEY) || "null");
      return !!(session && session.email && session.token);
    } catch (e) {
      return false;
    }
  },

  getUser: function () {
    try {
      return JSON.parse(localStorage.getItem(this.SESSION_KEY) || "null");
    } catch (e) {
      return null;
    }
  },

  getDisplayName: function () {
    if (window.SITE && SITE.displayName) return SITE.displayName;
    if (window.SITE && SITE.name) return SITE.name;
    var user = this.getUser();
    if (user && user.name) return user.name;
    return "Jerry McMillan";
  },

  login: function (email, password) {
    if (!email || !password) return false;
    var creds = (window.SITE && SITE.credentials) || {};
    var expectedEmail = (creds.email || "").trim().toLowerCase();
    var expectedPassword = creds.password || "";
    if (email.trim().toLowerCase() !== expectedEmail || password !== expectedPassword) {
      return false;
    }
    var displayName = (window.SITE && SITE.displayName) || (window.SITE && SITE.name) || "Jerry McMillan";
    var session = {
      email: email.trim(),
      name: displayName,
      token: Math.random().toString(36).slice(2) + Date.now().toString(36),
      createdAt: Date.now()
    };
    var write = window.__runSecureWrite || function (fn) { fn(); };
    write(function () {
      localStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
      localStorage.removeItem("loggedIn");
      localStorage.removeItem("user");
    }.bind(this));
    return true;
  },

  logout: function () {
    var write = window.__runSecureWrite || function (fn) { fn(); };
    write(function () {
      localStorage.removeItem(this.SESSION_KEY);
      localStorage.removeItem("loggedIn");
      localStorage.removeItem("user");
    }.bind(this));
    document.documentElement.classList.remove("auth-blocked");
    document.body.classList.remove("nav-open", "drawer-open");
    window.location.replace("/login.html");
  },

  requireAuth: function () {
    if (this.isLoggedIn()) return true;
    var next = encodeURIComponent(location.pathname + location.search);
    window.location.replace("/login.html?next=" + next);
    return false;
  },

  requireGuest: function () {
    if (!this.isLoggedIn()) return;
    var params = new URLSearchParams(location.search);
    var next = params.get("next") || "/dashboard.html";
    if (!next.startsWith("/") || next.startsWith("//")) next = "/dashboard.html";
    window.location.replace(next);
  },

  applyPublicNav: function () {
    var loggedIn = this.isLoggedIn();
    document.querySelectorAll("[data-auth-guest]").forEach(function (el) {
      el.classList.toggle("hidden", loggedIn);
    });
    document.querySelectorAll("[data-auth-user]").forEach(function (el) {
      el.classList.toggle("hidden", !loggedIn);
    });
    document.querySelectorAll("[data-auth-href]").forEach(function (el) {
      var loggedInHref = el.getAttribute("data-href-logged-in");
      var guestHref = el.getAttribute("data-href-guest") || el.getAttribute("href");
      el.setAttribute("href", loggedIn && loggedInHref ? loggedInHref : guestHref);
    });
  }
};
