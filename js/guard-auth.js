(function () {
  document.documentElement.classList.add("auth-blocked");

  function goLogin() {
    var next = encodeURIComponent(location.pathname + location.search);
    window.location.replace("/login.html?next=" + next);
  }

  if (!window.SatVaultAuth) {
    goLogin();
    return;
  }

  if (!SatVaultAuth.isLoggedIn()) {
    goLogin();
    return;
  }

  document.documentElement.classList.remove("auth-blocked");
})();
