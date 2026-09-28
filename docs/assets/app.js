(() => {
  "use strict";

  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));

  // ── Extension data ──────────────────────────────────────────────────────────
  // The Pages build copies the extension's lists into ext/. When browsing the
  // repo locally (serving the repo root), fall back to ../extension/.

  function loadScript(paths) {
    return new Promise(resolve => {
      const [first, ...rest] = paths;
      if (!first) return resolve(false);
      const s = document.createElement("script");
      s.src = first;
      s.onload = () => resolve(true);
      s.onerror = () => { s.remove(); loadScript(rest).then(resolve); };
      document.head.appendChild(s);
    });
  }

  const dataReady = (async () => {
    for (const f of ["accounts.js", "sources.js", "aliases.js"]) {
      await loadScript([`ext/${f}`, `../extension/${f}`]);
    }
    return {
      accounts: typeof BALLOON_ACCOUNTS !== "undefined" ? BALLOON_ACCOUNTS : [],
      sources: typeof BALLOON_SOURCES !== "undefined" ? BALLOON_SOURCES : [],
      categories: typeof BALLOON_CATEGORIES !== "undefined" ? BALLOON_CATEGORIES : {}
    };
  })();

  // ── Balloon sky (canvas) ────────────────────────────────────────────────────

  const canvas = $("#sky");
  const ctx = canvas.getContext("2d");
  const COLORS = [["#fbcfe8", "#ec4899"], ["#e9d5ff", "#a855f7"], ["#fde68a", "#f59e0b"], ["#bae6fd", "#38bdf8"], ["#f5d0fe", "#d946ef"]];
  let W = 0, H = 0, dpr = 1;
  const balloons = [];
  const particles = [];

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function spawn(initial) {
    const r = 10 + Math.random() * 16;
    return {
      x: Math.random() * W,
      y: initial ? Math.random() * H : H + r * 3,
      r,
      vy: 0.25 + Math.random() * 0.45,
      phase: Math.random() * Math.PI * 2,
      sway: 0.4 + Math.random() * 0.8,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      alpha: 0.2 + Math.random() * 0.3
    };
  }

  function drawBalloon(b, t) {
    const x = b.x + Math.sin(t / 1400 + b.phase) * 14 * b.sway;
    const y = b.y;
    ctx.save();
    ctx.globalAlpha = b.alpha;
    // string
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y + b.r * 1.15);
    ctx.bezierCurveTo(x - 6, y + b.r * 1.6, x + 6, y + b.r * 2.1, x, y + b.r * 2.8);
    ctx.stroke();
    // body
    const g = ctx.createRadialGradient(x - b.r * 0.35, y - b.r * 0.4, b.r * 0.1, x, y, b.r * 1.2);
    g.addColorStop(0, b.color[0]);
    g.addColorStop(1, b.color[1]);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x, y, b.r * 0.86, b.r, 0, 0, Math.PI * 2);
    ctx.fill();
    // knot
    ctx.beginPath();
    ctx.moveTo(x - 3, y + b.r * 1.15);
    ctx.lineTo(x + 3, y + b.r * 1.15);
    ctx.lineTo(x, y + b.r * 0.95);
    ctx.fill();
    // shine
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.beginPath();
    ctx.ellipse(x - b.r * 0.35, y - b.r * 0.4, b.r * 0.14, b.r * 0.24, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    b.drawX = x;
  }

  function pop(b) {
    const x = b.drawX ?? b.x;
    for (let i = 0; i < 18; i++) {
      const a = (Math.PI * 2 * i) / 18;
      const sp = 1.5 + Math.random() * 3;
      particles.push({ x, y: b.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1, color: b.color[1] });
    }
    particles.push({ x, y: b.y, text: "pop!", life: 1, vx: 0, vy: -0.6, color: "#fff" });
  }

  function frame(t) {
    ctx.clearRect(0, 0, W, H);
    for (let i = balloons.length - 1; i >= 0; i--) {
      const b = balloons[i];
      b.y -= b.vy;
      if (b.y < -b.r * 4) balloons[i] = spawn(false);
      drawBalloon(b, t);
    }
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx; p.y += p.vy; p.vy += p.text ? 0 : 0.08; p.life -= 0.025;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      if (p.text) {
        ctx.font = "800 18px 'Baloo 2', sans-serif";
        ctx.fillText(p.text, p.x - 16, p.y);
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.5 * p.life + 1, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    if (!document.hidden) requestAnimationFrame(frame);
  }

  resize();
  const count = Math.round(Math.min(22, Math.max(8, W / 70)));
  for (let i = 0; i < count; i++) balloons.push(spawn(true));
  addEventListener("resize", resize);

  if (reduceMotion) {
    frame(0);
  } else {
    requestAnimationFrame(frame);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) requestAnimationFrame(frame); });
    canvas.addEventListener("click", e => {
      const hit = balloons.findIndex(b => Math.hypot((b.drawX ?? b.x) - e.clientX, b.y - e.clientY) < b.r * 1.3);
      if (hit >= 0) {
        pop(balloons[hit]);
        balloons[hit] = spawn(false);
      }
    });
    canvas.addEventListener("mousemove", e => {
      const over = balloons.some(b => Math.hypot((b.drawX ?? b.x) - e.clientX, b.y - e.clientY) < b.r * 1.3);
      canvas.style.cursor = over ? "pointer" : "default";
    });
  }

  // ── Rotating hero word ──────────────────────────────────────────────────────

  const words = ["propaganda", "misinformation", "state media", "clickbait", "rage-bait"];
  const rot = $("#rotator");
  let wi = 0;
  if (!reduceMotion) {
    setInterval(() => {
      wi = (wi + 1) % words.length;
      rot.classList.remove("swap");
      void rot.offsetWidth;
      rot.textContent = words[wi];
      rot.classList.add("swap");
    }, 2600);
  }

  // ── Scroll reveal ───────────────────────────────────────────────────────────

  const io = new IntersectionObserver(entries => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const siblings = [...e.target.parentElement.children].filter(c => c.classList.contains("reveal"));
      e.target.style.transitionDelay = `${Math.max(0, siblings.indexOf(e.target)) * 80}ms`;
      e.target.classList.add("in");
      io.unobserve(e.target);
    }
  }, { threshold: 0.12 });
  $$(".reveal").forEach(el => io.observe(el));

  // ── Demo feed loop ──────────────────────────────────────────────────────────

  const feed = $("#demoFeed");
  const overlay = feed.querySelector(".demo-overlay");
  const STATES = ["s-source", "s-badge", "s-blocked"];
  let demoTimers = [];

  function runDemo() {
    demoTimers.forEach(clearTimeout);
    demoTimers = [];
    feed.classList.remove(...STATES);
    overlay.classList.remove("popping");
    STATES.forEach((s, i) => demoTimers.push(setTimeout(() => feed.classList.add(s), 900 + i * 1100)));
    demoTimers.push(setTimeout(popOverlay, 6400));
    demoTimers.push(setTimeout(runDemo, 8200));
  }
  function popOverlay() {
    if (!feed.classList.contains("s-blocked")) return;
    overlay.classList.add("popping");
  }
  feed.querySelector(".pop-btn").addEventListener("click", popOverlay);
  if (reduceMotion) feed.classList.add(...STATES);
  else runDemo();

  // ── Tilt cards ──────────────────────────────────────────────────────────────

  if (!reduceMotion) {
    $$(".tilt").forEach(card => {
      card.addEventListener("mousemove", e => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = `perspective(700px) rotateY(${px * 14}deg) rotateX(${-py * 14}deg) translateY(-4px)`;
      });
      card.addEventListener("mouseleave", () => { card.style.transform = ""; });
    });
  }

  // ── Count-up stats ──────────────────────────────────────────────────────────

  function countUp(el, to) {
    if (reduceMotion) { el.textContent = to; return; }
    const start = performance.now();
    const step = now => {
      const t = Math.min(1, (now - start) / 1400);
      el.textContent = Math.round(to * (1 - Math.pow(1 - t, 3)));
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  dataReady.then(({ accounts, sources }) => {
    const vals = {
      accounts: new Set(accounts.map(a => a.handle.toLowerCase())).size,
      sources: sources.length
    };
    $$("[data-stat]").forEach(el => {
      const v = vals[el.dataset.stat];
      if (v) countUp(el, v);
    });
  });

  // ── Link checker ────────────────────────────────────────────────────────────

  const bareHost = h => (h || "").toLowerCase().replace(/\.$/, "").replace(/^(www\d?|m|mobile|amp)\./, "");

  function hostOf(raw) {
    let s = (raw || "").trim();
    if (!s) return null;
    if (!/^[a-z]+:\/\//i.test(s)) s = "https://" + s;
    try {
      const u = new URL(s);
      const host = bareHost(u.hostname);
      const wrapped =
        ["l.facebook.com", "lm.facebook.com", "l.instagram.com"].includes(host) ? u.searchParams.get("u") :
        (host === "youtube.com" && u.pathname === "/redirect") ? u.searchParams.get("q") : null;
      return wrapped ? hostOf(wrapped) : (/^([a-z0-9-]+\.)+[a-z]{2,24}$/.test(host) ? host : null);
    } catch (_) {
      return null;
    }
  }

  const CAT_COLOR = {
    "state-propaganda": "#f59e0b",
    "state-funded": "#fbbf24",
    "misinformation": "#f87171"
  };

  async function check(raw) {
    const { sources, categories } = await dataReady;
    const out = $("#verdict");
    const host = hostOf(raw);
    out.innerHTML = "";
    if (!host) {
      const f = $("#checker");
      f.classList.remove("shake"); void f.offsetWidth; f.classList.add("shake");
      return;
    }
    const map = new Map(sources.map(s => [bareHost(s.domain), s]));
    let h = host, src = null;
    while (h.includes(".") && !src) { src = map.get(h) || null; h = h.slice(h.indexOf(".") + 1); }
    const cat = src && categories[src.category];
    void out.offsetWidth;
    if (src && cat && !cat.hidden) {
      const c = CAT_COLOR[src.category] || "#f0abfc";
      out.style.setProperty("--vb", c);
      out.innerHTML = `
        <span class="v-icon bob">🎈</span>
        <div>
          <h3>${esc(src.name || src.domain)} <span class="tag" style="color:${c}">${esc(cat.label)}</span>${src.blocked ? ` <span class="tag" style="color:#fca5a5">Blocked by default</span>` : ""}</h3>
          <p>${esc(src.detail || "")}</p>
          ${src.source ? `<small>Evidence: ${esc(src.source)}</small>` : ""}
        </div>`;
    } else {
      out.style.setProperty("--vb", "rgba(12,163,12,0.6)");
      out.innerHTML = `
        <span class="v-icon">✓</span>
        <div>
          <h3>${esc(host)} isn't on Balloon's list</h3>
          <p>That doesn't make it reliable on its own. Check who runs it, and whether other independent outlets report the same thing.</p>
        </div>`;
    }
  }

  $("#checker").addEventListener("submit", e => { e.preventDefault(); check($("#checkInput").value); });
  $$("[data-try]").forEach(b => b.addEventListener("click", () => {
    $("#checkInput").value = b.dataset.try;
    check(b.dataset.try);
  }));

  // ── Tooltip helper ──────────────────────────────────────────────────────────

  const tip = $("#tooltip");
  function bindTip(el, html) {
    el.addEventListener("mouseenter", () => { tip.innerHTML = html; tip.classList.add("on"); });
    el.addEventListener("mousemove", e => {
      tip.style.left = Math.min(e.clientX + 14, innerWidth - tip.offsetWidth - 8) + "px";
      tip.style.top = e.clientY + 16 + "px";
    });
    el.addEventListener("mouseleave", () => tip.classList.remove("on"));
  }

  // ── Live X trending scan ────────────────────────────────────────────────────

  const VERDICTS = {
    clear:   { label: "Clear",   icon: "✓", color: "#0ca30c", cls: "v-clear" },
    flagged: { label: "Flagged", icon: "▲", color: "#fab219", cls: "v-flagged" },
    blocked: { label: "Blocked", icon: "⊘", color: "#d03b3b", cls: "v-blocked" }
  };

  function emptyState(data) {
    const title = {
      pending: "This scan hasn't run yet",
      login_required: "X asked for a sign-in",
      empty: "No posts were found",
      error: "The last scrape failed"
    }[data.status] || "No scan data";
    return `
      <div class="scan-empty">
        <img class="big-balloon" src="assets/logo.svg" alt="" />
        <div>
          <h3>${esc(title)}</h3>
          <p>${esc(data.message || "")}</p>
          <p>Target: <a href="${esc(data.source_url)}">${esc(data.source_url)}</a></p>
          <pre>pip install -r scraper/requirements.txt &amp;&amp; scrapling install
X_AUTH_TOKEN=… X_CT0=… python scraper/scrape_x_trending.py</pre>
        </div>
      </div>`;
  }

  function renderPost(p) {
    const v = VERDICTS[p.balloon.verdict];
    const flags = p.balloon.flags.map(f =>
      `<span class="${f.blocked ? "blk" : ""}" title="${esc(f.detail || "")}">${esc(f.match)} · ${esc(f.category_label)}</span>`
    ).join("");
    const when = p.created_at ? new Date(p.created_at) : null;
    return `
      <div class="scan-post">
        <span class="v-pill ${v.cls}">${v.icon} ${v.label}</span>
        <div>
          <div class="who">${p.url ? `<a href="${esc(p.url)}">` : ""}${esc(p.name || p.handle || "Unknown")}${p.url ? "</a>" : ""}
            <span>@${esc(p.handle || "?")}${when && !isNaN(when) ? " · " + when.toLocaleString() : ""}</span></div>
          <p>${esc(p.text)}</p>
          ${flags ? `<div class="flags">${flags}</div>` : ""}
        </div>
      </div>`;
  }

  function animatePosts(root) {
    const obs = new IntersectionObserver(es => es.forEach((e, i) => {
      if (!e.isIntersecting) return;
      setTimeout(() => e.target.classList.add("in"), i * 60);
      obs.unobserve(e.target);
    }), { threshold: 0.1 });
    root.querySelectorAll(".scan-post:not(.in)").forEach(el => obs.observe(el));
  }

  async function loadScan() {
    const host = $("#scan");
    let data;
    try {
      const res = await fetch("data/trending.json", { cache: "no-store" });
      data = await res.json();
    } catch (_) {
      host.innerHTML = emptyState({ status: "error", message: "Couldn't load data/trending.json.", source_url: "https://x.com/i/trending/2104378106551406609" });
      return;
    }
    if (data.status !== "ok" || !data.posts?.length) {
      host.innerHTML = emptyState(data);
      return;
    }

    const s = data.summary;
    const total = s.total_posts || 1;
    const segs = ["clear", "flagged", "blocked"].filter(k => s[k] > 0);
    const cats = Object.entries(s.by_category || {});
    const when = data.scraped_at ? new Date(data.scraped_at).toLocaleString() : "";

    host.innerHTML = `
      <div class="scan-head">
        <h3>${esc(data.topic?.title || "Trending on X")}</h3>
        <span class="scan-meta">Scraped ${esc(when)} · <a href="${esc(data.source_url)}">view on X</a></span>
      </div>
      ${data.topic?.summary ? `<p class="scan-summary">${esc(data.topic.summary)}</p>` : ""}
      <div class="tiles">
        <div class="tile"><b>${s.total_posts}</b><span>posts scanned</span></div>
        ${["clear", "flagged", "blocked"].map(k => `
          <div class="tile"><b>${s[k]}</b><span><i class="sw" style="background:${VERDICTS[k].color}"></i>${VERDICTS[k].icon} ${VERDICTS[k].label}</span></div>`).join("")}
      </div>
      <div class="verdict-bar" role="img" aria-label="${segs.map(k => `${s[k]} ${VERDICTS[k].label.toLowerCase()}`).join(", ")}">
        ${segs.map(k => `<div data-k="${k}" style="flex:${s[k]};background:${VERDICTS[k].color}"></div>`).join("")}
      </div>
      <div class="legend">
        ${segs.map(k => `<span><i class="sw" style="background:${VERDICTS[k].color}"></i>${VERDICTS[k].icon} ${VERDICTS[k].label} · ${Math.round((s[k] / total) * 100)}%</span>`).join("")}
      </div>
      ${cats.length ? `<div class="cat-list">${cats.map(([k, n]) => `<span><b>${n}</b> ${esc(k)}</span>`).join("")}</div>` : ""}
      <div class="posts" id="scanPosts"></div>`;

    host.querySelectorAll(".verdict-bar div").forEach(d => {
      const k = d.dataset.k;
      bindTip(d, `<b>${VERDICTS[k].icon} ${VERDICTS[k].label}</b><br>${s[k]} of ${s.total_posts} posts (${Math.round((s[k] / total) * 100)}%)`);
    });

    const list = $("#scanPosts");
    const PAGE = 12;
    let shown = 0;
    const more = document.createElement("button");
    more.className = "btn btn-ghost show-more";
    const showNext = () => {
      list.insertAdjacentHTML("beforeend", data.posts.slice(shown, shown + PAGE).map(renderPost).join(""));
      shown += PAGE;
      animatePosts(list);
      more.textContent = `Show more (${data.posts.length - shown} left)`;
      if (shown >= data.posts.length) more.remove();
    };
    more.addEventListener("click", showNext);
    host.appendChild(more);
    showNext();
  }

  loadScan();
})();
