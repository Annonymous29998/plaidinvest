(function () {
  if (typeof fillWalletFields === "function") fillWalletFields();
  if (typeof initWalletCopyButtons === "function") initWalletCopyButtons();

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
    var amount = Number(document.getElementById("deposit-amount").value);
    if (!amount || amount < 100) return;
    WalletModal.showDeposit(amount, function () {
      var method = document.querySelector('input[name="method"]:checked').value;
      var asset = method === "btc" ? "BTC" : method === "eth" ? "ETH" : "USD";
      var completesAt = Date.now() + (10 + Math.random() * 10) * 60 * 1000;
      var txs = JSON.parse(localStorage.getItem("transactions") || "[]");
      txs.unshift({
        date: new Date().toLocaleDateString(),
        createdAt: Date.now(),
        completesAt: completesAt,
        amountUsd: amount,
        type: "Deposit",
        asset: asset,
        amount: "+$" + amount.toLocaleString(),
        status: "Pending"
      });
      var write = window.__runSecureWrite || function (fn) { fn(); };
      write(function () {
        localStorage.setItem("transactions", JSON.stringify(txs));
      });
      window.location.href = "/dashboard/accounthistory.html";
    });
  });
})();
