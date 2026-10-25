// Tells the app which kind of access this IKnOw uses, and where to send code requests.
// Holds no secrets: the owner's WhatsApp number / email are what the owner chose to publish to invitees.
module.exports = function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const mode = process.env.IKNOW_DEVICE_SECRET ? "device" : (process.env.IKNOW_ACCESS_CODE ? "shared" : "open");
  const whatsapp = String(process.env.IKNOW_REQUEST_WHATSAPP || "").replace(/\D/g, "");
  const email = String(process.env.IKNOW_REQUEST_EMAIL || "").trim();
  const links = mode === "device" && !!process.env.BLOB_READ_WRITE_TOKEN;
  const accessUrl = process.env.IKNOW_ACCESS_URL || "https://wijnzuwcluzalvpobpbr.supabase.co/functions/v1/iknow-access";
  res.status(200).json({ mode, links, accessUrl, whatsapp, email });
};
