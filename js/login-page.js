(function () {
  document.documentElement.classList.remove("auth-blocked");
  if (window.SatVaultAuth) SatVaultAuth.requireGuest();

  function initLoginForm() {
    var form = document.getElementById("login-form");
    if (!form) return;

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var email = document.getElementById("email").value.trim();
      var password = document.getElementById("password").value;
      var err = document.getElementById("login-error");
      if (!SatVaultAuth.login(email, password)) {
        err.textContent = "Invalid email or password.";
        err.classList.remove("hidden");
        return;
      }
      var params = new URLSearchParams(location.search);
      var next = params.get("next") || "/dashboard.html";
      if (!next.startsWith("/") || next.startsWith("//")) next = "/dashboard.html";
      location.href = next;
    });
  }

  function initPasswordToggle() {
    var input = document.getElementById("password");
    var toggle = document.getElementById("password-toggle");
    if (!input || !toggle) return;

    toggle.addEventListener("click", function () {
      var visible = input.type === "text";
      input.type = visible ? "password" : "text";
      toggle.classList.toggle("is-visible", !visible);
      toggle.setAttribute("aria-pressed", String(!visible));
      toggle.setAttribute("aria-label", visible ? "Show password" : "Hide password");
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      initLoginForm();
      initPasswordToggle();
    });
  } else {
    initLoginForm();
    initPasswordToggle();
  }
})();
