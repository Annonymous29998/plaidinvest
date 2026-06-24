(function () {
  if (!window.SatVaultAuth) {
    window.location.replace("/login.html");
    return;
  }
  SatVaultAuth.requireAuth();
})();
