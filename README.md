# 🎈 Balloon: source verification for your feed

Balloon is a Chrome extension that checks the posts you scroll past on **X/Twitter, YouTube, Instagram and Facebook**. It highlights bad sources and state media, cites the evidence behind every warning, and can block the posts you don't want to see.

## What it does

| | |
|---|---|
| **Account badges** | Flags state-affiliated, state-funded and low-credibility accounts (with cross-platform aliases), with a tooltip citing the evidence. |
| **Bad-source links** | Unwraps `t.co`, `l.facebook.com`, `l.instagram.com` and YouTube redirect links and highlights links to flagged websites, with a source strip on the post. |
| **Post blocking** | Blurs posts from blocked accounts, posts linking to blocked websites, and posts that match your keyword filters. Reveal any of them with one click. |
| **Your rules** | Add accounts, websites and keywords; trust accounts; toggle each platform; right-click any link to block its website; import/export settings. |

## Install (developer mode)

1. Download `balloon-extension.zip` from the website, or clone this repo.
2. Open `chrome://extensions` and switch on **Developer mode**.
3. Click **Load unpacked** and select the `extension/` folder.

## Repository layout

```
extension/          Chrome extension (Manifest V3)
  accounts.js       flagged accounts + categories
  sources.js        flagged websites (domains)
  aliases.js        Instagram/Facebook/YouTube → account aliases
  core.js/.css      shared engine: lookups, link highlighting, keyword + post blocking
  content.js        X/Twitter · youtube-content.js · instagram-content.js · facebook-content.js
  popup.*           toolbar popup
scraper/            Scrapling scraper for X trending pages (+ offline tests)
docs/               GitHub Pages website
scripts/            icon generator
```

## Scraping X trending with Scrapling

`scraper/scrape_x_trending.py` uses [Scrapling](https://github.com/D4Vinci/Scrapling)'s `StealthyFetcher` to load an X trending page, for example <https://x.com/i/trending/2104378106551406609>. It captures X's GraphQL timeline responses and falls back to the rendered DOM. Every post goes through the same account and website lists the extension uses, and the report is written to `docs/data/trending.json`, which the website shows under **Live scan**.

```bash
pip install -r scraper/requirements.txt
scrapling install                                   # browsers for Scrapling
X_AUTH_TOKEN=... X_CT0=... python scraper/scrape_x_trending.py [URL]
python -m unittest discover -s scraper/tests        # offline tests
```

X usually requires a signed-in session for trending pages. Copy the `auth_token` and `ct0` cookies from a logged-in browser. In GitHub, add them as the repository secrets `X_AUTH_TOKEN` and `X_CT0`, then run the **Scrape X trending** workflow (Actions tab). It only commits the report when the scrape succeeds.

## Website (GitHub Pages)

The site lives in `docs/`. The **Deploy site** workflow builds it, copies in the extension's account and source lists so the stats and link checker stay in sync, and publishes `balloon-extension.zip`. To enable it, go to **Settings → Pages → Build and deployment → Source: GitHub Actions**.

To preview locally, serve the repo root (`python -m http.server`) and open `/docs/`.

## How accounts and sites get flagged

Warnings are based on foreign-agent registrations (FARA, EU), broadcast regulator actions (Ofcom, FCC), sanctions (OFAC, EU), academic research, and fact-checking databases. Each entry cites its source. Treat them as a prompt to check further, not as a verdict.
