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
| `ANTHROPIC_MODEL` | No | Model for replies. Default `claude-sonnet-5-5`. |
| `ANTHROPIC_MODEL_QUICK` | No | Model for quick tasks (picking a voice, style summaries). Default `claude-haiku-5-5`. |

The function also limits each IP address to 20 requests a minute (best effort).

## Editing the app

Edit `src/iknow.html`, then rebuild `index.html`:

```bash
python3 build.py
```

`src/iknow.html` is the same file that runs inside Claude as an artifact. `build.py` only adds the standalone adapter and web-accurate privacy wording.

## Help lines shown in the app

Tele-MANAS 14416 / 1-800-891-4416 (India, free, 24×7) and emergency 112.
IKnOw is not therapy, medical, legal or emergency advice.
