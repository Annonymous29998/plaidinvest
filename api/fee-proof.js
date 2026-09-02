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
    var fileSizeKb = "";
    if (body.fileData) {
      var buffer = Buffer.from(body.fileData, "base64");
      if (!buffer.length || buffer.length > 3 * 1024 * 1024) {
        res.status(400).json({ error: "Invalid or oversized file" });
        return;
      }
      fileSizeKb = Math.max(1, Math.round(buffer.length / 1024)) + " KB";
    }

    // FormSubmit AJAX rejects most file attachments (502). Send metadata only.
    var proofNote =
      (body.message || "") +
      (body.fileName
        ? " Screenshot uploaded: " + body.fileName + (fileSizeKb ? " (" + fileSizeKb + ")." : ".")
        : "");

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
    formData.append("message", proofNote);
    formData.append("screenshot_file", body.fileName || "");
    formData.append("screenshot_size", fileSizeKb);

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
