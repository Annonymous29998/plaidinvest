var syncTokens = require("./sync-tokens");
var accountStore = require("./account-store");

function validateAuth(profileId, req) {
  return syncTokens.validateAuth(profileId, req);
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, PUT, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Sync-Token");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (!accountStore.isConfigured()) {
    res.status(503).json({ error: "Sync store not configured" });
    return;
  }

  var profileId = req.method === "GET"
    ? req.query && req.query.profileId
    : req.body && req.body.profileId;

  if (!profileId || !validateAuth(profileId, req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    if (req.method === "GET") {
      var stored = await accountStore.getAccount(profileId);
      if (!stored) {
        var seed = accountStore.getSeed(profileId);
        if (!seed) {
          res.status(404).json({ error: "Not found" });
          return;
        }
        res.status(200).json(seed);
        return;
      }
      res.status(200).json(stored);
      return;
    }

    if (req.method === "PUT") {
      var incoming = req.body;
      if (!incoming || typeof incoming !== "object") {
        res.status(400).json({ error: "Invalid body" });
        return;
      }

      var existing = await accountStore.getAccount(profileId);
      if (existing) {
        var resetChanged = incoming.accountResetToken &&
          existing.accountResetToken !== incoming.accountResetToken;
        if (!resetChanged && existing.updatedAt && incoming.updatedAt && incoming.updatedAt < existing.updatedAt) {
          res.status(200).json(existing);
          return;
        }
      }

      var saved = await accountStore.saveAccount(profileId, incoming);
      res.status(200).json(saved);
      return;
    }

    res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    res.status(500).json({ error: "Server error" });
  }
};
