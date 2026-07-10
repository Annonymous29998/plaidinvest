(function () {
  function renderHistory() {
    var rows = typeof getTransactions === "function" ? getTransactions() : [];
    var tbody = document.getElementById("history-rows");
    if (!tbody) return;
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="p-8 sm:p-12 text-center text-gray-500">' +
        '<img data-coin="btc" src="/assets/icons/btc.svg" alt="" class="coin-icon coin-icon-lg mx-auto mb-3" width="64" height="64">' +
        "<p>No transactions yet</p>" +
        '<a href="/dashboard/deposits.html" class="inline-block btn-primary mt-4 text-sm">Make a deposit</a>' +
        "</td></tr>";
      return;
    }
    tbody.innerHTML = rows.map(function (tx) {
      var status = tx.status || "";
      var amount = tx.amount || "";
      var statusClass = status.toLowerCase() === "pending" || status.toLowerCase() === "processing"
        ? "text-yellow-400" : "text-gray-300";
      var amountClass = amount.indexOf("+") === 0 ? "text-green-400" : "text-red-400";
      return "<tr><td>" + tx.date + "</td><td>" + tx.type + "</td><td>" + tx.asset + "</td>" +
        '<td class="text-right font-medium ' + amountClass + '">' + amount + "</td>" +
        '<td class="text-right ' + statusClass + '">' + status + "</td></tr>";
    }).join("");
  }

  renderHistory();
  document.addEventListener("transactionsUpdated", renderHistory);
  if (window.__enforceSecureStorage) {
    setInterval(renderHistory, 3000);
  }
})();
