(() => {
  const API = window.SE_API;
  const I = window.SE_I18N || { en: {}, ui: { zh: {}, en: {} } };
  const $ = (s, r = document) => r.querySelector(s);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) document.documentElement.classList.add("no-motion");
  $("#yr").textContent = new Date().getFullYear();

  // ---------- language: Chinese for Chinese browsers, English for everyone else; the button overrides ----------
  let lang = window.__lang === "en" ? "en" : "zh";
  const isEn = () => lang === "en";
  const U = () => I.ui[lang];
  // text of a camp in the current language (falls back to Chinese if no English was entered)
  const cl = (c, k) => (isEn() && c.en && c.en[k] ? c.en[k] : c[k]);
  const clHl = (c) => (isEn() && c.en && Array.isArray(c.en.highlights) && c.en.highlights.length ? c.en.highlights : c.highlights || []);

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const safeUrl = (u) => (/^https?:\/\//i.test(u || "") ? u : "");
  const TONE = { open: "gold", soon: "jade", full: "clay", past: "ink" };

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
  const statusOf = (c) => {
    const k = isPast(c) ? "past" : TONE[c.status] ? c.status : "open";
    return [U().status[k], TONE[k]];
  };

  // "Name · place" titles: the part after the last " · " is shown in gold on its own line
  function splitTitle(t) {
    const i = String(t).lastIndexOf(" · ");
    return i > 0 ? [t.slice(0, i), t.slice(i + 3)] : [t, ""];
  }
  // trailing "信息来源… / Source…" paragraph becomes a small source note
  function splitSummary(s) {
    const parts = String(s || "").split(/\n+/).map((x) => x.trim()).filter(Boolean);
    const src = parts.length && /^(信息来源|来源|source)/i.test(parts[parts.length - 1]) ? parts.pop() : "";
    return [parts.join("\n"), src];
  }
  // "Theme · 1月4日–8日": keep the date part unbroken (and on its own line on phones)
  function cell(b) {
    const i = b.lastIndexOf(" · ");
    return i > 0 ? `<span class="th">${esc(b.slice(0, i))}</span><span class="sep"> · </span><span class="dt">${esc(b.slice(i + 3))}</span>` : esc(b);
  }

  // ---------- camp detail (dialog) ----------
  function detail(c, inDialog) {
    const T = U();
    const [label, tone] = statusOf(c);
    const [summary, src] = splitSummary(cl(c, "summary"));
    const price = cl(c, "price");
    const spec = [[T.date, fmtRange(c.start_date, c.end_date)], [T.place, cl(c, "location")], [T.ages, cl(c, "ages")], [T.fee, price, "price"], [T.format, cl(c, "format"), "zh"]].filter((r) => r[1]);
    const kv = [[T.included, cl(c, "includes")], [T.excluded, cl(c, "excludes")], [T.service, cl(c, "service_fee")]].filter((r) => r[1]);
    const [name, loc] = splitTitle(cl(c, "title"));
    const rows = clHl(c).map((h) => {
      const i = h.indexOf(" · ");
      return i > 0 ? [h.slice(0, i), h.slice(i + 3)] : ["", h];
    });
    const table = rows.length || price ? `
      <table class="dtable">
        <thead><tr><th colspan="2">${T.schedule}</th></tr></thead>
        <tbody>${rows.map(([a, b], k) => `<tr style="--k:${k}">${a ? `<td>${esc(a)}</td><td>${cell(b)}</td>` : `<td colspan="2">${cell(b)}</td>`}</tr>`).join("")}</tbody>
        ${price ? `<tfoot><tr><td>${T.fee}</td><td class="num" style="text-align:left">${esc(price)}</td></tr></tfoot>` : ""}
      </table>` : "";
    const photo = c.image_url && safeUrl(c.image_url) ? `<div class="camp-photo"><img src="${esc(c.image_url)}" alt="${esc(cl(c, "title"))}" loading="lazy"></div>` : "";
    const gal = inDialog && (c.gallery || []).length ? `<div class="gallery">${c.gallery.filter(safeUrl).map((u) => `<img src="${esc(u)}" alt="" loading="lazy">`).join("")}</div>` : "";
    const rv = inDialog ? "in" : "reveal";
    return `
      <div class="camp-head">
        <p class="eyebrow ${rv}">${inDialog ? T.detailEyebrow : T.latestEyebrow} <span class="chip ${tone}" style="height:28px;font-size:13px;padding:0 12px">${label}</span></p>
        <h2 class="split${inDialog ? " in" : ""}"><span class="ln"><span>${esc(name)}</span></span>${loc ? `<span class="ln" style="--i:1"><span class="loc">${esc(loc)}</span></span>` : ""}</h2>
        ${!isEn() && c.title_en ? `<p class="title-en ${rv}">${esc(c.title_en)}</p>` : ""}
      </div>
      <div class="detail">
        ${photo}
        <div class="${rv}">
          ${spec.length ? `<dl class="spec">${spec.map(([k, v, cls]) => `<div><dt>${k}</dt><dd${cls ? ` class="${cls}"` : ""}>${esc(v)}</dd></div>`).join("")}</dl>` : ""}
          ${summary ? `<p class="summary">${esc(summary).replace(/\n/g, "<br>")}</p>` : ""}
          <div class="actions">${isPast(c) ? "" : `<button class="btn" data-copy-wechat>${T.copyAsk}</button>`}</div>
        </div>
        <div class="${rv}" style="--d:.1s">
          ${table}
          ${kv.length ? `<dl class="kv">${kv.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>` : ""}
          ${src ? `<p class="src">${esc(src)}</p>` : ""}
        </div>
        ${gal}
      </div>`;
  }

  // city = first known place name found in the (Chinese) location text
  const CITIES = ["清迈", "普吉岛", "曼谷", "吉隆坡", "新山", "槟城", "新加坡"];
  const cityOf = (c) => CITIES.find((k) => (c.location || "").includes(k) || (c.title || "").includes(k)) || "";
  const cityLabel = (k) => (k && U().cities[k]) || k;
  const shortPrice = (p) => String(p || "").split(/[（(]/)[0].trim();
  function row(c) {
    const [label, tone] = statusOf(c);
    const [name] = splitTitle(cl(c, "title"));
    const sub = [cityLabel(cityOf(c)) || cl(c, "location"), shortPrice(cl(c, "ages"))].filter(Boolean).join(" · ");
    return `<button class="crow${isPast(c) ? " past" : ""}" data-id="${esc(c.id)}" data-city="${esc(cityOf(c))}">
      <span class="when">${esc(fmtRange(c.start_date, c.end_date) || U().winter)}</span>
      <span class="t">${esc(name)}<small>${esc(sub)}</small></span>
      <span class="pr">${esc(shortPrice(cl(c, "price")))}</span>
      <span class="chip ${tone}" style="height:28px;font-size:13px;padding:0 12px">${label}</span></button>`;
  }

  let camps = [], city = "", settings = null, loaded = false;
  function drawList() {
    const list = $("#campList");
    if (!list) return;
    const ordered = [...camps.filter((c) => !isPast(c)), ...camps.filter(isPast)];
    const shown = ordered.filter((c) => !city || cityOf(c) === city);
    list.innerHTML = shown.length ? shown.map(row).join("") : `<p class="muted" style="padding:24px 0">${U().none}</p>`;
  }
  function renderCamps() {
    const T = U();
    const upcoming = camps.filter((c) => !isPast(c));
    const root = $("#campRoot");
    if (!loaded) {
      root.innerHTML = `<p class="muted">${T.loading}</p>`;
    } else if (!camps.length) {
      root.innerHTML = `<div class="reveal"><h3 class="h2" style="margin-bottom:12px">${T.emptyH}</h3><p class="lede" style="margin-bottom:28px">${T.emptyP}</p><button class="btn" data-copy-wechat>${T.copyWx}</button></div>`;
    } else {
      const cities = CITIES.filter((k) => camps.some((c) => cityOf(c) === k));
      root.innerHTML = `
        ${cities.length > 1 ? `<div class="filters reveal" role="group" aria-label="${T.filterAria}"><button class="chip${city ? "" : " on"}" data-city="">${T.all} ${camps.length}</button>${cities.map((k) => `<button class="chip${city === k ? " on" : ""}" data-city="${k}">${cityLabel(k)}</button>`).join("")}</div>` : ""}
        <div class="clist reveal" id="campList"></div>
        <p class="clist-note reveal">${T.note}</p>`;
      drawList();
    }
    observe(root);

    // hero bar + book page = summary of what is open
    const c = upcoming[0];
    if (loaded && c) {
      const cs = CITIES.filter((k) => upcoming.some((x) => cityOf(x) === k)).map(cityLabel);
      for (const id of ["#hStatus", "#hStatus2"]) { $(id).textContent = statusOf(c)[0]; $(id).className = "chip " + statusOf(c)[1]; }
      const since = c.start_date ? T.since(fmtDate(c.start_date)) : "";
      $("#hNextTitle").textContent = T.barTitle(upcoming.length);
      $("#hNextMeta").textContent = [T.cs(cs), since].filter(Boolean).join(" · ");
      $("#bkTitle").textContent = T.bkTitle;
      $("#bkMeta").textContent = T.bkMeta(upcoming.length, T.csBook(cs), since);
    } else if (loaded) {
      $("#hStatus").textContent = $("#hStatus2").textContent = T.preparing;
      $("#hNextTitle").textContent = $("#bkTitle").textContent = T.prepTitle;
      $("#hNextMeta").textContent = $("#bkMeta").textContent = T.prepMeta;
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
    const T = U();
    settings = s;
    wechat = s.wechat || "";
    $("#wxId").textContent = wechat || "—";
    const qr = $("#wxQr");
    if (safeUrl(s.wechat_qr)) { qr.src = s.wechat_qr; qr.hidden = false; } else qr.hidden = true;
    document.querySelectorAll("[data-copy-wechat]").forEach((b) => (b.hidden = !wechat));

    const rnUrl = safeUrl(s.rednote_url) || (s.rednote_id ? "https://www.xiaohongshu.com/search_result?keyword=" + encodeURIComponent(s.rednote_id) : "");
    const items = [
      ["rednote", T.rednote, s.rednote_id, rnUrl, T.follow],
      ["email", T.email, /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.email || "") ? s.email : "", "mailto:" + (s.email || ""), T.sendMail],
      ["instagram", "Instagram", s.instagram, safeUrl(s.instagram) || "https://www.instagram.com/" + encodeURIComponent(String(s.instagram || "").replace(/^@/, "")) + "/", T.open],
      ["facebook", "Facebook", s.facebook, safeUrl(s.facebook) || "https://www.facebook.com/" + encodeURIComponent(String(s.facebook || "").replace(/^@/, "")), T.open],
    ].filter((x) => x[2]);
    $("#others").innerHTML = items.map(([k, name, v, url, go]) =>
      `<a href="${esc(url)}"${k === "email" ? "" : ' target="_blank" rel="noopener"'}><svg aria-hidden="true"><use href="#${ICON[k]}"/></svg><span class="p">${name}</span><span class="h">${esc(k === "rednote" ? v : handleOf(k, v))}</span><span class="go">${go}</span></a>`).join("");

    if (s.rednote_id) $("#footRn").textContent = T.footRn + s.rednote_id;
    const dockRn = $("#dockRn");
    dockRn.href = rnUrl || "#contact";
    dockRn.hidden = !rnUrl;
  }

  // ---------- applying the language to the static page ----------
  const metaDesc = document.querySelector('meta[name="description"]');
  function applyStatic() {
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      if (el.dataset.zh === undefined) el.dataset.zh = el.innerHTML; // remember the Chinese original
      const k = el.dataset.i18n;
      el.innerHTML = isEn() && k in I.en ? I.en[k] : el.dataset.zh;
    });
    const T = U();
    document.documentElement.lang = isEn() ? "en" : "zh-CN";
    document.title = T.title;
    if (metaDesc) metaDesc.setAttribute("content", T.desc);
    const dark = $(".brand .on-dark"), light = $(".brand .on-light");
    if (dark) dark.src = isEn() ? "assets/logo-en-dark.png" : "assets/logo-cn-dark.png";
    if (light) light.src = isEn() ? "assets/logo-en-light.png" : "assets/logo-cn-light.png";
    $(".brand").setAttribute("aria-label", T.logoAlt);
    const cover = $(".front img");
    if (cover) cover.alt = T.logoAlt;
    const btn = $("#langBtn");
    btn.textContent = T.switchTo;
    btn.setAttribute("aria-label", T.switchAria);
    document.documentElement.classList.remove("pre-en");
  }
  function setLang(l, remember) {
    lang = l === "en" ? "en" : "zh";
    if (remember) { try { localStorage.setItem("se_lang", lang); } catch {} }
    const dlg = $("#campDlg");
    if (dlg.open) dlg.close();
    applyStatic();
    renderCamps();
    if (settings) renderContact(settings);
  }
  $("#langBtn").addEventListener("click", () => setLang(isEn() ? "zh" : "en", true));
  try { const q = new URLSearchParams(location.search).get("lang"); if (q === "en" || q === "zh") { try { localStorage.setItem("se_lang", q); } catch {} } } catch {}
  applyStatic();

  // ---------- data: live API, then built-in snapshot if the API is slow/blocked ----------
  function apply(d) {
    camps = d.camps || [];
    loaded = true;
    renderCamps();
    renderContact(d.settings || {});
  }
  renderCamps();
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
        b.innerHTML = `${U().copied}${esc(wechat)}`;
        setTimeout(() => { b.classList.remove("copied"); b.innerHTML = html; }, 2200);
      }, () => prompt(U().prompt, wechat));
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
  // scroll position -> how far the cover has opened (0 closed, 1 open)
  function updateBook() {
    const r = bookScroll.getBoundingClientRect();
    const total = r.height - innerHeight;
    const p = reduce || total <= 0 ? 1 : clamp01(-r.top / total);
    bookP = p;
    const open = smooth((p - 0.08) / 0.5);
    const st = stage.style;
    st.setProperty("--o0", open.toFixed(4));
    st.setProperty("--g", smooth((p - 0.05) / 0.55).toFixed(3));
    st.setProperty("--hint", (1 - smooth(p / 0.12)).toFixed(3));
    stage.classList.toggle("idle", p < 0.02 && !reduce);
    stage.classList.toggle("lit", open > 0.35 && !reduce);
    stage.classList.toggle("flipped", open > 0.5);
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
