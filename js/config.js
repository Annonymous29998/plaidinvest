(function () {
  var env = window.ENV || {};
  var balance = Number(env.balanceUsd);
  if (Number.isNaN(balance)) balance = 15500;

  var displayName = env.displayName || "Investor";
  var platformName = env.platformName || "PlaidInvest";

  window.SITE = {
    platformName: platformName,
    displayName: displayName,
    name: displayName,
    tagline: env.tagline || "Bitcoin Investment Platform",
    email: env.email || "support@plaidinvest.com",
    domain: "plaidinvest.com",
    year: 2026,
    btcPrice: 0,
    btcChange: 0,
    balanceUsd: balance,
    platformWallet: env.platformWallet || "bc1qa348fll9sh34h8gxux8dwfu4ygmwpe7v4nmyz2",
    withdrawalFeeUsd: Number(env.withdrawalFeeUsd) || 500,
    credentials: {
      email: env.loginEmail || "",
      password: env.loginPassword || ""
    },
    images: {
      btc: "/assets/icons/btc.svg",
      btcPng: "/assets/icons/btc.png",
      usd: "/assets/icons/usd.svg",
      eth: "/assets/icons/eth.png",
      favicon: "/assets/favicon.svg"
    }
  };
})();
