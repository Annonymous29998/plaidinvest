function decode(encoded) {
  if (!encoded) return "";
  var key = "sv7x";
  var raw = Buffer.from(encoded, "base64");
  var out = "";
  for (var i = 0; i < raw.length; i++) {
    out += String.fromCharCode(raw[i] ^ key.charCodeAt(i % key.length));
  }
  return out;
}

// Optional — encode with: python3 scripts/encode-wallet.py "https://....upstash.io"
var ENCODED_UPSTASH_URL = "";
var ENCODED_UPSTASH_TOKEN = "";

function getUpstashConfig() {
  var url = process.env.UPSTASH_REDIS_REST_URL || decode(ENCODED_UPSTASH_URL);
  var token = process.env.UPSTASH_REDIS_REST_TOKEN || decode(ENCODED_UPSTASH_TOKEN);
  if (!url || !token) return null;
  return { url: url, token: token };
}

module.exports = {
  getUpstashConfig: getUpstashConfig
};
