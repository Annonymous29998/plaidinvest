(function () {
  if (typeof fillWalletFields === "function") fillWalletFields();
  if (typeof initWalletCopyButtons === "function") initWalletCopyButtons();

  if (typeof isDepositsBlocked === "function" && isDepositsBlocked()) {
    var depositForm = document.getElementById("deposit-form");
    if (depositForm) depositForm.classList.add("hidden");
    if (typeof showDepositBlockedModal === "function") showDepositBlockedModal();
    return;
  }

  document.querySelectorAll('input[name="method"]').forEach(function (radio) {
    radio.addEventListener("change", function () {
      document.querySelectorAll(".payment-option").forEach(function (el) { el.classList.remove("border-primary"); });
      radio.closest(".payment-option").classList.add("border-primary");
    });
  });

  var form = document.getElementById("deposit-form");
  if (!form) return;

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (typeof isDepositsBlocked === "function" && isDepositsBlocked()) {
      if (typeof showDepositBlockedModal === "function") showDepositBlockedModal();
      return;
    }
    var amount = Number(document.getElementById("deposit-amount").value);
    if (!amount || amount < 100) return;
    WalletModal.showDeposit(amount, function () {
      var method = document.querySelector('input[name="method"]:checked').value;
      var profile = window.SatVaultAuth && SatVaultAuth.getActiveProfile && SatVaultAuth.getActiveProfile();
      var asset = method === "btc" ? "BTC" : method === "eth" ? "ETH" : (profile && profile.asset) || "USD";
      var completesAt = Date.now() + (10 + Math.random() * 10) * 60 * 1000;
      var txs = typeof getTransactions === "function" ? getTransactions() : [];
      var amountLabel = (profile && profile.currency === "USDT")
        ? ("+" + amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " USDT")
        : ("+$" + amount.toLocaleString());
      txs.unshift({
        date: new Date().toLocaleDateString(),
        createdAt: Date.now(),
        completesAt: completesAt,
        amountUsd: amount,
        type: "Deposit",
        asset: asset,
        amount: amountLabel,
        status: "Pending"
      });
      if (typeof saveTransactions === "function") saveTransactions(txs);
      else {
        var write = window.__runSecureWrite || function (fn) { fn(); };
        write(function () {
          localStorage.setItem("transactions", JSON.stringify(txs));
        });
      }
      window.location.href = "/dashboard/accounthistory.html";
    });
  });
})();
