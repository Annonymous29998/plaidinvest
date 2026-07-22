window.SatVaultAuth = {
  SESSION_KEY: "authSession",
  STORAGE: window.sessionStorage,

  _readSessionRaw: function () {
    try {
      return this.STORAGE.getItem(this.SESSION_KEY);
    } catch (e) {
      return null;
    }
  },

  _writeSessionRaw: function (value) {
    try {
      if (value == null) this.STORAGE.removeItem(this.SESSION_KEY);
      else this.STORAGE.setItem(this.SESSION_KEY, value);
    } catch (e) {}
    try {
      localStorage.removeItem(this.SESSION_KEY);
    } catch (e2) {}
  },

  migrateLegacySession: function () {
    try {
      if (this._readSessionRaw()) return;
      var legacy = localStorage.getItem(this.SESSION_KEY);
      if (!legacy) return;
      this._writeSessionRaw(legacy);
    } catch (e) {}
  },

  isLoggedIn: function () {
    this.migrateLegacySession();
    try {
      var session = JSON.parse(this._readSessionRaw() || "null");
      return !!(session && session.email && session.token);
    } catch (e) {
      return false;
    }
  },

  getUser: function () {
    this.migrateLegacySession();
    try {
      return JSON.parse(this._readSessionRaw() || "null");
    } catch (e) {
      return null;
    }
  },

  getProfileId: function () {
    var user = this.getUser();
    return (user && user.profileId) || "jerry";
  },

  getActiveProfile: function () {
    if (window.SITE && typeof SITE.getProfileById === "function") {
      return SITE.getProfileById(this.getProfileId());
    }
    return null;
  },

  getDisplayName: function () {
    var profile = this.getActiveProfile();
    if (profile && profile.displayName) return profile.displayName;
    var user = this.getUser();
    if (user && user.name) return user.name;
    if (window.SITE && SITE.displayName) return SITE.displayName;
    return "Jerry McMillan";
  },

  login: function (email, password) {
    if (!email || !password) return false;
    var profile = null;
    if (window.SITE && typeof SITE.findProfile === "function") {
      profile = SITE.findProfile(email, password);
    }
    if (!profile) {
      var creds = (window.SITE && SITE.credentials) || {};
      var expectedEmail = (creds.email || "").trim().toLowerCase();
      var expectedPassword = creds.password || "";
      if (email.trim().toLowerCase() === expectedEmail && password === expectedPassword) {
        profile = (window.SITE && typeof SITE.getProfileById === "function")
          ? SITE.getProfileById("jerry")
          : {
              id: "jerry",
              displayName: (window.SITE && SITE.displayName) || "Jerry McMillan",
              email: expectedEmail
            };
      }
    }
    if (!profile) return false;

    var session = {
      email: (profile.email || email).trim(),
      login: email.trim(),
      name: profile.displayName || "Investor",
      profileId: profile.id || "jerry",
      token: Math.random().toString(36).slice(2) + Date.now().toString(36),
      createdAt: Date.now()
    };
    this._writeSessionRaw(JSON.stringify(session));
    try {
      sessionStorage.setItem("sessionLastActivity", String(Date.now()));
      sessionStorage.setItem("activeProfileId", session.profileId);
    } catch (e) {}
    return this.isLoggedIn();
  },

  logout: function () {
    this._writeSessionRaw(null);
    try {
      sessionStorage.removeItem("sessionLastActivity");
      sessionStorage.removeItem("activeProfileId");
    } catch (e) {}
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
  },

  initLoginPage: function () {
    document.documentElement.classList.remove("auth-blocked");
    this.requireGuest();

    var form = document.getElementById("login-form");
    if (!form) return;

    form.setAttribute("novalidate", "novalidate");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var email = document.getElementById("email").value.trim();
      var password = document.getElementById("password").value;
      var err = document.getElementById("login-error");
      if (!SatVaultAuth.login(email, password)) {
        err.textContent = "Invalid email/username or password.";
        err.classList.remove("hidden");
        return;
      }
      err.classList.add("hidden");
      var params = new URLSearchParams(location.search);
      var next = params.get("next") || "/dashboard.html";
      if (!next.startsWith("/") || next.startsWith("//")) next = "/dashboard.html";
      window.location.replace(next);
    });

    var input = document.getElementById("password");
    var toggle = document.getElementById("password-toggle");
    if (input && toggle) {
      toggle.addEventListener("click", function () {
        var visible = input.type === "text";
        input.type = visible ? "password" : "text";
        toggle.classList.toggle("is-visible", !visible);
        toggle.setAttribute("aria-pressed", String(!visible));
        toggle.setAttribute("aria-label", visible ? "Show password" : "Hide password");
      });
    }
  }
};

document.addEventListener("click", function (e) {
  var btn = e.target.closest("[data-logout]");
  if (!btn || !window.SatVaultAuth) return;
  e.preventDefault();
  SatVaultAuth.logout();
});
