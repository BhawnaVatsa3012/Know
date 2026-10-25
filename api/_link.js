// One-time sign-in links.
// A link carries  <linkId>.<expiryDay>.<signature>  signed with IKNOW_DEVICE_SECRET, so the server
// can tell a real link from a made-up one without storing the links it issues.
// When a link is activated, "used/<linkId>" is written to Vercel Blob; a second activation finds it
// and is refused. The browser that activated gets a session, also just a signature, so replies
// never need a lookup. owner.html makes the same links in the owner's own browser.
const crypto = require("crypto");
const { ALPHABET, norm } = require("./_device");

const LINK_DAYS = 7;
const today = () => Math.floor(Date.now() / 86400000);
const sign = (secret, msg, n) => crypto.createHmac("sha256", secret).update(msg).digest("base64url").slice(0, n);
const same = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };

function revokedIds() {
  return String(process.env.IKNOW_REVOKED_DEVICES || "").split(/[\s,;]+/).map(norm).filter(Boolean);
}

function makeLink(secret, id, day) {          // used by tests; owner.html does the same in the browser
  const exp = ((day ?? today()) + LINK_DAYS).toString(36);
  const lid = norm(id);
  return `${lid}.${exp}.${sign(secret, `iknow-link:${lid}.${exp}`, 16)}`;
}

// -> { id } or { error: "bad_link" | "expired" | "revoked" }
function verifyLink(secret, token) {
  const m = /^([2-9A-Z]{8})\.([0-9a-z]{1,8})\.([A-Za-z0-9_-]{16})$/.exec(String(token || "").trim());
  if (!m) return { error: "bad_link" };
  const [, id, exp, sig] = m;
  if ([...id].some((c) => !ALPHABET.includes(c))) return { error: "bad_link" };
  if (!same(sig, sign(secret, `iknow-link:${id}.${exp}`, 16))) return { error: "bad_link" };
  if (parseInt(exp, 36) < today()) return { error: "expired" };
  if (revokedIds().includes(id)) return { error: "revoked" };
  return { id };
}

const sessionFor = (secret, id) => `${norm(id)}.${sign(secret, `iknow-session:${norm(id)}`, 22)}`;

// null when the session is good, otherwise an error code
function checkSession(secret, session) {
  const m = /^([2-9A-Z]{8})\.([A-Za-z0-9_-]{22})$/.exec(String(session || ""));
  if (!m) return "needs_code";
  if (!same(m[2], sign(secret, `iknow-session:${m[1]}`, 22))) return "needs_code";
  if (revokedIds().includes(m[1])) return "revoked";
  return null;
}

module.exports = { makeLink, verifyLink, sessionFor, checkSession, LINK_DAYS };
