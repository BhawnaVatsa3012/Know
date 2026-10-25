/* IKnOw standalone adapter.
   Inside Claude, the page gets storage and replies from Claude itself (window.claude).
   On its own website there is no window.claude, so this file provides:
   - replies: through /api/sample (a Vercel function that holds the API key)
   - export: an ordinary browser download
   - storage: none here, so the app falls back to this browser's own storage */
(function(){
  if (window.claude && window.claude.use) return;           // running inside Claude: change nothing
  window.IKNOW_STANDALONE = true;

  const CODE_KEY = "iknow:access-code";
  const DEV_KEY = "iknow:device-id";
  const getCode = () => { try { return localStorage.getItem(CODE_KEY) || ""; } catch (e) { return ""; } };
  const setCode = (c) => { try { localStorage.setItem(CODE_KEY, c); } catch (e) {} };

  /* Each phone/browser gets its own ID. Codes are made for one ID and work only with it. */
  const ALPHA = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
  let memId = "";
  function deviceId() {
    try { const v = localStorage.getItem(DEV_KEY); if (v && /^[2-9A-Z]{4}-[2-9A-Z]{4}$/.test(v)) return v; } catch (e) {}
    if (memId) return memId;
    const r = new Uint8Array(8); crypto.getRandomValues(r);
    let s = ""; for (let i = 0; i < 8; i++) s += ALPHA[r[i] % ALPHA.length];
    memId = s.slice(0, 4) + "-" + s.slice(4);
    try { localStorage.setItem(DEV_KEY, memId); } catch (e) {}
    return memId;
  }

  let accessInfo = null;
  async function access() {
    if (accessInfo) return accessInfo;
    try { const r = await fetch("/api/access", { cache: "no-store" }); accessInfo = await r.json(); }
    catch (e) { accessInfo = { mode: "shared" }; }
    return accessInfo;
  }

  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  function askCode(wrong, reason) {
    return access().then((info) => new Promise((resolve) => {
      const hi = (document.documentElement.lang === "hi");
      const device = info && info.mode === "device";
      const id = deviceId();
      const L = hi ? {
        h: device ? "इस फ़ोन के लिए कोड" : "इनवाइट कोड डालिए",
        p: device ? "हर फ़ोन का अपना कोड होता है, जो सिर्फ़ उसी फ़ोन पर चलता है। कोड माँगिए, फिर यहाँ डालिए। यह इस फ़ोन पर एक बार ही माँगा जाएगा।"
                  : "जवाब पाने के लिए इस IKnOw का इनवाइट कोड चाहिए। यह एक बार ही माँगा जाएगा।",
        idL: "इस फ़ोन की ID", req: "WhatsApp पर कोड माँगें", reqM: "ईमेल से कोड माँगें",
        wrong: "यह कोड इस फ़ोन के लिए नहीं है। ध्यान दें: कोड सिर्फ़ उसी फ़ोन पर चलता है जिसकी ID से बना है।",
        rev: "इस फ़ोन की पहुँच बंद कर दी गई है। नया कोड माँगें।",
        lab: device ? "इस फ़ोन का कोड" : "इनवाइट कोड", no: "रद्द करें", ok: "ठीक है",
        msg: "नमस्ते, मुझे IKnOw का कोड चाहिए। मेरे फ़ोन की ID: " + id
      } : {
        h: device ? "A code for this phone" : "Enter your invite code",
        p: device ? "Each phone has its own code, and it only works on that phone. Request one, then enter it here. You'll only be asked once on this phone."
                  : "Replies on this IKnOw need an invite code. You'll only be asked once on this phone.",
        idL: "This phone's ID", req: "Request a code on WhatsApp", reqM: "Request a code by email",
        wrong: "That code isn't for this phone. A code only works on the phone whose ID it was made for.",
        rev: "Access for this phone has been switched off. Request a new code.",
        lab: device ? "This phone's code" : "Invite code", no: "Cancel", ok: "Continue",
        msg: "Hi, I'd like an IKnOw code. My phone ID: " + id
      };
      const wa = device && info.whatsapp ? "https://wa.me/" + info.whatsapp + "?text=" + encodeURIComponent(L.msg) : "";
      const ml = device && info.email ? "mailto:" + info.email + "?subject=" + encodeURIComponent("IKnOw code") + "&body=" + encodeURIComponent(L.msg) : "";
      const wrap = document.createElement("div");
      wrap.className = "layer open"; wrap.style.zIndex = "60";
      wrap.innerHTML = `<div class="scrim"></div><div class="dialog" role="dialog" aria-modal="true" aria-labelledby="acH">
        <h3 id="acH">${L.h}</h3>
        <div class="dbody"><p>${L.p}</p>
        ${device ? `<p>${L.idL}: <strong id="acId" style="letter-spacing:.08em;font-size:1.15em;user-select:all">${esc(id)}</strong></p>` : ""}
        ${wrong ? `<p style="color:var(--danger)">${reason === "revoked" ? L.rev : (device ? L.wrong : (hi ? "यह कोड मेल नहीं खाया।" : "That code didn't match."))}</p>` : ""}
        ${wa ? `<p><a class="btn btn-secondary" id="acReq" href="${esc(wa)}" target="_blank" rel="noopener">${L.req}</a></p>` : ""}
        ${ml ? `<p><a class="btn btn-secondary" id="acReqM" href="${esc(ml)}">${L.reqM}</a></p>` : ""}</div>
        <label class="flabel" for="acIn">${L.lab}</label><input class="field" id="acIn" autocomplete="off" autocapitalize="characters" spellcheck="false" ${device ? 'placeholder="XXXX-XXXX"' : ""}>
        <div class="acts"><button class="btn btn-secondary" type="button" id="acNo">${L.no}</button><button class="btn btn-primary" type="button" id="acOk">${L.ok}</button></div></div>`;
      document.body.appendChild(wrap);
      const inp = wrap.querySelector("#acIn"); setTimeout(() => inp.focus(), 20);
      const done = (v) => { wrap.remove(); resolve(v); };
      wrap.querySelector("#acOk").onclick = () => done(inp.value.trim());
      wrap.querySelector("#acNo").onclick = () => done(null);
      inp.addEventListener("keydown", (e) => { if (e.key === "Enter") done(inp.value.trim()); });
    }));
  }

  async function call(input, opts, json, retried) {
    opts = opts || {};
    if (opts.signal && opts.signal.aborted) throw { code: "cancelled", message: "cancelled" };
    let res;
    try {
      res = await fetch("/api/sample", {
        method: "POST",
        headers: { "content-type": "application/json", "x-iknow-code": getCode(), "x-iknow-device": deviceId() },
        body: JSON.stringify({ input, json: !!json, modelTier: opts.modelTier || "default" }),
        signal: opts.signal,
      });
    } catch (e) {
      if (e && e.name === "AbortError") throw { code: "cancelled", message: "cancelled" };
      throw { code: "unavailable", message: "network" };
    }
    let data = {};
    try { data = await res.json(); } catch (e) {}
    if (res.status === 401 && (data.code === "needs_code" || data.code === "revoked") && (retried || 0) < 3) {
      const c = await askCode(!!getCode() || (retried || 0) > 0, data.code);
      if (!c) throw { code: "needs_code", message: "no invite code" };
      setCode(c);
      return call(input, opts, json, (retried || 0) + 1);
    }
    if (res.status === 401) { try { localStorage.removeItem(CODE_KEY); } catch (e) {} throw { code: "needs_code", message: "wrong invite code" }; }
    if (!res.ok) throw { code: data.code || (res.status === 429 ? "rate_limited" : "unavailable"), message: "HTTP " + res.status };
    const text = String(data.text || "");
    if (opts.onText) { try { opts.onText({ text, delta: text }); } catch (e) {} }
    return { text, truncated: !!data.truncated };
  }

  function parseJson(text) {
    const s = String(text).trim();
    try { return JSON.parse(s); } catch (e) {}
    const f = /```(?:json)?\s*([\s\S]*?)```/i.exec(s); if (f) { try { return JSON.parse(f[1]); } catch (e) {} }
    const a = Math.min(...["{", "["].map((c) => { const i = s.indexOf(c); return i < 0 ? Infinity : i; }));
    const b = Math.max(s.lastIndexOf("}"), s.lastIndexOf("]"));
    if (isFinite(a) && b > a) { try { return JSON.parse(s.slice(a, b + 1)); } catch (e) {} }
    throw { code: "invalid_json", message: "no JSON", text: s };
  }

  const sample = (input, opts) => call(input, opts, false);
  sample.json = async (input, opts) => { const r = await call(input, opts, true); return parseJson(r.text); };
  sample.limits = async () => ({ inputBytes: 256 * 1024 });

  const downloads = {
    save: async ({ filename, data }) => {
      const blob = data instanceof Blob ? data : new Blob([data], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = filename || "iknow-diary.md";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      return { status: "saved" };
    },
  };

  const caps = { sample, downloads };
  window.claude = { use: async (name) => caps[name] || null };

  /* The privacy notice must describe this version truthfully. */
  const en = document.getElementById("aboutEn"), hi = document.getElementById("aboutHi");
  if (en) en.innerHTML = `
    <p><strong>What IKnOw is.</strong> A private diary that writes back in a voice you choose. The voices are written by Claude, an AI made by Anthropic. They are not real people, and IKnOw is not therapy, medical, legal or emergency advice.</p>
    <p><strong>Where your diary lives.</strong> Only in this browser, on this phone. There is no account and no IKnOw database. If you clear this browser's data or switch phones, the diary is gone, so use "Export my diary" now and then.</p>
    <p><strong>What is stored here.</strong> Your entries, the replies, your moods, whether a reply helped, your people list, your name, your settings, any imported style, and a scrambled (hashed) form of your PIN. Your PIN itself is never stored.</p>
    <p><strong>How replies are made.</strong> To write a reply, the text needed for it (that day's entries, your voice settings, your name, the names under My people, and, if switched on, your last three days or an imported style) is sent through this app's server to Anthropic's Claude API. The server passes it on and keeps nothing. Anthropic handles it under its API terms.</p>
    <p><strong>Imported chats.</strong> The WhatsApp file is read on this phone and let go once read. Only what you pick is kept, here on this phone.</p>
    <p><strong>Your control.</strong> Export everything, delete a page, or delete everything at any time.</p>
    <p><strong>Help.</strong> Tele-MANAS: 14416 or 1-800-891-4416 (free, 24×7, many languages). Emergency: 112.</p>
    <p class="consent" id="consentLine"></p>`;
  if (hi) hi.innerHTML = `
    <p><strong>IKnOw क्या है।</strong> एक निजी डायरी जो आपकी चुनी हुई आवाज़ में जवाब देती है। ये आवाज़ें Claude लिखता है, जो Anthropic का एक AI है। ये असली लोग नहीं हैं, और IKnOw थेरेपी, डॉक्टरी, क़ानूनी या आपातकालीन सलाह नहीं है।</p>
    <p><strong>आपकी डायरी कहाँ रहती है।</strong> सिर्फ़ इस ब्राउज़र में, इसी फ़ोन पर। कोई अकाउंट नहीं, कोई IKnOw डेटाबेस नहीं। ब्राउज़र का डेटा मिटाने या फ़ोन बदलने पर डायरी चली जाएगी, इसलिए कभी-कभी "मेरी डायरी एक्सपोर्ट करें" कर लीजिए।</p>
    <p><strong>यहाँ क्या सेव होता है।</strong> आपकी बातें, जवाब, मूड, कोई जवाब हल्का लगा या नहीं, आपके लोग, आपका नाम, सेटिंग्स, इम्पोर्ट किया गया अंदाज़, और PIN का एक सुरक्षित (hash किया हुआ) रूप। असली PIN कभी सेव नहीं होता।</p>
    <p><strong>जवाब कैसे बनते हैं।</strong> जवाब लिखने के लिए ज़रूरी बातें (उस दिन की बातें, आवाज़ की सेटिंग्स, आपका नाम, My people के नाम, और अगर चालू हो तो पिछले तीन दिन या इम्पोर्ट किया गया अंदाज़) इस ऐप के सर्वर से होकर Anthropic के Claude API को भेजी जाती हैं। सर्वर इन्हें आगे भेजता है और कुछ नहीं रखता।</p>
    <p><strong>इम्पोर्ट की गई चैट।</strong> WhatsApp फ़ाइल इसी फ़ोन पर पढ़ी जाती है और पढ़ने के बाद छोड़ दी जाती है। सिर्फ़ आपका चुना हुआ हिस्सा, इसी फ़ोन पर रखा जाता है।</p>
    <p><strong>आपका नियंत्रण।</strong> कभी भी सब कुछ एक्सपोर्ट करें, एक पन्ना या सब कुछ हटाएँ।</p>
    <p><strong>मदद।</strong> टेली-मानस: 14416 या 1-800-891-4416 (मुफ़्त, 24×7)। आपातकाल: 112।</p>
    <p class="consent" id="consentLineHi"></p>`;
})();
