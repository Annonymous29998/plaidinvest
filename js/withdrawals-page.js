(function () {
  if (typeof fillWalletFields === "function") fillWalletFields();

  if (typeof isWithdrawalsBlocked === "function" && isWithdrawalsBlocked()) {
    var withdrawForm = document.getElementById("withdraw-form");
    if (withdrawForm) withdrawForm.classList.add("hidden");
  }

  function formatAvailable(usd) {
    return "$" + Number(usd).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function refreshWithdrawAvailable() {
    var available = typeof getAvailableBalance === "function"
      ? getAvailableBalance()
      : (Number(localStorage.getItem("balanceUsdBook")) || SITE.balanceUsd || 15500);
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
      : (Number(localStorage.getItem("balanceUsdBook")) || SITE.balanceUsd || 15500);

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

    WalletModal.showWithdrawFee(amount, function () {
      if (!validateWithdrawAmount(amount)) return;

      var completesAt = Date.now() + (10 + Math.random() * 10) * 60 * 1000;
      var txs = JSON.parse(localStorage.getItem("transactions") || "[]");
      txs.unshift({
        date: new Date().toLocaleDateString(),
        createdAt: Date.now(),
        completesAt: completesAt,
        amountUsd: amount,
        type: "Withdrawal",
        asset: "BTC",
        amount: "-$" + amount.toLocaleString(),
        status: "Pending"
      });
      var write = window.__runSecureWrite || function (fn) { fn(); };
      write(function () {
        localStorage.setItem("transactions", JSON.stringify(txs));
      });
      refreshWithdrawAvailable();
      ok.textContent = "Withdrawal submitted. Status: Pending — your balance will update after fee verification.";
      ok.classList.remove("hidden");
      form.reset();
      setTimeout(function () { location.href = "/dashboard/accounthistory.html"; }, 2000);
    });
  });
})();
