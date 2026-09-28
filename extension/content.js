(() => {
  "use strict";

  // ── State ────────────────────────────────────────────────────────────────────

  let accountMap = {};
  let trustedSet = new Set();
  let sessionCount = 0;
  let pendingMenuHandle = null;

  let settings = {
    showSidebarWidget: true,
    showProfileBanner: true,
    showTweetBadge:    true,
    showAvatarDot:     true,
    blockContent:      true,
    highlightTweets:   false
  };

  // ── SVG icon set ──────────────────────────────────────────────────────────────

  const ICONS = {
    "state-propaganda": `<svg width="11" height="11" viewBox="0 0 11 11" fill="none" xmlns="http://www.w3.org/2000/svg"><line x1="2" y1="1" x2="2" y2="10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M2 1.5L9.5 4.25L2 7Z" fill="currentColor"/></svg>`,
    "state-funded":     `<svg width="11" height="11" viewBox="0 0 11 11" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="5" width="9" height="5" rx="0.6" stroke="currentColor" stroke-width="1.3" fill="none"/><path d="M0.5 5L5.5 1.5L10.5 5" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round" fill="none"/><rect x="4" y="6.5" width="3" height="3.5" rx="0.4" fill="currentColor" opacity="0.75"/></svg>`,
    "misinformation":   `<svg width="11" height="11" viewBox="0 0 11 11" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5.5 1L10.5 10H0.5L5.5 1Z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round" fill="none"/><line x1="5.5" y1="4.2" x2="5.5" y2="7" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><circle cx="5.5" cy="8.4" r="0.65" fill="currentColor"/></svg>`,
    "conspiracy":       `<svg width="11" height="11" viewBox="0 0 11 11" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="5.5" cy="5.5" r="4.2" stroke="currentColor" stroke-width="1.3"/><line x1="3.5" y1="3.5" x2="7.5" y2="7.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><line x1="7.5" y1="3.5" x2="3.5" y2="7.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`,
    "satire":           `<svg width="11" height="11" viewBox="0 0 11 11" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 2h7a.8.8 0 01.8.8V7a.8.8 0 01-.8.8H6.5L4.5 9.5V7.8H2A.8.8 0 011.2 7V2.8A.8.8 0 012 2Z" stroke="currentColor" stroke-width="1.2" fill="none" stroke-linejoin="round"/><path d="M3.5 5.5c.3-.6.9-.6 1.4 0 .4.6 1.1.6 1.4 0" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" fill="none"/></svg>`
  };

  // Logo SVGs come from BalloonCore.logo() so each copy gets its own gradient id

  // ── Load ──────────────────────────────────────────────────────────────────────

  function reload(cb) {
    chrome.storage.sync.get(
      ["customAccounts","disabledHandles","blockedOverrides","trustedHandles","settings"],
      data => {
        if (data.settings) Object.assign(settings, data.settings);
        trustedSet = new Set((data.trustedHandles || []).map(h => h.toLowerCase()));

        const disabled        = new Set((data.disabledHandles || []).map(h => h.toLowerCase()));
        const blockedOverride = data.blockedOverrides || {};
        const custom          = data.customAccounts   || [];

        const merged = [...BALLOON_ACCOUNTS, ...custom].filter(
          a => !disabled.has(a.handle.toLowerCase())
        );

        accountMap = {};
        for (const a of merged) {
          const h = a.handle.toLowerCase();
          if (trustedSet.has(h)) continue;
          accountMap[h] = {
            ...a, handle: h,
            blocked: h in blockedOverride ? blockedOverride[h] : !!a.blocked
          };
        }

        if (cb) cb();
      }
    );
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────

  function handleFromHref(href) {
    if (!href) return null;
    const m = href.match(/^\/([A-Za-z0-9_]{1,50})(?:\/|$)/);
    return m ? m[1].toLowerCase() : null;
  }

  function cat(account) {
    const c = BALLOON_CATEGORIES[account.category];
    if (!c || c.hidden) return null;
    return c;
  }

  function flagEmoji(code) {
    return [...code.toUpperCase()].map(c =>
      String.fromCodePoint(c.codePointAt(0) + 127397)
    ).join("");
  }

  const pageFlags = new Map(); // handle → account (tracks flags seen this page/session)

  function bumpCount(n = 1, account = null) {
    sessionCount += n;
    if (account) pageFlags.set(account.handle, account);
    try { chrome.runtime.sendMessage({ type: "BALLOON_COUNT", delta: n }); } catch (_) {}
    updateSidebarCount();
  }

  // ── Toast ─────────────────────────────────────────────────────────────────────

  function showToast(msg, sub = "") {
    document.querySelectorAll(".balloon-toast").forEach(t => t.remove());
    const toast = document.createElement("div");
    toast.className = "balloon-toast";
    toast.innerHTML = `
      <span class="balloon-toast-icon">${BalloonCore.logo(16)}</span>
      <div class="balloon-toast-text">
        <span class="balloon-toast-main">${msg}</span>
        ${sub ? `<span class="balloon-toast-sub">${sub}</span>` : ""}
      </div>
    `;
    document.body.appendChild(toast);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => toast.classList.add("balloon-toast-show"));
    });
    setTimeout(() => {
      toast.classList.remove("balloon-toast-show");
      toast.addEventListener("transitionend", () => toast.remove(), { once: true });
    }, 3200);
  }

  // ── Quick-flag from menu ───────────────────────────────────────────────────────

  function quickFlag(handle) {
    const h = handle.toLowerCase();
    chrome.storage.sync.get(["customAccounts", "disabledHandles"], data => {
      const all = [...BALLOON_ACCOUNTS, ...(data.customAccounts || [])];
      const disabled = new Set((data.disabledHandles || []).map(x => x.toLowerCase()));

      if (disabled.has(h)) {
        // Re-enable if disabled
        chrome.storage.sync.set({
          disabledHandles: (data.disabledHandles || []).filter(x => x.toLowerCase() !== h)
        }, () => showToast(`@${handle} re-enabled`, "Warning restored in Balloon"));
        return;
      }

      if (all.some(a => a.handle.toLowerCase() === h)) {
        showToast(`@${handle} is already flagged`, "Open Balloon popup to edit");
        return;
      }

      const custom = data.customAccounts || [];
      custom.push({
        handle: h,
        label: "Unverified Claims",
        category: "misinformation",
        blocked: false,
        detail: `Flagged via Balloon quick-add on Twitter.`
      });
      chrome.storage.sync.set({ customAccounts: custom }, () => {
        showToast(`@${handle} flagged`, "Tap popup to change category");
      });
    });
  }

  // ── Tweet "···" menu injection ─────────────────────────────────────────────────

  function makeBalloonMenuItem(handle) {
    const item = document.createElement("div");
    item.className = "balloon-menu-item";
    item.setAttribute("role", "menuitem");
    item.setAttribute("tabindex", "0");
    item.innerHTML = `
      <span class="balloon-menu-icon">${BalloonCore.logo(16)}</span>
      <span class="balloon-menu-text">Flag @${handle} with Balloon…</span>
    `;
    item.addEventListener("click", e => {
      e.stopPropagation();
      // Close the dropdown
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      quickFlag(handle);
    });
    item.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") item.click();
    });
    return item;
  }

  // Track which handle the pending caret click belongs to
  document.addEventListener("click", e => {
    const caret = e.target.closest('[data-testid="caret"]');
    if (caret) {
      const article = caret.closest('article');
      if (article) {
        const links = article.querySelectorAll('[data-testid="User-Name"] a[href]');
        for (const a of links) {
          const h = handleFromHref(a.getAttribute("href"));
          if (h) { pendingMenuHandle = h; break; }
        }
      }
      return;
    }

    // User cell more button (Relevant people / Who to follow)
    const moreBtn = e.target.closest('[data-testid="UserCell"] button[aria-label]');
    if (moreBtn) {
      const cell = moreBtn.closest('[data-testid="UserCell"]');
      if (cell) {
        const link = cell.querySelector("a[href]");
        if (link) {
          const h = handleFromHref(link.getAttribute("href"));
          if (h) pendingMenuHandle = h;
        }
      }
    }
  }, true);

  // Watch for the dropdown menu to appear
  new MutationObserver(mutations => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeType !== 1) continue;
        const dropdown =
          (node.dataset?.testid === "Dropdown" ? node : null) ||
          node.querySelector?.('[data-testid="Dropdown"]');
        if (dropdown && pendingMenuHandle && !dropdown.querySelector(".balloon-menu-item")) {
          const h = pendingMenuHandle;
          pendingMenuHandle = null;
          const divider = document.createElement("div");
          divider.className = "balloon-menu-divider";
          const item = makeBalloonMenuItem(h);
          dropdown.insertBefore(divider, dropdown.firstChild);
          dropdown.insertBefore(item, dropdown.firstChild);
        }
      }
    }
  }).observe(document.body, { childList: true, subtree: true });

  // ── Sidebar widget ─────────────────────────────────────────────────────────────

  const SIDEBAR_ID = "balloon-sidebar-widget";
  const PANEL_ID   = "balloon-sidebar-panel";

  function renderPanel() {
    const list   = document.getElementById("balloon-panel-list");
    const footer = document.getElementById("balloon-panel-footer");
    if (!list) return;
    list.innerHTML = "";

    const attachRescan = (btn) => {
      btn?.addEventListener("click", () => {
        document.querySelectorAll('article[data-testid="tweet"]').forEach(a => {
          delete a.dataset.balloonTweet;
        });
        scan(document.body);
        setTimeout(renderPanel, 300);
      });
    };

    if (pageFlags.size === 0) {
      list.innerHTML = `<div class="pp-empty">No flagged accounts visible yet.<br>Scroll to scan more tweets.</div>`;
      if (footer) {
        footer.innerHTML = `<span></span><button class="pp-rescan-btn">↺ Rescan</button>`;
        attachRescan(footer.querySelector(".pp-rescan-btn"));
      }
      return;
    }

    for (const [, account] of pageFlags) {
      const c   = cat(account);
      const row = document.createElement("div");
      row.className = "pp-row";
      row.innerHTML = `
        <span class="pp-dot" style="background:${c.dotColor}"></span>
        <span class="pp-handle">@${account.handle}${account.country ? " " + flagEmoji(account.country) : ""}</span>
        <span class="pp-chip" style="color:${c.color};background:${c.bgColor};border-color:${c.borderColor}">${c.label}</span>
      `;
      list.appendChild(row);
    }

    if (footer) {
      footer.innerHTML = `<span>${pageFlags.size} flagged visible</span><button class="pp-rescan-btn">↺ Rescan</button>`;
      attachRescan(footer.querySelector(".pp-rescan-btn"));
    }
  }

  function makeSidebarWidget() {
    const el = document.createElement("div");
    el.id = SIDEBAR_ID;
    el.innerHTML = `
      <div class="psw-wrap" id="balloon-wrap">
        <div class="psw-icon-wrap psw-glow">
          ${BalloonCore.logo(36)}
          <span class="psw-pill balloon-pill-hide" id="balloon-pill"></span>
        </div>
        <span class="psw-name">Balloon</span>
        <span class="psw-beta">BETA</span>
      </div>
      <div class="balloon-panel" id="${PANEL_ID}">
        <div class="pp-header"><span>Flagged on this page</span><span class="pp-shortcut">Alt+B</span></div>
        <div class="pp-list" id="balloon-panel-list"></div>
        <div class="pp-footer" id="balloon-panel-footer"></div>
      </div>
    `;

    el.querySelector("#balloon-wrap").addEventListener("click", togglePanel);

    return el;
  }

  function togglePanel() {
    const panel = document.getElementById(PANEL_ID);
    if (!panel) return;
    const opening = !panel.classList.contains("pp-open");
    panel.classList.toggle("pp-open", opening);
    if (opening) renderPanel();
  }

  // Alt+B keyboard shortcut to toggle the panel
  document.addEventListener("keydown", e => {
    if (e.altKey && !e.ctrlKey && !e.metaKey && e.code === "KeyB") {
      e.preventDefault();
      togglePanel();
    }
  }, true);

  function updateSidebarCount() {
    const pill = document.getElementById("balloon-pill");
    if (!pill) return;
    if (sessionCount > 0) {
      const prev = parseInt(pill.dataset.n || "0");
      pill.textContent = sessionCount;
      pill.dataset.n = sessionCount;
      pill.classList.remove("balloon-pill-hide");
      if (sessionCount !== prev) {
        pill.classList.remove("balloon-bump");
        void pill.offsetWidth;
        pill.classList.add("balloon-bump");
      }
      // Refresh open panel
      const p = document.getElementById(PANEL_ID);
      if (p?.classList.contains("pp-open")) renderPanel();
    } else {
      pill.classList.add("balloon-pill-hide");
    }
  }

  // Walk up from an element to find its nav-item container block.
  // Stops when the parent is the sideNav itself, has a role, or has multiple
  // children (meaning we've reached a shared container, not an item wrapper).
  function navItemBlock(el, sideNav) {
    let cur = el.parentElement;
    while (cur && cur !== sideNav) {
      const p = cur.parentElement;
      if (!p || p === sideNav) return cur;
      if (p.getAttribute("role") || p.children.length > 2) return cur;
      cur = p;
    }
    return el.parentElement || el;
  }

  function twitterEnabled() {
    return settings.platforms?.twitter !== false;
  }

  function injectSidebarWidget() {
    if (!settings.showSidebarWidget || !twitterEnabled()) return;
    if (document.getElementById(SIDEBAR_ID)) return;

    const sideNav =
      document.querySelector('[data-testid="SideNav"]')         ||
      document.querySelector('[data-testid="AppTabBar"]')       ||
      document.querySelector('nav[aria-label="Primary"]')       ||
      document.querySelector('nav[aria-label="primary"]')       ||
      document.querySelector("header[role=banner]")             ||
      document.querySelector('nav[role="navigation"]');
    if (!sideNav) return;

    const widget = makeSidebarWidget();

    // Target: insert BEFORE the Home nav item so widget sits between X logo and Home
    const homeLink =
      sideNav.querySelector('a[href="/home"]')                              ||
      sideNav.querySelector('[data-testid="AppTabBar_Home_Link"]')         ||
      sideNav.querySelector('[data-testid="AppTabBar-Home-Link"]')         ||
      sideNav.querySelector('a[aria-label="Home"]');

    if (homeLink) {
      navItemBlock(homeLink, sideNav).insertAdjacentElement("beforebegin", widget);
    } else {
      // Fallback: insert after the X / site-logo link
      const logoLink =
        sideNav.querySelector('a[aria-label="X"]') ||
        sideNav.querySelector('a[href="/"]');
      if (logoLink) {
        navItemBlock(logoLink, sideNav).insertAdjacentElement("afterend", widget);
      } else {
        sideNav.prepend(widget);
      }
    }
    updateSidebarCount();
    updateSidebarCompactMode();
  }

  function updateSidebarCompactMode() {
    const widget = document.getElementById(SIDEBAR_ID);
    if (!widget) return;
    // Detect icon-only sidebar: Twitter hides the text label spans in compact mode
    const homeLink =
      document.querySelector('a[href="/home"]') ||
      document.querySelector('[data-testid="AppTabBar_Home_Link"]');
    if (!homeLink) return;
    const labelSpan = [...homeLink.querySelectorAll("span")].find(
      s => s.textContent.trim() === "Home" && !s.children.length
    );
    const isCompact = labelSpan
      ? getComputedStyle(labelSpan).display === "none" ||
        getComputedStyle(labelSpan).visibility === "hidden"
      : false;
    widget.classList.toggle("psw-compact", isCompact);
  }

  // Burst injection at startup so widget appears immediately when nav is ready,
  // then keep it alive with an interval for SPA re-renders
  injectSidebarWidget();
  [50, 150, 350, 700, 1400, 2500].forEach(d => setTimeout(injectSidebarWidget, d));
  setInterval(() => { injectSidebarWidget(); updateSidebarCompactMode(); }, 500);

  // ── Badge ──────────────────────────────────────────────────────────────────────

  function makeBadge(account) {
    const c = cat(account);
    const el = document.createElement("span");
    el.className = `balloon-badge balloon-cat-${account.category}`;
    el.dataset.balloonHandle = account.handle;
    el.style.cssText = `--pc:${c.color};--pb:${c.bgColor};--pbd:${c.borderColor}`;
    el.setAttribute("role", "img");
    el.setAttribute("aria-label", `Balloon: ${c.label}`);
    el.innerHTML = `
      <span class="pb-icon">${ICONS[account.category] || ""}</span>
      <span class="pb-text">${account.label || c.label}</span>
    `;

    const tip = document.createElement("div");
    tip.className = "balloon-tip";
    tip.innerHTML = `
      <div class="pt-head">
        <div class="pt-head-icon">${ICONS[account.category] || ""}</div>
        <div class="pt-head-meta">
          <div class="pt-head-title">${account.label || c.label}${account.country ? " " + flagEmoji(account.country) : ""}</div>
          <div class="pt-head-handle">@${account.handle} · ${c.label}</div>
        </div>
      </div>
      <div class="pt-body">${account.detail || ""}</div>
      ${account.source ? `<div class="pt-source">${account.source}</div>` : ""}
    `;
    el.appendChild(tip);
    return el;
  }

  // ── Avatar dot ────────────────────────────────────────────────────────────────

  function makeAvatarDot(account) {
    const c = cat(account);
    const dot = document.createElement("span");
    dot.className = "balloon-avatar-dot";
    dot.dataset.balloonHandle = account.handle;
    dot.style.background = c.dotColor;
    dot.title = `Balloon: ${c.label}`;
    return dot;
  }

  // ── Profile banner ─────────────────────────────────────────────────────────────

  function makeProfileBanner(account) {
    const c = cat(account);
    const banner = document.createElement("div");
    banner.id = "balloon-profile-banner";
    banner.className = `balloon-banner balloon-cat-${account.category}`;
    banner.style.cssText = `--pc:${c.color};--pb:${c.bgColor};--pbd:${c.borderColor}`;

    banner.innerHTML = `
      <div class="balloon-banner-content">
        <div class="balloon-banner-row1">
          <span class="balloon-banner-cat-icon">${ICONS[account.category] || ""}</span>
          <span class="balloon-banner-name">${account.label || c.label}${account.country ? " " + flagEmoji(account.country) : ""}</span>
          <span class="balloon-banner-cat-chip">${c.label}</span>
          ${account.blocked && settings.blockContent ? '<span class="balloon-banner-blocked-chip">Content hidden</span>' : ""}
        </div>
        ${account.detail ? `<div class="balloon-banner-detail">${account.detail}</div>` : ""}
        ${account.source ? `<div class="balloon-banner-source">${account.source}</div>` : ""}
      </div>
      <div class="balloon-banner-btns">
        <button class="balloon-banner-trust" title="Mark as trusted">
          <svg width="10" height="10" viewBox="0 0 11 11" fill="none"><path d="M1.5 5.5L4 8.5L9.5 2.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
          Trust
        </button>
        <button class="balloon-banner-close" aria-label="Dismiss">
          <svg width="11" height="11" viewBox="0 0 14 14" fill="none"><line x1="1" y1="1" x2="13" y2="13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><line x1="13" y1="1" x2="1" y2="13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
        </button>
      </div>
    `;
    banner.querySelector(".balloon-banner-trust").addEventListener("click", () => {
      chrome.storage.sync.get("trustedHandles", data => {
        const trusted = data.trustedHandles || [];
        if (!trusted.includes(account.handle)) trusted.push(account.handle);
        chrome.storage.sync.set({ trustedHandles: trusted }, () => {
          showToast(`@${account.handle} marked as trusted`, "Balloon warnings removed for this account");
          banner.remove();
        });
      });
    });
    banner.querySelector(".balloon-banner-close").addEventListener("click", () => {
      banner.classList.add("balloon-banner-out");
      banner.addEventListener("transitionend", () => banner.remove(), { once: true });
    });
    return banner;
  }

  // ── Block overlay ──────────────────────────────────────────────────────────────

  function makeBlockOverlay(account) {
    const c = cat(account);
    const ov = document.createElement("div");
    ov.className = "balloon-block-overlay";
    ov.style.cssText = `--pc:${c.color};--pb:${c.bgColor};--pbd:${c.borderColor}`;
    ov.innerHTML = `
      <div class="pbo-inner">
        <div class="pbo-icon-ring">${ICONS[account.category] || ""}</div>
        <div class="pbo-body">
          <div class="pbo-label">${account.label || c.label}</div>
          <div class="pbo-handle">@${account.handle}${account.country ? " " + flagEmoji(account.country) : ""}</div>
          <div class="pbo-detail">${(account.detail || "").slice(0, 110)}${(account.detail || "").length > 110 ? "…" : ""}</div>
        </div>
        <button class="pbo-btn">View anyway</button>
      </div>
    `;
    ov.querySelector(".pbo-btn").addEventListener("click", e => {
      e.stopPropagation();
      const art = ov.closest("article");
      if (art) { art.classList.remove("balloon-blocked"); art.dataset.balloonRevealed = "1"; }
      ov.classList.add("pbo-out");
      setTimeout(() => ov.remove(), 380);
    });
    return ov;
  }

  // ── Process tweet ──────────────────────────────────────────────────────────────

  function processTweet(article) {
    if (article.dataset.balloonTweet) return;

    const userBlock = article.querySelector('[data-testid="User-Name"]');
    if (!userBlock) return;

    let handle = null;
    const links = userBlock.querySelectorAll("a[href]");
    for (const a of links) {
      const h = handleFromHref(a.getAttribute("href"));
      if (h && accountMap[h]) { handle = h; break; }
    }
    if (!handle) return;

    article.dataset.balloonTweet = handle;
    const account = accountMap[handle];
    const c = cat(account);
    if (!c) return; // category hidden (misinformation/conspiracy/satire)

    if (settings.showTweetBadge) {
      const link = [...links].find(a => handleFromHref(a.getAttribute("href")) === handle);
      if (link) {
        const row = link.closest("[dir]") || link.parentElement;
        if (row && !row.querySelector(`.balloon-badge[data-balloon-handle="${handle}"]`)) {
          link.insertAdjacentElement("afterend", makeBadge(account));
          bumpCount(1, account);
        }
      }
    }

    if (settings.showAvatarDot) {
      const av = article.querySelector('[data-testid="Tweet-User-Avatar"]');
      if (av && !av.querySelector(".balloon-avatar-dot")) {
        av.style.position = "relative";
        av.appendChild(makeAvatarDot(account));
      }
    }

    if (settings.highlightTweets && !account.blocked) {
      article.style.setProperty("--phc", c.bgColor);
      article.style.setProperty("--phb", c.borderColor);
      article.classList.add("balloon-highlighted");
    }

    if (settings.blockContent && account.blocked && !article.dataset.balloonRevealed) {
      article.classList.add("balloon-blocked");
      if (!article.querySelector(".balloon-block-overlay")) {
        article.appendChild(makeBlockOverlay(account));
      }
    }
  }

  // ── User cells ────────────────────────────────────────────────────────────────

  function processUserCell(cell) {
    if (cell.dataset.balloonDone) return;
    const link = cell.querySelector("a[href]");
    if (!link) return;
    const handle = handleFromHref(link.getAttribute("href"));
    if (!handle || !accountMap[handle]) return;
    if (!cat(accountMap[handle])) return; // category hidden
    cell.dataset.balloonDone = handle;
    if (!settings.showTweetBadge) return;
    const nameEl = cell.querySelector('[dir="ltr"] span') || link;
    if (!nameEl.parentElement?.querySelector(`.balloon-badge[data-balloon-handle="${handle}"]`)) {
      nameEl.insertAdjacentElement("afterend", makeBadge(accountMap[handle]));
    }
  }

  // ── Profile banner ────────────────────────────────────────────────────────────

  const NON_PROFILE = new Set([
    "home","explore","notifications","messages",
    "settings","i","search","compose","bookmarks","lists"
  ]);

  function tryProfileBanner() {
    if (!settings.showProfileBanner) return;
    if (document.getElementById("balloon-profile-banner")) return;

    const parts = window.location.pathname.split("/").filter(Boolean);
    if (!parts.length || NON_PROFILE.has(parts[0].toLowerCase())) return;

    const handle  = parts[0].toLowerCase();
    const account = accountMap[handle];
    if (!account || !cat(account)) return; // category hidden

    const banner  = makeProfileBanner(account);
    const tabList = document.querySelector('[role="tablist"]');

    if (tabList) {
      (tabList.closest("nav") || tabList.parentElement)
        ?.insertAdjacentElement("beforebegin", banner);
    } else {
      const anchor =
        document.querySelector('[data-testid="UserProfileHeader_Items"]') ||
        document.querySelector('[data-testid="UserDescription"]');
      if (anchor) anchor.insertAdjacentElement("afterend", banner);
      else document.querySelector('[data-testid="primaryColumn"]')?.prepend(banner);
    }

    bumpCount(1, account);
  }

  // ── Scan ──────────────────────────────────────────────────────────────────────

  function scan(root) {
    if (!root?.querySelectorAll || !twitterEnabled()) return;
    root.querySelectorAll('article[data-testid="tweet"]').forEach(processTweet);
    root.querySelectorAll('[data-testid="UserCell"]').forEach(processUserCell);
    tryProfileBanner();
    injectSidebarWidget();
  }

  let scanPending = false;
  function queueScan() {
    if (scanPending) return;
    scanPending = true;
    requestAnimationFrame(() => { scanPending = false; scan(document.body); });
  }

  const domObserver = new MutationObserver(queueScan);

  let lastUrl = location.href;
  new MutationObserver(() => {
    if (location.href === lastUrl) return;
    lastUrl = location.href;
    document.getElementById("balloon-profile-banner")?.remove();
    pageFlags.clear();
    sessionCount = 0;
    updateSidebarCount();
    // Re-inject widget immediately, then cascade scans as Twitter mounts React nav
    injectSidebarWidget();
    [0, 150, 400, 900, 1800, 3000].forEach(delay => setTimeout(() => {
      injectSidebarWidget();
      scan(document.body);
    }, delay));
  }).observe(document, { subtree: true, childList: true });

  chrome.storage.onChanged.addListener(() => {
    reload(() => {
      document.querySelectorAll(
        ".balloon-badge,.balloon-block-overlay,.balloon-avatar-dot,#balloon-profile-banner,#balloon-sidebar-widget"
      ).forEach(el => el.remove());
      document.querySelectorAll("[data-balloon-tweet],[data-balloon-done]").forEach(el => {
        el.classList.remove("balloon-blocked","balloon-highlighted");
        delete el.dataset.balloonTweet;
        delete el.dataset.balloonDone;
        delete el.dataset.balloonRevealed;
        el.style.removeProperty("--phc");
        el.style.removeProperty("--phb");
      });
      sessionCount = 0;
      pageFlags.clear();
      scan(document.body);
    });
  });

  reload(() => {
    scan(document.body);
    domObserver.observe(document.body, { childList: true, subtree: true });
  });

  // ── Source links + keyword filter (shared core) ──────────────────────────────

  BalloonCore.watch({
    platform: "twitter",
    postSelector: 'article[data-testid="tweet"]',
    getText: art => BalloonCore.textOf(art),
    // Link cards show "From rt.com" while the href is a t.co shortlink
    extraText: art => [...art.querySelectorAll('[data-testid="card.wrapper"]')]
      .map(BalloonCore.textOf).join(" "),
    stripHost: art => art.querySelector('[data-testid="tweetText"]')?.parentElement || null
  });
})();
