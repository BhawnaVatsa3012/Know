/* Dear Mann standalone adapter.
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
  const TOKEN_KEY = "iknow:device-token";
  let memToken = "";
  function deviceToken() {        // a random secret for this browser; the owner approves or switches it off
    try { const v = localStorage.getItem(TOKEN_KEY); if (v && /^[A-Za-z0-9_-]{43}$/.test(v)) return v; } catch (e) {}
    if (memToken) return memToken;
    const r = new Uint8Array(32); crypto.getRandomValues(r);
    memToken = btoa(String.fromCharCode.apply(null, r)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    try { localStorage.setItem(TOKEN_KEY, memToken); } catch (e) {}
    return memToken;
  }
  const SESSION_KEY = "iknow:session";
  const getSession = () => { try { return localStorage.getItem(SESSION_KEY) || ""; } catch (e) { return ""; } };
  const setSession = (v) => { try { v ? localStorage.setItem(SESSION_KEY, v) : localStorage.removeItem(SESSION_KEY); } catch (e) {} };

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
      const links = device && info.links;
      const id = deviceId();
      const L = hi ? {
        h: device ? "इस फ़ोन के लिए कोड" : "इनवाइट कोड डालिए",
        p: device ? "हर फ़ोन का अपना कोड होता है, जो सिर्फ़ उसी फ़ोन पर चलता है। कोड माँगिए, फिर यहाँ डालिए। यह इस फ़ोन पर एक बार ही माँगा जाएगा।"
                  : "जवाब पाने के लिए इस Dear Mann का इनवाइट कोड चाहिए। यह एक बार ही माँगा जाएगा।",
        idL: "इस फ़ोन की ID", req: "WhatsApp पर कोड माँगें", reqM: "ईमेल से कोड माँगें",
        wrong: "यह कोड इस फ़ोन के लिए नहीं है। ध्यान दें: कोड सिर्फ़ उसी फ़ोन पर चलता है जिसकी ID से बना है।",
        rev: "इस फ़ोन की पहुँच बंद कर दी गई है। नया कोड माँगें।",
        lab: device ? "इस फ़ोन का कोड" : "इनवाइट कोड", no: "रद्द करें", ok: "ठीक है",
        msg: "नमस्ते, मुझे Dear Mann का कोड चाहिए। मेरे फ़ोन की ID: " + id
      } : {
        h: device ? "A code for this phone" : "Enter your invite code",
        p: device ? "Each phone has its own code, and it only works on that phone. Request one, then enter it here. You'll only be asked once on this phone."
                  : "Replies on this Dear Mann need an invite code. You'll only be asked once on this phone.",
        idL: "This phone's ID", req: "Request a code on WhatsApp", reqM: "Request a code by email",
        wrong: "That code isn't for this phone. A code only works on the phone whose ID it was made for.",
        rev: "Access for this phone has been switched off. Request a new code.",
        lab: device ? "This phone's code" : "Invite code", no: "Cancel", ok: "Continue",
        msg: "Hi, I'd like an Dear Mann code. My phone ID: " + id
      };
      if (links) Object.assign(L, hi ? {
        h: "Dear Mann सिर्फ़ न्योते पर है",
        p: "जवाब पाने के लिए साइन-इन लिंक माँगिए और उसे इसी फ़ोन पर, उसी ब्राउज़र में खोलिए जिसमें Dear Mann है। या अगर आपको इस फ़ोन का कोड मिला है, तो नीचे डालिए।",
        req: "WhatsApp पर साइन-इन लिंक माँगें", reqM: "ईमेल से साइन-इन लिंक माँगें",
        rev: "इस फ़ोन की पहुँच बंद कर दी गई है। नया साइन-इन लिंक माँगें।",
        lab: "या इस फ़ोन का कोड", msg: "नमस्ते, मुझे Dear Mann का साइन-इन लिंक चाहिए। (फ़ोन ID: " + id + ")"
      } : {
        h: "Dear Mann is invite-only",
        p: "To get replies, ask for a sign-in link and open it on this phone, in the browser you use Dear Mann in. Or, if you were sent a code for this phone, enter it below.",
        req: "Ask for a sign-in link on WhatsApp", reqM: "Ask for a sign-in link by email",
        rev: "Access for this phone has been switched off. Ask for a new sign-in link.",
        lab: "Or this phone's code", msg: "Hi, I'd like an Dear Mann sign-in link. (Phone ID: " + id + ")"
      });
      const wa = device && info.whatsapp ? "https://wa.me/" + info.whatsapp + "?text=" + encodeURIComponent(L.msg) : "";
      const ml = device && info.email ? "mailto:" + info.email + "?subject=" + encodeURIComponent("Dear Mann code") + "&body=" + encodeURIComponent(L.msg) : "";
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


  /* Owner-managed access: ask, wait for approval, or see that access was switched off. */
  function askAccess(state) {
    return access().then((info) => new Promise((resolve) => {
      const hi = (document.documentElement.lang === "hi");
      const L = hi ? {
        needH: "Dear Mann सिर्फ़ न्योते पर है", needP: "इस फ़ोन से पहुँच माँगिए। ऐप चलाने वाले के मंज़ूर करते ही जवाब आने लगेंगे। आपकी बात सेव है।",
        nameL: "आपका नाम (ताकि उन्हें पता चले कि आप हैं)", ask: "पहुँच माँगें",
        waitH: "मंज़ूरी का इंतज़ार", waitP: "आपकी माँग भेज दी गई है। मंज़ूर होते ही जवाब आने लगेंगे। आपकी बात सेव है।",
        nudge: "WhatsApp पर उन्हें बता दें", check: "फिर देखें",
        revH: "पहुँच बंद है", revP: "ऐप चलाने वाले ने इस फ़ोन की पहुँच बंद कर दी है। आपकी बात सेव है।", again: "फिर से माँगें",
        close: "बंद करें", fail: "माँग नहीं भेजी जा सकी। कनेक्शन देखकर फिर कोशिश करें।", busy: "अभी बहुत माँगें आ रही हैं। थोड़ी देर बाद कोशिश करें।",
        msg: (n) => "नमस्ते, मैंने अपने फ़ोन से Dear Mann की पहुँच माँगी है" + (n ? " (" + n + ")" : "") + "।"
      } : {
        needH: "Dear Mann is invite-only", needP: "Ask for access from this phone. Replies start as soon as the owner approves it. Your entry is saved.",
        nameL: "Your name (so they know it's you)", ask: "Ask for access",
        waitH: "Waiting for approval", waitP: "Your request has been sent. Replies start as soon as the owner approves it. Your entry is saved.",
        nudge: "Let them know on WhatsApp", check: "Check now",
        revH: "Access is switched off", revP: "The owner has switched off access for this phone. Your entry is saved.", again: "Ask again",
        close: "Close", fail: "Couldn't send the request. Check your connection and try again.", busy: "Too many requests right now. Try again a little later.",
        msg: (n) => "Hi, I've asked for Dear Mann access from my phone" + (n ? " (" + n + ")" : "") + "."
      };
      const wrap = document.createElement("div");
      wrap.className = "layer open"; wrap.style.zIndex = "60";
      document.body.appendChild(wrap);
      const done = (v) => { wrap.remove(); resolve(v); };
      const NAME_KEY = "iknow:request-name";
      const getName = () => { try { return localStorage.getItem(NAME_KEY) || ""; } catch (e) { return ""; } };
      const card = (h, inner, acts) => { wrap.innerHTML = `<div class="scrim"></div><div class="dialog" role="dialog" aria-modal="true" aria-labelledby="axH"><h3 id="axH">${h}</h3><div class="dbody">${inner}</div><div class="acts">${acts}</div></div>`; };
      const showWait = () => {
        const wa = info.whatsapp ? "https://wa.me/" + info.whatsapp + "?text=" + encodeURIComponent(L.msg(getName())) : "";
        card(L.waitH, `<p id="axMsg">${L.waitP}</p>${wa ? `<p><a class="btn btn-secondary" id="axNudge" href="${esc(wa)}" target="_blank" rel="noopener">${L.nudge}</a></p>` : ""}`,
          `<button class="btn btn-secondary" type="button" id="axClose">${L.close}</button><button class="btn btn-primary" type="button" id="axCheck">${L.check}</button>`);
        wrap.querySelector("#axClose").onclick = () => done(null);
        wrap.querySelector("#axCheck").onclick = () => done("retry");
      };
      const showAsk = (h, p, btn) => {
        card(h, `<p>${p}</p><label class="flabel" for="axName">${L.nameL}</label><input class="field" id="axName" maxlength="40" autocomplete="name" value="${esc(getName())}"><p id="axErr" style="color:var(--danger)"></p>`,
          `<button class="btn btn-secondary" type="button" id="axClose">${L.close}</button><button class="btn btn-primary" type="button" id="axAsk">${btn}</button>`);
        wrap.querySelector("#axClose").onclick = () => done(null);
        wrap.querySelector("#axAsk").onclick = async () => {
          const b = wrap.querySelector("#axAsk"); b.disabled = true;
          const name = wrap.querySelector("#axName").value.trim().slice(0, 40);
          try { localStorage.setItem(NAME_KEY, name); } catch (e) {}
          try {
            const r = await fetch(info.accessUrl, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "request", token: deviceToken(), label: name }) });
            const d = await r.json().catch(() => ({}));
            if (r.ok && d.status === "active") { done("retry"); return; }
            if (r.ok) { showWait(); return; }
            wrap.querySelector("#axErr").textContent = r.status === 429 ? L.busy : L.fail; b.disabled = false;
          } catch (e) { wrap.querySelector("#axErr").textContent = L.fail; b.disabled = false; }
        };
      };
      if (state === "pending") showWait();
      else if (state === "revoked") showAsk(L.revH, L.revP, L.again);
      else showAsk(L.needH, L.needP, L.ask);
    }));
  }

  async function call(input, opts, json, retried) {
    opts = opts || {};
    if (opts.signal && opts.signal.aborted) throw { code: "cancelled", message: "cancelled" };
    let res;
    try {
      res = await fetch("/api/sample", {
        method: "POST",
        headers: { "content-type": "application/json", "x-iknow-code": getCode(), "x-iknow-device": deviceId(), "x-iknow-session": getSession(), "x-iknow-token": deviceToken() },
        body: JSON.stringify({ input, json: !!json, modelTier: opts.modelTier || "default" }),
        signal: opts.signal,
      });
    } catch (e) {
      if (e && e.name === "AbortError") throw { code: "cancelled", message: "cancelled" };
      throw { code: "unavailable", message: "network" };
    }
    let data = {};
    try { data = await res.json(); } catch (e) {}
    if (res.status === 401 && ["needs_access", "pending", "access_revoked"].includes(data.code)) {
      if ((retried || 0) >= 4) throw { code: data.code, message: "no access yet" };
      const next = await askAccess(data.code === "access_revoked" ? "revoked" : data.code);
      if (next !== "retry") throw { code: data.code, message: "no access yet" };
      return call(input, opts, json, (retried || 0) + 1);
    }
    if (res.status === 401 && getSession()) setSession("");      // a switched-off or stale session: fall back to asking
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
      const a = document.createElement("a"); a.href = url; a.download = filename || "dear-mann-diary.md";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      return { status: "saved" };
    },
  };


  /* One-time sign-in links: know-zeta.vercel.app/#join=<token>.
     The link is only used up when the person taps Activate, so opening it in the wrong place wastes nothing. */
  function inAppBrowser() { return /WhatsApp|FBAN|FBAV|Instagram|Line\/|; wv\)/i.test(navigator.userAgent || ""); }
  function joinToken() { const m = /(?:^#|&)join=([^&]+)/.exec(location.hash || ""); return m ? decodeURIComponent(m[1]) : ""; }
  function clearJoin() { try { history.replaceState(null, "", location.pathname + location.search); } catch (e) { location.hash = ""; } }

  function showActivate(token) {
    const hi = (document.documentElement.lang === "hi") || /^hi/i.test(navigator.language || "");
    const L = hi ? {
      h: "इस फ़ोन पर Dear Mann चालू करें",
      p: "यह लिंक सिर्फ़ एक बार, एक ही फ़ोन पर चलता है। इसे उसी ब्राउज़र में खोलिए जिसमें आप Dear Mann इस्तेमाल करेंगे (Chrome या Safari), फिर चालू करें दबाइए।",
      inapp: "लगता है आप WhatsApp के अंदर वाले ब्राउज़र में हैं। पहले ⋮ या शेयर आइकन दबाकर “Chrome में खोलें” (या Safari) चुनिए, वरना आपकी डायरी यहीं अटक जाएगी।",
      go: "इस फ़ोन पर चालू करें", no: "अभी नहीं", wait: "चालू हो रहा है…", done: "हो गया! Dear Mann इस फ़ोन पर चालू है।", ok: "ठीक है",
      e: { used: "यह लिंक पहले ही इस्तेमाल हो चुका है। नया लिंक माँगिए।", expired: "यह लिंक पुराना हो गया है (7 दिन)। नया लिंक माँगिए।",
           bad_link: "यह लिंक सही नहीं है। पूरा लिंक दोबारा खोलकर देखें।", revoked: "यह लिंक बंद कर दिया गया है।",
           links_off: "साइन-इन लिंक अभी चालू नहीं हैं।", links_not_ready: "साइन-इन लिंक अभी तैयार नहीं हैं। ऐप चलाने वाले को बताइए।",
           rate_limited: "बहुत बार कोशिश हुई। एक मिनट रुकिए।", net: "कनेक्शन नहीं मिला। फिर कोशिश करें।" },
      already: "यह फ़ोन पहले से चालू है। लिंक इस्तेमाल नहीं हुआ, इसे किसी और को मत दीजिए।"
    } : {
      h: "Activate Dear Mann on this phone",
      p: "This link works once, on one phone. Open it in the browser you'll use Dear Mann in (Chrome or Safari), then tap Activate.",
      inapp: "It looks like you're inside WhatsApp's own browser. Tap ⋮ or the share icon and choose “Open in Chrome” (or Safari) first, or your diary will be stuck in here.",
      go: "Activate on this phone", no: "Not now", wait: "Activating…", done: "Done! Dear Mann is active on this phone.", ok: "OK",
      e: { used: "This link has already been used. Ask for a new one.", expired: "This link has expired (links last 7 days). Ask for a new one.",
           bad_link: "This link isn't valid. Try opening the whole link again.", revoked: "This link has been switched off.",
           links_off: "Sign-in links aren't switched on.", links_not_ready: "Sign-in links aren't ready yet. Let the person who runs this Dear Mann know.",
           rate_limited: "Too many tries. Wait a minute.", net: "No connection. Try again." },
      already: "This phone is already active. The link wasn't used, so don't pass it on."
    };
    const wrap = document.createElement("div");
    wrap.className = "layer open"; wrap.style.zIndex = "70";
    const card = (inner) => `<div class="scrim"></div><div class="dialog" role="dialog" aria-modal="true" aria-labelledby="jH">${inner}</div>`;
    const close = () => { wrap.remove(); clearJoin(); };
    const message = (t, good) => {
      wrap.innerHTML = card(`<h3 id="jH">${L.h}</h3><div class="dbody"><p id="jMsg" ${good ? "" : 'style="color:var(--danger)"'}>${t}</p></div>
        <div class="acts"><button class="btn btn-primary" type="button" id="jOk">${L.ok}</button></div>`);
      wrap.querySelector("#jOk").onclick = close;
    };
    document.body.appendChild(wrap);
    if (getSession()) { message(L.already, true); return; }
    wrap.innerHTML = card(`<h3 id="jH">${L.h}</h3><div class="dbody"><p>${L.p}</p>
      ${inAppBrowser() ? `<p id="jInApp" style="color:var(--danger)">${L.inapp}</p>` : ""}<p id="jErr" style="color:var(--danger)"></p></div>
      <div class="acts"><button class="btn btn-secondary" type="button" id="jNo">${L.no}</button><button class="btn btn-primary" type="button" id="jGo">${L.go}</button></div>`);
    wrap.querySelector("#jNo").onclick = () => wrap.remove();          // keep the link in the address bar for later
    wrap.querySelector("#jGo").onclick = async () => {
      const b = wrap.querySelector("#jGo"); b.disabled = true; b.textContent = L.wait;
      let r, data = {};
      try { r = await fetch("/api/activate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token }) }); data = await r.json(); }
      catch (e) { wrap.querySelector("#jErr").textContent = L.e.net; b.disabled = false; b.textContent = L.go; return; }
      if (r.ok && data.session) { setSession(data.session); clearJoin(); message(L.done, true); return; }
      message(L.e[data.code] || L.e.bad_link, false);
    };
  }

  function initJoin() { const t = joinToken(); if (t) showActivate(t); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => setTimeout(initJoin, 300)); else setTimeout(initJoin, 300);

  const caps = { sample, downloads };
  window.claude = { use: async (name) => caps[name] || null };

  /* The privacy notice must describe this version truthfully. */
  const en = document.getElementById("aboutEn"), hi = document.getElementById("aboutHi");
  if (en) en.innerHTML = `
    <p><strong>What Dear Mann is.</strong> A private diary that writes back in a voice you choose. The voices are written by Claude, an AI made by Anthropic. They are not real people, and Dear Mann is not therapy, medical, legal or emergency advice.</p>
    <p><strong>Where your diary lives.</strong> Only in this browser, on this phone. There is no account and no Dear Mann database. If you clear this browser's data or switch phones, the diary is gone, so use "Export my diary" now and then.</p>
    <p><strong>What is stored here.</strong> Your entries, the replies, your moods, whether a reply helped, your people list, your name, your settings, any imported style, and a scrambled (hashed) form of your PIN. Your PIN itself is never stored.</p>
    <p><strong>How replies are made.</strong> To write a reply, the text needed for it (that day's entries, your voice settings, your name, the names under My people, and, if switched on, your last three days or an imported style) is sent through this app's server to Anthropic's Claude API. The server passes it on and keeps nothing. Anthropic handles it under its API terms.</p>
    <p><strong>Imported chats.</strong> The WhatsApp file is read on this phone and let go once read. Only what you pick is kept, here on this phone.</p>
    <p><strong>Your control.</strong> Export everything, delete a page, or delete everything at any time.</p>
    <p><strong>Help.</strong> Tele-MANAS: 14416 or 1-800-891-4416 (free, 24×7, many languages). Emergency: 112.</p>
    <p class="consent" id="consentLine"></p>`;
  if (hi) hi.innerHTML = `
    <p><strong>Dear Mann क्या है।</strong> एक निजी डायरी जो आपकी चुनी हुई आवाज़ में जवाब देती है। ये आवाज़ें Claude लिखता है, जो Anthropic का एक AI है। ये असली लोग नहीं हैं, और Dear Mann थेरेपी, डॉक्टरी, क़ानूनी या आपातकालीन सलाह नहीं है।</p>
    <p><strong>आपकी डायरी कहाँ रहती है।</strong> सिर्फ़ इस ब्राउज़र में, इसी फ़ोन पर। कोई अकाउंट नहीं, कोई Dear Mann डेटाबेस नहीं। ब्राउज़र का डेटा मिटाने या फ़ोन बदलने पर डायरी चली जाएगी, इसलिए कभी-कभी "मेरी डायरी एक्सपोर्ट करें" कर लीजिए।</p>
    <p><strong>यहाँ क्या सेव होता है।</strong> आपकी बातें, जवाब, मूड, कोई जवाब हल्का लगा या नहीं, आपके लोग, आपका नाम, सेटिंग्स, इम्पोर्ट किया गया अंदाज़, और PIN का एक सुरक्षित (hash किया हुआ) रूप। असली PIN कभी सेव नहीं होता।</p>
    <p><strong>जवाब कैसे बनते हैं।</strong> जवाब लिखने के लिए ज़रूरी बातें (उस दिन की बातें, आवाज़ की सेटिंग्स, आपका नाम, My people के नाम, और अगर चालू हो तो पिछले तीन दिन या इम्पोर्ट किया गया अंदाज़) इस ऐप के सर्वर से होकर Anthropic के Claude API को भेजी जाती हैं। सर्वर इन्हें आगे भेजता है और कुछ नहीं रखता।</p>
    <p><strong>इम्पोर्ट की गई चैट।</strong> WhatsApp फ़ाइल इसी फ़ोन पर पढ़ी जाती है और पढ़ने के बाद छोड़ दी जाती है। सिर्फ़ आपका चुना हुआ हिस्सा, इसी फ़ोन पर रखा जाता है।</p>
    <p><strong>आपका नियंत्रण।</strong> कभी भी सब कुछ एक्सपोर्ट करें, एक पन्ना या सब कुछ हटाएँ।</p>
    <p><strong>मदद।</strong> टेली-मानस: 14416 या 1-800-891-4416 (मुफ़्त, 24×7)। आपातकाल: 112।</p>
    <p class="consent" id="consentLineHi"></p>`;
})();
