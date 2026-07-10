(function () {
  var PROTECTED = {
    transactions: true,
    balanceUsdBook: true,
    balanceUsd: true,
    balanceBtcHoldings: true
  };
  var SEAL_KEY = "__integritySeal";
  var allowDepth = 0;
  var bootstrapping = true;
  var nativeSet = Storage.prototype.setItem;
  var nativeGet = Storage.prototype.getItem;
  var nativeRemove = Storage.prototype.removeItem;
  var nativeClear = Storage.prototype.clear;

  function snapshotProtected() {
    return {
      transactions: nativeGet.call(localStorage, "transactions"),
      balanceUsdBook: nativeGet.call(localStorage, "balanceUsdBook"),
      balanceUsd: nativeGet.call(localStorage, "balanceUsd"),
      balanceBtcHoldings: nativeGet.call(localStorage, "balanceBtcHoldings")
    };
  }

  function hashString(value) {
    var h = 2166136261;
    for (var i = 0; i < value.length; i++) {
      h ^= value.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(36);
  }

  function encodePayload(payload) {
    return btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
  }

  function decodePayload(raw) {
    return JSON.parse(decodeURIComponent(escape(atob(raw))));
  }

  function sealStorage() {
    if (window.__reconcileTransactions) window.__reconcileTransactions();
    var payload = snapshotProtected();
    var sig = hashString(JSON.stringify(payload));
    nativeSet.call(localStorage, SEAL_KEY, sig + "|" + encodePayload(payload));
  }

  function restoreFromSeal() {
    var raw = nativeGet.call(localStorage, SEAL_KEY);
    if (!raw) return false;
    var pipe = raw.indexOf("|");
    if (pipe < 0) return false;
    var payload;
    try {
      payload = decodePayload(raw.slice(pipe + 1));
    } catch (e) {
      return false;
    }
    allowDepth++;
    try {
      Object.keys(PROTECTED).forEach(function (key) {
        var value = payload[key];
        if (value == null) nativeRemove.call(localStorage, key);
        else nativeSet.call(localStorage, key, value);
      });
    } finally {
      allowDepth--;
    }
    return true;
  }

  function isTampered() {
    var raw = nativeGet.call(localStorage, SEAL_KEY);
    if (!raw) return false;
    var pipe = raw.indexOf("|");
    if (pipe < 0) return true;
    var expected = raw.slice(0, pipe);
    return hashString(JSON.stringify(snapshotProtected())) !== expected;
  }

  function enforceIntegrity() {
    if (bootstrapping) return;
    if (window.__reconcileTransactions) window.__reconcileTransactions();
    if (isTampered()) {
      restoreFromSeal();
      if (window.__reconcileTransactions) window.__reconcileTransactions();
    }
    if (nativeGet.call(localStorage, SEAL_KEY)) sealStorage();
  }

  function blockedWrite(key) {
    return PROTECTED[key] && allowDepth === 0 && !bootstrapping;
  }

  Storage.prototype.setItem = function (key, value) {
    if (blockedWrite(key)) {
      enforceIntegrity();
      return;
    }
    nativeSet.call(this, key, value);
  };

  Storage.prototype.removeItem = function (key) {
    if (blockedWrite(key)) {
      enforceIntegrity();
      return;
    }
    nativeRemove.call(this, key);
  };

  Storage.prototype.clear = function () {
    if (allowDepth === 0 && !bootstrapping) {
      enforceIntegrity();
      return;
    }
    nativeClear.call(this);
  };

  window.__runSecureWrite = function (fn) {
    allowDepth++;
    try {
      return fn();
    } finally {
      allowDepth--;
      sealStorage();
    }
  };

  window.__sealSecureStorage = function () {
    bootstrapping = false;
    sealStorage();
  };

  window.__enforceSecureStorage = enforceIntegrity;

  try {
    window.eval = function () {
      throw new Error("Eval is disabled.");
    };
  } catch (e) {}

  function finishBootstrap() {
    if (!bootstrapping) return;
    bootstrapping = false;
    sealStorage();
  }

  document.addEventListener("DOMContentLoaded", finishBootstrap);

  window.addEventListener("focus", enforceIntegrity);
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) enforceIntegrity();
  });
  setInterval(enforceIntegrity, 2500);
})();
