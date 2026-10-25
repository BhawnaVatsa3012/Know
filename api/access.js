// Tells the app which kind of access this IKnOw uses, and where to send access requests.
// Holds no secrets: the owner's WhatsApp number / email are what the owner chose to show to invitees.
const ACCESS_URL = process.env.IKNOW_ACCESS_URL || "https://wijnzuwcluzalvpobpbr.supabase.co/functions/v1/iknow-access?forceFunctionRegion=ap-south-1";

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const mode = process.env.IKNOW_DEVICE_SECRET ? "device" : (process.env.IKNOW_ACCESS_CODE ? "shared" : "open");
  const whatsapp = String(process.env.IKNOW_REQUEST_WHATSAPP || "").replace(/\D/g, "");
  const email = String(process.env.IKNOW_REQUEST_EMAIL || "").trim();
  const links = mode === "device" && !!process.env.BLOB_READ_WRITE_TOKEN;
  // Is owner-approved access switched on (owner account created)? null = service not reachable.
  let managed = null;
  try {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 8000);
    const r = await fetch(ACCESS_URL, { method: "GET", signal: ctl.signal }); clearTimeout(t);
    if (r.ok) { const d = await r.json(); managed = !!d.claimed; }
  } catch (e) {}
  res.status(200).json({ mode, links, accessUrl: ACCESS_URL, managed, whatsapp, email });
};
