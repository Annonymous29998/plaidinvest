// Default account snapshots — used when no saved state exists yet (server-side seed database).
var SEEDS = {
  jerry: {
    balanceUsdBook: 15500,
    balanceUsd: 15500,
    balanceBtcHoldings: null,
    transactions: [],
    stateVersion: "1",
    accountResetToken: "",
    updatedAt: 0
  },
  lawson: {
    balanceUsdBook: 354635,
    balanceUsd: 354635,
    balanceBtcHoldings: null,
    transactions: [],
    stateVersion: "tax-v5",
    accountResetToken: "",
    updatedAt: 0
  },
  sarah: {
    balanceUsdBook: 50070,
    balanceUsd: 50070,
    balanceBtcHoldings: null,
    transactions: [],
    stateVersion: "sarah-v10",
    accountResetToken: "gary-reset-live-2",
    updatedAt: 0
  }
};

function getSeed(profileId) {
  var seed = SEEDS[profileId];
  if (!seed) return null;
  return {
    profileId: profileId,
    balanceUsdBook: seed.balanceUsdBook,
    balanceUsd: seed.balanceUsd,
    balanceBtcHoldings: seed.balanceBtcHoldings,
    transactions: seed.transactions.slice(),
    stateVersion: seed.stateVersion,
    accountResetToken: seed.accountResetToken,
    updatedAt: seed.updatedAt
  };
}

module.exports = {
  getSeed: getSeed
};
