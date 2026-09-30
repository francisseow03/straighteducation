(() => {
  const API = window.SE_API;
  const $ = (s, r = document) => r.querySelector(s);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) document.documentElement.classList.add("no-motion");
  $("#yr").textContent = new Date().getFullYear();

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const safeUrl = (u) => (/^https?:\/\//i.test(u || "") ? u : "");
  const STATUS = { open: ["报名中", "gold"], soon: ["即将开放", "jade"], full: ["已满额", "clay"], past: ["已结束", "ink"] };
  const star = '<svg class="star" style="width:26px;height:26px;color:var(--gold)"><use href="#star"/></svg>';

  function fmtDate(d) { return d ? d.replaceAll("-", ".") : ""; }
  function fmtRange(a, b) {
    if (!a && !b) return "";
    if (!b || a === b) return fmtDate(a || b);
    const [ay, am] = a.split("-"), [by, bm] = b.split("-");
    return ay === by ? `${fmtDate(a)} — ${am === bm ? b.slice(8) : b.slice(5).replace("-", ".")}` : `${fmtDate(a)} — ${fmtDate(b)}`;
  }
  function isPast(c) {
    if (c.status === "past") return true;
    const end = c.end_date || c.start_date;
    return end ? new Date(end + "T23:59:59") < new Date() : false;
  }
  const media = (c, cls) => c.image_url && safeUrl(c.image_url)
    ? `<div class="${cls}"><img src="${esc(c.image_url)}" alt="${esc(c.title)}" loading="lazy"></div>`
    : `<div class="${cls} placeholder"><div class="ph-inner"><img src="assets/icon-light.png" alt=""><span>营地实景照片 · 授权照片补充中</span></div></div>`;

  function feature(c, inDialog) {
    const [label, tone] = STATUS[isPast(c) ? "past" : c.status] || STATUS.open;
    const rows = [
      ["日期", fmtRange(c.start_date, c.end_date), true],
      ["地点", c.location],
      ["适合年龄", c.ages],
    ].filter((r) => r[1]);
    const table = rows.length || c.price ? `
      <table class="dtable">
        <thead><tr><th>营期信息</th><th></th></tr></thead>
        <tbody>${rows.map(([k, v, en]) => `<tr><td>${k}</td><td${en ? ' style="font-family:var(--en);font-weight:500;letter-spacing:.04em"' : ""}>${esc(v)}</td></tr>`).join("")}</tbody>
        ${c.price ? `<tfoot><tr><td>费用</td><td class="num" style="text-align:left">${esc(c.price)}</td></tr></tfoot>` : ""}
      </table>` : "";
    const hl = (c.highlights || []).length ? `<ul class="diamonds">${c.highlights.map((h) => `<li>${esc(h)}</li>`).join("")}</ul>` : "";
    // a trailing "信息来源/来源/Source" paragraph in the summary is set as a small source note
    const parts = String(c.summary || "").split(/\n+/).map((s) => s.trim()).filter(Boolean);
    const src = parts.length && /^(信息来源|来源|source)/i.test(parts[parts.length - 1]) ? parts.pop() : "";
    const summary = parts.join("\n");
    const gal = inDialog && (c.gallery || []).length ? `<div class="gallery">${c.gallery.filter(safeUrl).map((u) => `<img src="${esc(u)}" alt="" loading="lazy">`).join("")}</div>` : "";
    return `
      <article class="camp-feature${inDialog ? "" : " reveal"}">
        ${media(c, "camp-media")}
        <div class="camp-body">
          <div class="chips"><span class="chip ${tone}">${label}</span>${c.location ? `<span class="chip">${esc(c.location)}</span>` : ""}</div>
          <div><h3>${esc(c.title)}</h3>${c.title_en ? `<div class="title-en">${esc(c.title_en)}</div>` : ""}</div>
          ${summary ? `<p class="summary">${esc(summary).replace(/\n/g, "<br>")}</p>` : ""}
          ${table}${hl}${gal}
          <div class="actions">
            ${isPast(c) ? "" : `<a class="btn" href="#contact" data-close>咨询这期营 <span class="arrow">→</span></a>`}
          </div>
          ${src ? `<p class="src">${esc(src)}</p>` : ""}
        </div>
      </article>`;
  }

  function card(c, i) {
    const past = isPast(c);
    const [label, tone] = STATUS[past ? "past" : c.status] || STATUS.open;
    return `
      <button class="camp-card reveal${past ? " past" : ""}" style="--d:${(i % 3) * 0.08}s" data-id="${esc(c.id)}">
        ${media(c, "thumb")}
        <div class="info">
          <div><span class="chip ${tone}" style="height:28px;font-size:13px;padding:0 12px">${label}</span></div>
          <h4>${esc(c.title)}</h4>
          <div class="when">${esc(fmtRange(c.start_date, c.end_date) || c.location || "")}</div>
        </div>
      </button>`;
  }

  let camps = [];
  function renderCamps() {
    const root = $("#campsRoot");
    const upcoming = camps.filter((c) => !isPast(c));
    const past = camps.filter(isPast);
    const ordered = [...upcoming, ...past];
    if (!ordered.length) {
      root.innerHTML = `
        <div class="camp-empty tab-card reveal">
          ${star}
          <h3>下一期营期正在筹备中</h3>
          <p>关注我们的小红书，新营期一公布就能第一时间看到。</p>
          <a class="btn" href="#contact">关注与咨询 <span class="arrow">→</span></a>
        </div>`;
    } else {
      const [first, ...rest] = ordered;
      root.innerHTML = feature(first) + (rest.length ? `<div class="camp-list">${rest.map(card).join("")}</div>` : "");
    }
    observe(root);
    bindParallax();

    const hc = $("#heroCamp");
    const next = upcoming[0];
    if (next) {
      const [label] = STATUS[next.status] || STATUS.open;
      hc.innerHTML = `
        <div class="tag"><span class="chip gold">最新营期</span><span class="en" style="font-size:12px;font-weight:700;color:var(--cream-60)">${esc(label)}</span></div>
        <h3>${esc(next.title)}</h3>
        <div class="meta">${esc([fmtRange(next.start_date, next.end_date), next.location].filter(Boolean).join(" · "))}</div>
        <a class="go" href="#camps">查看营期 <span class="arrow">→</span></a>`;
    } else {
      hc.innerHTML = `
        <div class="tag"><span class="chip gold">最新营期</span><span class="en" style="font-size:12px;font-weight:700;color:var(--cream-60)">Coming soon</span></div>
        <h3>下一期营期筹备中</h3>
        <div class="meta">关注小红书获取第一手消息</div>
        <a class="go" href="#contact">关注我们 <span class="arrow">→</span></a>`;
    }
  }

  const ICON = { rednote: "i-rednote", wechat: "i-wechat", instagram: "i-ig", facebook: "i-fb", email: "i-mail" };
  function socialUrl(kind, v, s) {
    if (kind === "email") return "mailto:" + v;
    if (kind === "rednote") return safeUrl(s.rednote_url) || "https://www.xiaohongshu.com/search_result?keyword=" + encodeURIComponent(v);
    if (kind === "instagram") return safeUrl(v) || "https://www.instagram.com/" + encodeURIComponent(v.replace(/^@/, "")) + "/";
    if (kind === "facebook") return safeUrl(v) || "https://www.facebook.com/" + encodeURIComponent(v.replace(/^@/, ""));
    return "";
  }
  function handleOf(kind, v) {
    if (!/^https?:\/\//i.test(v)) return v;
    try {
      const u = new URL(v);
      const seg = u.pathname.split("/").filter(Boolean);
      if (kind === "facebook" && u.searchParams.get("id")) return "Straight Education";
      return seg.length ? (kind === "instagram" ? "@" : "") + decodeURIComponent(seg[seg.length - 1]) : u.hostname;
    } catch { return v; }
  }
  function renderSocials(s) {
    const items = [
      ["rednote", "小红书 RedNote", s.rednote_id],
      ["wechat", "微信 WeChat", s.wechat],
      ["instagram", "Instagram", s.instagram],
      ["facebook", "Facebook", s.facebook],
      ["email", "电子邮箱 Email", /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.email || "") ? s.email : ""],
    ].filter((x) => x[2]);
    $("#socials").innerHTML = items.map(([k, name, v], i) => {
      const url = socialUrl(k, v, s);
      const shown = k === "rednote" ? v : handleOf(k, v);
      const actions = k === "wechat"
        ? `<button class="chip gold" data-copy="${esc(v)}" style="cursor:pointer">复制微信号</button><span class="copy-ok">已复制</span>`
        : k === "email"
        ? `<a class="chip gold" href="${esc(url)}">发邮件</a><button class="chip" data-copy="${esc(v)}" style="cursor:pointer">复制</button><span class="copy-ok">已复制</span>`
        : `<a class="chip gold" href="${esc(url)}" target="_blank" rel="noopener">${k === "rednote" ? "去小红书关注" : "打开主页"} ↗</a>`;
      const qr = k === "wechat" && safeUrl(s.wechat_qr) ? `<img class="qr" src="${esc(s.wechat_qr)}" alt="微信二维码" loading="lazy">` : "";
      return `
        <div class="tab-card social reveal" style="--d:${(i % 2) * 0.08}s">
          <div class="top"><span class="platform"><svg><use href="#${ICON[k]}"/></svg>${name}</span></div>
          <div class="handle">${k === "rednote" ? "小红书号 " : ""}${esc(shown)}</div>
          ${qr}
          <div class="row">${actions}</div>
        </div>`;
    }).join("");
    if (s.rednote_id) $("#footRn").textContent = "小红书号 " + s.rednote_id;
    observe($("#socials"));
  }

  // ---------- data ----------
  function apply(d) {
    camps = d.camps || [];
    renderCamps();
    renderSocials(d.settings || {});
  }
  try {
    const cached = JSON.parse(localStorage.getItem("se_cache") || "null");
    if (cached) apply(cached);
  } catch {}
  fetch(API).then((r) => r.json()).then((d) => {
    if (d.error) throw d.error;
    apply(d);
    try { localStorage.setItem("se_cache", JSON.stringify(d)); } catch {}
  }).catch(() => {
    if (!camps.length) renderCamps();
  });

  // ---------- interactions ----------
  document.addEventListener("click", (e) => {
    const copy = e.target.closest("[data-copy]");
    if (copy) {
      const done = () => { const ok = copy.nextElementSibling; ok.classList.add("show"); setTimeout(() => ok.classList.remove("show"), 1800); };
      navigator.clipboard?.writeText(copy.dataset.copy).then(done, () => { prompt("微信号", copy.dataset.copy); });
      return;
    }
    const cardEl = e.target.closest(".camp-card");
    if (cardEl) {
      const c = camps.find((x) => String(x.id) === cardEl.dataset.id);
      if (c) { $("#dlgBody").innerHTML = feature(c, true); $("#campDlg").showModal(); }
      return;
    }
    if (e.target.closest("[data-close]") && $("#campDlg").open) $("#campDlg").close();
  });
  $("#dlgClose").onclick = () => $("#campDlg").close();
  $("#campDlg").addEventListener("click", (e) => { if (e.target === e.currentTarget) e.currentTarget.close(); });

  const nav = $("#nav"), menuBtn = $("#menuBtn");
  menuBtn.onclick = () => {
    const open = nav.classList.toggle("open");
    menuBtn.setAttribute("aria-expanded", open);
  };
  $("#navLinks").addEventListener("click", (e) => {
    if (e.target.closest("a")) { nav.classList.remove("open"); menuBtn.setAttribute("aria-expanded", "false"); }
  });

  // ---------- scroll motion ----------
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
  }, { threshold: 0.14, rootMargin: "0px 0px -6% 0px" });
  function observe(root = document) {
    root.querySelectorAll(".reveal, .reveal-rule, .tab-card, .camp-feature").forEach((el) => {
      if (reduce) el.classList.add("in"); else io.observe(el);
    });
  }
  observe();

  const heroStar = $("#heroStar"), hero = $("#hero");
  const steps = $("#steps"), stepLine = steps.querySelector(".steps-line i"), stepEls = [...steps.querySelectorAll(".step")];
  let parallaxImgs = [];
  function bindParallax() { parallaxImgs = [...document.querySelectorAll(".camp-media:not(.placeholder) img")]; }
  const sections = ["about", "services", "camps", "process", "contact"].map((id) => document.getElementById(id));
  const links = [...document.querySelectorAll(".nav-links a")];

  let lastY = scrollY, ticking = false;
  function onScroll() {
    const y = scrollY, vh = innerHeight;
    nav.classList.toggle("solid", y > hero.offsetHeight - 80);
    if (!nav.classList.contains("open")) nav.classList.toggle("hide", y > lastY && y > vh * 0.9);
    lastY = y;

    if (!reduce) {
      if (y < vh * 1.2) heroStar.style.transform = `translateY(calc(-50% + ${y * 0.18}px)) rotate(${y * 0.03}deg)`;
      for (const img of parallaxImgs) {
        const r = img.parentElement.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) continue;
        const p = (r.top + r.height / 2 - vh / 2) / vh;
        img.style.transform = `translateY(${p * -5}%)`;
      }
    }
    const sr = steps.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (vh * 0.75 - sr.top) / (sr.height + vh * 0.2)));
    stepLine.style.setProperty("--p", reduce ? 1 : p);
    stepEls.forEach((el, i) => el.classList.toggle("lit", p >= (i + 0.2) / stepEls.length || reduce));

    let cur = -1;
    sections.forEach((s, i) => { if (s.getBoundingClientRect().top < vh * 0.4) cur = i; });
    links.forEach((a, i) => a.classList.toggle("active", i === cur));
    ticking = false;
  }
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  addEventListener("resize", onScroll);
  onScroll();

  requestAnimationFrame(() => setTimeout(() => hero.classList.add("ready"), 80));
})();
