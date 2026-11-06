# REAN MD

WhatsApp bot (Baileys, multi-device) + Telegram pairing bot. Pair your WhatsApp
number from Telegram, then use the bot's commands in WhatsApp.

- **Entry point:** `npm start` (`node index.js`, Node 18+)
- **Prefix:** `.` (also `!` `#` `&` `/` `@`)
- **Menu in WhatsApp:** `.menu` / `.allmenu`
- **Pair from Telegram:** `/start` then `/pair <number with country code, no 0>`
- **Unpair:** `/unpair <number>`

## Deploy on Railway

1. Connect this repo in Railway (New Project → Deploy from GitHub repo).
2. Add a Variable: `BOT_TOKEN` = your Telegram bot token (from @BotFather).
3. Deploy. Railway builds with Nixpacks (`railway.json`: `npm start`,
   restart on failure) and installs `ffmpeg` for sticker / media commands.

No token is stored in this repo — never commit one to a public repo.

## Optional variables (for AI / lookup commands)

Set these in Railway Variables (or your panel's environment) if you want the
commands that use them. Without them those commands will fail, but the bot
still starts and pairs.

- `GROQ_API_KEY` — Groq AI commands (`.groq`, `.mistral`, `.ai`)
- `API_KEY` — NexOracle lookup / downloader commands
- `NEXORACLE_KEY` — NexOracle API key
- `ASITHA_JWT` — channel react / Sora features
- `LOLHUMAN_API_KEY` — Free Fire lookup
- `OMDB_API_KEY` — movie info

## Run on a panel / PC

```bash
npm install --legacy-peer-deps
BOT_TOKEN=your-telegram-bot-token npm start
```

On a Pterodactyl panel, first run the startup command as
`npm install --legacy-peer-deps`, then change it back to `npm start`.

## Configure

- Owner WhatsApp number, bot name and owner name: `setting/config.js`
- Telegram admin ID: `bot.js` (`ownerID`)
- Menu photo: `media/image1.jpg` (also used as the link photo in menus)

## Pairing

`/pair` gives a code that expires in 2 minutes. In WhatsApp go to
Settings → Linked Devices → Link a Device and enter the code.
Sessions are saved under `kingbadboitimewisher/pairing/` (git-ignored).

> Unofficial WhatsApp bots can get the linked number banned. Use a secondary
> number, not your main one.
