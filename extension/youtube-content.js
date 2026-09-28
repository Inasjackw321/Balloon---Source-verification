// Balloon — Source Verification · YouTube content script
(function () {
  'use strict';
  if (window.__balloonYTLoaded) return;
  window.__balloonYTLoaded = true;

  /* ── Settings ─────────────────────────────────────────────────── */
  // Read from same storage structure as the popup (nested `settings` object)
  const settings = {
    showBadges:        true,  // maps from settings.showTweetBadge
    showBanners:       true,  // maps from settings.showProfileBanner
    showSidebarWidget: true,
  };

  let trustedSet = new Set();

  let enabled = true;

  function loadStorage(cb) {
    chrome.storage.sync.get(['settings', 'trustedHandles'], data => {
      const s = data.settings || {};
      enabled = s.platforms?.youtube !== false;
      settings.showBadges        = s.showTweetBadge   !== false;
      settings.showBanners       = s.showProfileBanner !== false;
      settings.showSidebarWidget = s.showSidebarWidget !== false;
      trustedSet = new Set((data.trustedHandles || []).map(h => h.toLowerCase()));
      if (!enabled) {
        document.querySelectorAll('.balloon-yt-badge-wrap, .balloon-yt-block-overlay, #balloon-yt-banner')
          .forEach(el => el.remove());
        document.querySelectorAll('[data-balloon-yt-done]').forEach(el => delete el.dataset.balloonYtDone);
      }
      if (cb) cb();
    });
  }

  loadStorage();

  // Re-read whenever popup changes settings
  chrome.storage.onChanged.addListener(() => loadStorage());

  function isTrusted(handle) {
    return trustedSet.has((handle || '').toLowerCase());
  }

  /* ── Handle normalization ─────────────────────────────────────── */
  function norm(h) {
    return (h || '').toLowerCase().replace(/[_\-\.@\s]/g, '');
  }

  // YouTube handle → Twitter handle overrides (where they differ from Twitter handle)
  const YT_OVERRIDES = {
    // ── Russian state media ───────────────────────────────────────
    'rt':                    'RT_com',
    'rtnews':                'RT_com',
    'rtdoc':                 'RT_Documentary',
    'rtdocumentary':         'RT_Documentary',
    'rtuk':                  'RT_UK',
    'rtindia':               'RT_India',
    'sputniknews':           'SputnikInt',
    'sputniknewsofficial':   'SputnikInt',
    'sputnik':               'SputnikInt',
    'sputnikglobe':          'SputnikInt',
    'ruptly':                'Ruptly',
    'ruptlyvideo':           'Ruptly',
    'redfishstream':         'Redfishstream',
    'redfishmedia':          'Redfishstream',
    'zvezda':                'ZvezdaTV_ru',
    'zvezdatv':              'ZvezdaTV_ru',
    'zvezdatvofficial':      'ZvezdaTV_ru',
    // ── Chinese state media ───────────────────────────────────────
    'cgtn':                  'cgtnamerica',
    'cgtnofficial':          'cgtnamerica',
    'cgtnenglish':           'cgtnamerica',
    'cgtnnews':              'cgtnamerica',
    'cgtneurope':            'CGTNEurope',
    'cgtnafrica':            'CGTNAfrica',
    'cgtnfrancais':          'CGTNFrancais',
    'cgtnamerica':           'cgtnamerica',
    'cgtnárabes':            'CGTN_Arabic',
    'cgtnarabic':            'CGTN_Arabic',
    'chinadailynewspaper':   'ChinaDaily',
    'chinadailyvideo':       'ChinaDaily',
    'criofficial':           'CRI_English',
    'crienglishtv':          'CRI_English',
    'crienglishtv1':         'CRI_English',
    'xinhua':                'XHNews',
    'xinhuanewsagency':      'XHNews',
    'xinhuanews':            'XHNews',
    'xinhuanewsnetwork':     'XHNews',
    'newchinatv':            'XHNews',
    'peopledailychina':      'PDChina',
    'peopledaily':           'PDChina',
    'globaltimes':           'GlobalTimesOP',
    'globaltiimesnews':      'GlobalTimesOP',
    'cctv':                  'cgtnamerica',
    'cctvnews':              'cgtnamerica',
    'mfachina':              'MFA_China',
    // ── Iranian / proxy ───────────────────────────────────────────
    'presstv':               'PressTV',
    'presstvofficial':       'PressTV',
    'presstviran':           'PressTV',
    'hispantv':              'HispanTV',
    'hispantvenglish':       'HispanTV',
    'almayadeen':            'AlMayadeen_en',
    'almayadeenenglish':     'AlMayadeen_en',
    'almanar':               'AlManarNews',
    'almanartvofficial':     'AlManarNews',
    'mehrnews':              'Mehr_English',
    'ifilmtv':               'iFilmTV_en',
    // ── Venezuelan / Cuban ────────────────────────────────────────
    'telesur':               'teleSURArabic',
    'telesurtv':             'teleSURArabic',
    'telesurtvenglish':      'teleSURArabic',
    'actualidadrt':          'ActualidadRT',
    'vtvcanaoficial':        'VTVcanalOficial',
    'cubadebateofficial':    'CubaDebate',
    'prensalatina':          'Prensa_Latina',
    // ── Western pro-Russia / Bad Source ──────────────────────────
    'tuckercarlson':         'TuckerCarlson',
    'tuckercarlsonnetwork':  'TuckerCarlson',
    'thegrayzone':           'GrayzoneNews',
    'grayzoneproject':       'GrayzoneNews',
    'thegrayzoneproject':    'GrayzoneNews',
    'maxblumenthal':         'MaxBlumenthal',
    'aaronmate':             'aaronjmate',
    'scottrittertalk':       'ScottRitter11',
    'douglasmacgregor':      'DouglasMMacG',
    'garlandnixon':          'GarlandNixon',
    'partisangirl':          'PartisanGirl',
    'candaceowens':          'RealCandaceO',
    'alexjoneschannel':      'RealAlexJones',
    'infowars':              'RealAlexJones',
    'oann':                  'OAN',
    'oannews':               'OAN',
    'epochtimes':            'EpochTimes',
    'theepochtimes':         'EpochTimes',
    'ntdnews':               'EpochTimes',
    'ntdtelevision':         'EpochTimes',
  };

  /* ── Account map ──────────────────────────────────────────────── */
  const ytMap = new Map(); // normalized handle → account

  for (const acc of BALLOON_ACCOUNTS) {
    const c = BALLOON_CATEGORIES[acc.category];
    if (c?.hidden) continue;
    ytMap.set(acc.handle.toLowerCase(), acc);
    ytMap.set(norm(acc.handle), acc);
  }

  for (const [ytH, twitterH] of Object.entries(YT_OVERRIDES)) {
    const acc = BALLOON_ACCOUNTS.find(a => a.handle.toLowerCase() === twitterH.toLowerCase());
    if (acc) {
      ytMap.set(ytH.toLowerCase(), acc);
      ytMap.set(norm(ytH), acc);
    }
  }

  function lookup(handle) {
    if (!handle) return null;
    const h = handle.replace(/^@/, '');
    return ytMap.get(h.toLowerCase()) || ytMap.get(norm(h)) || null;
  }

  /* ── Category helper ──────────────────────────────────────────── */
  function cat(account) {
    const c = BALLOON_CATEGORIES[account?.category];
    if (!c || c.hidden) return null;
    return c;
  }

  /* ── Handle extraction from href ─────────────────────────────── */
  function handleFromHref(href) {
    if (!href) return null;
    let m = href.match(/\/@([^/?&#\s]+)/);
    if (m) return m[1];
    m = href.match(/\/c\/([^/?&#\s]+)/);
    if (m) return m[1];
    m = href.match(/\/user\/([^/?&#\s]+)/);
    if (m) return m[1];
    return null;
  }

  /* ── Page flag tracking ───────────────────────────────────────── */
  const pageFlags = new Set();

  /* ── Badge element ────────────────────────────────────────────── */
  function makeBadge(acc) {
    const c = cat(acc);
    if (!c) return null;

    // Wrapper ensures block layout regardless of YouTube's parent flex/grid
    const wrap = document.createElement('div');
    wrap.className = 'balloon-yt-badge-wrap';

    const el = document.createElement('span');
    el.className = 'balloon-yt-badge';
    el.dataset.balloonCategory = acc.category;
    el.title = [c.label, acc.country ? `(${acc.country})` : '', acc.detail].filter(Boolean).join(' — ');
    el.innerHTML = `<span class="pyb-icon">${c.textIcon}</span><span class="pyb-label">${c.label}</span>`;
    el.style.cssText = `--pc:${c.color};--pb:${c.bgColor};--pbd:${c.borderColor}`;

    wrap.appendChild(el);
    return wrap;
  }

  /* ── Watch / channel page banner ──────────────────────────────── */
  function makeYtBanner(acc, displayName) {
    const c = cat(acc);
    if (!c) return null;
    const el = document.createElement('div');
    el.id = 'balloon-yt-banner';
    el.className = `balloon-yt-banner balloon-yt-cat-${acc.category}`;
    el.style.cssText = `--pc:${c.color};--pb:${c.bgColor};--pbd:${c.borderColor}`;

    const name = displayName || `@${acc.handle}`;
    const country = acc.country ? ` · ${acc.country}` : '';
    const blockedChip = acc.blocked
      ? `<span class="pyt-blocked-chip">⊘ Blocked by default</span>` : '';
    const sourceLine = acc.source
      ? `<div class="pyt-source">Sources: ${acc.source}</div>` : '';

    el.innerHTML = `
      <div class="pyt-content">
        <div class="pyt-row1">
          <span class="pyt-name">${name}${country}</span>
          <span class="pyt-cat-chip">${c.textIcon} ${c.label}</span>
          ${blockedChip}
        </div>
        <div class="pyt-detail">${acc.detail || ''}</div>
        ${sourceLine}
      </div>
      <div class="pyt-btns">
        <button class="pyt-trust" title="Hide warnings for this channel">✓ Trust</button>
        <button class="pyt-close" title="Close">✕</button>
      </div>`;

    el.querySelector('.pyt-trust').addEventListener('click', () => {
      // Write to trustedHandles — same key used by Twitter script and popup
      chrome.storage.sync.get({ trustedHandles: [] }, d => {
        const t = d.trustedHandles;
        if (!t.includes(acc.handle)) t.push(acc.handle);
        chrome.storage.sync.set({ trustedHandles: t });
      });
      el.remove();
    });
    el.querySelector('.pyt-close').addEventListener('click', () => el.remove());
    return el;
  }

  /* ── Video card processing ────────────────────────────────────── */
  function processVideoCard(card) {
    if (card.dataset.balloonYtDone) return;

    // Try multiple selectors for channel link — YouTube changes these periodically
    const channelLink =
      card.querySelector('ytd-channel-name a.yt-simple-endpoint[href]') ||
      card.querySelector('#channel-name a[href]') ||
      card.querySelector('a.yt-simple-endpoint[href*="/@"]') ||
      card.querySelector('a[href*="/@"][class*="yt"]') ||
      card.querySelector('#byline-container a[href]');

    if (!channelLink) return; // not ready yet — don't mark, allow retry

    const handle = handleFromHref(channelLink.getAttribute('href'));
    if (!handle) {
      card.dataset.balloonYtDone = 'no-handle';
      return;
    }

    card.dataset.balloonYtDone = handle;

    if (isTrusted(handle)) return;
    if (!settings.showBadges) return;

    const acc = lookup(handle);
    if (!acc) return;

    const badge = makeBadge(acc);
    if (!badge) return;

    // Don't double-badge
    if (card.querySelector('.balloon-yt-badge-wrap')) return;

    // Insert after channel name element
    const nameEl =
      channelLink.closest('ytd-channel-name') ||
      channelLink.closest('#channel-name') ||
      channelLink.parentElement;
    nameEl.insertAdjacentElement('afterend', badge);

    // Overlay on thumbnail for blocked accounts
    if (acc.blocked) {
      const thumb =
        card.querySelector('ytd-thumbnail') ||
        card.querySelector('a#thumbnail') ||
        card.querySelector('#thumbnail');
      if (thumb && !thumb.querySelector('.balloon-yt-block-overlay')) {
        const overlay = document.createElement('div');
        overlay.className = 'balloon-yt-block-overlay';
        const catDef = BALLOON_CATEGORIES[acc.category] || {};
        overlay.innerHTML = `<div class="pybo-inner"><span class="pybo-icon">${catDef.textIcon || '★'}</span><span class="pybo-text">State Media</span></div>`;
        overlay.style.cssText = `--pb:${catDef.bgColor || '#fffbeb'};--pc:${catDef.color || '#b45309'}`;
        thumb.style.position = 'relative';
        thumb.appendChild(overlay);
      }
    }

    pageFlags.add(handle.toLowerCase());
    updateSidebarCount();
  }

  /* ── Watch page banner ────────────────────────────────────────── */
  let watchBannerHandle = null;

  function processWatchPage() {
    if (!settings.showBanners || !enabled) return;
    if (!location.pathname.startsWith('/watch')) return;

    const ownerLink =
      document.querySelector('#owner #channel-name a.yt-simple-endpoint[href]') ||
      document.querySelector('ytd-video-owner-renderer #channel-name a[href]') ||
      document.querySelector('#upload-info #channel-name a[href]') ||
      document.querySelector('#owner a[href*="/@"]') ||
      document.querySelector('ytd-video-owner-renderer a[href*="/@"]');
    if (!ownerLink) return;

    const handle = handleFromHref(ownerLink.getAttribute('href'));
    if (!handle || handle.toLowerCase() === watchBannerHandle) return;
    if (isTrusted(handle)) return;
    const acc = lookup(handle);
    if (!acc) return;

    watchBannerHandle = handle.toLowerCase();
    document.getElementById('balloon-yt-banner')?.remove();

    const displayName = ownerLink.textContent.trim();
    const banner = makeYtBanner(acc, displayName);
    if (!banner) return;

    // Multiple insertion point attempts — YouTube watch layout varies
    const insertTarget =
      document.querySelector('#above-the-fold') ||
      document.querySelector('#below') ||
      document.querySelector('ytd-watch-metadata') ||
      document.querySelector('#primary-inner');
    if (insertTarget) insertTarget.insertAdjacentElement('afterbegin', banner);

    pageFlags.add(handle.toLowerCase());
    updateSidebarCount();
  }

  /* ── Channel page banner ──────────────────────────────────────── */
  let channelBannerHandle = null;

  function processChannelPage() {
    if (!settings.showBanners || !enabled) return;
    const m = location.pathname.match(/^\/@([^/?&#]+)/);
    if (!m) return;
    const handle = m[1];
    if (handle.toLowerCase() === channelBannerHandle) return;
    if (isTrusted(handle)) return;
    const acc = lookup(handle);
    if (!acc) return;

    channelBannerHandle = handle.toLowerCase();
    document.getElementById('balloon-yt-banner')?.remove();

    const displayName =
      document.querySelector('ytd-channel-header-renderer #channel-name yt-formatted-string')?.textContent.trim() ||
      document.querySelector('yt-page-header-renderer h1')?.textContent.trim() ||
      document.querySelector('ytd-c4-tabbed-header-renderer #channel-header-container yt-formatted-string')?.textContent.trim() ||
      `@${handle}`;

    const banner = makeYtBanner(acc, displayName);
    if (!banner) return;

    const header =
      document.querySelector('ytd-c4-tabbed-header-renderer') ||
      document.querySelector('yt-page-header-renderer') ||
      document.querySelector('#channel-header') ||
      document.querySelector('ytd-channel-header-renderer');
    if (header) header.insertAdjacentElement('afterend', banner);

    pageFlags.add(handle.toLowerCase());
    updateSidebarCount();
  }

  /* ── Sidebar widget ───────────────────────────────────────────── */
  const YT_SIDEBAR_ID = 'balloon-yt-sidebar-widget';
  const YT_PANEL_ID   = 'balloon-yt-panel';

  function makeSidebarWidget() {
    const wrap = document.createElement('div');
    wrap.id = YT_SIDEBAR_ID;
    wrap.className = 'balloon-yt-sidebar';

    wrap.innerHTML = `
      <div class="pys-widget" id="${YT_SIDEBAR_ID}-btn">
        <span class="pys-glow">${BalloonCore.logo(22)}</span>
        <div class="pys-text">
          <span class="pys-name">Balloon</span>
          <span class="pys-sub" id="${YT_SIDEBAR_ID}-count">Source Verification</span>
        </div>
        <span class="pys-beta">BETA</span>
      </div>
      <div class="balloon-yt-panel" id="${YT_PANEL_ID}">
        <div class="pyp-header"><span>Flagged on this page</span><span class="pyp-shortcut">Alt+B</span></div>
        <div class="pyp-list" id="balloon-yt-panel-list"></div>
        <div class="pyp-footer" id="balloon-yt-panel-footer"></div>
      </div>`;

    wrap.querySelector(`#${YT_SIDEBAR_ID}-btn`).addEventListener('click', toggleYtPanel);
    return wrap;
  }

  function toggleYtPanel() {
    const panel = document.getElementById(YT_PANEL_ID);
    if (!panel) return;
    const opening = !panel.classList.contains('pyp-open');
    panel.classList.toggle('pyp-open', opening);
    if (opening) renderYtPanel();
  }

  function renderYtPanel() {
    const list   = document.getElementById('balloon-yt-panel-list');
    const footer = document.getElementById('balloon-yt-panel-footer');
    if (!list) return;
    list.innerHTML = '';

    const attachRescan = btn => btn?.addEventListener('click', () => {
      document.querySelectorAll('[data-balloon-yt-done]').forEach(el => delete el.dataset.balloonYtDone);
      document.querySelectorAll('.balloon-yt-badge-wrap').forEach(el => el.remove());
      pageFlags.clear();
      updateSidebarCount();
      scan(document.body);
      setTimeout(renderYtPanel, 400);
    });

    if (pageFlags.size === 0) {
      list.innerHTML = `<div class="pyp-empty">No flagged channels visible yet.<br>Scroll to scan more videos.</div>`;
      if (footer) {
        footer.innerHTML = `<span></span><button class="pyp-rescan">↺ Rescan</button>`;
        attachRescan(footer.querySelector('.pyp-rescan'));
      }
      return;
    }

    for (const handle of pageFlags) {
      const acc = lookup(handle);
      if (!acc) continue;
      const c = cat(acc);
      if (!c) continue;
      const row = document.createElement('div');
      row.className = 'pyp-row';
      row.innerHTML = `
        <span class="pyp-chip" style="--pc:${c.color};--pb:${c.bgColor};--pbd:${c.borderColor}">${c.textIcon} ${c.label}</span>
        <span class="pyp-handle">@${acc.handle}</span>`;
      list.appendChild(row);
    }

    if (footer) {
      footer.innerHTML = `<span>${pageFlags.size} flagged</span><button class="pyp-rescan">↺ Rescan</button>`;
      attachRescan(footer.querySelector('.pyp-rescan'));
    }
  }

  function updateSidebarCount() {
    const el = document.getElementById(`${YT_SIDEBAR_ID}-count`);
    if (!el) return;
    el.textContent = pageFlags.size > 0
      ? `${pageFlags.size} flagged this page`
      : 'Source Verification';
  }

  function injectSidebarWidget() {
    if (!settings.showSidebarWidget || !enabled) {
      document.getElementById(YT_SIDEBAR_ID)?.remove();
      return;
    }

    // Remove stale widget if it's been detached from the live DOM
    const existing = document.getElementById(YT_SIDEBAR_ID);
    if (existing && !document.body.contains(existing)) existing.remove();
    if (document.getElementById(YT_SIDEBAR_ID)) return;

    // Try multiple YouTube guide container selectors (order: most specific → fallback)
    const target =
      document.querySelector('ytd-guide-renderer #guide-inner-content') ||
      document.querySelector('#guide-inner-content') ||
      document.querySelector('ytd-guide-renderer #sections') ||
      document.querySelector('ytd-guide-section-renderer') ||
      document.querySelector('ytd-guide-renderer') ||
      document.querySelector('#guide-content') ||
      document.querySelector('#guide');
    if (!target) return;

    target.insertAdjacentElement('afterbegin', makeSidebarWidget());
  }

  /* ── Keyboard shortcut Alt+B ──────────────────────────────────── */
  document.addEventListener('keydown', e => {
    if (e.altKey && !e.ctrlKey && !e.metaKey && e.code === 'KeyB') {
      e.preventDefault();
      toggleYtPanel();
    }
  }, true);

  /* ── Scanner ──────────────────────────────────────────────────── */
  const VIDEO_CARD_SELECTORS = [
    'ytd-rich-grid-media',
    'ytd-video-renderer',
    'ytd-compact-video-renderer',
    'ytd-grid-video-renderer',
    'ytd-playlist-video-renderer',
    'ytd-shelf-renderer',
    'ytd-reel-item-renderer',
  ].join(', ');

  function scan(root) {
    if (!root?.querySelectorAll || !enabled) return;
    root.querySelectorAll(VIDEO_CARD_SELECTORS).forEach(processVideoCard);
    // Fallback: catch any channel link not inside a known card element
    root.querySelectorAll('a[href*="/@"]:not([data-balloon-scanned])').forEach(link => {
      const card =
        link.closest('ytd-rich-grid-media') ||
        link.closest('ytd-video-renderer') ||
        link.closest('ytd-compact-video-renderer') ||
        link.closest('ytd-grid-video-renderer') ||
        link.closest('ytd-playlist-video-renderer');
      if (card) processVideoCard(card);
    });
  }

  /* ── Page detection ───────────────────────────────────────────── */
  function detectPage() {
    if (location.pathname.startsWith('/watch')) {
      [0, 500, 1200, 2500].forEach(d => setTimeout(processWatchPage, d));
    } else if (location.pathname.match(/^\/@/)) {
      [0, 500, 1200, 2500].forEach(d => setTimeout(processChannelPage, d));
    }
  }

  /* ── MutationObserver ─────────────────────────────────────────── */
  let scanQueued = false;
  function queueScan() {
    if (scanQueued) return;
    scanQueued = true;
    requestAnimationFrame(() => { scanQueued = false; scan(document.body); });
  }

  new MutationObserver(muts => {
    for (const m of muts) {
      for (const n of m.addedNodes) {
        if (n.nodeType === 1) scan(n);
      }
    }
    queueScan();
  }).observe(document.body, { subtree: true, childList: true });

  // YouTube fires yt-navigate-finish on SPA navigations
  let lastPath = location.pathname + location.search;
  document.addEventListener('yt-navigate-finish', () => {
    const newPath = location.pathname + location.search;
    if (newPath === lastPath) return;
    lastPath = newPath;
    document.getElementById('balloon-yt-banner')?.remove();
    watchBannerHandle   = null;
    channelBannerHandle = null;
    pageFlags.clear();
    updateSidebarCount();
    // Re-inject sidebar widget — YouTube may rebuild guide DOM on some navigations
    document.getElementById(YT_SIDEBAR_ID)?.remove();
    detectPage();
    [0, 200, 500, 1000, 2000].forEach(d => setTimeout(() => {
      scan(document.body);
      injectSidebarWidget();
    }, d));
  });

  /* ── Init ─────────────────────────────────────────────────────── */
  loadStorage(() => {
    scan(document.body);
    detectPage();
  });
  // Burst sidebar injection — YouTube guide DOM loads asynchronously
  [0, 300, 700, 1400, 2500, 4000].forEach(d => setTimeout(injectSidebarWidget, d));
  setInterval(injectSidebarWidget, 800);
  setInterval(() => scan(document.body), 2000);

  /* ── Source links + keyword filter (shared core) ──────────────── */
  BalloonCore.watch({
    platform: 'youtube',
    postSelector: [
      'ytd-rich-item-renderer', 'ytd-video-renderer', 'ytd-compact-video-renderer',
      'ytd-grid-video-renderer', 'ytd-reel-item-renderer', 'yt-lockup-view-model',
      'ytd-comment-thread-renderer', 'ytd-watch-metadata'
    ].join(', '),
    // Keyword filter hides cards and comments, never the video you're watching
    getText: el => el.matches('ytd-watch-metadata') ? '' : BalloonCore.textOf(el),
    stripHost: el =>
      el.querySelector('#description-inner, #description') ||
      el.querySelector('#content-text')?.parentElement || null
  });

})();
