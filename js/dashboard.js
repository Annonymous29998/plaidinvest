(function () {
  var btn = document.getElementById("dash-menu-btn");
  var nav = document.getElementById("dash-mobile-nav");
  if (!btn || !nav) return;

  function setOpen(open) {
    nav.classList.toggle("open", open);
    btn.setAttribute("aria-expanded", open ? "true" : "false");
    document.body.classList.toggle("nav-open", open);
  }

  btn.addEventListener("click", function () {
    setOpen(!nav.classList.contains("open"));
  });

  nav.querySelectorAll("a, button").forEach(function (el) {
    el.addEventListener("click", function () { setOpen(false); });
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") setOpen(false);
  });

  window.addEventListener("resize", function () {
    if (window.innerWidth >= 900) setOpen(false);
  });
})();
