(function () {
  var target = "/dashboard.html";
  if (!window.SatVaultAuth || !SatVaultAuth.isLoggedIn()) {
    location.replace("/login.html?next=" + encodeURIComponent(target));
    return;
  }
  location.replace(target);
})();
