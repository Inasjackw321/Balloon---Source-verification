(() => {
  "use strict";

  // ── State ──────────────────────────────────────────────────────────────────

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

  let customAccounts   = [];
  let disabledHandles  = [];
  let blockedOverrides = {};
  let trustedHandles   = [];
  let customDomains    = [];
  let disabledDomains  = [];
  let domainOverrides  = {};
  let blockedKeywords  = [];
  let settings         = structuredClone(DEFAULT_SETTINGS);
  let filter           = "";
  let srcFilter        = "";
  let trustedOpen      = false;

  const $ = id => document.getElementById(id);

  // ── Helpers ────────────────────────────────────────────────────────────────

  function save(cb) {
    chrome.storage.sync.set({
      customAccounts, disabledHandles, blockedOverrides, trustedHandles,
      customDomains, disabledDomains, domainOverrides, blockedKeywords, settings
    }, cb);
  }

  function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, c => (
      { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
    ));
  }

  const CAT_SHORT = {
    "state-propaganda": "State-Affiliated",
    "state-funded":     "State-Funded",
    "misinformation":   "Bad Source",
    "conspiracy":       "Bad Source",
    "satire":           "Satire"
  };

  const CAT_STYLE = {
    "state-propaganda": { color: "#b45309", bg: "#fffbeb", dot: "#d97706" },
    "state-funded":     { color: "#92400e", bg: "#fef3c7", dot: "#b45309" },
    "misinformation":   { color: "#991b1b", bg: "#fef2f2", dot: "#ef4444" },
    "conspiracy":       { color: "#6d28d9", bg: "#f5f3ff", dot: "#8b5cf6" },
    "satire":           { color: "#1d4ed8", bg: "#eff6ff", dot: "#3b82f6" }
  };
  const styleFor = c => CAT_STYLE[c] || { color: "#555", bg: "#f5f5f5", dot: "#999" };

  function flag(code) {
    if (!code) return "";
    return " " + [...code.toUpperCase()].map(c => String.fromCodePoint(c.codePointAt(0) + 127397)).join("");
  }

  function bareHost(h) {
    return (h || "").trim().toLowerCase().replace(/\.$/, "").replace(/^(www\d?|m|mobile|amp)\./, "");
  }

  function shake(input) {
    input.classList.remove("shake");
    void input.offsetWidth;
    input.classList.add("shake");
  }

  // Little balloons burst out of the element that was clicked
  function confetti(fromEl) {
    const box = fromEl.getBoundingClientRect();
    const host = $("confetti");
    const colors = ["#a855f7", "#ec4899", "#f59e0b", "#22c55e", "#3b82f6", "#f0abfc"];
    for (let i = 0; i < 14; i++) {
      const p = document.createElement("i");
      const angle = (Math.PI * 2 * i) / 14 + Math.random() * 0.4;
      const dist = 40 + Math.random() * 50;
      p.style.left = box.left + box.width / 2 + "px";
      p.style.top = box.top + box.height / 2 + "px";
      p.style.background = colors[i % colors.length];
      p.style.setProperty("--dx", Math.cos(angle) * dist + "px");
      p.style.setProperty("--dy", Math.sin(angle) * dist - 30 + "px");
      p.style.setProperty("--rot", (Math.random() * 360 - 180) + "deg");
      host.appendChild(p);
      setTimeout(() => p.remove(), 950);
    }
  }

  // Animate a number from its current value to `to`
  function countTo(el, to) {
    const from = parseInt(el.textContent, 10) || 0;
    if (from === to) return;
    const start = performance.now();
    const dur = 700;
    const step = now => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(from + (to - from) * eased);
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function removeWithPop(el, done) {
    el.classList.add("removing");
    setTimeout(done, 280);
  }

  // ── Tabs with sliding ink ──────────────────────────────────────────────────

  function moveInk(btn) {
    const ink = $("tabInk");
    ink.style.left = btn.offsetLeft + 8 + "px";
    ink.style.width = btn.offsetWidth - 16 + "px";
  }

  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const t = btn.dataset.tab;
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.toggle("active", b === btn));
      document.querySelectorAll(".pane").forEach(p => p.classList.toggle("active", p.id === `tab-${t}`));
      moveInk(btn);
    });
  });
  requestAnimationFrame(() => moveInk(document.querySelector(".tab-btn.active")));

  // Poke the header balloon: it pops and re-inflates
  $("logoFloat").addEventListener("click", e => {
    const el = e.currentTarget;
    confetti(el);
    el.classList.add("popped");
    setTimeout(() => {
      el.classList.remove("popped");
      el.style.animation = "none";
      void el.offsetWidth;
      el.style.animation = "";
    }, 400);
  });

  $("version").textContent = `Balloon v${chrome.runtime.getManifest().version}`;

  // ── Stats ──────────────────────────────────────────────────────────────────

  function renderStats() {
    const accs = new Set([...BALLOON_ACCOUNTS, ...customAccounts].map(a => a.handle.toLowerCase()));
    const srcs = new Set([...BALLOON_SOURCES, ...customDomains].map(s => bareHost(s.domain)));
    countTo($("statAccounts"), accs.size);
    countTo($("statSources"), srcs.size);
    countTo($("statKeywords"), blockedKeywords.length);
    countTo($("statPlatforms"), Object.values(settings.platforms).filter(v => v !== false).length);
  }

  // ── Accounts ───────────────────────────────────────────────────────────────

  function isDefaultAccount(handle) {
    return BALLOON_ACCOUNTS.some(a => a.handle.toLowerCase() === handle.toLowerCase());
  }

  function effectiveBlocked(acc) {
    const h = acc.handle.toLowerCase();
    return h in blockedOverrides ? blockedOverrides[h] : !!acc.blocked;
  }

  function renderAccounts() {
    const listEl = $("accList");
    const disabled = new Set(disabledHandles.map(h => h.toLowerCase()));
    const customSet = new Set(customAccounts.map(a => a.handle.toLowerCase()));
    const all = [...BALLOON_ACCOUNTS, ...customAccounts.filter(c => !isDefaultAccount(c.handle))];

    const q = filter.toLowerCase().replace(/^@/, "");
    const visible = q
      ? all.filter(a =>
          a.handle.toLowerCase().includes(q) ||
          (a.label || "").toLowerCase().includes(q) ||
          (a.category || "").toLowerCase().includes(q))
      : all;

    $("accCount").textContent = visible.length === all.length
      ? `${all.length} accounts`
      : `${visible.length} of ${all.length}`;

    listEl.innerHTML = "";
    if (!visible.length) {
      listEl.innerHTML = `<div class="no-results">${q ? `No results for "@${esc(q)}"` : "No accounts flagged."}</div>`;
    }
    visible.forEach((acc, i) => {
      const h = acc.handle.toLowerCase();
      const off = disabled.has(h);
      const blocked = effectiveBlocked(acc);
      const st = styleFor(acc.category);
      const row = document.createElement("div");
      row.className = "item" + (off ? " disabled" : "");
      row.style.setProperty("--i", Math.min(i, 30));
      row.title = acc.detail || "";
      row.innerHTML = `
        <span class="dot" style="background:${off ? "#d1d5db" : st.dot}"></span>
        <span class="item-name">@${esc(acc.handle)}${flag(acc.country)}</span>
        <span class="cat-pill" style="color:${st.color};background:${st.bg}">${CAT_SHORT[acc.category] || esc(acc.category)}</span>
        ${blocked && !off ? '<span class="blocked-dot" title="Posts blocked"></span>' : ""}
        <div class="actions">
          <button class="btn-ghost${blocked ? " active-flag" : ""}" data-act="block">${blocked ? "Unblock" : "Block"}</button>
          <button class="btn-ghost" data-act="toggle">${off ? "Enable" : "Disable"}</button>
          ${customSet.has(h) ? `<button class="btn-ghost danger" data-act="remove">✕</button>` : ""}
        </div>`;
      row.querySelector('[data-act="block"]').addEventListener("click", () => {
        blockedOverrides[h] = !blocked;
        save(renderAccounts);
      });
      row.querySelector('[data-act="toggle"]').addEventListener("click", () => {
        disabledHandles = off ? disabledHandles.filter(x => x.toLowerCase() !== h) : [...disabledHandles, h];
        save(renderAccounts);
      });
      row.querySelector('[data-act="remove"]')?.addEventListener("click", () => {
        removeWithPop(row, () => {
          customAccounts = customAccounts.filter(a => a.handle.toLowerCase() !== h);
          delete blockedOverrides[h];
          save(renderAll);
        });
      });
      listEl.appendChild(row);
    });

    renderTrusted();
  }

  function renderTrusted() {
    const listEl = $("trustedList");
    listEl.innerHTML = "";
    if (!trustedHandles.length) {
      listEl.innerHTML = `<div style="padding:10px 14px;font-size:11.5px;color:var(--text3)">
        No trusted accounts. Use “Trust” on any Balloon banner, or right-click a profile link on X.
      </div>`;
      return;
    }
    trustedHandles.forEach(h => {
      const row = document.createElement("div");
      row.className = "trusted-item";
      row.innerHTML = `
        <span class="trusted-handle">@${esc(h)}</span>
        <span class="trusted-tag">Trusted</span>
        <button class="btn-ghost danger" style="font-size:10px;padding:2px 7px">Remove</button>`;
      row.querySelector("button").addEventListener("click", () => {
        trustedHandles = trustedHandles.filter(x => x !== h);
        save(renderTrusted);
      });
      listEl.appendChild(row);
    });
  }

  $("trustedToggle").addEventListener("click", () => {
    trustedOpen = !trustedOpen;
    $("trustedToggle").classList.toggle("open", trustedOpen);
    $("trustedList").classList.toggle("open", trustedOpen);
  });

  $("searchInput").addEventListener("input", e => { filter = e.target.value; renderAccounts(); });

  const handleInput = $("handleInput");
  $("addBtn").addEventListener("click", e => {
    const errEl = $("addErr");
    errEl.textContent = "";
    const handle = handleInput.value.trim().replace(/^@/, "").toLowerCase();
    if (!handle) { errEl.textContent = "Enter a username."; shake(handleInput); return; }
    if (!/^[a-z0-9_.]{1,50}$/.test(handle)) { errEl.textContent = "Invalid username."; shake(handleInput); return; }
    if ([...BALLOON_ACCOUNTS, ...customAccounts].some(a => a.handle.toLowerCase() === handle)) {
      errEl.textContent = "Already in list."; shake(handleInput); return;
    }
    const cat = $("catSelect").value;
    customAccounts.push({
      handle, label: CAT_SHORT[cat] || cat, category: cat,
      blocked: cat === "state-propaganda",
      detail: `Manually flagged as: ${CAT_SHORT[cat] || cat}.`
    });
    confetti(e.currentTarget);
    save(() => {
      handleInput.value = "";
      $("pendingPill").style.display = "none";
      renderAll();
    });
  });
  handleInput.addEventListener("keydown", e => { if (e.key === "Enter") $("addBtn").click(); });

  // Handle queued by the X right-click menu
  chrome.storage.local.get("pendingAdd", data => {
    if (!data.pendingAdd) return;
    handleInput.value = "@" + data.pendingAdd;
    $("pendingText").innerHTML = `<strong>@${esc(data.pendingAdd)}</strong> — choose a category and add.`;
    $("pendingPill").style.display = "flex";
    chrome.storage.local.remove("pendingAdd");
    document.querySelector("[data-tab='accounts']").click();
  });
  $("pendingClear").addEventListener("click", () => {
    $("pendingPill").style.display = "none";
    handleInput.value = "";
  });

  // ── Sources ────────────────────────────────────────────────────────────────

  function allSources() {
    const map = new Map();
    for (const s of BALLOON_SOURCES) map.set(bareHost(s.domain), { ...s, domain: bareHost(s.domain), custom: false });
    for (const s of customDomains) map.set(bareHost(s.domain), { ...s, domain: bareHost(s.domain), custom: true });
    return [...map.values()];
  }

  function srcBlocked(src) {
    return src.domain in domainOverrides ? domainOverrides[src.domain] : !!src.blocked;
  }

  function renderSources() {
    const listEl = $("srcList");
    const off = new Set(disabledDomains.map(bareHost));
    const all = allSources();
    const q = srcFilter.toLowerCase();
    const visible = q
      ? all.filter(s => s.domain.includes(q) || (s.name || "").toLowerCase().includes(q) || (s.category || "").includes(q))
      : all;

    $("srcCount").textContent = visible.length === all.length ? `${all.length} websites` : `${visible.length} of ${all.length}`;
    listEl.innerHTML = visible.length ? "" : `<div class="no-results">No websites match “${esc(q)}”.</div>`;

    visible.forEach((src, i) => {
      const disabled = off.has(src.domain);
      const blocked = srcBlocked(src);
      const st = styleFor(src.category);
      const row = document.createElement("div");
      row.className = "item" + (disabled ? " disabled" : "");
      row.style.setProperty("--i", Math.min(i, 30));
      row.title = [src.name, src.detail, src.source].filter(Boolean).join(" — ");
      row.innerHTML = `
        <span class="dot" style="background:${disabled ? "#d1d5db" : st.dot}"></span>
        <span class="item-name">${esc(src.domain)}${flag(src.country)}</span>
        <span class="cat-pill" style="color:${st.color};background:${st.bg}">${CAT_SHORT[src.category] || esc(src.category)}</span>
        ${blocked && !disabled ? '<span class="blocked-dot" title="Posts linking here are blocked"></span>' : ""}
        <div class="actions">
          <button class="btn-ghost${blocked ? " active-flag" : ""}" data-act="block">${blocked ? "Unblock" : "Block"}</button>
          <button class="btn-ghost" data-act="toggle">${disabled ? "Enable" : "Disable"}</button>
          ${src.custom ? `<button class="btn-ghost danger" data-act="remove">✕</button>` : ""}
        </div>`;
      row.querySelector('[data-act="block"]').addEventListener("click", () => {
        domainOverrides[src.domain] = !blocked;
        save(renderSources);
      });
      row.querySelector('[data-act="toggle"]').addEventListener("click", () => {
        disabledDomains = disabled
          ? disabledDomains.filter(d => bareHost(d) !== src.domain)
          : [...disabledDomains, src.domain];
        save(renderSources);
      });
      row.querySelector('[data-act="remove"]')?.addEventListener("click", () => {
        removeWithPop(row, () => {
          customDomains = customDomains.filter(d => bareHost(d.domain) !== src.domain);
          delete domainOverrides[src.domain];
          save(renderAll);
        });
      });
      listEl.appendChild(row);
    });
  }

  $("srcSearch").addEventListener("input", e => { srcFilter = e.target.value.trim(); renderSources(); });

  function parseDomain(raw) {
    let s = (raw || "").trim();
    if (!s) return null;
    if (!/^[a-z]+:\/\//i.test(s)) s = "https://" + s;
    try {
      const url = new URL(s);
      const host = bareHost(url.hostname);
      const wrapped =
        (host === "l.facebook.com" || host === "lm.facebook.com" || host === "l.instagram.com") ? url.searchParams.get("u") :
        (host === "youtube.com" && url.pathname === "/redirect") ? url.searchParams.get("q") : null;
      const finalHost = wrapped ? bareHost(new URL(wrapped).hostname) : host;
      return /^([a-z0-9-]+\.)+[a-z]{2,24}$/.test(finalHost) ? finalHost : null;
    } catch (_) {
      return null;
    }
  }

  const domainInput = $("domainInput");
  $("addDomainBtn").addEventListener("click", e => {
    const errEl = $("domainErr");
    errEl.textContent = "";
    const domain = parseDomain(domainInput.value);
    if (!domain) { errEl.textContent = "Enter a valid website, e.g. example.com"; shake(domainInput); return; }
    if (allSources().some(s => s.domain === domain)) { errEl.textContent = "Already in list."; shake(domainInput); return; }
    const cat = $("domainCat").value;
    customDomains.push({
      domain, name: domain, category: cat, blocked: false,
      detail: `Manually flagged as: ${CAT_SHORT[cat] || cat}.`
    });
    confetti(e.currentTarget);
    save(() => { domainInput.value = ""; renderAll(); });
  });
  domainInput.addEventListener("keydown", e => { if (e.key === "Enter") $("addDomainBtn").click(); });

  // Link checker — same suffix matching the content scripts use
  function checkLink() {
    const input = $("checkInput");
    const verdict = $("verdict");
    const host = parseDomain(input.value);
    verdict.innerHTML = "";
    if (!host) { shake(input); return; }
    const off = new Set(disabledDomains.map(bareHost));
    const map = new Map(allSources().filter(s => !off.has(s.domain)).map(s => [s.domain, s]));
    let h = host, src = null;
    while (h.includes(".") && !src) {
      src = map.get(h) || null;
      h = h.slice(h.indexOf(".") + 1);
    }
    void verdict.offsetWidth;
    if (src) {
      const st = styleFor(src.category);
      verdict.style.cssText = `--vb:${st.dot};--vbg:${st.bg};--vc:${st.color}`;
      verdict.innerHTML = `
        <span class="v-icon">🎈</span>
        <div>
          <div class="v-title">${esc(src.name || src.domain)}${flag(src.country)} · ${CAT_SHORT[src.category] || esc(src.category)}${srcBlocked(src) ? " · Blocked" : ""}</div>
          <div class="v-detail">${esc(src.detail || "")}</div>
          ${src.source ? `<div class="v-source">${esc(src.source)}</div>` : ""}
        </div>`;
    } else {
      verdict.style.cssText = "--vb:#86efac;--vbg:#f0fdf4;--vc:#15803d";
      verdict.innerHTML = `
        <span class="v-icon">✓</span>
        <div>
          <div class="v-title">${esc(host)} isn't on Balloon's list</div>
          <div class="v-detail">That doesn't make it reliable — check who runs it and whether other outlets confirm the story.</div>
        </div>`;
    }
  }
  $("checkBtn").addEventListener("click", checkLink);
  $("checkInput").addEventListener("keydown", e => { if (e.key === "Enter") checkLink(); });

  // ── Keyword filters ────────────────────────────────────────────────────────

  function renderKeywords() {
    const host = $("kwChips");
    host.innerHTML = blockedKeywords.length ? "" : `<span class="hint" style="margin:0">No filters yet.</span>`;
    blockedKeywords.forEach((w, i) => {
      const chip = document.createElement("span");
      chip.className = "chip";
      chip.style.animationDelay = `${i * 30}ms`;
      chip.innerHTML = `${esc(w)} <button aria-label="Remove ${esc(w)}">✕</button>`;
      chip.querySelector("button").addEventListener("click", () => {
        removeWithPop(chip, () => {
          blockedKeywords = blockedKeywords.filter(x => x !== w);
          save(renderAll);
        });
      });
      host.appendChild(chip);
    });
  }

  const kwInput = $("kwInput");
  $("kwAdd").addEventListener("click", e => {
    const errEl = $("kwErr");
    errEl.textContent = "";
    const w = kwInput.value.trim().replace(/\s+/g, " ");
    if (w.length < 2) { errEl.textContent = "Use at least 2 characters."; shake(kwInput); return; }
    if (w.length > 60) { errEl.textContent = "Keep it under 60 characters."; shake(kwInput); return; }
    if (blockedKeywords.some(x => x.toLowerCase() === w.toLowerCase())) { errEl.textContent = "Already filtered."; shake(kwInput); return; }
    blockedKeywords.push(w);
    confetti(e.currentTarget);
    save(() => { kwInput.value = ""; renderAll(); });
  });
  kwInput.addEventListener("keydown", e => { if (e.key === "Enter") $("kwAdd").click(); });

  // ── Export / Import ────────────────────────────────────────────────────────

  $("exportBtn").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify({
      app: "balloon", version: 4, exportedAt: new Date().toISOString(),
      customAccounts, disabledHandles, blockedOverrides, trustedHandles,
      customDomains, disabledDomains, domainOverrides, blockedKeywords
    }, null, 2)], { type: "application/json" });
    const a = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(blob),
      download: "balloon-settings.json"
    });
    a.click();
    URL.revokeObjectURL(a.href);
  });

  $("importFile").addEventListener("change", e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const d = JSON.parse(ev.target.result);
        if (Array.isArray(d.customAccounts))  customAccounts   = d.customAccounts;
        if (Array.isArray(d.disabledHandles)) disabledHandles  = d.disabledHandles;
        if (d.blockedOverrides)               blockedOverrides = d.blockedOverrides;
        if (Array.isArray(d.trustedHandles))  trustedHandles   = d.trustedHandles;
        if (Array.isArray(d.customDomains))   customDomains    = d.customDomains;
        if (Array.isArray(d.disabledDomains)) disabledDomains  = d.disabledDomains;
        if (d.domainOverrides)                domainOverrides  = d.domainOverrides;
        if (Array.isArray(d.blockedKeywords)) blockedKeywords  = d.blockedKeywords;
        save(renderAll);
      } catch (_) {
        $("addErr").textContent = "Invalid JSON file.";
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  });

  // ── Settings ───────────────────────────────────────────────────────────────

  const SETTING_MAP = {
    "s-sidebar":    "showSidebarWidget",
    "s-banner":     "showProfileBanner",
    "s-badge":      "showTweetBadge",
    "s-avatar":     "showAvatarDot",
    "s-block":      "blockContent",
    "s-highlight":  "highlightTweets",
    "s-sources":    "highlightSources",
    "s-blocklinks": "blockSourceLinks",
    "s-keywords":   "keywordFilter"
  };
  const PLATFORMS = ["twitter", "youtube", "instagram", "facebook"];

  function syncSettingsUI() {
    for (const [id, key] of Object.entries(SETTING_MAP)) $(id).checked = !!settings[key];
    for (const p of PLATFORMS) {
      const on = settings.platforms[p] !== false;
      $(`p-${p}`).checked = on;
      $(`p-${p}`).closest(".platform").classList.toggle("on", on);
    }
  }

  for (const [id, key] of Object.entries(SETTING_MAP)) {
    $(id).addEventListener("change", () => { settings[key] = $(id).checked; save(); });
  }
  for (const p of PLATFORMS) {
    $(`p-${p}`).addEventListener("change", e => {
      settings.platforms = { ...settings.platforms, [p]: e.target.checked };
      e.target.closest(".platform").classList.toggle("on", e.target.checked);
      save(renderStats);
    });
  }

  $("resetBtn").addEventListener("click", () => {
    if (!confirm("Reset all custom accounts, sources, filters, trusted handles and settings to defaults?")) return;
    customAccounts = []; disabledHandles = []; blockedOverrides = {}; trustedHandles = [];
    customDomains = []; disabledDomains = []; domainOverrides = {}; blockedKeywords = [];
    settings = structuredClone(DEFAULT_SETTINGS);
    save(() => { syncSettingsUI(); renderAll(); });
  });

  // ── Load ───────────────────────────────────────────────────────────────────

  function renderAll() {
    renderAccounts();
    renderSources();
    renderKeywords();
    renderStats();
  }

  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    if (!tab) return;
    chrome.action.getBadgeText({ tabId: tab.id }, text => {
      if (text && text !== "0") {
        $("headerCount").textContent = `${text} flagged here`;
        $("headerCount").classList.add("visible");
      }
    });
  });

  chrome.storage.sync.get(
    ["customAccounts", "disabledHandles", "blockedOverrides", "trustedHandles", "settings",
     "customDomains", "disabledDomains", "domainOverrides", "blockedKeywords"],
    data => {
      customAccounts   = data.customAccounts   || [];
      disabledHandles  = data.disabledHandles  || [];
      blockedOverrides = data.blockedOverrides || {};
      trustedHandles   = data.trustedHandles   || [];
      customDomains    = data.customDomains    || [];
      disabledDomains  = data.disabledDomains  || [];
      domainOverrides  = data.domainOverrides  || {};
      blockedKeywords  = data.blockedKeywords  || [];
      if (data.settings) {
        Object.assign(settings, data.settings);
        settings.platforms = { ...DEFAULT_SETTINGS.platforms, ...(data.settings.platforms || {}) };
      }
      syncSettingsUI();
      renderAll();
    }
  );
})();
