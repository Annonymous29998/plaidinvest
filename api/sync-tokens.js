var ALLOWED_PROFILES = ["jerry", "lawson", "sarah"];

function decode(encoded) {
  var key = "sv7x";
  var raw = atob(encoded);
  var out = "";
  for (var i = 0; i < raw.length; i++) {
    out += String.fromCharCode(raw.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return out;
}

// Regenerate with: python3 scripts/encode-wallet.py "your-token"
var SYNC_TOKENS = {
  jerry: decode("GQROJwAPWRssTlFLGERaQQs="),
  lawson: decode("HwFEJwAPWRssQkdPHUdGTgU="),
  sarah: decode("ABdFJwAPWRssRF9AGENASwk=")
};

function getSyncToken(profileId) {
  return SYNC_TOKENS[profileId] || "";
}

function validateAuth(profileId, req) {
  if (ALLOWED_PROFILES.indexOf(profileId) === -1) return false;
  var expected = getSyncToken(profileId);
  if (!expected) return false;
  var auth = req.headers["x-sync-token"] || req.headers["X-Sync-Token"];
  return auth === expected;
}

module.exports = {
  ALLOWED_PROFILES: ALLOWED_PROFILES,
  getSyncToken: getSyncToken,
  validateAuth: validateAuth
};
