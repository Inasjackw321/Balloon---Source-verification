"""Scrape an X (Twitter) trending page with Scrapling and run Balloon's
source verification over every post on it.

    pip install -r scraper/requirements.txt
    scrapling install                      # downloads the browsers Scrapling drives
    python scraper/scrape_x_trending.py    # writes docs/data/trending.json

X shows most trending pages only to signed-in users. Export the `auth_token`
(and optionally `ct0`) cookie from a logged-in browser session and pass them
as environment variables:

    X_AUTH_TOKEN=... X_CT0=... python scraper/scrape_x_trending.py

The output feeds the "Live X trending scan" section of the GitHub Pages site.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable
from urllib.parse import parse_qs, urlparse

ROOT = Path(__file__).resolve().parent.parent
EXTENSION = ROOT / "extension"
DEFAULT_URL = "https://x.com/i/trending/2104378106551406609"
DEFAULT_OUT = ROOT / "docs" / "data" / "trending.json"

TWEET_SELECTOR = 'article[data-testid="tweet"]'
GRAPHQL_XHR = r"/i/api/graphql/"
LOGIN_MARKERS = ("/login", "/i/flow/login", "/i/flow/signup")


# ── Balloon database (parsed from the extension's own JS files) ──────────────

def _js_entries(path: Path) -> list[dict[str, Any]]:
    """Pull the flat object literals out of accounts.js / sources.js.

    Each entry is `{ key: "value", key: true, key: 12, ... }` with no nested
    objects, so a small regex parser is enough and keeps the extension files
    as the single source of truth.
    """
    text = path.read_text(encoding="utf-8")
    entries = []
    for block in re.findall(r"\{([^{}]*?)\}", text, flags=re.S):
        fields: dict[str, Any] = {}
        for key, raw in re.findall(r'(\w+)\s*:\s*("(?:[^"\\]|\\.)*"|true|false|-?\d+(?:\.\d+)?)', block):
            if raw.startswith('"'):
                fields[key] = json.loads(raw)
            elif raw in ("true", "false"):
                fields[key] = raw == "true"
            else:
                fields[key] = float(raw) if "." in raw else int(raw)
        entries.append(fields)
    return entries


def _norm(handle: str) -> str:
    return re.sub(r"[_\-.\s]", "", handle.lower().lstrip("@"))


def _bare_host(host: str) -> str:
    return re.sub(r"^(www\d?|m|mobile|amp)\.", "", host.lower().rstrip("."))


class BalloonDB:
    """Account + domain lookups that mirror extension/core.js."""

    def __init__(self, extension_dir: Path = EXTENSION):
        self.categories = {
            e["key"]: e for e in self._categories(extension_dir / "accounts.js")
        }
        self.accounts: dict[str, dict] = {}
        for acc in _js_entries(extension_dir / "accounts.js"):
            if "handle" not in acc:
                continue
            self.accounts.setdefault(acc["handle"].lower(), acc)
            self.accounts.setdefault(_norm(acc["handle"]), acc)
        aliases_js = (extension_dir / "aliases.js").read_text(encoding="utf-8")
        for alias, target in re.findall(r'"(\w+)"\s*:\s*"(\w+)"', aliases_js):
            acc = self.accounts.get(target.lower())
            if acc:
                self.accounts.setdefault(alias, acc)
        self.domains = {
            _bare_host(s["domain"]): s
            for s in _js_entries(extension_dir / "sources.js")
            if "domain" in s
        }

    @staticmethod
    def _categories(path: Path) -> list[dict]:
        text = path.read_text(encoding="utf-8")
        block = re.search(r"const BALLOON_CATEGORIES = \{(.*?)\n\};", text, flags=re.S)
        out = []
        if not block:
            return out
        for key, body in re.findall(r'"([\w-]+)"\s*:\s*\{(.*?)\n\s*\}', block.group(1), flags=re.S):
            label = re.search(r'label:\s*"([^"]+)"', body)
            out.append({
                "key": key,
                "label": label.group(1) if label else key,
                "hidden": bool(re.search(r"hidden:\s*true", body)),
            })
        return out

    def _visible(self, item: dict | None) -> dict | None:
        if not item:
            return None
        cat = self.categories.get(item.get("category", ""))
        return item if cat and not cat["hidden"] else None

    def category_label(self, key: str) -> str:
        return self.categories.get(key, {}).get("label", key)

    def account(self, handle: str | None) -> dict | None:
        if not handle:
            return None
        return self._visible(self.accounts.get(handle.lower()) or self.accounts.get(_norm(handle)))

    def domain(self, host: str | None) -> dict | None:
        h = _bare_host(host or "")
        while "." in h:
            if h in self.domains:
                return self._visible(self.domains[h])
            h = h.split(".", 1)[1]
        return None


def unwrap_host(url_or_text: str) -> str | None:
    """Host a link really points at (follows l.facebook.com / youtube redirect shims)."""
    s = (url_or_text or "").strip().rstrip("…")
    if not s:
        return None
    if not re.match(r"^[a-z]+://", s, flags=re.I):
        s = "https://" + s
    try:
        u = urlparse(s)
    except ValueError:
        return None
    host = _bare_host(u.hostname or "")
    wrapped = None
    if host in ("l.facebook.com", "lm.facebook.com", "l.instagram.com"):
        wrapped = parse_qs(u.query).get("u", [None])[0]
    elif host == "youtube.com" and u.path == "/redirect":
        wrapped = parse_qs(u.query).get("q", [None])[0]
    if wrapped:
        return unwrap_host(wrapped)
    return host or None


DOMAIN_IN_TEXT = re.compile(r"(?:^|[^a-z0-9@.-])((?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24})(?![a-z0-9-])", re.I)


# ── Tweet extraction ─────────────────────────────────────────────────────────

def _walk(node: Any) -> Iterable[dict]:
    if isinstance(node, dict):
        yield node
        for v in node.values():
            yield from _walk(v)
    elif isinstance(node, list):
        for v in node:
            yield from _walk(v)


def tweets_from_graphql(payloads: Iterable[Any]) -> list[dict]:
    """Tweets from X's GraphQL timeline responses (the most reliable source)."""
    found: dict[str, dict] = {}
    for payload in payloads:
        for node in _walk(payload):
            if node.get("__typename") == "TweetWithVisibilityResults" and isinstance(node.get("tweet"), dict):
                node = node["tweet"]
            legacy = node.get("legacy")
            rest_id = node.get("rest_id")
            if not (isinstance(legacy, dict) and rest_id and "full_text" in legacy):
                continue
            user = (((node.get("core") or {}).get("user_results") or {}).get("result") or {})
            handle = (
                (user.get("core") or {}).get("screen_name")
                or (user.get("legacy") or {}).get("screen_name")
            )
            name = (user.get("core") or {}).get("name") or (user.get("legacy") or {}).get("name")
            note = ((((node.get("note_tweet") or {}).get("note_tweet_results") or {}).get("result") or {}).get("text"))
            urls = [
                u.get("expanded_url") or u.get("url")
                for u in ((legacy.get("entities") or {}).get("urls") or [])
            ]
            card = ((node.get("card") or {}).get("legacy") or {})
            for bv in card.get("binding_values") or []:
                if bv.get("key") in ("vanity_url", "card_url"):
                    val = (bv.get("value") or {}).get("string_value")
                    if val:
                        urls.append(val)
            found[rest_id] = {
                "id": rest_id,
                "handle": handle,
                "name": name,
                "text": note or legacy.get("full_text", ""),
                "created_at": legacy.get("created_at"),
                "url": f"https://x.com/{handle}/status/{rest_id}" if handle else None,
                "links": [u for u in urls if u],
                "metrics": {
                    k: legacy.get(k)
                    for k in ("reply_count", "retweet_count", "favorite_count", "quote_count")
                    if legacy.get(k) is not None
                },
            }
    return list(found.values())


def tweets_from_dom(page) -> list[dict]:
    """Fallback: read the rendered <article> elements with Scrapling selectors."""
    tweets = []
    for art in page.css(TWEET_SELECTOR):
        hrefs = art.css('[data-testid="User-Name"] a::attr(href)').getall()
        handle = next((h.strip("/") for h in hrefs if re.fullmatch(r"/\w{1,50}", h or "")), None)
        name_el = art.css('[data-testid="User-Name"] span').first
        text_el = art.css('[data-testid="tweetText"]').first
        status = art.css('a[href*="/status/"]::attr(href)').get()
        links = []
        for a in art.css('[data-testid="tweetText"] a'):
            display = a.get_all_text(separator="").strip()
            if re.match(r"^(https?://)?[a-z0-9.-]+\.[a-z]{2,}", display, flags=re.I):
                links.append(display)
        card = art.css('[data-testid="card.wrapper"]').first
        tweets.append({
            "id": (re.search(r"/status/(\d+)", status or "") or [None, None])[1],
            "handle": handle,
            "name": name_el.get_all_text(separator="").strip() if name_el else None,
            "text": text_el.get_all_text(separator="").strip() if text_el else "",
            "created_at": art.css("time::attr(datetime)").get(),
            "url": f"https://x.com{status}" if status and status.startswith("/") else status,
            "links": links,
            "card_text": card.get_all_text(separator=" ").strip() if card else "",
            "metrics": {},
        })
    return tweets


def topic_from_dom(page) -> dict:
    def first_text(*selectors: str) -> str | None:
        for sel in selectors:
            el = page.css(sel).first
            if el:
                txt = el.get_all_text(separator=" ").strip()
                if txt:
                    return txt
        return None

    return {
        "title": first_text('[data-testid="primaryColumn"] h1', '[data-testid="primaryColumn"] h2', "title"),
        "summary": first_text(
            '[data-testid="primaryColumn"] [data-testid="trend-summary"]',
            '[data-testid="primaryColumn"] [dir="auto"][lang]',
        ) or page.css('meta[property="og:description"]::attr(content)').get(),
    }


# ── Verification ─────────────────────────────────────────────────────────────

def verify(tweet: dict, db: BalloonDB) -> dict:
    flags = []
    acc = db.account(tweet.get("handle"))
    if acc:
        flags.append({
            "type": "account",
            "match": "@" + acc["handle"],
            "category": acc.get("category"),
            "category_label": db.category_label(acc.get("category", "")),
            "label": acc.get("label"),
            "blocked": bool(acc.get("blocked")),
            "detail": acc.get("detail"),
            "source": acc.get("source"),
        })

    hosts = {unwrap_host(link) for link in tweet.get("links", [])}
    for text in (tweet.get("text", ""), tweet.get("card_text", "")):
        hosts.update(_bare_host(m.group(1)) for m in DOMAIN_IN_TEXT.finditer(text or ""))
    seen = set()
    for host in sorted(h for h in hosts if h):
        src = db.domain(host)
        if src and src["domain"] not in seen:
            seen.add(src["domain"])
            flags.append({
                "type": "domain",
                "match": src["domain"],
                "category": src.get("category"),
                "category_label": db.category_label(src.get("category", "")),
                "label": src.get("name"),
                "blocked": bool(src.get("blocked")),
                "detail": src.get("detail"),
                "source": src.get("source"),
            })

    verdict = "blocked" if any(f["blocked"] for f in flags) else "flagged" if flags else "clear"
    return {**tweet, "balloon": {"verdict": verdict, "flags": flags}}


def summarise(posts: list[dict]) -> dict:
    verdicts = Counter(p["balloon"]["verdict"] for p in posts)
    categories = Counter(f["category_label"] for p in posts for f in p["balloon"]["flags"])
    sources = Counter(f["match"] for p in posts for f in p["balloon"]["flags"])
    return {
        "total_posts": len(posts),
        "clear": verdicts.get("clear", 0),
        "flagged": verdicts.get("flagged", 0),
        "blocked": verdicts.get("blocked", 0),
        "by_category": dict(categories.most_common()),
        "top_flagged": [{"match": m, "count": c} for m, c in sources.most_common(10)],
    }


# ── Fetch ────────────────────────────────────────────────────────────────────

def build_cookies() -> list[dict]:
    cookies = []
    for name, env in (("auth_token", "X_AUTH_TOKEN"), ("ct0", "X_CT0")):
        value = os.environ.get(env, "").strip()
        if value:
            cookies.append({
                "name": name, "value": value, "domain": ".x.com", "path": "/",
                "secure": True, "httpOnly": name == "auth_token", "sameSite": "Lax",
            })
    return cookies


def fetch(url: str, scrolls: int, headless: bool, executable_path: str | None):
    from scrapling.fetchers import StealthyFetcher

    def page_action(page):
        # Let the timeline mount, then scroll to pull in more posts
        try:
            page.wait_for_selector(TWEET_SELECTOR, timeout=25_000)
        except Exception:
            return
        for _ in range(scrolls):
            page.mouse.wheel(0, 2600)
            page.wait_for_timeout(1400)

    kwargs: dict[str, Any] = dict(
        headless=headless,
        network_idle=False,
        disable_resources=False,
        cookies=build_cookies() or None,
        page_action=page_action,
        capture_xhr=GRAPHQL_XHR,
        timeout=90_000,
        locale="en-US",
    )
    if executable_path:
        kwargs["executable_path"] = executable_path
    return StealthyFetcher.fetch(url, **kwargs)


def xhr_payloads(page) -> list[Any]:
    out = []
    for resp in getattr(page, "captured_xhr", []) or []:
        try:
            body = resp.body
            out.append(json.loads(body.decode("utf-8") if isinstance(body, bytes) else body))
        except Exception:
            continue
    return out


def run(url: str, out: Path, scrolls: int = 6, headless: bool = True,
        executable_path: str | None = None, page=None) -> dict:
    db = BalloonDB()
    result: dict[str, Any] = {
        "source_url": url,
        "scraped_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "scraper": "Scrapling StealthyFetcher",
        "status": "ok",
        "message": "",
        "topic": {},
        "summary": {},
        "posts": [],
    }
    try:
        page = page or fetch(url, scrolls, headless, executable_path)
    except Exception as exc:  # network errors, browser missing, etc.
        result.update(status="error", message=f"{type(exc).__name__}: {exc}")
        return _write(result, out)

    tweets = tweets_from_graphql(xhr_payloads(page))
    if not tweets:
        tweets = tweets_from_dom(page)
    else:
        # Merge card text from the DOM, which GraphQL doesn't include
        dom = {t["id"]: t for t in tweets_from_dom(page) if t.get("id")}
        for t in tweets:
            t["card_text"] = dom.get(t["id"], {}).get("card_text", "")

    final_url = getattr(page, "url", url) or url
    result["final_url"] = final_url
    result["http_status"] = getattr(page, "status", None)
    result["topic"] = topic_from_dom(page)

    if not tweets:
        if any(marker in final_url for marker in LOGIN_MARKERS) or not build_cookies():
            result.update(
                status="login_required",
                message="X did not return any posts. Trending pages usually need a signed-in "
                        "session: set X_AUTH_TOKEN (and X_CT0) and run the scraper again.",
            )
        else:
            result.update(status="empty", message="The page loaded but no posts were found.")

    posts = [verify(t, db) for t in tweets]
    order = {"blocked": 0, "flagged": 1, "clear": 2}
    posts.sort(key=lambda p: order[p["balloon"]["verdict"]])
    result["posts"] = posts
    result["summary"] = summarise(posts)
    return _write(result, out)


def _write(result: dict, out: Path) -> dict:
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return result


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("url", nargs="?", default=DEFAULT_URL, help="X trending URL to scrape")
    ap.add_argument("--out", type=Path, default=DEFAULT_OUT, help="where to write the JSON report")
    ap.add_argument("--scrolls", type=int, default=6, help="how many times to scroll for more posts")
    ap.add_argument("--headful", action="store_true", help="show the browser window")
    ap.add_argument("--executable-path", default=os.environ.get("CHROMIUM_PATH"),
                    help="use this Chrome/Chromium binary instead of Scrapling's")
    args = ap.parse_args(argv)

    result = run(args.url, args.out, args.scrolls, not args.headful, args.executable_path)
    s = result["summary"]
    print(f"[{result['status']}] {result['source_url']}")
    if result["message"]:
        print("  " + result["message"])
    if s:
        print(f"  {s['total_posts']} posts · {s['flagged']} flagged · {s['blocked']} blocked · {s['clear']} clear")
    print(f"  wrote {args.out}")
    return 0 if result["status"] in ("ok", "login_required", "empty") else 1


if __name__ == "__main__":
    sys.exit(main())
