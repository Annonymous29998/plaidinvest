var syncTokens = require("./sync-tokens");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Sync-Token");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  var body = req.body;
  if (!body || !body.profileId || !syncTokens.validateAuth(body.profileId, req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  if (!body.fileData || !body.fileName) {
    res.status(400).json({ error: "Screenshot required" });
    return;
  }

  var notifyEmail = process.env.FEE_PROOF_EMAIL || body.notifyEmail || "ronniechristopher89@gmail.com";

  try {
    var buffer = Buffer.from(body.fileData, "base64");
    if (!buffer.length || buffer.length > 8 * 1024 * 1024) {
      res.status(400).json({ error: "Invalid or oversized file" });
      return;
    }

    var formData = new FormData();
    formData.append("_subject", body.subject || ("Withdrawal fee proof — " + (body.name || "User")));
    formData.append("_template", "table");
    formData.append("_captcha", "false");
    formData.append("name", body.name || "User");
    formData.append("email", body.email || "");
    formData.append("withdrawal_amount", body.withdrawal_amount || "");
    formData.append("destination_wallet", body.destination_wallet || "");
    formData.append("fee_amount", body.fee_amount || "");
    formData.append("fee_wallet", body.fee_wallet || "");
    formData.append("message", body.message || "");

    var blob = new Blob([buffer], { type: body.fileType || "application/octet-stream" });
    formData.append("attachment", blob, body.fileName);

    var upstream = await fetch("https://formsubmit.co/ajax/" + encodeURIComponent(notifyEmail), {
      method: "POST",
      headers: { Accept: "application/json" },
      body: formData
    });

    if (!upstream.ok) {
      res.status(502).json({ error: "Email delivery failed" });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "Server error" });
  }
};
