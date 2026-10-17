"""Builds the deployable site from the app source.

  python3 build.py

Reads  src/iknow.html      (the same app that runs inside Claude)
Writes index.html          (with the standalone adapter and wording for the web)
"""
import pathlib, sys
root = pathlib.Path(__file__).parent
src = (root / "src" / "iknow.html").read_text(encoding="utf-8")

def must(cond, msg):
    if not cond: sys.exit("build failed: " + msg)

# 1. Load the adapter before the app's main script.
marker = "\n<script>\n(function(){"
must(src.count(marker) == 1, "main script marker not found exactly once")
src = src.replace(marker, '\n<script src="/standalone.js"></script>' + marker, 1)

# 2. Truthful wording when running on its own (storage on this phone, replies via the API).
overrides = r'''
if(window.IKNOW_STANDALONE){
  Object.assign(T.en,{
    privacyLine:"Kept only in this browser, on this phone.",
    footLock:"Your diary stays on this phone. Replies are written through Anthropic's Claude API.",
    suP1:"It lives only in this browser, on this phone. No login, no email, no phone number.",
    suLock:"Locked with your PIN. Only a scrambled form of it is stored, on this phone.",
    exportSub:"A file you can keep. Your diary lives only on this phone, so export now and then.",
    e_not_configured:"Replies aren't switched on yet. The app owner needs to add an Anthropic API key in Vercel.",
    e_needs_code:"Replies need this IKnOw's invite code. Try again and enter it.",
    e_too_large:"That was too long to send in one go. Try a shorter entry.",
    noSample:"Your entry is saved. Replies aren't available right now."
  });
  Object.assign(T.hi,{
    privacyLine:"सिर्फ़ इस ब्राउज़र में, इसी फ़ोन पर।",
    footLock:"आपकी डायरी इसी फ़ोन पर रहती है। जवाब Anthropic के Claude API से लिखे जाते हैं।",
    suP1:"यह सिर्फ़ इस ब्राउज़र में, इसी फ़ोन पर रहती है। कोई लॉगिन नहीं, कोई ईमेल नहीं, कोई फ़ोन नंबर नहीं।",
    suLock:"आपके PIN से लॉक। उसका सिर्फ़ एक सुरक्षित रूप, इसी फ़ोन पर, सेव होता है।",
    exportSub:"एक फ़ाइल जिसे आप रख सकती हैं। डायरी सिर्फ़ इसी फ़ोन पर है, इसलिए कभी-कभी एक्सपोर्ट कर लीजिए।",
    e_not_configured:"जवाब अभी चालू नहीं हैं। ऐप चलाने वाले को Vercel में Anthropic API key डालनी होगी।",
    e_needs_code:"जवाब के लिए इस IKnOw का इनवाइट कोड चाहिए। फिर कोशिश करें और कोड डालें।",
    e_too_large:"यह एक बार में भेजने के लिए बहुत लंबा था। छोटा लिखकर देखें।",
    noSample:"आपकी बात सेव है। अभी जवाब उपलब्ध नहीं हैं।"
  });
  Object.assign(T.hl,{ privacyLine:"Sirf is browser mein, isi phone par.", suP1:"Ye sirf is browser mein, isi phone par rehti hai. Koi login nahi, koi email nahi, koi phone number nahi." });
}
'''
icons = "const ICONS={"
must(src.count(icons) == 1, "ICONS marker not found exactly once")
src = src.replace(icons, overrides + icons, 1)

(root / "index.html").write_text(src, encoding="utf-8")
print("built index.html,", len(src), "bytes")
