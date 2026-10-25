# IKnOw

A private diary that writes back. You choose who you need right now (Dear diary, Best friend, Spouse, Mom, or "You decide"), write, and get a short reply in that voice, ending with a handwritten *"I know."*

This repository is the web version, ready for [Vercel](https://vercel.com).

## How it works

| Part | What it does |
|---|---|
| `index.html` | The whole app (built from `src/iknow.html`). |
| `standalone.js` | Lets the app run on its own website: replies go through `/api/sample`, exports become normal downloads, and the diary is stored in the phone's own browser. |
| `api/sample.js` | A Vercel serverless function. It adds your Anthropic API key and calls the Claude Messages API. It stores and logs nothing. |
| `vercel.json` | Security headers. No build step is needed. |

**Where the diary lives:** only in the browser on the phone that uses it (localStorage). There is no account and no database. Clearing browser data or switching phones loses the diary, so users should use **Settings → Export my diary** now and then.

**What leaves the phone:** only the text needed to write a reply, sent through `/api/sample` to Anthropic's API.

## Setup on Vercel

Add these under **Project → Settings → Environment Variables**, then redeploy:

| Variable | Required | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | **Yes** | Your key from [console.anthropic.com](https://console.anthropic.com). Without it, replies show "Replies aren't switched on yet". |
| `IKNOW_ACCESS_CODE` | Recommended | An invite code. When set, each phone must enter it once before replies work, so strangers who find the link can't spend your API credit. |
| `IKNOW_DEVICE_SECRET` | Recommended | Turns on **phone-specific codes** (replaces `IKNOW_ACCESS_CODE`). A long phrase only you know, at least 20 characters. Changing it switches off every phone's code at once. |
| `IKNOW_REQUEST_WHATSAPP` | With phone codes | Your WhatsApp number with country code, e.g. `919800000000`. The app's "Request a code" button opens WhatsApp to this number with the phone's ID filled in. |
| `IKNOW_REQUEST_EMAIL` | Optional | An email address for code requests, as well as or instead of WhatsApp. |
| `IKNOW_REVOKED_DEVICES` | Optional | Link IDs or phone IDs to switch off, separated by commas, e.g. `X9A5-Y3RJ, NY4C-ECWJ`. |
| `BLOB_READ_WRITE_TOKEN` | For sign-in links | Added automatically when you connect a Vercel Blob store to the project (Storage → Create → Blob). |
| `ANTHROPIC_WORKSPACE_ID` | Only if needed | Needed only when your API key isn't tied to a workspace (Anthropic then says the request "must include the anthropic-workspace-id header"). Copy the ID from console.anthropic.com → Workspaces. Easier: create the key inside a workspace instead. |
| `ANTHROPIC_MODEL` | No | Model for replies. Default `claude-sonnet-5-5`. |
| `ANTHROPIC_MODEL_QUICK` | No | Model for quick tasks (picking a voice, style summaries). Default `claude-haiku-5-5`. |

The function also limits each IP address to 20 requests a minute (best effort).

## One-time sign-in links (recommended)

Needs `IKNOW_DEVICE_SECRET` and a Vercel Blob store connected to the project.

1. Open **`/owner`**, enter your secret, tap **Make a sign-in link**, then **Copy a message to send**.
2. The person opens the link in Chrome or Safari (the page warns them if they are inside WhatsApp's own browser) and taps **Activate on this phone**.
3. That browser is now signed in. The link is used up: opened anywhere else it says "already been used". Unused links expire after 7 days. Opening a link without tapping Activate uses nothing.

The Blob store holds only `iknow-used/<linkId>` markers. No names, no diary text. Replies are checked by signature, so there is no lookup per reply.

## Phone-specific codes

With `IKNOW_DEVICE_SECRET` set, every phone (or browser) gets its own ID, like `NY4C-ECWJ`, the first time it asks for a reply.

1. The person taps **Request a code on WhatsApp**. WhatsApp opens with their phone ID filled in.
2. You open **`/owner`** on this site (e.g. `know-zeta.vercel.app/owner`), enter your secret and their phone ID, and get their code, e.g. `772M-GECM`.
3. You send the code back. It works only on the phone with that ID; on any other phone it is refused.

No database is used: a code is a signature of the phone ID made with your secret, so the server can check it without storing anything. The owner page works the code out in your own browser and sends nothing anywhere.

A new browser, a private window, or clearing browser data gives that phone a new ID, so it needs a new code (its old diary is gone in that case anyway).

## Editing the app

Edit `src/iknow.html`, then rebuild `index.html`:

```bash
python3 build.py
```

`src/iknow.html` is the same file that runs inside Claude as an artifact. `build.py` only adds the standalone adapter and web-accurate privacy wording.

## Help lines shown in the app

Tele-MANAS 14416 / 1-800-891-4416 (India, free, 24×7) and emergency 112.
IKnOw is not therapy, medical, legal or emergency advice.
