// Balloon — shared source-verification core.
// Loaded before every platform script. Provides account + domain lookup,
// keyword filtering, and a generic post scanner that highlights links to
// bad sources and hides blocked posts on any site.

const BalloonCore = (() => {
  "use strict";

  const DEFAULT_SETTINGS = {
    showSidebarWidget: true,
    showProfileBanner: true,
    showTweetBadge:    true,
    showAvatarDot:     true,
    blockContent:      true,
    highlightTweets:   false,
    highlightSources:  true,
    blockSourceLinks:  false,
    keywordFilter:     true,
    platforms: { twitter: true, youtube: true, instagram: true, facebook: true }
  };

  const STORAGE_KEYS = [
    "customAccounts", "disabledHandles", "blockedOverrides", "trustedHandles",
    "settings", "customDomains", "disabledDomains", "domainOverrides", "blockedKeywords"
  ];

  const state = {
    settings: structuredClone(DEFAULT_SETTINGS),
    accounts: new Map(),   // normalised handle → account
    domains:  new Map(),   // bare domain → source
    keywords: [],          // [{ word, re }]
    trusted:  new Set()
  };

  // ── Normalisation ─────────────────────────────────────────────────────────

  function norm(h) {
    return (h || "").toLowerCase().replace(/^@/, "").replace(/[_\-.\s]/g, "");
  }

  function bareHost(host) {
    return (host || "").toLowerCase().replace(/\.$/, "").replace(/^(www\d?|m|mobile|amp)\./, "");
  }

  function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, c => (
      { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
    ));
  }

  // ── Load ──────────────────────────────────────────────────────────────────

  function load(cb) {
    chrome.storage.sync.get(STORAGE_KEYS, data => {
      const s = structuredClone(DEFAULT_SETTINGS);
      if (data.settings) {
        Object.assign(s, data.settings);
        s.platforms = { ...DEFAULT_SETTINGS.platforms, ...(data.settings.platforms || {}) };
      }
      state.settings = s;
      state.trusted = new Set((data.trustedHandles || []).map(norm));

      // Accounts
      const disabled = new Set((data.disabledHandles || []).map(h => h.toLowerCase()));
      const overrides = data.blockedOverrides || {};
      state.accounts = new Map();
      for (const a of [...BALLOON_ACCOUNTS, ...(data.customAccounts || [])]) {
        const h = a.handle.toLowerCase();
        if (disabled.has(h)) continue;
        const acc = { ...a, handle: h, blocked: h in overrides ? overrides[h] : !!a.blocked };
        state.accounts.set(h, acc);
        state.accounts.set(norm(h), acc);
      }
      for (const [alias, target] of Object.entries(typeof BALLOON_ALIASES === "object" ? BALLOON_ALIASES : {})) {
        const acc = state.accounts.get(target.toLowerCase());
        if (acc && !state.accounts.has(alias)) state.accounts.set(alias, acc);
      }

      // Domains
      const offDomains = new Set((data.disabledDomains || []).map(bareHost));
      const domainOverrides = data.domainOverrides || {};
      state.domains = new Map();
      for (const src of [...BALLOON_SOURCES, ...(data.customDomains || [])]) {
        const d = bareHost(src.domain);
        if (!d || offDomains.has(d)) continue;
        state.domains.set(d, {
          ...src, domain: d,
          blocked: d in domainOverrides ? domainOverrides[d] : !!src.blocked
        });
      }

      // Keywords
      state.keywords = (data.blockedKeywords || [])
        .map(w => String(w).trim())
        .filter(Boolean)
        .map(word => ({ word, re: keywordRegex(word) }));

      if (cb) cb(state);
    });
  }

  function keywordRegex(word) {
    const body = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
    return new RegExp(`(?<![\\p{L}\\p{N}])${body}(?![\\p{L}\\p{N}])`, "iu");
  }

  // ── Lookups ───────────────────────────────────────────────────────────────

  function category(item) {
    const c = BALLOON_CATEGORIES[item?.category];
    return c && !c.hidden ? c : null;
  }

  function lookupAccount(handle) {
    if (!handle) return null;
    if (state.trusted.has(norm(handle))) return null;
    const acc = state.accounts.get(handle.toLowerCase().replace(/^@/, "")) ||
                state.accounts.get(norm(handle));
    if (!acc || !category(acc) || state.trusted.has(norm(acc.handle))) return null;
    return acc;
  }

  function isTrusted(handle) {
    return state.trusted.has(norm(handle));
  }

  // Follow the redirect shims each platform wraps outbound links in.
  function unwrapUrl(href) {
    let url;
    try { url = new URL(href, location.href); } catch (_) { return null; }
    const host = bareHost(url.hostname);
    const param =
      (host === "l.facebook.com" || host === "lm.facebook.com") ? "u" :
      host === "l.instagram.com" ? "u" :
      (host === "youtube.com" && url.pathname === "/redirect") ? "q" :
      (host.startsWith("google.") && url.pathname === "/url") ? (url.searchParams.has("q") ? "q" : "url") :
      null;
    if (param && url.searchParams.get(param)) {
      try { return new URL(url.searchParams.get(param)); } catch (_) { return null; }
    }
    return url;
  }

  function lookupDomain(host) {
    let h = bareHost(host);
    while (h && h.includes(".")) {
      const src = state.domains.get(h);
      if (src) return category(src) ? src : null;
      h = h.slice(h.indexOf(".") + 1);
    }
    return null;
  }

  const DOMAIN_RE = /(?:^|[^a-z0-9@.-])((?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24})(?![a-z0-9-])/gi;

  function domainsInText(text) {
    const out = new Set();
    for (const m of (text || "").matchAll(DOMAIN_RE)) out.add(bareHost(m[1]));
    return [...out];
  }

  // Domain a link points at: real href first, then its visible text
  // (Twitter shows "rt.com/news/…" while the href is a t.co shortlink).
  function sourceForAnchor(a) {
    const url = unwrapUrl(a.getAttribute("href") || "");
    if (url && url.hostname && bareHost(url.hostname) !== bareHost(location.hostname)) {
      const src = lookupDomain(url.hostname);
      if (src) return src;
    }
    const txt = (a.textContent || "").trim().replace(/^https?:\/\//i, "");
    const m = txt.match(/^([a-z0-9.-]+\.[a-z]{2,24})(?:[/?#…]|$)/i);
    return m ? lookupDomain(m[1]) : null;
  }

  const INJECTED = [
    ".balloon-core-badge", ".balloon-src-strip", ".balloon-core-overlay", ".balloon-core-tip",
    ".balloon-badge", ".balloon-tip", ".balloon-block-overlay", ".balloon-avatar-dot",
    ".balloon-yt-badge-wrap", ".balloon-yt-block-overlay", "#balloon-float",
    "#balloon-core-banner", "#balloon-profile-banner", "#balloon-yt-banner", "script", "style"
  ].join(",");

  // Visible-ish text of an element, ignoring anything Balloon injected
  // (so a keyword like "state" never matches our own "State-Affiliated" label).
  function textOf(el) {
    if (!el) return "";
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
      acceptNode: n => n.parentElement?.closest(INJECTED)
        ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
    });
    let out = "";
    while (walker.nextNode()) out += walker.currentNode.nodeValue + " ";
    return out;
  }

  function matchKeyword(text) {
    if (!state.settings.keywordFilter || !text) return null;
    for (const k of state.keywords) if (k.re.test(text)) return k.word;
    return null;
  }

  function platformEnabled(p) {
    return state.settings.platforms?.[p] !== false;
  }

  // ── Visuals ───────────────────────────────────────────────────────────────

  let logoSeq = 0;
  function logo(size = 16) {
    const id = `blg${++logoSeq}`;
    return `<svg class="balloon-logo" width="${size}" height="${size}" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs><radialGradient id="${id}" cx="0.35" cy="0.3" r="0.8"><stop offset="0" stop-color="#f0abfc"/><stop offset="0.45" stop-color="#a855f7"/><stop offset="1" stop-color="#6d28d9"/></radialGradient></defs>
      <path d="M18 2.5C11.6 2.5 7 7.4 7 13.5c0 7 5.9 12.5 9.6 13.9h2.8C23.1 26 29 20.5 29 13.5 29 7.4 24.4 2.5 18 2.5Z" fill="url(#${id})"/>
      <path d="M16.2 27.3h3.6L18 29.6Z" fill="#6d28d9"/>
      <path d="M18 29.6c-1.8 1.5 1.6 2.6 0 4.9" stroke="#a78bfa" stroke-width="1.4" stroke-linecap="round"/>
      <ellipse cx="12.8" cy="9.6" rx="2.2" ry="3.4" transform="rotate(-24 12.8 9.6)" fill="#fff" opacity="0.45"/>
      <path d="M13.4 14.2l3.1 3.1 6-6.4" stroke="#fff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
  }

  function flagEmoji(code) {
    if (!code) return "";
    return [...code.toUpperCase()].map(c => String.fromCodePoint(c.codePointAt(0) + 127397)).join("");
  }

  function catVars(c) {
    return `--pc:${c.color};--pb:${c.bgColor};--pbd:${c.borderColor}`;
  }

  function toast(msg, sub = "") {
    document.querySelectorAll(".balloon-core-toast").forEach(t => t.remove());
    const t = document.createElement("div");
    t.className = "balloon-core-toast";
    t.innerHTML = `<span class="bct-icon">${logo(18)}</span><div><div class="bct-main">${esc(msg)}</div>${sub ? `<div class="bct-sub">${esc(sub)}</div>` : ""}</div>`;
    document.body.appendChild(t);
    requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add("bct-show")));
    setTimeout(() => {
      t.classList.remove("bct-show");
      setTimeout(() => t.remove(), 400);
    }, 3200);
  }

  function bump(delta = 1) {
    try { chrome.runtime.sendMessage({ type: "BALLOON_COUNT", delta }); } catch (_) {}
  }

  function makeBadge(acc) {
    const c = category(acc);
    const el = document.createElement("span");
    el.className = "balloon-core-badge";
    el.style.cssText = catVars(c);
    el.dataset.balloonHandle = acc.handle;
    el.innerHTML = `<span class="bcb-dot"></span><span>${esc(acc.label || c.label)}</span>
      <span class="balloon-core-tip">
        <strong>${esc(acc.label || c.label)} ${flagEmoji(acc.country)}</strong>
        <em>@${esc(acc.handle)} · ${esc(c.label)}</em>
        <span>${esc(acc.detail || "")}</span>
        ${acc.source ? `<small>${esc(acc.source)}</small>` : ""}
      </span>`;
    return el;
  }

  function makeSourceStrip(sources) {
    const strip = document.createElement("div");
    strip.className = "balloon-src-strip";
    strip.innerHTML = `<span class="bss-logo">${logo(16)}</span>` + sources.map(src => {
      const c = category(src);
      return `<span class="bss-item" style="${catVars(c)}" tabindex="0">
        <b>${esc(src.domain)}</b> · ${esc(c.label)} ${flagEmoji(src.country)}
        <span class="balloon-core-tip">
          <strong>${esc(src.name || src.domain)} ${flagEmoji(src.country)}</strong>
          <em>${esc(src.domain)} · ${esc(c.label)}</em>
          <span>${esc(src.detail || "")}</span>
          ${src.source ? `<small>${esc(src.source)}</small>` : ""}
        </span>
      </span>`;
    }).join("");
    return strip;
  }

  function makeOverlay(reason, detail, c, onReveal) {
    const ov = document.createElement("div");
    ov.className = "balloon-core-overlay";
    if (c) ov.style.cssText = catVars(c);
    ov.innerHTML = `
      <div class="bco-card">
        <div class="bco-balloon">${logo(34)}</div>
        <div class="bco-text">
          <div class="bco-reason">${esc(reason)}</div>
          ${detail ? `<div class="bco-detail">${esc(detail)}</div>` : ""}
        </div>
        <button class="bco-btn" type="button">View anyway</button>
      </div>`;
    ov.querySelector(".bco-btn").addEventListener("click", e => {
      e.preventDefault();
      e.stopPropagation();
      ov.classList.add("bco-pop");
      setTimeout(() => { ov.remove(); onReveal?.(); }, 380);
    });
    // Swallow clicks so the underlying post doesn't open
    ov.addEventListener("click", e => { e.preventDefault(); e.stopPropagation(); });
    return ov;
  }

  function banner(acc, displayName) {
    const c = category(acc);
    const el = document.createElement("div");
    el.className = "balloon-core-banner";
    el.style.cssText = catVars(c);
    el.innerHTML = `
      <div class="bcbn-balloon">${logo(30)}</div>
      <div class="bcbn-body">
        <div class="bcbn-row">
          <strong>${esc(displayName || acc.label || c.label)} ${flagEmoji(acc.country)}</strong>
          <span class="bcbn-chip">${esc(c.label)}</span>
          ${acc.blocked && state.settings.blockContent ? `<span class="bcbn-chip bcbn-blocked">Posts hidden</span>` : ""}
        </div>
        <div class="bcbn-detail">${esc(acc.detail || "")}</div>
        ${acc.source ? `<div class="bcbn-source">${esc(acc.source)}</div>` : ""}
      </div>
      <div class="bcbn-btns">
        <button type="button" class="bcbn-trust">Trust</button>
        <button type="button" class="bcbn-close" aria-label="Dismiss">✕</button>
      </div>`;
    el.querySelector(".bcbn-trust").addEventListener("click", () => {
      chrome.storage.sync.get({ trustedHandles: [] }, d => {
        const t = d.trustedHandles;
        if (!t.includes(acc.handle)) t.push(acc.handle);
        chrome.storage.sync.set({ trustedHandles: t });
        toast(`@${acc.handle} marked as trusted`, "Balloon warnings removed for this account");
      });
      el.remove();
    });
    el.querySelector(".bcbn-close").addEventListener("click", () => {
      el.classList.add("bcbn-out");
      setTimeout(() => el.remove(), 300);
    });
    return el;
  }

  // ── Floating balloon widget (Instagram / Facebook) ────────────────────────

  const pageFlags = new Map(); // key → { label, sub, c }

  function recordFlag(key, label, sub, c) {
    if (pageFlags.has(key)) return;
    pageFlags.set(key, { label, sub, c });
    bump(1);
    updateFloat();
  }

  function floatingWidget() {
    if (!state.settings.showSidebarWidget) { document.getElementById("balloon-float")?.remove(); return; }
    if (document.getElementById("balloon-float")) return;
    const w = document.createElement("div");
    w.id = "balloon-float";
    w.innerHTML = `
      <div class="bf-panel" id="balloon-float-panel">
        <div class="bf-head"><span>Flagged on this page</span><span class="bf-key">Alt+B</span></div>
        <div class="bf-list" id="balloon-float-list"></div>
      </div>
      <button type="button" class="bf-btn" title="Balloon — Source Verification">
        <span class="bf-string"></span>
        ${logo(44)}
        <span class="bf-count" id="balloon-float-count"></span>
      </button>`;
    w.querySelector(".bf-btn").addEventListener("click", toggleFloat);
    document.body.appendChild(w);
    updateFloat();
  }

  function toggleFloat() {
    const w = document.getElementById("balloon-float");
    if (!w) return;
    w.classList.toggle("bf-open");
    renderFloat();
  }

  function renderFloat() {
    const list = document.getElementById("balloon-float-list");
    if (!list) return;
    if (!pageFlags.size) {
      list.innerHTML = `<div class="bf-empty">Nothing flagged yet — keep scrolling.</div>`;
      return;
    }
    list.innerHTML = [...pageFlags.values()].map(f => `
      <div class="bf-row" style="${catVars(f.c)}">
        <span class="bf-dot"></span>
        <span class="bf-label">${esc(f.label)}</span>
        <span class="bf-chip">${esc(f.sub)}</span>
      </div>`).join("");
  }

  function updateFloat() {
    const n = document.getElementById("balloon-float-count");
    if (!n) return;
    n.textContent = pageFlags.size || "";
    n.classList.toggle("bf-count-on", pageFlags.size > 0);
    n.classList.remove("bf-bump");
    void n.offsetWidth;
    n.classList.add("bf-bump");
    if (document.getElementById("balloon-float")?.classList.contains("bf-open")) renderFloat();
  }

  // ── Generic post scanner ──────────────────────────────────────────────────
  //
  // adapter = {
  //   platform:     "instagram" | "facebook" | "twitter" | "youtube",
  //   postSelector: CSS selector for a post / card,
  //   getAuthor?:   post → { handle, anchor } | null   (enables account layer)
  //   getText?:     post → string                      (keyword filter)
  //   extraText?:   post → string                      (link-preview text to scan for domains)
  //   stripHost?:   post → element to append the source strip to
  //   skip?:        post → true to leave the post alone
  //   profile?:     () → { handle, displayName, host } | null  (profile banner)
  //   floating?:    true to show the floating balloon widget
  // }

  function processPost(post, a) {
    if (a.skip?.(post)) return;
    if (post.parentElement?.closest("[data-balloon-post]")) return; // nested inside a handled post

    const sig = post.getElementsByTagName("a").length + ":" + (post.textContent || "").length;
    if (post.dataset.balloonPost === sig) return;
    post.dataset.balloonPost = sig;

    const s = state.settings;
    const hidden = () => post.classList.contains("balloon-blocked") || post.querySelector(":scope > .balloon-core-overlay");
    const hide = (reason, detail, c) => {
      if (hidden() || post.dataset.balloonRevealed) return;
      post.classList.add("balloon-core-blocked");
      post.appendChild(makeOverlay(reason, detail, c, () => {
        post.classList.remove("balloon-core-blocked");
        post.dataset.balloonRevealed = "1";
      }));
    };

    // 1. Account layer
    const author = a.getAuthor?.(post);
    const acc = author ? lookupAccount(author.handle) : null;
    if (acc) {
      const c = category(acc);
      if (s.showTweetBadge && author.anchor && !post.querySelector(".balloon-core-badge")) {
        author.anchor.insertAdjacentElement("afterend", makeBadge(acc));
      }
      recordFlag("@" + acc.handle, "@" + acc.handle, c.label, c);
      if (acc.blocked && s.blockContent) {
        hide(`${acc.label || c.label}`, `@${acc.handle} · ${c.label}`, c);
      }
    }

    // 2. Source layer
    if (s.highlightSources) {
      const found = new Map();
      for (const link of post.querySelectorAll("a[href]")) {
        if (link.closest(".balloon-src-strip, .balloon-core-overlay")) continue;
        const src = sourceForAnchor(link);
        if (!src) continue;
        found.set(src.domain, src);
        if (!link.classList.contains("balloon-src-link")) {
          link.classList.add("balloon-src-link");
          link.style.setProperty("--pc", category(src).color);
          link.style.setProperty("--pbd", category(src).borderColor);
        }
      }
      const extra = a.extraText?.(post);
      if (extra) {
        for (const d of domainsInText(extra)) {
          const src = lookupDomain(d);
          if (src) found.set(src.domain, src);
        }
      }
      const existing = post.querySelector(".balloon-src-strip");
      const shown = existing?.dataset.domains || "";
      const key = [...found.keys()].sort().join(",");
      if (found.size && key !== shown) {
        existing?.remove();
        const strip = makeSourceStrip([...found.values()]);
        strip.dataset.domains = key;
        (a.stripHost?.(post) || post).appendChild(strip);
        for (const src of found.values()) {
          const c = category(src);
          recordFlag(src.domain, src.domain, c.label, c);
        }
      }
      if (s.blockSourceLinks) {
        const bad = [...found.values()].find(x => x.blocked);
        if (bad) hide(`Links to ${bad.domain}`, `${bad.name || bad.domain} · ${category(bad).label}`, category(bad));
      }
    }

    // 3. Keyword layer
    if (state.keywords.length && a.getText) {
      const word = matchKeyword(a.getText(post));
      if (word) {
        hide(`Filtered: “${word}”`, "This post matches one of your Balloon keyword filters.", null);
        recordFlag("kw:" + word, `“${word}”`, "Keyword", BALLOON_CATEGORIES.misinformation);
      }
    }
  }

  function tryProfile(a) {
    if (!a.profile || !state.settings.showProfileBanner) return;
    const p = a.profile();
    const existing = document.getElementById("balloon-core-banner");
    if (!p) { existing?.remove(); return; }
    if (existing?.dataset.handle === p.handle.toLowerCase()) return;
    existing?.remove();
    const acc = lookupAccount(p.handle);
    if (!acc || !p.host) return;
    const b = banner(acc, p.displayName);
    b.id = "balloon-core-banner";
    b.dataset.handle = p.handle.toLowerCase();
    p.host.insertAdjacentElement(p.position || "afterbegin", b);
    recordFlag("@" + acc.handle, "@" + acc.handle, category(acc).label, category(acc));
  }

  function clearAll() {
    document.querySelectorAll(".balloon-core-badge, .balloon-src-strip, .balloon-core-overlay, #balloon-core-banner")
      .forEach(el => el.remove());
    document.querySelectorAll(".balloon-src-link").forEach(el => {
      el.classList.remove("balloon-src-link");
      el.style.removeProperty("--pc");
      el.style.removeProperty("--pbd");
    });
    document.querySelectorAll("[data-balloon-post]").forEach(el => {
      el.classList.remove("balloon-core-blocked");
      delete el.dataset.balloonPost;
      delete el.dataset.balloonRevealed;
    });
    pageFlags.clear();
    updateFloat();
  }

  function watch(adapter) {
    let queued = false;

    const scan = () => {
      queued = false;
      if (!platformEnabled(adapter.platform)) return;
      document.querySelectorAll(adapter.postSelector).forEach(p => processPost(p, adapter));
      tryProfile(adapter);
      if (adapter.floating) floatingWidget();
    };
    const queue = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(scan);
    };

    let lastUrl = location.href;
    const observer = new MutationObserver(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        document.getElementById("balloon-core-banner")?.remove();
        pageFlags.clear();
        updateFloat();
      }
      queue();
    });

    load(() => {
      scan();
      observer.observe(document.body, { childList: true, subtree: true });
    });

    chrome.storage.onChanged.addListener((_, area) => {
      if (area !== "sync") return;
      load(() => {
        clearAll();
        if (!platformEnabled(adapter.platform)) document.getElementById("balloon-float")?.remove();
        scan();
      });
    });

    if (adapter.floating) {
      document.addEventListener("keydown", e => {
        if (e.altKey && !e.ctrlKey && !e.metaKey && e.code === "KeyB") {
          e.preventDefault();
          toggleFloat();
        }
      }, true);
    }

    return { rescan: () => { clearAll(); scan(); } };
  }

  return {
    DEFAULT_SETTINGS, state, load, watch, norm, esc, logo, toast, flagEmoji,
    lookupAccount, lookupDomain, domainsInText, sourceForAnchor, unwrapUrl,
    matchKeyword, category, isTrusted, platformEnabled, textOf
  };
})();
