window.BtcPrice = {
  price: 0,
  targetPrice: 0,
  displayPrice: 0,
  change24h: 0,
  high52w: 0,
  low52w: 0,
  marketCap: 0,
  chartCache: {},
  displayed: {},
  _statId: 0,
  pollMs: 15000,
  onLivePrice: null,
  _pollStarted: false,
  cacheKey: "btcPriceCache",

  loadCache: function () {
    try {
      var raw = localStorage.getItem(BtcPrice.cacheKey);
      if (!raw) return false;
      var cached = JSON.parse(raw);
      if (!cached || !cached.price) return false;
      if (Date.now() - cached.at > 600000) return false;
      BtcPrice.targetPrice = cached.price;
      BtcPrice.displayPrice = cached.price;
      BtcPrice.price = cached.price;
      BtcPrice.change24h = cached.change != null ? cached.change : 0;
      if (window.SITE) {
        SITE.btcPrice = cached.price;
        SITE.btcChange = BtcPrice.change24h;
      }
      BtcPrice.paintPrice(cached.price);
      BtcPrice.renderChange();
      if (window.refreshBtcBalances) window.refreshBtcBalances();
      return true;
    } catch (e) {
      return false;
    }
  },

  saveCache: function () {
    if (!BtcPrice.targetPrice) return;
    try {
      localStorage.setItem(BtcPrice.cacheKey, JSON.stringify({
        price: BtcPrice.targetPrice,
        change: BtcPrice.change24h,
        at: Date.now()
      }));
    } catch (e) {}
  },

  applyPrice: function (usd, change24h, marketCap) {
    var prev = BtcPrice.targetPrice || BtcPrice.price;
    BtcPrice.targetPrice = usd;
    BtcPrice.displayPrice = usd;
    BtcPrice.price = usd;
    BtcPrice.change24h = change24h != null ? change24h : BtcPrice.change24h;
    if (marketCap) BtcPrice.marketCap = marketCap;
    if (window.SITE) {
      SITE.btcPrice = usd;
      SITE.btcChange = BtcPrice.change24h;
    }
    BtcPrice.saveCache();
    BtcPrice.paintPrice(usd);
    BtcPrice.renderChange();
    if (BtcPrice.marketCap) BtcPrice.renderMarketCap(BtcPrice.marketCap);
    if (window.refreshBtcBalances) window.refreshBtcBalances();
    if (typeof BtcPrice.onLivePrice === "function") {
      BtcPrice.onLivePrice(usd, prev);
    }
    return true;
  },

  fetchFromCoinGecko: function () {
    return fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true&include_market_cap=true"
    )
      .then(function (r) {
        if (!r.ok) throw new Error("coingecko http " + r.status);
        return r.json();
      })
      .then(function (data) {
        var btc = data.bitcoin;
        if (!btc || !btc.usd) throw new Error("coingecko missing price");
        return BtcPrice.applyPrice(btc.usd, btc.usd_24h_change || 0, btc.usd_market_cap);
      });
  },

  fetchFromBinance: function () {
    return fetch("https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT")
      .then(function (r) {
        if (!r.ok) throw new Error("binance http " + r.status);
        return r.json();
      })
      .then(function (data) {
        if (!data || !data.lastPrice) throw new Error("binance missing price");
        var price = parseFloat(data.lastPrice);
        var change = parseFloat(data.priceChangePercent);
        if (!isFinite(price) || price <= 0) throw new Error("binance invalid price");
        return BtcPrice.applyPrice(price, isFinite(change) ? change : 0, BtcPrice.marketCap || null);
      });
  },

  fetchFromCoinbase: function () {
    return fetch("https://api.coinbase.com/v2/prices/BTC-USD/spot")
      .then(function (r) {
        if (!r.ok) throw new Error("coinbase http " + r.status);
        return r.json();
      })
      .then(function (data) {
        var amt = data && data.data && data.data.amount;
        var price = parseFloat(amt);
        if (!isFinite(price) || price <= 0) throw new Error("coinbase missing price");
        return BtcPrice.applyPrice(price, BtcPrice.change24h || 0, BtcPrice.marketCap || null);
      });
  },

  fetchLive: function () {
    return BtcPrice.fetchFromCoinGecko()
      .catch(function () { return BtcPrice.fetchFromBinance(); })
      .catch(function () { return BtcPrice.fetchFromCoinbase(); })
      .catch(function () {});
  },

  fetchMarketData: function () {
    return fetch(
      "https://api.coingecko.com/api/v3/coins/bitcoin?localization=false&tickers=false&community_data=false&developer_data=false&sparkline=false"
    )
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var md = data.market_data;
        if (!md) return;
        if (md.market_cap && md.market_cap.usd) BtcPrice.marketCap = md.market_cap.usd;
        if (!BtcPrice.price && md.current_price && md.current_price.usd) {
          BtcPrice.applyPrice(
            md.current_price.usd,
            md.usd_24h_change != null ? md.usd_24h_change : 0,
            md.market_cap && md.market_cap.usd
          );
        } else if (BtcPrice.marketCap) {
          BtcPrice.renderMarketCap(BtcPrice.marketCap);
        }
      })
      .catch(function () {});
  },

  fetchYearRange: function () {
    return BtcPrice.fetchChart(365, true).then(function (data) {
      if (!data || !data.length) return;
      BtcPrice.high52w = Math.max.apply(null, data);
      BtcPrice.low52w = Math.min.apply(null, data);
      BtcPrice.setStat("mkt-high", BtcPrice.high52w, BtcPrice.formatUsd);
      BtcPrice.setStat("mkt-high-hero", BtcPrice.high52w, BtcPrice.formatUsd);
      BtcPrice.setStat("mkt-low", BtcPrice.low52w, BtcPrice.formatUsd);
    });
  },

  fetchChart: function (days, force) {
    var cached = BtcPrice.chartCache[days];
    var ttl = days <= 1 ? 45000 : days <= 7 ? 120000 : 300000;
    if (!force && cached && Date.now() - cached.at < ttl) {
      return Promise.resolve(cached.prices.slice());
    }
    return fetch(
      "https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=" + days
    )
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var prices = data.prices.map(function (p) { return p[1]; });
        BtcPrice.chartCache[days] = { prices: prices, at: Date.now() };
        return prices.slice();
      })
      .catch(function () { return []; });
  },

  formatUsd: function (n) {
    return "$" + Math.round(Number(n)).toLocaleString();
  },

  formatUsdLive: function (n) {
    return "$" + Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  },

  getLivePrice: function () {
    return BtcPrice.displayPrice || BtcPrice.targetPrice || BtcPrice.price || 0;
  },

  paintPrice: function (price) {
    if (!price || !isFinite(price)) return;
    var text = BtcPrice.formatUsdLive(price);
    var rounded = BtcPrice.formatUsd(price);
    ["mkt-price", "btc-live-price", "btc-price-copy", "dashboard-btc-rate", "mkt-price-hero"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) {
        el.textContent = id === "mkt-price" || id === "mkt-price-hero" ? rounded : text;
        BtcPrice.displayed[id] = price;
      }
    });
    document.querySelectorAll("[data-btc-price]").forEach(function (el) {
      if (el.id === "mkt-price") return;
      el.textContent = el.closest(".market-stat") || el.closest(".stat-box") ? rounded : text;
      var key = el.id || el.dataset.statKey;
      if (key) BtcPrice.displayed[key] = price;
    });
  },

  formatUsdFull: function (n) {
    return "$" + Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  },

  formatCap: function (n) {
    n = Number(n);
    if (n >= 1e12) return "$" + (n / 1e12).toFixed(2) + "T";
    if (n >= 1e9) return "$" + (n / 1e9).toFixed(2) + "B";
    return BtcPrice.formatUsd(n);
  },

  formatChange: function (n) {
    n = Number(n);
    return (n >= 0 ? "+" : "") + n.toFixed(2) + "% (24h)";
  },

  changeKey: function (el) {
    if (el.id) return "chg:" + el.id;
    if (!el.dataset.chgKey) {
      BtcPrice._statId += 1;
      el.dataset.chgKey = "chg-stat-" + BtcPrice._statId;
    }
    return el.dataset.chgKey;
  },

  setChangeColor: function (el, value) {
    el.classList.remove("text-green-400", "text-red-400");
    el.classList.add(value >= 0 ? "text-green-400" : "text-red-400");
  },

  setStat: function (id, value, formatFn) {
    var el = document.getElementById(id);
    if (!el || value == null || !isFinite(value)) return;
    el.textContent = formatFn(value);
    BtcPrice.displayed[id] = value;
  },

  setStatAll: function (selector, value, formatFn) {
    document.querySelectorAll(selector).forEach(function (el) {
      var key = el.id;
      if (!key) {
        if (!el.dataset.statKey) {
          BtcPrice._statId += 1;
          el.dataset.statKey = "stat-" + BtcPrice._statId;
        }
        key = el.dataset.statKey;
      }
      el.textContent = formatFn(value);
      BtcPrice.displayed[key] = value;
    });
  },

  renderMarketCap: function (cap) {
    if (!cap) return;
    BtcPrice.setStat("mkt-cap", cap, BtcPrice.formatCap);
    BtcPrice.setStat("mkt-cap-hero", cap, BtcPrice.formatCap);
    BtcPrice.setStat("hero-mkt-cap", cap, BtcPrice.formatCap);
  },

  renderChange: function () {
    var change = BtcPrice.change24h;
    if (change == null || !isFinite(change)) return;
    var text = BtcPrice.formatChange(change);
    document.querySelectorAll("#btc-live-change, #btc-change-copy, [data-btc-change]").forEach(function (el) {
      el.textContent = text;
      BtcPrice.setChangeColor(el, change);
      BtcPrice.displayed[BtcPrice.changeKey(el)] = change;
    });
  },

  render: function () {
    var price = BtcPrice.targetPrice || BtcPrice.price;
    if (price) {
      BtcPrice.targetPrice = price;
      BtcPrice.displayPrice = price;
      BtcPrice.paintPrice(price);
      if (BtcPrice.marketCap) BtcPrice.renderMarketCap(BtcPrice.marketCap);
    }

    BtcPrice.renderChange();
  },

  start: function () {
    BtcPrice.loadCache();
    BtcPrice.fetchLive();
    if (BtcPrice._pollStarted) return;
    BtcPrice._pollStarted = true;
    setTimeout(function () { BtcPrice.fetchLive(); }, 2000);
    setTimeout(function () { BtcPrice.fetchMarketData(); }, 1500);
    setTimeout(BtcPrice.fetchYearRange, 3000);
    setInterval(BtcPrice.fetchLive, BtcPrice.pollMs);
    setInterval(BtcPrice.fetchMarketData, 120000);
    setInterval(BtcPrice.fetchYearRange, 600000);
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) BtcPrice.fetchLive();
    });
  }
};
