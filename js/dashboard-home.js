(function () {
  function renderRecentTx() {
    var txs = typeof getTransactions === "function" ? getTransactions() : [];
    var recent = document.getElementById("recent-tx");
    if (!txs.length || !recent) return;
    recent.innerHTML = "<div class='space-y-3 text-left'>" + txs.slice(0, 5).map(function (tx) {
      var status = tx.status ? " · <span class='text-yellow-400'>" + tx.status + "</span>" : "";
      if ((tx.status || "").toLowerCase() === "completed") {
        status = " · <span class='text-gray-500'>Completed</span>";
      }
      return "<div class='flex flex-col sm:flex-row sm:justify-between text-sm border-b border-gray-800 pb-2 gap-1 recent-tx-row'>" +
        "<span class='text-gray-400'>" + tx.date + " · " + tx.type + " · " + tx.asset + status + "</span>" +
        "<span class='text-primary font-medium'>" + tx.amount + "</span></div>";
    }).join("") + "</div>";
  }

  renderRecentTx();
  document.addEventListener("transactionsUpdated", function () {
    renderRecentTx();
    if (window.refreshDashMobile) refreshDashMobile();
  });

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
