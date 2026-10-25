// Phone-specific access codes (no database).
// A phone's code = first 8 characters of HMAC-SHA256(IKNOW_DEVICE_SECRET, "iknow-device:" + phoneId),
// written in an alphabet without look-alike characters. owner.html computes the same thing in the browser.
const crypto = require("crypto");

const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"; // no 0/O, 1/I/L
const norm = (s) => String(s || "").toUpperCase().replace(/[^0-9A-Z]/g, "");

function codeFor(secret, phoneId) {
  const mac = crypto.createHmac("sha256", secret).update("iknow-device:" + norm(phoneId)).digest();
  let out = "";
  for (let i = 0; i < 8; i++) out += ALPHABET[mac[i] % ALPHABET.length];
  return out.slice(0, 4) + "-" + out.slice(4);
}

function revoked(phoneId) {
  const list = String(process.env.IKNOW_REVOKED_DEVICES || "").split(/[\s,;]+/).map(norm).filter(Boolean);
  return list.includes(norm(phoneId));
}

// Returns null when allowed, or an error code.
function checkDevice(secret, phoneId, code) {
  const id = norm(phoneId);
  if (id.length !== 8) return "needs_code";
  if (revoked(id)) return "revoked";
  const want = Buffer.from(norm(codeFor(secret, id)));
  const got = Buffer.from(norm(code));
  if (got.length !== want.length || !crypto.timingSafeEqual(got, want)) return "needs_code";
  return null;
}

module.exports = { codeFor, checkDevice, norm, ALPHABET };
