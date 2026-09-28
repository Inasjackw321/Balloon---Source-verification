const DEFAULT_SETTINGS = {
  showSidebarWidget:   true,
  showProfileBanner:   true,
  showTweetBadge:      true,
  showAvatarDot:       true,
  blockContent:        true,
  highlightTweets:     false,
  highlightSources:    true,
  blockSourceLinks:    false,
  keywordFilter:       true,
  platforms: { twitter: true, youtube: true, instagram: true, facebook: true }
};

const SUPPORTED_PAGES = [
  "https://twitter.com/*", "https://x.com/*",
  "https://www.youtube.com/*", "https://youtube.com/*",
  "https://www.instagram.com/*",
  "https://www.facebook.com/*", "https://web.facebook.com/*", "https://m.facebook.com/*"
];

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(
    ["customAccounts", "disabledHandles", "blockedOverrides", "trustedHandles", "settings",
     "customDomains", "disabledDomains", "domainOverrides", "blockedKeywords"],
    data => {
      if (!data.customAccounts)   chrome.storage.sync.set({ customAccounts: [] });
      if (!data.disabledHandles)  chrome.storage.sync.set({ disabledHandles: [] });
      if (!data.blockedOverrides) chrome.storage.sync.set({ blockedOverrides: {} });
      if (!data.trustedHandles)   chrome.storage.sync.set({ trustedHandles: [] });
      if (!data.customDomains)    chrome.storage.sync.set({ customDomains: [] });
      if (!data.disabledDomains)  chrome.storage.sync.set({ disabledDomains: [] });
      if (!data.blockedKeywords)  chrome.storage.sync.set({ blockedKeywords: [] });
      if (!data.domainOverrides)  chrome.storage.sync.set({ domainOverrides: {} });
      // Merge so users upgrading from Pluto keep their choices and gain new keys
      chrome.storage.sync.set({
        settings: {
          ...DEFAULT_SETTINGS,
          ...(data.settings || {}),
          platforms: { ...DEFAULT_SETTINGS.platforms, ...(data.settings?.platforms || {}) }
        }
      });
    }
  );

  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "balloon-flag",
      title: "Flag with Balloon…",
      contexts: ["link"],
      documentUrlPatterns: ["https://twitter.com/*", "https://x.com/*"]
    });

    chrome.contextMenus.create({
      id: "balloon-trust",
      title: "Mark as trusted in Balloon",
      contexts: ["link"],
      documentUrlPatterns: ["https://twitter.com/*", "https://x.com/*"]
    });

    chrome.contextMenus.create({
      id: "balloon-block-domain",
      title: "Block this link's website with Balloon",
      contexts: ["link"],
      documentUrlPatterns: SUPPORTED_PAGES
    });
  });
});

// Resolve the real destination of platform redirect links
function realHost(link) {
  try {
    const url = new URL(link);
    const host = url.hostname.replace(/^www\./, "");
    const wrapped =
      (host === "l.facebook.com" || host === "lm.facebook.com" || host === "l.instagram.com")
        ? url.searchParams.get("u")
        : (host === "youtube.com" && url.pathname === "/redirect") ? url.searchParams.get("q") : null;
    return new URL(wrapped || link).hostname.replace(/^(www\d?|m|amp)\./, "").toLowerCase();
  } catch (_) {
    return null;
  }
}

chrome.contextMenus.onClicked.addListener((info) => {
  const url = info.linkUrl || "";

  if (info.menuItemId === "balloon-block-domain") {
    const domain = realHost(url);
    if (!domain || /(^|\.)(x|twitter|t|youtube|instagram|facebook)\.(com|co)$/.test(domain)) return;
    chrome.storage.sync.get({ customDomains: [] }, d => {
      const list = d.customDomains.filter(x => x.domain !== domain);
      list.push({
        domain, name: domain, category: "misinformation", blocked: true,
        detail: "Blocked from the right-click menu."
      });
      chrome.storage.sync.set({ customDomains: list });
    });
    return;
  }

  const m = url.match(/(?:twitter|x)\.com\/([A-Za-z0-9_]{1,50})(?:[/?#]|$)/);
  if (!m) return;

  if (info.menuItemId === "balloon-flag") {
    chrome.storage.local.set({ pendingAdd: m[1] });
  }
  if (info.menuItemId === "balloon-trust") {
    chrome.storage.sync.get("trustedHandles", d => {
      const list = d.trustedHandles || [];
      const h = m[1].toLowerCase();
      if (!list.includes(h)) {
        chrome.storage.sync.set({ trustedHandles: [...list, h] });
      }
    });
  }
});

// Per-tab warning counts — shown as extension badge
const tabCounts = {};

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.type !== "BALLOON_COUNT") return;
  const id = sender.tab?.id;
  if (!id) return;
  tabCounts[id] = (tabCounts[id] || 0) + msg.delta;
  const n = tabCounts[id];
  chrome.action.setBadgeText({ text: n > 0 ? (n > 99 ? "99+" : String(n)) : "", tabId: id });
  chrome.action.setBadgeBackgroundColor({ color: "#a855f7", tabId: id });
});

chrome.tabs.onRemoved.addListener(id => delete tabCounts[id]);
chrome.tabs.onUpdated.addListener((id, info) => {
  if (info.status === "loading") {
    tabCounts[id] = 0;
    chrome.action.setBadgeText({ text: "", tabId: id });
  }
});
