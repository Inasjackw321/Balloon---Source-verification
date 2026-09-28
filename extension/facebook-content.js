// Balloon — Facebook content script
(() => {
  "use strict";
  if (window.__balloonFBLoaded) return;
  window.__balloonFBLoaded = true;

  // First-path-segment routes that are not pages or profiles
  const RESERVED = new Set([
    "profile.php", "groups", "watch", "events", "pages", "photo", "photo.php",
    "photos", "story.php", "permalink.php", "hashtag", "reel", "reels", "share",
    "people", "stories", "marketplace", "gaming", "friends", "messages",
    "notifications", "settings", "bookmarks", "saved", "search", "help",
    "policies", "privacy", "login", "home.php", "ads", "business", "l.php",
    "sharer", "sharer.php", "dialog", "plugins", "media", "video", "videos"
  ]);

  function handleFromHref(href) {
    let url;
    try { url = new URL(href, location.href); } catch (_) { return null; }
    if (!/(^|\.)facebook\.com$/.test(url.hostname)) return null;
    const seg = url.pathname.split("/").filter(Boolean)[0];
    if (!seg || RESERVED.has(seg.toLowerCase())) return null;
    return /^[A-Za-z0-9.\-]{2,80}$/.test(seg) ? seg : null;
  }

  function getAuthor(post) {
    const candidates = post.querySelectorAll(
      "h2 a[href], h3 a[href], h4 a[href], strong a[href], [data-ad-rendering-role='profile_name'] a[href]"
    );
    for (const a of candidates) {
      const h = handleFromHref(a.getAttribute("href"));
      if (h && a.textContent.trim()) return { handle: h, anchor: a };
    }
    return null;
  }

  function getText(post) {
    const msg = post.querySelector(
      "[data-ad-preview='message'], [data-ad-comet-preview='message'], [data-ad-rendering-role='story_message']"
    );
    return BalloonCore.textOf(msg || post);
  }

  BalloonCore.watch({
    platform: "facebook",
    // Feed units; comments are role=article too, but they sit inside a
    // handled post and are skipped by the core's nesting check.
    postSelector: "div[aria-posinset], [data-pagelet^='FeedUnit'], div[role='article']:not([aria-label^='Comment'])",
    floating: true,
    getAuthor,
    getText,
    // Link previews show the publisher domain in upper case ("RT.COM")
    extraText: post => BalloonCore.textOf(post),
    profile() {
      const parts = location.pathname.split("/").filter(Boolean);
      if (parts.length !== 1 || RESERVED.has(parts[0].toLowerCase())) return null;
      const host = document.querySelector("[role='main']");
      if (!host) return null;
      const name = document.querySelector("[role='main'] h1")?.textContent.trim();
      return { handle: parts[0], displayName: name, host, position: "afterbegin" };
    }
  });
})();
