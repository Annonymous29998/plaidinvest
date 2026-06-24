(function () {
  var site = window.SITE || { name: "Jerry McMillan", displayName: "Jerry McMillan", balanceUsd: 15500, btcPrice: 0 };
  var defaultBalance = Number(site.balanceUsd);
  if (Number.isNaN(defaultBalance) || defaultBalance <= 0) defaultBalance = 15500;

  var balanceResetKey = "balanceResetV3";
  if (localStorage.getItem(balanceResetKey) !== "1") {
    localStorage.setItem("balanceUsd", String(defaultBalance));
    localStorage.setItem(balanceResetKey, "1");
  } else if (localStorage.getItem("balanceUsd") === null) {
    localStorage.setItem("balanceUsd", String(defaultBalance));
  }

  var txResetKey = "txResetV4";
  if (localStorage.getItem(txResetKey) !== "1") {
    try {
      var txs = JSON.parse(localStorage.getItem("transactions") || "[]");
      var txChanged = false;
      txs = txs.map(function (tx) {
        if (!tx || !tx.amount) return tx;
        var amount = String(tx.amount);
        if (amount.indexOf("780,000") !== -1 || amount.indexOf("780000") !== -1) {
          txChanged = true;
          return Object.assign({}, tx, { amount: "+$15,500" });
        }
        return tx;
      });
      if (txChanged) localStorage.setItem("transactions", JSON.stringify(txs));
    } catch (e) {}
    localStorage.setItem(txResetKey, "1");
  }

  var accountResetV5 = "accountResetV5";
  if (localStorage.getItem(accountResetV5) !== "1") {
    localStorage.setItem("balanceUsd", String(defaultBalance));
    localStorage.setItem("balanceUsdBook", String(defaultBalance));
    localStorage.removeItem("balanceBtcHoldings");
    try {
      var pendingTxs = JSON.parse(localStorage.getItem("transactions") || "[]");
      pendingTxs = pendingTxs.filter(function (tx) {
        var status = ((tx && tx.status) || "").toLowerCase();
        return status !== "processing" && status !== "pending";
      });
      localStorage.setItem("transactions", JSON.stringify(pendingTxs));
    } catch (e) {}
    localStorage.setItem(accountResetV5, "1");
  }

  var accountResetV6 = "accountResetV6";
  if (localStorage.getItem(accountResetV6) !== "1") {
    localStorage.setItem("balanceUsd", String(defaultBalance));
    localStorage.setItem("balanceUsdBook", String(defaultBalance));
    localStorage.removeItem("balanceBtcHoldings");
    try {
      var txsV6 = JSON.parse(localStorage.getItem("transactions") || "[]");
      txsV6 = txsV6.filter(function (tx) {
        if (!tx) return false;
        if (tx.amountUsd === 1000) return false;
        var amount = String(tx.amount || "");
        if (amount.indexOf("1,000") !== -1 || amount === "+$1000") return false;
        return true;
      });
      localStorage.setItem("transactions", JSON.stringify(txsV6));
    } catch (e) {}
    localStorage.setItem(accountResetV6, "1");
  }

  var stored = Number(localStorage.getItem("balanceUsd"));
  if (!Number.isNaN(stored) && stored > 0) site.balanceUsd = stored;
  else site.balanceUsd = defaultBalance;

  var holdingsKey = "balanceBtcHoldings";
  var bookKey = "balanceUsdBook";

  if (!localStorage.getItem(bookKey)) {
    localStorage.setItem(bookKey, String(site.balanceUsd || defaultBalance));
  }

  function getBookUsd() {
    var book = Number(localStorage.getItem(bookKey));
    if (!isNaN(book) && book > 0) return book;
    return site.balanceUsd || defaultBalance;
  }

  function getPrice() {
    if (window.BtcPrice && typeof BtcPrice.getLivePrice === "function") {
      return BtcPrice.getLivePrice();
    }
    return (window.BtcPrice && BtcPrice.price) || site.btcPrice || 0;
  }

  function getHoldings() {
    var stored = Number(localStorage.getItem(holdingsKey));
    if (!Number.isNaN(stored) && stored > 0) return stored;
    return null;
  }

  function ensureHoldings() {
    var holdings = getHoldings();
    if (holdings != null) return holdings;
    var price = getPrice();
    if (!price) return 0;
    holdings = (site.balanceUsd || defaultBalance) / price;
    localStorage.setItem(holdingsKey, String(holdings));
    return holdings;
  }

  function getLiveUsd() {
    var price = getPrice();
    var holdings = ensureHoldings();
    if (!price || !holdings) return site.balanceUsd || defaultBalance;
    return holdings * price;
  }

  function formatUsd(value) {
    return "$" + Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function formatBtc(value) {
    return Number(value).toFixed(8) + " BTC";
  }

  function renderBalances() {
    var price = getPrice();
    var holdings = ensureHoldings();
    var liveUsd = getLiveUsd();
    var displayBtc = price ? getBookUsd() / price : holdings;

    if (price && holdings) {
      site.balanceUsd = liveUsd;
      localStorage.setItem("balanceUsd", String(liveUsd));
    }

    var liveUsdText = formatUsd(liveUsd);
    document.querySelectorAll("[data-balance-usd]").forEach(function (el) {
      el.textContent = liveUsdText;
    });

    document.querySelectorAll("[data-balance-btc]").forEach(function (el) {
      if (!price) {
        el.textContent = "—";
        return;
      }
      el.textContent = formatBtc(displayBtc);
    });

    document.querySelectorAll("[data-deposits-total]").forEach(function (el) {
      el.textContent = liveUsdText;
    });
  }

  window.refreshBtcBalances = renderBalances;
  if (window.BtcPrice) BtcPrice.start();
  renderBalances();

  var displayName = site.displayName || site.name || "Jerry McMillan";
  var platformName = site.platformName || "PlaidInvest";

  document.querySelectorAll("[data-logo-text]").forEach(function (el) {
    el.textContent = platformName;
  });

  document.querySelectorAll("[data-brand]").forEach(function (el) {
    if (!el.closest(".text-logo")) {
      el.textContent = platformName;
    }
  });
  document.querySelectorAll("[data-tagline]").forEach(function (el) {
    el.textContent = site.tagline;
  });
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = site.year;
  });
  document.querySelectorAll("[data-email]").forEach(function (el) {
    el.textContent = site.email;
    if (el.tagName === "A") el.href = "mailto:" + site.email;
  });

  document.querySelectorAll("[data-user-name]").forEach(function (el) {
    el.textContent = displayName;
  });

  if (window.SatVaultAuth && SatVaultAuth.isLoggedIn()) {
    try {
      var session = SatVaultAuth.getUser();
      if (session && session.name !== displayName) {
        session.name = displayName;
        localStorage.setItem(SatVaultAuth.SESSION_KEY, JSON.stringify(session));
      }
    } catch (e) {}
  }

  if (site.images) {
    document.querySelectorAll("img[data-coin]").forEach(function (img) {
      var key = img.getAttribute("data-coin");
      if (site.images[key]) img.src = site.images[key];
    });
    var favicon = document.querySelector('link[rel="icon"]');
    if (favicon && site.images.favicon) favicon.href = site.images.favicon;
  }

  document.title = document.title.replace(/^(SatVault|Jerry McMillan|BTC Invest|PlaidInvest)/, platformName);

  window.updateBalance = function (usd) {
    var price = getPrice();
    localStorage.setItem(bookKey, String(usd));
    if (price) {
      var holdings = usd / price;
      localStorage.setItem(holdingsKey, String(holdings));
    }
    localStorage.setItem("balanceUsd", String(usd));
    site.balanceUsd = usd;
    renderBalances();
  };

  window.getWalletUsd = function () {
    return getLiveUsd();
  };

  function getPendingWithdrawalTotal() {
    return getTransactions().filter(function (tx) {
      var status = ((tx && tx.status) || "").toLowerCase();
      return tx && tx.type === "Withdrawal" && (status === "pending" || status === "processing");
    }).reduce(function (sum, tx) {
      return sum + parseTxAmount(tx);
    }, 0);
  }

  window.getAvailableBalance = function () {
    var book = getBookUsd();
    var reserved = getPendingWithdrawalTotal();
    return Math.max(0, Math.round((book - reserved) * 100) / 100);
  };

  window.getTransactions = function () {
    try {
      return JSON.parse(localStorage.getItem("transactions") || "[]");
    } catch (e) {
      return [];
    }
  };

  function parseTxAmount(tx) {
    if (tx && tx.amountUsd != null) return Math.abs(Number(tx.amountUsd)) || 0;
    var raw = String((tx && tx.amount) || "").replace(/[^0-9.\-]/g, "");
    var n = parseFloat(raw);
    return isNaN(n) ? 0 : Math.abs(n);
  }

  function processPendingTransactions() {
    var txs;
    try {
      txs = JSON.parse(localStorage.getItem("transactions") || "[]");
    } catch (e) {
      return false;
    }
    var now = Date.now();
    var changed = false;
    var balanceDelta = 0;

    txs = txs.map(function (tx) {
      var status = ((tx && tx.status) || "").toLowerCase();
      if (status !== "pending" && status !== "processing") return tx;

      if (!tx.completesAt) {
        tx = Object.assign({}, tx, {
          createdAt: tx.createdAt || now,
          completesAt: now + (10 + Math.random() * 10) * 60 * 1000,
          amountUsd: tx.amountUsd != null ? tx.amountUsd : parseTxAmount(tx)
        });
        changed = true;
      }

      if (now < tx.completesAt) return tx;

      var amt = parseTxAmount(tx);
      if (tx.type === "Deposit") balanceDelta += amt;
      else if (tx.type === "Withdrawal") balanceDelta -= amt;

      changed = true;
      return Object.assign({}, tx, { status: "Completed" });
    });

    if (changed) {
      localStorage.setItem("transactions", JSON.stringify(txs));
    }
    if (balanceDelta !== 0) {
      var base = Number(localStorage.getItem(bookKey));
      if (Number.isNaN(base)) base = getBookUsd();
      updateBalance(base + balanceDelta);
    } else if (changed) {
      renderBalances();
    }

    if (changed) {
      document.dispatchEvent(new CustomEvent("transactionsUpdated"));
    }
    return changed;
  }

  window.processPendingTransactions = processPendingTransactions;
  processPendingTransactions();
  setInterval(processPendingTransactions, 30000);
})();
