// Answers one question for the access service: is this the invite code set in Vercel?
// Used once, when the owner creates their owner account, to prove it is really them.
const crypto = require("crypto");
const hits = new Map();

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") { res.status(405).json({ ok: false }); return; }
  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < 60000); list.push(now); hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  if (list.length > 5) { res.status(429).json({ ok: false }); return; }

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = null; } }
  const want = String(process.env.IKNOW_ACCESS_CODE || "");
  const got = String((body && body.code) || "");
  const a = crypto.createHash("sha256").update(want).digest(), b = crypto.createHash("sha256").update(got).digest();
  const ok = want.length > 0 && crypto.timingSafeEqual(a, b);
  res.status(ok ? 200 : 403).json({ ok });
};
