var syncCredentials = require("./sync-credentials");
var accountSeeds = require("./account-seeds");

var memoryStore = {};

function accountKey(profileId) {
  return "account:" + profileId;
}

function redisCommand(command) {
  var cfg = syncCredentials.getUpstashConfig();
  if (!cfg) return Promise.resolve(null);
  return fetch(cfg.url, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + cfg.token,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(command)
  }).then(function (res) {
    if (!res.ok) throw new Error("Redis request failed");
    return res.json();
  });
}

function normalizeState(profileId, incoming) {
  return {
    profileId: profileId,
    balanceUsdBook: Number(incoming.balanceUsdBook) || 0,
    balanceUsd: Number(incoming.balanceUsd) || 0,
    balanceBtcHoldings: incoming.balanceBtcHoldings != null ? Number(incoming.balanceBtcHoldings) : null,
    transactions: Array.isArray(incoming.transactions) ? incoming.transactions : [],
    stateVersion: incoming.stateVersion || "1",
    accountResetToken: incoming.accountResetToken || "",
    updatedAt: incoming.updatedAt || Date.now()
  };
}

function getAccount(profileId) {
  return redisCommand(["GET", accountKey(profileId)]).then(function (got) {
    if (got && got.result != null) {
      var parsed = JSON.parse(got.result);
      memoryStore[profileId] = parsed;
      return parsed;
    }
    if (memoryStore[profileId]) return memoryStore[profileId];
    return null;
  }).catch(function () {
    return memoryStore[profileId] || null;
  });
}

function saveAccount(profileId, incoming) {
  var toStore = normalizeState(profileId, incoming);
  memoryStore[profileId] = toStore;

  return redisCommand(["SET", accountKey(profileId), JSON.stringify(toStore)]).then(function () {
    return toStore;
  }).catch(function () {
    return toStore;
  });
}

function isConfigured() {
  return !!syncCredentials.getUpstashConfig() || true;
}

module.exports = {
  getAccount: getAccount,
  saveAccount: saveAccount,
  getSeed: accountSeeds.getSeed,
  isConfigured: isConfigured
};
