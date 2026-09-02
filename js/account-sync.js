(function () {
  var ready = false;
  var readyCallbacks = [];
  var pushTimer = null;
  var pollTimer = null;
  var enabled = true;
  var LIVE_SYNC_MS = 12000;

  if (document.body && document.body.classList.contains("dash-app")) {
    document.body.classList.add("balance-loading");
  }

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
    startLiveSync();
  }

  function getProfileId() {
    return window.SatVaultAuth && typeof SatVaultAuth.getProfileId === "function"
      ? SatVaultAuth.getProfileId()
      : null;
  }

  function getSyncToken(profileId) {
    if (window.SITE && typeof SITE.getSyncToken === "function") {
      return SITE.getSyncToken(profileId);
    }
    return "";
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
      accountResetToken: (profile && profile.accountResetToken) || "",
      updatedAt: Date.now()
    };
  }

  function configResetToken(profileId) {
    var profile = window.SITE && typeof SITE.getProfileById === "function"
      ? SITE.getProfileById(profileId)
      : null;
    return (profile && profile.accountResetToken) || "";
  }

  function configStateVersion(profileId) {
    var profile = window.SITE && typeof SITE.getProfileById === "function"
      ? SITE.getProfileById(profileId)
      : null;
    return (profile && profile.stateVersion) || "1";
  }

  function applyConfigReset(profileId) {
    if (typeof window.applyAccountResetIfNeeded === "function") {
      return window.applyAccountResetIfNeeded();
    }

    var prefix = storagePrefix(profileId);
    var targetVersion = configStateVersion(profileId);
    if (localStorage.getItem(prefix + "stateVersion") === targetVersion) return false;

    var reset = buildSeedState(profileId);
    reset.updatedAt = Date.now();
    applyState(profileId, reset);
    return true;
  }

  function applyState(profileId, state) {
    if (!state) return false;
    var prefix = storagePrefix(profileId);
    var prevBook = localStorage.getItem(prefix + "balanceUsdBook");
    var prevTx = localStorage.getItem(prefix + "transactions");
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
    if (state.accountResetToken) {
      localStorage.setItem(prefix + "accountResetToken", state.accountResetToken);
    }
    if (state.updatedAt) {
      localStorage.setItem(prefix + "stateUpdatedAt", String(state.updatedAt));
    }
    var nextBook = String(state.balanceUsdBook);
    var nextTx = JSON.stringify(state.transactions || []);
    return prevBook !== nextBook || prevTx !== nextTx;
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
    var updatedAt = Number(localStorage.getItem(prefix + "stateUpdatedAt"));
    if (!updatedAt) updatedAt = Date.now();

    return {
      profileId: profileId,
      balanceUsdBook: Number(localStorage.getItem(prefix + "balanceUsdBook")) || 0,
      balanceUsd: Number(localStorage.getItem(prefix + "balanceUsd")) || 0,
      balanceBtcHoldings: holdingsRaw == null ? null : Number(holdingsRaw),
      transactions: txs,
      stateVersion: localStorage.getItem(prefix + "stateVersion") || "1",
      accountResetToken: localStorage.getItem(prefix + "accountResetToken") || "",
      updatedAt: updatedAt
    };
  }

  function apiPath(path) {
    var base = window.SITE && SITE.syncApiBase ? String(SITE.syncApiBase).replace(/\/$/, "") : "";
    return base + path;
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
      ? apiPath("/api/account-state?profileId=" + encodeURIComponent(profileId))
      : apiPath("/api/account-state");

    return fetch(url, opts).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        return { ok: res.ok, status: res.status, data: data, skipped: res.status === 503 };
      });
    }).catch(function () {
      return { ok: false, skipped: true };
    });
  }

  function notifyStateChange() {
    document.dispatchEvent(new CustomEvent("accountStateSynced"));
    document.dispatchEvent(new CustomEvent("transactionsUpdated"));
  }

  function mergeAndApply(profileId, remote, local) {
    local = local || collectState(profileId);
    if (!remote) return { applied: false, state: local };

    var targetVersion = configStateVersion(profileId);
    var targetReset = configResetToken(profileId);

    if (remote.stateVersion !== targetVersion) {
      var reset = buildSeedState(profileId);
      reset.updatedAt = Date.now();
      applyState(profileId, reset);
      return { applied: true, state: reset, source: "reset", needsPush: true };
    }
    if (targetReset && remote.accountResetToken !== targetReset) {
      var staleReset = buildSeedState(profileId);
      staleReset.updatedAt = Date.now();
      applyState(profileId, staleReset);
      return { applied: true, state: staleReset, source: "reset", needsPush: true };
    }

    var remoteTime = Number(remote.updatedAt) || 0;
    var localTime = Number(local.updatedAt) || 0;

    if (remoteTime > localTime) {
      return { applied: applyState(profileId, remote), state: remote, source: "remote" };
    }
    if (localTime > remoteTime) {
      return { applied: false, state: local, source: "local", needsPush: true };
    }

    return { applied: applyState(profileId, remote), state: remote, source: "remote" };
  }

  function pull(profileId, options) {
    options = options || {};
    var local = collectState(profileId);

    return apiFetch(profileId, "GET").then(function (result) {
      if (result.skipped) {
        enabled = false;
        return null;
      }

      if (result.status === 404) {
        var seed = buildSeedState(profileId);
        var seedState = local.updatedAt > (seed.updatedAt || 0) ? local : seed;
        return apiFetch(profileId, "PUT", seedState).then(function (putResult) {
          var finalState = (putResult.ok && putResult.data) ? putResult.data : seedState;
          var changed = applyState(profileId, finalState);
          if (changed && options.notify !== false) notifyStateChange();
          return finalState;
        });
      }

      if (result.ok && result.data) {
        var merge = mergeAndApply(profileId, result.data, local);
        if (merge.needsPush) {
          return push(profileId, { notify: false }).then(function () {
            return merge.state;
          });
        }
        if (merge.applied && options.notify !== false) notifyStateChange();
        return merge.state;
      }

      return null;
    });
  }

  function push(profileId, options) {
    options = options || {};
    if (!enabled) return Promise.resolve(null);
    var state = collectState(profileId);
    state.updatedAt = Date.now();
    localStorage.setItem(storagePrefix(profileId) + "stateUpdatedAt", String(state.updatedAt));

    return apiFetch(profileId, "PUT", state).then(function (result) {
      if (result.skipped) enabled = false;
      if (result.ok && result.data) {
        var accepted = result.data;
        if (state.accountResetToken && accepted.accountResetToken !== state.accountResetToken) {
          if (options.notify !== false) notifyStateChange();
          return state;
        }
        applyState(profileId, accepted);
        if (options.notify !== false) notifyStateChange();
        return accepted;
      }
      return null;
    });
  }

  function syncOnLogin() {
    var profileId = getProfileId();
    if (!profileId || !window.SatVaultAuth || !SatVaultAuth.isLoggedIn()) {
      return Promise.resolve(null);
    }
    applyConfigReset(profileId);
    return pull(profileId).then(function (state) {
      if (enabled) return push(profileId, { notify: false }).then(function () { return state; });
      return state;
    });
  }

  function schedulePush() {
    if (!enabled) return;
    var profileId = getProfileId();
    if (!profileId || !window.SatVaultAuth || !SatVaultAuth.isLoggedIn()) return;
    if (pushTimer) clearTimeout(pushTimer);
    pushTimer = setTimeout(function () {
      pushTimer = null;
      push(profileId);
    }, 400);
  }

  function pushNow() {
    if (!enabled) return Promise.resolve(null);
    var profileId = getProfileId();
    if (!profileId || !window.SatVaultAuth || !SatVaultAuth.isLoggedIn()) {
      return Promise.resolve(null);
    }
    if (pushTimer) {
      clearTimeout(pushTimer);
      pushTimer = null;
    }
    return push(profileId);
  }

  function startLiveSync() {
    if (!enabled || pollTimer) return;
    var profileId = getProfileId();
    if (!profileId || !getSyncToken(profileId)) return;

    pollTimer = setInterval(function () {
      if (!window.SatVaultAuth || !SatVaultAuth.isLoggedIn()) return;
      var id = getProfileId();
      if (!id) return;
      pull(id, { notify: true });
    }, LIVE_SYNC_MS);
  }

  function stopLiveSync() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  function touchTimestamp() {
    var profileId = getProfileId();
    if (!profileId) return;
    var ts = Date.now();
    localStorage.setItem(storagePrefix(profileId) + "stateUpdatedAt", String(ts));
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
    var didReset = applyConfigReset(profileId);
    pull(profileId, { notify: false }).then(function () {
      if (didReset && enabled) return push(profileId, { notify: false });
    }).finally(function () {
      if (typeof window.applyAccountResetIfNeeded === "function") {
        window.applyAccountResetIfNeeded();
      }
      finishReady();
    });
  }

  window.AccountSync = {
    whenReady: whenReady,
    syncOnLogin: syncOnLogin,
    schedulePush: schedulePush,
    pushNow: pushNow,
    pull: pull,
    push: push,
    touchTimestamp: touchTimestamp,
    stopLiveSync: stopLiveSync
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
