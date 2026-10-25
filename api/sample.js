// IKnOw reply endpoint (Vercel serverless function).
// The browser sends the prompt here; this function adds the Anthropic API key
// (kept only in Vercel's environment) and calls the Claude Messages API.
// Nothing the person writes is logged or stored here. On an API error, only the
// status code and error type are logged so the owner can see what went wrong.

const { checkDevice } = require("./_device");

const MAX_INPUT_BYTES = 256 * 1024;
const WINDOW_MS = 60 * 1000;
const MAX_PER_WINDOW = 20;           // per IP, best effort (per warm instance)
const hits = new Map();

function tooMany(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return list.length > MAX_PER_WINDOW;
}

function toMessages(input) {
  if (typeof input === "string") return [{ role: "user", content: input }];
  if (Array.isArray(input)) {
    const msgs = input
      .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .map((m) => ({ role: m.role, content: m.content }));
    if (msgs.length && msgs[0].role === "user" && msgs[msgs.length - 1].role === "user") return msgs;
  }
  return null;
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") { res.status(405).json({ code: "bad_request" }); return; }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) { res.status(503).json({ code: "not_configured" }); return; }

  const deviceSecret = process.env.IKNOW_DEVICE_SECRET;
  const access = process.env.IKNOW_ACCESS_CODE;
  if (deviceSecret) {
    // Phone-specific codes: the code must belong to this phone's ID.
    const bad = checkDevice(deviceSecret, req.headers["x-iknow-device"], req.headers["x-iknow-code"]);
    if (bad) { res.status(401).json({ code: bad }); return; }
  } else if (access && req.headers["x-iknow-code"] !== access) { res.status(401).json({ code: "needs_code" }); return; }

  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
  if (tooMany(ip)) { res.status(429).json({ code: "rate_limited" }); return; }

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = null; } }
  if (!body) { res.status(400).json({ code: "bad_request" }); return; }
  if (Buffer.byteLength(JSON.stringify(body)) > MAX_INPUT_BYTES) { res.status(413).json({ code: "too_large" }); return; }

  const messages = toMessages(body.input);
  if (!messages) { res.status(400).json({ code: "bad_request" }); return; }

  const quick = body.modelTier === "quick";
  const model = quick
    ? (process.env.ANTHROPIC_MODEL_QUICK || "claude-haiku-5-5")
    : (process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5");

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: Object.assign(
        { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        process.env.ANTHROPIC_WORKSPACE_ID ? { "anthropic-workspace-id": process.env.ANTHROPIC_WORKSPACE_ID.trim() } : {}
      ),
      body: JSON.stringify({
        model,
        max_tokens: quick ? 600 : 1500,
        system: body.json
          ? "You are a careful assistant inside a private diary app. Reply with only the JSON value the user asks for, no prose."
          : "You are the writing engine of IKnOw, a private diary app for adults. Follow the user's instructions exactly.",
        messages,
      }),
    });
    if (r.status === 429) { res.status(429).json({ code: "rate_limited" }); return; }
    if (!r.ok) {
      // Work out why, without ever logging what the person wrote.
      let errType = "", errMsg = "";
      try { const e = await r.json(); errType = (e && e.error && e.error.type) || ""; errMsg = String((e && e.error && e.error.message) || ""); } catch (e) {}
      let code = "unavailable";
      if (r.status === 401 || errType === "authentication_error") code = "bad_key";
      else if (r.status === 403 || errType === "permission_error") code = "no_access";
      else if (/workspace/i.test(errMsg)) code = "needs_workspace";
      else if (/credit balance|billing/i.test(errMsg)) code = "no_credit";
      else if (r.status === 404 || errType === "not_found_error" || /model/i.test(errMsg)) code = "bad_model";
      else if (r.status === 529 || errType === "overloaded_error") code = "busy";
      console.error("anthropic_error", JSON.stringify({ status: r.status, type: errType, code, model, reason: errMsg.replace(/\s+/g, " ").slice(0, 300) }));
      res.status(502).json({ code, status: r.status });
      return;
    }
    const data = await r.json();
    const text = (data.content || []).filter((c) => c.type === "text").map((c) => c.text).join("");
    res.status(200).json({ text, truncated: data.stop_reason === "max_tokens" });
  } catch (e) {
    console.error("anthropic_unreachable", String(e && e.name || "error"));
    res.status(502).json({ code: "unavailable" });
  }
};

module.exports.config = { maxDuration: 60 };
