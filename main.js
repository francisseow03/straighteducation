(() => {
  const API = window.SE_API;
  const $ = (s, r = document) => r.querySelector(s);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) document.documentElement.classList.add("no-motion");
  $("#yr").textContent = new Date().getFullYear();

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const safeUrl = (u) => (/^https?:\/\//i.test(u || "") ? u : "");
  const STATUS = { open: ["报名中", "gold"], soon: ["即将开放", "jade"], full: ["已满额", "clay"], past: ["已结束", "ink"] };

  const fmtDate = (d) => (d ? d.replaceAll("-", ".") : "");
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
  const statusOf = (c) => STATUS[isPast(c) ? "past" : c.status] || STATUS.open;

  // "Name · place" titles: the part after the last " · " is shown in gold on its own line
  function splitTitle(t) {
    const i = String(t).lastIndexOf(" · ");
    return i > 0 ? [t.slice(0, i), t.slice(i + 3)] : [t, ""];
  }
  // trailing "信息来源…" paragraph becomes a small source note
  function splitSummary(s) {
    const parts = String(s || "").split(/\n+/).map((x) => x.trim()).filter(Boolean);
    const src = parts.length && /^(信息来源|来源|source)/i.test(parts[parts.length - 1]) ? parts.pop() : "";
    return [parts.join("\n"), src];
  }

  // "主题 · 1月4日–8日": keep the date part unbroken (and on its own line on phones)
  function cell(b) {
    const i = b.lastIndexOf(" · ");
    return i > 0 ? `<span class="th">${esc(b.slice(0, i))}</span><span class="sep"> · </span><span class="dt">${esc(b.slice(i + 3))}</span>` : esc(b);
  }

  // ---------- camp detail (section 2 + dialog) ----------
  function detail(c, inDialog) {
    const [label, tone] = statusOf(c);
    const [summary, src] = splitSummary(c.summary);
    const spec = [["日期", fmtRange(c.start_date, c.end_date)], ["地点", c.location], ["适合年龄", c.ages], ["营地费", c.price, "price"], ["形式", c.format, "zh"]].filter((r) => r[1]);
    const kv = [["费用包含", c.includes], ["费用不含", c.excludes], ["服务费", c.service_fee]].filter((r) => r[1]);
    const [name, loc] = splitTitle(c.title);
    const rows = (c.highlights || []).map((h) => {
      const i = h.indexOf(" · ");
      return i > 0 ? [h.slice(0, i), h.slice(i + 3)] : ["", h];
    });
    const table = rows.length || c.price ? `
      <table class="dtable">
        <thead><tr><th colspan="2">营期安排</th></tr></thead>
        <tbody>${rows.map(([a, b], k) => `<tr style="--k:${k}">${a ? `<td>${esc(a)}</td><td>${cell(b)}</td>` : `<td colspan="2">${cell(b)}</td>`}</tr>`).join("")}</tbody>
        ${c.price ? `<tfoot><tr><td>营地费</td><td class="num" style="text-align:left">${esc(c.price)}</td></tr></tfoot>` : ""}
      </table>` : "";
    const photo = c.image_url && safeUrl(c.image_url) ? `<div class="camp-photo"><img src="${esc(c.image_url)}" alt="${esc(c.title)}" loading="lazy"></div>` : "";
    const gal = inDialog && (c.gallery || []).length ? `<div class="gallery">${c.gallery.filter(safeUrl).map((u) => `<img src="${esc(u)}" alt="" loading="lazy">`).join("")}</div>` : "";
    const rv = inDialog ? "in" : "reveal";
    return `
      <div class="camp-head">
        <p class="eyebrow ${rv}">${inDialog ? "营期详情" : "最新营期"} <span class="chip ${tone}" style="height:28px;font-size:13px;padding:0 12px">${label}</span></p>
        <h2 class="split${inDialog ? " in" : ""}"><span class="ln"><span>${esc(name)}</span></span>${loc ? `<span class="ln" style="--i:1"><span class="loc">${esc(loc)}</span></span>` : ""}</h2>
        ${c.title_en ? `<p class="title-en ${rv}">${esc(c.title_en)}</p>` : ""}
      </div>
      <div class="detail">
        ${photo}
        <div class="${rv}">
          ${spec.length ? `<dl class="spec">${spec.map(([k, v, cls]) => `<div><dt>${k}</dt><dd${cls ? ` class="${cls}"` : ""}>${esc(v)}</dd></div>`).join("")}</dl>` : ""}
          ${summary ? `<p class="summary">${esc(summary).replace(/\n/g, "<br>")}</p>` : ""}
          <div class="actions">${isPast(c) ? "" : `<button class="btn" data-copy-wechat>复制微信号咨询这期</button>`}</div>
        </div>
        <div class="${rv}" style="--d:.1s">
          ${table}
          ${kv.length ? `<dl class="kv">${kv.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>` : ""}
          ${src ? `<p class="src">${esc(src)}</p>` : ""}
        </div>
        ${gal}
      </div>`;
  }
  // city = first known place name found in the location text
  const CITIES = ["清迈", "普吉岛", "曼谷", "吉隆坡", "新山", "槟城"];
  const cityOf = (c) => CITIES.find((k) => (c.location || "").includes(k) || (c.title || "").includes(k)) || "";
  const shortPrice = (p) => String(p || "").split("（")[0].trim();
  function row(c) {
    const [label, tone] = statusOf(c);
    const [name, loc] = splitTitle(c.title);
    const sub = [cityOf(c) || c.location, shortPrice(c.ages)].filter(Boolean).join(" · ");
    return `<button class="crow${isPast(c) ? " past" : ""}" data-id="${esc(c.id)}" data-city="${esc(cityOf(c))}">
      <span class="when">${esc(fmtRange(c.start_date, c.end_date) || "2027 寒假")}</span>
      <span class="t">${esc(name)}<small>${esc(sub)}</small></span>
      <span class="pr">${esc(shortPrice(c.price))}</span>
      <span class="chip ${tone}" style="height:28px;font-size:13px;padding:0 12px">${label}</span></button>`;
  }

  // short label for a camp inside the little book: "曼谷德威国际学校冬令营" -> "德威"
  function shortName(c) {
    const k = cityOf(c);
    let n = splitTitle(c.title)[0].replace(/(国际学校)?(英语冬令营|冬季英语营|冬令营|寒假插班)$/, "").trim();
    if (k && n.startsWith(k) && n.length > k.length) n = n.slice(k.length).trim();
    return n || c.title;
  }
  function cityBlock(k, en, list) {
    if (!list.length) return "";
    return `<p class="city"><b>${k}</b><span class="en">${en}</span><span class="n">${list.length}</span></p><ul class="cl">${list.map((c) => `<li>${esc(shortName(c))}</li>`).join("")}</ul>`;
  }
  function renderBookPages(upcoming) {
    const by = (k) => upcoming.filter((c) => cityOf(c) === k);
    $("#bkChiangMai").innerHTML = by("清迈").length ? cityBlock("清迈", "CHIANG MAI", by("清迈")) : `<p class="sub">营期更新中，关注小红书获取最新消息。</p>`;
    $("#bkPhuket").innerHTML = cityBlock("普吉岛", "PHUKET", by("普吉岛"));
    $("#bkBangkok").innerHTML = cityBlock("曼谷", "BANGKOK", by("曼谷"));
  }

  let camps = [], city = "";
  function drawList() {
    const list = $("#campList");
    if (!list) return;
    const ordered = [...camps.filter((c) => !isPast(c)), ...camps.filter(isPast)];
    const shown = ordered.filter((c) => !city || cityOf(c) === city);
    list.innerHTML = shown.length ? shown.map(row).join("") : `<p class="muted" style="padding:24px 0">这个城市暂时没有营期。</p>`;
  }
  function renderCamps() {
    const upcoming = camps.filter((c) => !isPast(c));
    const root = $("#campRoot");
    if (!camps.length) {
      root.innerHTML = `<div class="reveal"><h3 class="h2" style="margin-bottom:12px">下一期营期正在筹备中</h3><p class="lede" style="margin-bottom:28px">关注小红书或添加微信，新营期公布时第一时间告诉你。</p><button class="btn" data-copy-wechat>复制微信号</button></div>`;
    } else {
      const cities = CITIES.filter((k) => camps.some((c) => cityOf(c) === k));
      root.innerHTML = `
        ${cities.length > 1 ? `<div class="filters reveal" role="group" aria-label="按城市筛选"><button class="chip on" data-city="">全部 ${camps.length}</button>${cities.map((k) => `<button class="chip" data-city="${k}">${k}</button>`).join("")}</div>` : ""}
        <div class="clist reveal" id="campList"></div>
        <p class="clist-note reveal">点击任一营期，查看日期、费用、包含项目与信息来源。费用以营地官方最新公布为准。</p>`;
      drawList();
    }
    observe(root);

    renderBookPages(upcoming);

    // hero bar = summary of what is open, pointing at the list
    const c = upcoming[0];
    if (c) {
      const cs = CITIES.filter((k) => upcoming.some((x) => cityOf(x) === k));
      for (const id of ["#hStatus", "#hStatus2"]) { $(id).textContent = statusOf(c)[0]; $(id).className = "chip " + statusOf(c)[1]; }
      const since = c.start_date ? `最早 ${fmtDate(c.start_date)} 开营` : "";
      $("#hNextTitle").textContent = `2027 寒假营期 · 共 ${upcoming.length} 个`;
      $("#hNextMeta").textContent = [cs.join(" / "), since].filter(Boolean).join(" · ");
      $("#bkTitle").textContent = "2027 寒假营期";
      $("#bkMeta").textContent = [`共 ${upcoming.length} 个营`, cs.join(" · "), since].filter(Boolean).join(" · ");
    } else {
      $("#hStatus").textContent = $("#hStatus2").textContent = "筹备中";
      $("#hNextTitle").textContent = $("#bkTitle").textContent = "下一期营期正在筹备中";
      $("#hNextMeta").textContent = $("#bkMeta").textContent = "关注小红书或添加微信，第一时间获取";
    }
  }

  // ---------- contact ----------
  let wechat = ($("#wxId").textContent || "").trim(); // static fallback until data arrives
  const ICON = { rednote: "i-rednote", instagram: "i-ig", facebook: "i-fb", email: "i-mail" };
  function handleOf(kind, v) {
    if (!/^https?:\/\//i.test(v)) return v;
    try {
      const u = new URL(v);
      if (kind === "facebook" && u.searchParams.get("id")) return "Straight Education";
      const seg = u.pathname.split("/").filter(Boolean);
      return seg.length ? (kind === "instagram" ? "@" : "") + decodeURIComponent(seg[seg.length - 1]) : u.hostname;
    } catch { return v; }
  }
  function renderContact(s) {
    wechat = s.wechat || "";
    $("#wxId").textContent = wechat || "—";
    $("#bkWx").textContent = wechat || "—";
    const qr = $("#wxQr");
    if (safeUrl(s.wechat_qr)) { qr.src = s.wechat_qr; qr.hidden = false; } else qr.hidden = true;
    document.querySelectorAll("[data-copy-wechat]").forEach((b) => (b.hidden = !wechat));

    const rnUrl = safeUrl(s.rednote_url) || (s.rednote_id ? "https://www.xiaohongshu.com/search_result?keyword=" + encodeURIComponent(s.rednote_id) : "");
    const items = [
      ["rednote", "小红书", s.rednote_id, rnUrl, "去关注 ↗"],
      ["email", "邮箱", /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.email || "") ? s.email : "", "mailto:" + (s.email || ""), "发邮件 ↗"],
      ["instagram", "Instagram", s.instagram, safeUrl(s.instagram) || "https://www.instagram.com/" + encodeURIComponent(String(s.instagram || "").replace(/^@/, "")) + "/", "打开 ↗"],
      ["facebook", "Facebook", s.facebook, safeUrl(s.facebook) || "https://www.facebook.com/" + encodeURIComponent(String(s.facebook || "").replace(/^@/, "")), "打开 ↗"],
    ].filter((x) => x[2]);
    $("#others").innerHTML = items.map(([k, name, v, url, go]) =>
      `<a href="${esc(url)}"${k === "email" ? "" : ' target="_blank" rel="noopener"'}><svg aria-hidden="true"><use href="#${ICON[k]}"/></svg><span class="p">${name}</span><span class="h">${esc(k === "rednote" ? v : handleOf(k, v))}</span><span class="go">${go}</span></a>`).join("");

    if (s.rednote_id) $("#footRn").textContent = "小红书号 " + s.rednote_id;
    const dockRn = $("#dockRn");
    dockRn.href = rnUrl || "#contact";
    dockRn.hidden = !rnUrl;
  }

  // ---------- data: live API, then built-in snapshot if the API is slow/blocked ----------
  function apply(d) {
    camps = d.camps || [];
    renderCamps();
    renderContact(d.settings || {});
  }
  // No browser-side copy of old data: paint the shipped snapshot right away (same site, fast),
  // then replace it with live data as soon as the API answers. Never show a stale remembered list.
  try { localStorage.removeItem("se_cache"); } catch {}
  let live = false, painted = false;
  const withTimeout = (url, ms) => {
    const ctl = "AbortController" in window ? new AbortController() : null;
    const t = setTimeout(() => ctl && ctl.abort(), ms);
    return fetch(url, ctl ? { signal: ctl.signal, cache: "no-store" } : { cache: "no-store" }).then((r) => { clearTimeout(t); if (!r.ok) throw new Error(r.status); return r.json(); });
  };
  withTimeout("data.json?t=" + Math.floor(Date.now() / 60000), 8000)
    .then((d) => { if (!live) { apply(d); painted = true; } })
    .catch(() => {});
  withTimeout(API, 10000)
    .then((d) => { if (d.error) throw d.error; live = true; painted = true; apply(d); })
    .catch(() => setTimeout(() => { if (!painted) apply({ camps: [], settings: {} }); }, 1500));

  // ---------- copy WeChat ID (works in WeChat/RedNote in-app browsers too) ----------
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text).catch(() => legacyCopy(text));
    return legacyCopy(text);
  }
  function legacyCopy(text) {
    return new Promise((res, rej) => {
      const ta = document.createElement("textarea");
      ta.value = text; ta.setAttribute("readonly", ""); ta.style.cssText = "position:fixed;top:-100px;opacity:0";
      document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, text.length);
      const ok = document.execCommand && document.execCommand("copy");
      ta.remove(); ok ? res() : rej();
    });
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-copy-wechat]");
    if (b) {
      if (!wechat) return;
      const html = b.innerHTML;
      copyText(wechat).then(() => {
        b.classList.add("copied");
        b.innerHTML = `已复制 ${esc(wechat)}`;
        setTimeout(() => { b.classList.remove("copied"); b.innerHTML = html; }, 2200);
      }, () => prompt("微信号（长按复制）", wechat));
      return;
    }
    const f = e.target.closest(".filters [data-city]");
    if (f) {
      city = f.dataset.city;
      document.querySelectorAll(".filters .chip").forEach((x) => x.classList.toggle("on", x === f));
      drawList();
      return;
    }
    const r = e.target.closest(".crow");
    if (r) {
      const c = camps.find((x) => String(x.id) === r.dataset.id);
      if (c) { $("#dlgBody").innerHTML = detail(c, true); $("#campDlg").showModal(); }
    }
  });
  $("#dlgClose").onclick = () => $("#campDlg").close();
  $("#campDlg").addEventListener("click", (e) => { if (e.target === e.currentTarget) e.currentTarget.close(); });

  // ---------- nav ----------
  const nav = $("#nav"), menuBtn = $("#menuBtn");
  const setMenu = (open) => { nav.classList.toggle("open", open); menuBtn.setAttribute("aria-expanded", open); };
  menuBtn.onclick = () => setMenu(!nav.classList.contains("open"));
  $("#navLinks").addEventListener("click", (e) => { if (e.target.closest("a")) setMenu(false); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") setMenu(false); });

  // ---------- scroll reveal (information only; nothing loops) ----------
  const io = "IntersectionObserver" in window ? new IntersectionObserver((entries) => {
    for (const en of entries) if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
  }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }) : null;
  function observe(root = document) {
    root.querySelectorAll(".reveal, .split").forEach((el) => {
      if (el.id === "hTitle") return;
      if (reduce || !io) el.classList.add("in"); else io.observe(el);
    });
  }
  observe();

  const hero = $("#hero"), bar = $("#progress"), dock = $("#dock"), contact = $("#contact");
  const bookScroll = $("#bookScroll"), stage = $("#stage");
  const clamp01 = (x) => Math.min(1, Math.max(0, x));
  const smooth = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };
  let bookP = 0;
  // scroll position -> which pages have turned (0 = lying on the right, 1 = turned to the left)
  function updateBook() {
    const r = bookScroll.getBoundingClientRect();
    const total = r.height - innerHeight;
    const p = reduce || total <= 0 ? 1 : clamp01(-r.top / total);
    bookP = p;
    const st = stage.style;
    st.setProperty("--o0", smooth((p - 0.06) / 0.22).toFixed(4));
    st.setProperty("--o1", smooth((p - 0.36) / 0.2).toFixed(4));
    st.setProperty("--o2", smooth((p - 0.66) / 0.2).toFixed(4));
    st.setProperty("--g", smooth((p - 0.04) / 0.5).toFixed(3));
    st.setProperty("--hint", (1 - smooth(p / 0.1)).toFixed(3));
    stage.classList.toggle("idle", p < 0.02 && !reduce);
    stage.classList.toggle("lit", p > 0.14 && !reduce);
  }
  const steps = $("#steps"), stepLine = steps.querySelector(".steps-line i"), stepEls = [...steps.querySelectorAll(".step")];
  const sections = ["camp", "about", "process", "contact"].map((id) => document.getElementById(id));
  const links = [...document.querySelectorAll(".nav-links a")];
  let lastY = scrollY, ticking = false;
  function onScroll() {
    const y = scrollY, vh = innerHeight, max = document.documentElement.scrollHeight - vh;
    nav.classList.toggle("solid", y > hero.offsetHeight - 72);
    nav.classList.toggle("scrolled", y > 8);
    if (!nav.classList.contains("open")) nav.classList.toggle("hide", y > lastY + 4 && y > vh * 0.9);
    if (y < lastY - 2) nav.classList.remove("hide");
    lastY = y;
    bar.style.setProperty("--p", max > 0 ? y / max : 0);
    // show the quick-contact bar whenever the hero's own WeChat button is off screen, until the contact section arrives
    updateBook();
    dock.classList.toggle("show", bookP > 0.85 && y > 60 && contact.getBoundingClientRect().top > vh * 0.6);

    const sr = steps.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (vh * 0.75 - sr.top) / (sr.height + vh * 0.2)));
    stepLine.style.setProperty("--p", reduce ? 1 : p);
    stepEls.forEach((el, i) => el.classList.toggle("lit", reduce || p >= (i + 0.2) / stepEls.length));

    let cur = -1;
    sections.forEach((s, i) => { if (s.getBoundingClientRect().top < vh * 0.4) cur = i; });
    links.forEach((a, i) => { a.classList.toggle("active", i === cur); if (i === cur) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current"); });
    ticking = false;
  }
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  addEventListener("resize", onScroll);
  onScroll();

  requestAnimationFrame(() => setTimeout(() => hero.classList.add("ready"), 60));
})();
