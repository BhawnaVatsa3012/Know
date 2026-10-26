# Dear Mann (formerly IKnOw): handover

Last updated: 26 Oct 2026. Read this first in any new session about the app.

## What it is
A private diary that writes back in a chosen voice: Dear diary (just listens), Best friend (Facts / Sympathy), Spouse (comfort + a pinch of reality), Mom (only wants your smile back), You decide (app picks). Every reply ends with a handwritten "I know." English, Hindi, Hinglish. Renamed from IKnOw to Dear Mann because of a pregnancy-test brand with the same name; the "I know." signature was kept on purpose.

## Where everything lives
| Thing | Where |
|---|---|
| Code (source of truth) | GitHub `BhawnaVatsa3012/Know` (public), branch `main` |
| Live website | https://know-zeta.vercel.app (Vercel project `know`, team "vatsabhawna-6941's projects") |
| Owner dashboard | https://know-zeta.vercel.app/owner |
| In-Claude version | Claude artifact https://claude.ai/artifact/NgeaVH8u5wEBFBFxzGdazj (uses Claude's own storage and replies) |
| Access service | Supabase project `parv-app` (ref `wijnzuwcluzalvpobpbr`, Mumbai), Edge Function `iknow-access`, private schema `iknow` |
| User guide | Dear_Mann_User_Guide.docx (18 pages, 24 screenshots) sent in chat |

## Repo layout
- `src/iknow.html`: the whole app (same file runs inside Claude). Edit this.
- `build.py`: makes `index.html` from `src/iknow.html` (adds `standalone.js` + web wording). Run `python3 build.py` after editing.
- `standalone.js`: web adapter: replies via `/api/sample`, storage in browser localStorage, export as download, access dialogs (ask for access / waiting / switched off), older invite-code, phone-code and sign-in-link dialogs.
- `owner.html`: owner page (create account, sign in, approve / decline / switch off / turn back on / remove, change password).
- `api/sample.js`: calls Anthropic Messages API. Checks access first (owner-approved mode via Supabase, 30 s cache), falls back to invite code if the service is unreachable. Names API errors (bad key, no credit, workspace, model, busy) and logs only status + reason, never diary text.
- `api/access.js`: tells the app the access mode, access-service URL, owner WhatsApp; reports `managed` (owner account exists).
- `api/verify-code.js`: checks the invite code; used once when the owner creates the owner account.
- `api/_device.js`, `api/_link.js`, `api/activate.js`: older phone-code and one-time-link mechanisms (inactive once the owner account exists; links also need a Vercel Blob store that was never created).
- `supabase/functions/iknow-access/index.ts`: access service source (deployed separately to Supabase; not deployed by Vercel).

## Vercel environment variables (values are only in Vercel; never paste them in chat)
- `ANTHROPIC_API_KEY`: set. Key named `iknow-vercel`, inside an Anthropic workspace (a key not tied to a workspace failed; `ANTHROPIC_WORKSPACE_ID` is supported but not needed now). Credit has been bought.
- `IKNOW_ACCESS_CODE`: set (owner's invite code; proves ownership when creating the owner account).
- `IKNOW_DEVICE_SECRET`, `IKNOW_REQUEST_WHATSAPP`: set by the owner (phone-code mode). WhatsApp number is shown to people asking for access.
- Optional: `ANTHROPIC_MODEL` (default `claude-sonnet-5-5`), `ANTHROPIC_MODEL_QUICK` (default `claude-haiku-5-5`), `IKNOW_REVOKED_DEVICES`, `IKNOW_ACCESS_URL`.
- Env var names keep the old IKNOW_ prefix on purpose; so do browser storage keys (`iknow:*`). Do not rename them or users lose their diaries.

## Access model (current)
1. Owner opens `/owner` once and creates a username + password (PBKDF2 hash stored; nobody else knows it). Proof = current invite code (read automatically from the owner's phone). Only one owner account can exist. Owner's phone is approved automatically.
2. A new phone sees "Dear Mann is invite-only", types a name, taps Ask for access (optional WhatsApp nudge to the owner).
3. Owner taps Approve / Decline / Switch off / Turn back on / Remove. Takes effect within ~30 s. No Vercel edits or redeploys.
4. Supabase stores per phone: SHA-256 of a random browser token, the typed name, status, dates. No diary text. 8 wrong owner logins = 15-minute lock.
5. Forgotten owner password: no email reset; reset by deleting the row in `iknow.owner` (via Supabase) and creating the account again.

## Status / open items
- **Owner account: not yet created** as of 26 Oct (status showed `managed: false`). Until it is, the site uses phone-code mode, so the owner's own phone may not get replies. Next step: open /owner on the phone used for the diary and create the account.
- pg_net extension was switched on in `parv-app` only for testing; harmless, can be removed.
- The access function contains a one-time cleanup of test records (exact matches only); harmless, can be removed in a later deploy.
- Web address still `know-zeta.vercel.app` (Claude couldn't add a domain: Vercel 403). Owner can add e.g. `dear-mann.vercel.app` in Vercel → Settings → Domains. GitHub repo still named `Know`.
- Name check for "Dear Mann" was a quick web search, not a trademark search.
- Planned next: a design refresh via Claude Design. Ask Claude Design for a developer-ready spec: dark + light tokens (colours incl. one accent per voice, fonts with Devanagari, spacing, radii, motion), SVG logo + app icon, components, and every screen/state (signup, lock + calculator, home, diary per voice, safety card + breathing, My days, WhatsApp import, Settings, access dialogs, owner page). Then hand the Markdown spec or artifact link to Claude.

## Costs (verified Oct 2026 pricing)
Sonnet 5.5: $2 / M input, $10 / M output tokens. Typical reply ≈ 650 in + 150 out ≈ $0.003 (≈ ₹0.25). Imported-style replies ≈ $0.005–0.008. $5 ≈ 1,500 ordinary replies. Recommend a monthly spend limit in the Anthropic console.

## Safety and privacy promises to keep
- Crisis detection (English + Hindi) replaces the reply with a help card: Tele-MANAS 14416 / 1-800-891-4416, emergency 112, breathing exercise.
- Web version: diary lives only in that browser on that phone; replies go through the app's server to Anthropic's API (not used for training by default; deleted within 30 days unless flagged or legally required). Server stores and logs no diary text.
- Gemini was considered and rejected: its free tier says not to send personal information and may use data with human review.

## How to work on it in a new session
1. Clone `BhawnaVatsa3012/Know` (attach the repo to the session).
2. Edit `src/iknow.html` (and `standalone.js` / `owner.html` / `api/*` as needed), run `python3 build.py`, push to `main`; Vercel deploys automatically.
3. For the in-Claude version, republish `src/iknow.html` to the artifact URL above.
4. Access service changes: redeploy `supabase/functions/iknow-access/index.ts` to project `wijnzuwcluzalvpobpbr` with JWT verification off.
5. User preferences: answers must be verified; explain with examples; do not store client references.
