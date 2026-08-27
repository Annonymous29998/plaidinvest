(function () {
  var ready = false;
  var readyCallbacks = [];
  var pushTimer = null;
  var enabled = true;

  function whenReady(fn) {
    if (ready) fn();
    else readyCallbacks.push(fn);
  }

  function finishReady() {
    if (ready) return;
    ready = true;
    readyCallbacks.forEach(function (fn) { fn(); });
    readyCallbacks = [];
    document.dispatchEvent(new CustomEvent("accountStateLoaded"));
  }

  function getProfileId() {
    return window.SatVaultAuth && typeof SatVaultAuth.getProfileId === "function"
      ? SatVaultAuth.getProfileId()
      : null;
  }

  function getSyncToken(profileId) {
    if (!window.SITE || typeof SITE.getProfileById !== "function") return "";
    var profile = SITE.getProfileById(profileId);
    return (profile && profile.syncToken) || "";
  }

  function storagePrefix(profileId) {
    return "acct:" + profileId + ":";
  }

  function buildSeedState(profileId) {
    var profile = window.SITE && typeof SITE.getProfileById === "function"
      ? SITE.getProfileById(profileId)
      : null;
    var balance = profile && Number(profile.balanceUsd) > 0 ? Number(profile.balanceUsd) : 15500;
    return {
      profileId: profileId,
      balanceUsdBook: balance,
      balanceUsd: balance,
      balanceBtcHoldings: null,
      transactions: [],
      stateVersion: (profile && profile.stateVersion) || "1",
      updatedAt: Date.now()
    };
  }

  function applyState(profileId, state) {
    if (!state) return;
    var prefix = storagePrefix(profileId);
    localStorage.setItem(prefix + "balanceUsdBook", String(state.balanceUsdBook));
    localStorage.setItem(prefix + "balanceUsd", String(state.balanceUsd));
    if (state.balanceBtcHoldings != null && !Number.isNaN(Number(state.balanceBtcHoldings))) {
      localStorage.setItem(prefix + "balanceBtcHoldings", String(state.balanceBtcHoldings));
    } else {
      localStorage.removeItem(prefix + "balanceBtcHoldings");
    }
    localStorage.setItem(prefix + "transactions", JSON.stringify(state.transactions || []));
    if (state.stateVersion) {
      localStorage.setItem(prefix + "stateVersion", state.stateVersion);
    }
  }

  function collectState(profileId) {
    var prefix = storagePrefix(profileId);
    var txs = [];
    try {
      txs = JSON.parse(localStorage.getItem(prefix + "transactions") || "[]");
    } catch (e) {
      txs = [];
    }
    if (!Array.isArray(txs)) txs = [];

    var holdingsRaw = localStorage.getItem(prefix + "balanceBtcHoldings");
    return {
      profileId: profileId,
      balanceUsdBook: Number(localStorage.getItem(prefix + "balanceUsdBook")) || 0,
      balanceUsd: Number(localStorage.getItem(prefix + "balanceUsd")) || 0,
      balanceBtcHoldings: holdingsRaw == null ? null : Number(holdingsRaw),
      transactions: txs,
      stateVersion: localStorage.getItem(prefix + "stateVersion") || "1",
      updatedAt: Date.now()
    };
  }

  function apiFetch(profileId, method, body) {
    var token = getSyncToken(profileId);
    if (!token) return Promise.resolve({ ok: false, skipped: true });

    var opts = {
      method: method,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Sync-Token": token
      }
    };
    if (body) opts.body = JSON.stringify(body);

    var url = method === "GET"
      ? "/api/account-state?profileId=" + encodeURIComponent(profileId)
      : "/api/account-state";

    return fetch(url, opts).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        return { ok: res.ok, status: res.status, data: data, skipped: res.status === 503 };
      });
    }).catch(function () {
      return { ok: false, skipped: true };
    });
  }

  function pull(profileId) {
    return apiFetch(profileId, "GET").then(function (result) {
      if (result.skipped) {
        enabled = false;
        return null;
      }
      if (result.status === 404) {
        var seed = buildSeedState(profileId);
        return apiFetch(profileId, "PUT", seed).then(function (putResult) {
          if (putResult.ok && putResult.data) applyState(profileId, putResult.data);
          else applyState(profileId, seed);
          return putResult.data || seed;
        });
      }
      if (result.ok && result.data) {
        applyState(profileId, result.data);
        return result.data;
      }
      return null;
    });
  }

  function push(profileId) {
    if (!enabled) return Promise.resolve(null);
    var state = collectState(profileId);
    return apiFetch(profileId, "PUT", state).then(function (result) {
      if (result.skipped) enabled = false;
      return result.ok ? result.data : null;
    });
  }

  function syncOnLogin() {
    var profileId = getProfileId();
    if (!profileId || !window.SatVaultAuth || !SatVaultAuth.isLoggedIn()) {
      return Promise.resolve(null);
    }
    return pull(profileId);
  }

  function schedulePush() {
    if (!enabled) return;
    var profileId = getProfileId();
    if (!profileId || !window.SatVaultAuth || !SatVaultAuth.isLoggedIn()) return;
    if (pushTimer) clearTimeout(pushTimer);
    pushTimer = setTimeout(function () {
      pushTimer = null;
      push(profileId);
    }, 800);
  }

  function init() {
    if (!window.SatVaultAuth || !SatVaultAuth.isLoggedIn()) {
      finishReady();
      return;
    }
    var profileId = getProfileId();
    if (!profileId || !getSyncToken(profileId)) {
      finishReady();
      return;
    }
    pull(profileId).finally(finishReady);
  }

  window.AccountSync = {
    whenReady: whenReady,
    syncOnLogin: syncOnLogin,
    schedulePush: schedulePush,
    pull: pull,
    push: push
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
