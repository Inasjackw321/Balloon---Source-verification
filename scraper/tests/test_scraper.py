"""Offline tests for the X trending scraper (no network needed).

    python -m unittest discover -s scraper/tests
"""
import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from scrapling.parser import Selector  # noqa: E402

import scrape_x_trending as st  # noqa: E402

TIMELINE_HTML = """<html><body><main data-testid="primaryColumn">
<h2>Example trending topic</h2>
<article data-testid="tweet">
  <div data-testid="User-Name"><a href="/RT_com"><span>RT</span></a><a href="/RT_com">@RT_com</a></div>
  <div data-testid="tweetText">Statement <a href="https://t.co/a">rt.com/news/1…</a></div>
  <a href="/RT_com/status/111"><time datetime="2026-09-01T10:00:00.000Z">1h</time></a>
</article>
<article data-testid="tweet">
  <div data-testid="User-Name"><a href="/someone"><span>Someone</span></a></div>
  <div data-testid="tweetText">Interesting read</div>
  <div data-testid="card.wrapper"><span>From zerohedge.com</span></div>
  <a href="/someone/status/222"><time datetime="2026-09-01T11:00:00.000Z">1h</time></a>
</article>
<article data-testid="tweet">
  <div data-testid="User-Name"><a href="/reporter"><span>Reporter</span></a></div>
  <div data-testid="tweetText">Live updates from the scene</div>
  <a href="/reporter/status/333"><time datetime="2026-09-01T12:00:00.000Z">1h</time></a>
</article>
</main></body></html>"""

GRAPHQL = {"data": {"timeline": {"instructions": [{"entries": [
    {"content": {"itemContent": {"tweet_results": {"result": {
        "__typename": "Tweet", "rest_id": "900",
        "core": {"user_results": {"result": {"core": {"screen_name": "PressTV", "name": "Press TV"}}}},
        "legacy": {"full_text": "Report https://t.co/z", "created_at": "Mon Sep 01 10:00:00 +0000 2026",
                   "entities": {"urls": [{"expanded_url": "https://www.presstv.ir/Detail/2026/1"}]},
                   "favorite_count": 5}}}}}},
    {"content": {"itemContent": {"tweet_results": {"result": {
        "__typename": "TweetWithVisibilityResults", "tweet": {
            "rest_id": "901",
            "core": {"user_results": {"result": {"legacy": {"screen_name": "citizen", "name": "Citizen"}}}},
            "legacy": {"full_text": "via l.facebook.com", "entities": {"urls": [
                {"expanded_url": "https://l.facebook.com/l.php?u=https%3A%2F%2Finfowars.com%2Fx"}]}}}}}}}},
]}]}}}


class ScraperTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.db = st.BalloonDB()

    def test_db_loads_extension_data(self):
        self.assertGreater(len(self.db.domains), 20)
        self.assertEqual(self.db.account("rt_com")["handle"], "RT_com")
        self.assertEqual(self.db.account("rtnews")["handle"], "RT_com")   # alias
        self.assertEqual(self.db.domain("www.news.rt.com")["domain"], "rt.com")
        self.assertIsNone(self.db.domain("bbc.co.uk"))
        self.assertIsNone(self.db.domain("theonion.com"))                   # satire is hidden

    def test_unwrap_host(self):
        self.assertEqual(st.unwrap_host("rt.com/news/1…"), "rt.com")
        self.assertEqual(st.unwrap_host("https://l.facebook.com/l.php?u=https%3A%2F%2Fwww.infowars.com%2F"), "infowars.com")

    def test_dom_extraction_and_verdicts(self):
        page = Selector(TIMELINE_HTML, url="https://x.com/i/trending/1")
        tweets = st.tweets_from_dom(page)
        self.assertEqual([t["handle"] for t in tweets], ["RT_com", "someone", "reporter"])
        self.assertEqual(tweets[0]["id"], "111")
        verdicts = [st.verify(t, self.db)["balloon"]["verdict"] for t in tweets]
        self.assertEqual(verdicts, ["blocked", "flagged", "clear"])
        self.assertEqual(st.topic_from_dom(page)["title"], "Example trending topic")

    def test_graphql_extraction(self):
        tweets = {t["id"]: t for t in st.tweets_from_graphql([GRAPHQL])}
        self.assertEqual(tweets["900"]["handle"], "PressTV")
        self.assertEqual(tweets["901"]["handle"], "citizen")
        v = st.verify(tweets["901"], self.db)["balloon"]
        self.assertEqual([f["match"] for f in v["flags"]], ["infowars.com"])

    def test_run_writes_report(self):
        page = Selector(TIMELINE_HTML, url="https://x.com/i/trending/1")
        with tempfile.TemporaryDirectory() as d:
            out = Path(d) / "report.json"
            result = st.run("https://x.com/i/trending/1", out, page=page)
            saved = json.loads(out.read_text())
        self.assertEqual(result["status"], "ok")
        self.assertEqual(saved["summary"]["total_posts"], 3)
        self.assertEqual(saved["summary"]["blocked"], 1)
        self.assertEqual(saved["posts"][0]["handle"], "RT_com")   # blocked first


if __name__ == "__main__":
    unittest.main()
