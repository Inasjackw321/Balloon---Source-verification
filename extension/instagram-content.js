// Balloon — Instagram content script
(() => {
  "use strict";
  if (window.__balloonIGLoaded) return;
  window.__balloonIGLoaded = true;

  // First-path-segment routes that are not usernames
  const RESERVED = new Set([
    "p", "reel", "reels", "explore", "stories", "direct", "accounts", "about",
    "legal", "developer", "tv", "web", "challenge", "emails", "session",
    "your_activity", "archive", "invites", "nametag", "tags", "locations"
  ]);

  function handleFromHref(href) {
    const m = (href || "").match(/^(?:https?:\/\/(?:www\.)?instagram\.com)?\/([A-Za-z0-9._]{1,30})\/?(?:[?#]|$)/);
    if (!m || RESERVED.has(m[1].toLowerCase())) return null;
    return m[1];
  }

  function getAuthor(post) {
    // Post header: the first profile link that has visible text
    for (const a of post.querySelectorAll("a[href]")) {
      const h = handleFromHref(a.getAttribute("href"));
      if (h && a.textContent.trim()) return { handle: h, anchor: a };
    }
    return null;
  }

  BalloonCore.watch({
    platform: "instagram",
    postSelector: "article",
    floating: true,
    getAuthor,
    getText: post => BalloonCore.textOf(post),
    // Captions can mention domains in plain text ("read more at rt.com")
    extraText: post => BalloonCore.textOf(post),
    profile() {
      const parts = location.pathname.split("/").filter(Boolean);
      if (parts.length !== 1 || RESERVED.has(parts[0].toLowerCase())) return null;
      const host = document.querySelector("main header") || document.querySelector("header section");
      if (!host) return null;
      return {
        handle: parts[0],
        displayName: "@" + parts[0],
        host,
        position: "afterend"
      };
    }
  });
})();
