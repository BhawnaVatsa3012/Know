// IKnOw access service (Supabase Edge Function "iknow-access").
// Keeps the list of phones that asked for access, the owner's decision for each,
// and the owner's account. Stores no diary text. Phones are known only by a hash
// of a random token their browser made, plus an optional name the person typed.
import postgres from "npm:postgres@3.4.5";

const APP_URL = Deno.env.get("IKNOW_APP_URL") || "https://know-zeta.vercel.app";
const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { max: 3, prepare: false, idle_timeout: 20 });

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
};
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "content-type": "application/json", "cache-control": "no-store" } });

const enc = new TextEncoder();
const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
const sha256 = async (s: string) => hex(await crypto.subtle.digest("SHA-256", enc.encode(s)));
const randomToken = () => { const b = new Uint8Array(32); crypto.getRandomValues(b); return btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); };
const validToken = (t: unknown) => typeof t === "string" && /^[A-Za-z0-9_-]{32,64}$/.test(t);
const clean = (s: unknown, n: number) => String(s ?? "").replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, n);

async function pbkdf2(password: string, saltHex: string, iterations: number) {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const salt = new Uint8Array(saltHex.match(/../g)!.map((h) => parseInt(h, 16)));
  return hex(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256));
}
const ITER = 210000;
function sameHex(a: string, b: string) { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; }

// Simple rate limits kept in the database (work across instances).
async function limited(kind: string, key: string, max: number, minutes: number) {
  const [{ n }] = await sql`select count(*)::int as n from iknow.attempts where kind = ${kind} and key = ${key} and at > now() - make_interval(mins => ${minutes})`;
  return n >= max;
}
const note = (kind: string, key: string) => sql`insert into iknow.attempts (kind, key) values (${kind}, ${key})`;

async function ownerExists() { const r = await sql`select 1 from iknow.owner where id = 1`; return r.length > 0; }

async function ownerSession(session: unknown) {
  if (!validToken(session)) return false;
  const h = await sha256(session as string);
  const r = await sql`select 1 from iknow.owner_sessions where token_hash = ${h} and expires_at > now()`;
  return r.length > 0;
}
async function newOwnerSession() {
  const t = randomToken();
  await sql`insert into iknow.owner_sessions (token_hash, expires_at) values (${await sha256(t)}, now() + interval '30 days')`;
  await sql`delete from iknow.owner_sessions where expires_at < now()`;
  return t;
}

// The owner proves who they are once, at setup, with the invite code currently set in Vercel.
async function inviteCodeIsRight(code: string) {
  try {
    const r = await fetch(APP_URL + "/api/verify-code", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code }) });
    return r.status === 200;
  } catch { return false; }
}

async function deviceView() {
  return await sql`select id, label, status, is_owner, requested_at, decided_at, last_seen_at from iknow.devices order by
    case status when 'pending' then 0 when 'active' then 1 else 2 end, coalesce(decided_at, requested_at) desc limit 500`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json(405, { code: "bad_request" });
  let b: Record<string, unknown> = {};
  try { b = await req.json(); } catch { return json(400, { code: "bad_request" }); }
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";

  try {
    switch (b.action) {
      // ---- for the app and the reply server ----
      case "check": {                      // is this phone allowed?
        const managed = await ownerExists();
        if (!managed) return json(200, { managed: false });
        if (!validToken(b.token)) return json(200, { managed: true, status: "none" });
        const h = await sha256(b.token as string);
        const r = await sql`update iknow.devices set last_seen_at = case when last_seen_at is null or last_seen_at < now() - interval '5 minutes' then now() else last_seen_at end
                            where token_hash = ${h} returning status`;
        return json(200, { managed: true, status: r.length ? r[0].status : "none" });
      }
      case "request": {                    // a phone asks for access
        if (!(await ownerExists())) return json(409, { code: "not_managed" });
        if (!validToken(b.token)) return json(400, { code: "bad_request" });
        const h = await sha256(b.token as string);
        const label = clean(b.label, 40) || null;
        const cur = await sql`select status from iknow.devices where token_hash = ${h}`;
        if (cur.length && cur[0].status !== "revoked") {
          if (label) await sql`update iknow.devices set label = ${label} where token_hash = ${h} and status = 'pending'`;
          return json(200, { status: cur[0].status });
        }
        if (await limited("request", ip, 5, 60)) return json(429, { code: "rate_limited" });
        const [{ n }] = await sql`select count(*)::int as n from iknow.devices where status = 'pending'`;
        if (n >= 100) return json(429, { code: "too_many_requests" });
        await note("request", ip);
        if (cur.length) await sql`update iknow.devices set status = 'pending', label = coalesce(${label}, label), requested_at = now(), decided_at = null where token_hash = ${h}`;
        else await sql`insert into iknow.devices (token_hash, label) values (${h}, ${label})`;
        return json(200, { status: "pending" });
      }

      // ---- for the owner ----
      case "state": return json(200, { claimed: await ownerExists() });
      case "claim": {
        if (await ownerExists()) return json(409, { code: "already_claimed" });
        if (await limited("claim", "all", 10, 60)) return json(429, { code: "rate_limited" });
        await note("claim", "all");
        const username = clean(b.username, 40), password = String(b.password ?? "");
        if (username.length < 3) return json(400, { code: "bad_username" });
        if (password.length < 8 || password.length > 200) return json(400, { code: "weak_password" });
        if (!(await inviteCodeIsRight(String(b.invite ?? "")))) return json(403, { code: "bad_invite" });
        const salt = hex(crypto.getRandomValues(new Uint8Array(16)).buffer);
        const ins = await sql`insert into iknow.owner (id, username, pass_salt, pass_hash, iterations)
                              values (1, ${username}, ${salt}, ${await pbkdf2(password, salt, ITER)}, ${ITER}) on conflict (id) do nothing returning id`;
        if (!ins.length) return json(409, { code: "already_claimed" });
        if (validToken(b.token)) {           // the owner's own phone gets access straight away
          const h = await sha256(b.token as string);
          await sql`insert into iknow.devices (token_hash, label, status, is_owner, decided_at) values (${h}, 'You (owner)', 'active', true, now())
                    on conflict (token_hash) do update set status = 'active', is_owner = true, decided_at = now()`;
        }
        return json(200, { session: await newOwnerSession() });
      }
      case "login": {
        if (await limited("login_fail", "all", 8, 15)) return json(429, { code: "rate_limited" });
        const r = await sql`select username, pass_salt, pass_hash, iterations from iknow.owner where id = 1`;
        const ok = r.length && clean(b.username, 40).toLowerCase() === r[0].username.toLowerCase() &&
                   sameHex(await pbkdf2(String(b.password ?? ""), r[0].pass_salt, r[0].iterations), r[0].pass_hash);
        if (!ok) { await note("login_fail", "all"); return json(401, { code: "bad_login" }); }
        if (validToken(b.token)) {
          const h = await sha256(b.token as string);
          await sql`insert into iknow.devices (token_hash, label, status, is_owner, decided_at) values (${h}, 'You (owner)', 'active', true, now())
                    on conflict (token_hash) do update set status = 'active', is_owner = true`;
        }
        return json(200, { session: await newOwnerSession() });
      }
      case "logout": {
        if (validToken(b.session)) await sql`delete from iknow.owner_sessions where token_hash = ${await sha256(b.session as string)}`;
        return json(200, { ok: true });
      }
      case "list": {
        if (!(await ownerSession(b.session))) return json(401, { code: "signed_out" });
        return json(200, { devices: await deviceView() });
      }
      case "decide": {
        if (!(await ownerSession(b.session))) return json(401, { code: "signed_out" });
        const id = String(b.id ?? "");
        if (!/^[0-9a-f-]{36}$/.test(id)) return json(400, { code: "bad_request" });
        if (b.to === "delete") await sql`delete from iknow.devices where id = ${id} and is_owner = false`;
        else if (b.to === "active" || b.to === "revoked") await sql`update iknow.devices set status = ${b.to as string}, decided_at = now() where id = ${id} and (is_owner = false or ${b.to as string} = 'active')`;
        else return json(400, { code: "bad_request" });
        return json(200, { devices: await deviceView() });
      }
      case "password": {
        if (!(await ownerSession(b.session))) return json(401, { code: "signed_out" });
        const r = await sql`select pass_salt, pass_hash, iterations from iknow.owner where id = 1`;
        if (!sameHex(await pbkdf2(String(b.old ?? ""), r[0].pass_salt, r[0].iterations), r[0].pass_hash)) return json(403, { code: "bad_login" });
        const pw = String(b.password ?? "");
        if (pw.length < 8 || pw.length > 200) return json(400, { code: "weak_password" });
        const salt = hex(crypto.getRandomValues(new Uint8Array(16)).buffer);
        await sql`update iknow.owner set pass_salt = ${salt}, pass_hash = ${await pbkdf2(pw, salt, ITER)}, iterations = ${ITER} where id = 1`;
        await sql`delete from iknow.owner_sessions where token_hash <> ${await sha256(b.session as string)}`;   // sign out everywhere else
        return json(200, { ok: true });
      }
      default: return json(400, { code: "bad_request" });
    }
  } catch (e) {
    console.error("iknow_access_error", String((e as Error)?.message || e).slice(0, 300));
    return json(500, { code: "unavailable" });
  }
});
