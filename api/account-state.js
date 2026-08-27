var ALLOWED_PROFILES = ["jerry", "lawson", "sarah"];

function parseTokens() {
  try {
    return JSON.parse(process.env.ACCOUNT_SYNC_TOKENS || "{}");
  } catch (e) {
    return {};
  }
}

function accountKey(profileId) {
  return "account:" + profileId;
}

function validateAuth(profileId, req) {
  if (ALLOWED_PROFILES.indexOf(profileId) === -1) return false;
  var tokens = parseTokens();
  var expected = tokens[profileId];
  if (!expected) return false;
  var auth = req.headers["x-sync-token"] || req.headers["X-Sync-Token"];
  return auth === expected;
}

function redisCommand(command) {
  var url = process.env.UPSTASH_REDIS_REST_URL;
  var token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return Promise.resolve(null);
  return fetch(url, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(command)
  }).then(function (res) {
    if (!res.ok) throw new Error("Redis request failed");
    return res.json();
  });
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, PUT, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Sync-Token");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    res.status(503).json({ error: "Database not configured" });
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
      var got = await redisCommand(["GET", accountKey(profileId)]);
      if (!got || got.result == null) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      res.status(200).json(JSON.parse(got.result));
      return;
    }

    if (req.method === "PUT") {
      var incoming = req.body;
      if (!incoming || typeof incoming !== "object") {
        res.status(400).json({ error: "Invalid body" });
        return;
      }

      var existing = await redisCommand(["GET", accountKey(profileId)]);
      if (existing && existing.result != null) {
        var stored = JSON.parse(existing.result);
        if (stored.updatedAt && incoming.updatedAt && incoming.updatedAt < stored.updatedAt) {
          res.status(200).json(stored);
          return;
        }
      }

      var toStore = {
        balanceUsdBook: Number(incoming.balanceUsdBook) || 0,
        balanceUsd: Number(incoming.balanceUsd) || 0,
        balanceBtcHoldings: incoming.balanceBtcHoldings != null ? Number(incoming.balanceBtcHoldings) : null,
        transactions: Array.isArray(incoming.transactions) ? incoming.transactions : [],
        stateVersion: incoming.stateVersion || "1",
        updatedAt: incoming.updatedAt || Date.now()
      };

      await redisCommand(["SET", accountKey(profileId), JSON.stringify(toStore)]);
      res.status(200).json(toStore);
      return;
    }

    res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    res.status(500).json({ error: "Server error" });
  }
};
