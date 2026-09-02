(function () {
  function renderRecentTx() {
    var txs = typeof getTransactions === "function" ? getTransactions() : [];
    var recent = document.getElementById("recent-tx");
    if (!recent) return;
    if (!txs.length) {
      recent.innerHTML = "<div class='text-center py-6 text-gray-500 text-sm'>No transactions yet.</div>";
      return;
    }
    recent.innerHTML = "<div class='space-y-3 text-left'>" + txs.slice(0, 5).map(function (tx) {
      var statusLower = (tx.status || "").toLowerCase();
      var status = "";
      if (statusLower === "completed") {
        status = " · <span class='text-gray-500'>Completed</span>";
      } else if (statusLower === "pending" || statusLower === "processing") {
        status = " · <span class='text-red-400'>" + tx.status + "</span>";
      } else if (tx.status) {
        status = " · <span class='text-yellow-400'>" + tx.status + "</span>";
      }
      return "<div class='flex flex-col sm:flex-row sm:justify-between text-sm border-b border-gray-800 pb-2 gap-1 recent-tx-row'>" +
        "<span class='text-gray-400'>" + tx.date + " · " + tx.type + " · " + tx.asset + status + "</span>" +
        "<span class='text-primary font-medium'>" + tx.amount + "</span></div>";
    }).join("") + "</div>";
  }

  function onTransactionsChanged() {
    renderRecentTx();
    if (window.refreshDashMobile) refreshDashMobile();
  }

  function initRecentTx() {
    renderRecentTx();
  }

  document.addEventListener("transactionsUpdated", onTransactionsChanged);
  document.addEventListener("accountStateLoaded", renderRecentTx);
  document.addEventListener("appReady", renderRecentTx);

  if (window.AccountSync && typeof AccountSync.whenReady === "function") {
    AccountSync.whenReady(initRecentTx);
  } else if (typeof getTransactions === "function") {
    initRecentTx();
  } else {
    document.addEventListener("appReady", initRecentTx, { once: true });
  }

  if (window.BtcPrice) {
    var origPaint = BtcPrice.paintPrice;
    BtcPrice.paintPrice = function (price) {
      origPaint(price);
      var mob = document.getElementById("btc-price-copy-mobile");
      var chg = document.getElementById("btc-change-copy-mobile");
      if (mob && price) mob.textContent = BtcPrice.formatUsdLive(price);
      if (chg && BtcPrice.change24h != null) chg.textContent = BtcPrice.formatChange(BtcPrice.change24h);
    };
  }
})();
