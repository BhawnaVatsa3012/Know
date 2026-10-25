// Activates a one-time sign-in link on the phone that opens it.
// Stores only "used/<linkId>" in Vercel Blob. No names, no diary text.
const { verifyLink, sessionFor } = require("./_link");

const hits = new Map();
function tooMany(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < 60000);
  list.push(now); hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return list.length > 10;
}

// Default store: real Vercel Blob. Tests replace it.
const blobStore = {
  // true = this link had not been used and is now marked used; false = it was already used.
  async claim(path) {
    const { put, head, BlobNotFoundError } = require("@vercel/blob");
    const exists = async () => {
      try { await head(path); return true; }
      catch (e) { if (e instanceof BlobNotFoundError || /does not exist|not.?found/i.test(String(e && e.message))) return false; throw e; }
    };
    if (await exists()) return false;
    const tryPut = (access) => put(path, "used", { access, addRandomSuffix: false, allowOverwrite: false, contentType: "text/plain" });
    try { await tryPut("private"); return true; }
    catch (e) {
      if (await exists()) return false;                        // someone else claimed it first
      try { await tryPut("public"); return true; }             // the store may have been created as public
      catch (e2) { if (await exists()) return false; throw e2; }
    }
  },
};

async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") { res.status(405).json({ code: "bad_request" }); return; }
  const secret = process.env.IKNOW_DEVICE_SECRET;
  if (!secret) { res.status(503).json({ code: "links_off" }); return; }
  if (!process.env.BLOB_READ_WRITE_TOKEN && !handler.store) { res.status(503).json({ code: "links_not_ready" }); return; }

  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
  if (tooMany(ip)) { res.status(429).json({ code: "rate_limited" }); return; }

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = null; } }
  const v = verifyLink(secret, body && body.token);
  if (v.error) { res.status(400).json({ code: v.error }); return; }

  try {
    const fresh = await (handler.store || blobStore).claim(`iknow-used/${v.id}`);
    if (!fresh) { res.status(409).json({ code: "used" }); return; }
  } catch (e) {
    console.error("activate_store_error", String(e && e.name || "error"), String(e && e.message || "").slice(0, 200));
    res.status(503).json({ code: "links_not_ready" });
    return;
  }
  res.status(200).json({ session: sessionFor(secret, v.id) });
}

module.exports = handler;
