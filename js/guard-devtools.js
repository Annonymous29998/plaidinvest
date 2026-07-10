(function () {
  var host = (location.hostname || "").toLowerCase();
  var isLive = host === "plaidinvest.online" || host === "www.plaidinvest.online";
  if (!isLive) return;

  function isEditableTarget(target) {
    if (!target || !target.closest) return false;
    return !!target.closest("input, textarea, select, [contenteditable='true']");
  }

  function blockShortcut(e) {
    var key = e.key || "";
    var code = e.keyCode || e.which || 0;
    var ctrl = e.ctrlKey;
    var meta = e.metaKey;
    var shift = e.shiftKey;
    var alt = e.altKey;

    if (key === "F12" || code === 123) {
      e.preventDefault();
      e.stopImmediatePropagation();
      return false;
    }

    if ((ctrl || meta) && shift && /^(I|J|C|K)$/i.test(key)) {
      e.preventDefault();
      e.stopImmediatePropagation();
      return false;
    }

    if (meta && alt && /^(I|J|C|U)$/i.test(key)) {
      e.preventDefault();
      e.stopImmediatePropagation();
      return false;
    }

    if ((ctrl || meta) && !shift && !alt && /^U$/i.test(key)) {
      e.preventDefault();
      e.stopImmediatePropagation();
      return false;
    }

    if ((ctrl || meta) && shift && code === 73) {
      e.preventDefault();
      e.stopImmediatePropagation();
      return false;
    }
  }

  document.addEventListener("keydown", blockShortcut, true);

  document.addEventListener("contextmenu", function (e) {
    if (isEditableTarget(e.target)) return;
    e.preventDefault();
  }, true);
})();
