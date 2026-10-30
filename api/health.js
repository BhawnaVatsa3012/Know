// Health check for the owner: is the Anthropic API key set, and does Anthropic accept it?
// Never returns or logs the key. Uses the free "list models" call, so it spends no credit.
module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const key = process.env.ANTHROPIC_API_KEY;
  const out = { keySet: !!key, keyAccepted: null, model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5", modelAvailable: null };
  if (key) {
    try {
      const headers = Object.assign({ "x-api-key": key, "anthropic-version": "2023-06-01" },
        process.env.ANTHROPIC_WORKSPACE_ID ? { "anthropic-workspace-id": process.env.ANTHROPIC_WORKSPACE_ID.trim() } : {});
      const r = await fetch("https://api.anthropic.com/v1/models?limit=100", { headers });
      out.keyAccepted = r.ok;
      if (r.ok) {
        const d = await r.json();
        const ids = (d.data || []).map((m) => m.id);
        out.modelAvailable = ids.some((id) => id === out.model || id.startsWith(out.model));
      } else out.status = r.status;
    } catch (e) { out.error = "unreachable"; }
  }
  res.status(200).json(out);
};
