(function () {
  if (window.SatVaultAuth && typeof SatVaultAuth.initLoginPage === "function") {
    SatVaultAuth.initLoginPage();
  }
})();
