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

  // ---------- camp detail (section 2 + dialog) ----------
  function detail(c, inDialog) {
    const [label, tone] = statusOf(c);
    const [summary, src] = splitSummary(c.summary);
    // on the page the hero already shows dates/place/age; the dialog repeats them since it stands alone
    const kv = [
      ...(inDialog ? [["日期", fmtRange(c.start_date, c.end_date)], ["地点", c.location], ["适合年龄", c.ages]] : []),
      ["形式", c.format], ["费用包含", c.includes], ["服务费", c.service_fee],
    ].filter((r) => r[1]);
    const rows = (c.highlights || []).map((h) => {
      const i = h.indexOf(" · ");
      return i > 0 ? [h.slice(0, i), h.slice(i + 3)] : ["", h];
    });
    const table = rows.length || c.price ? `
      <table class="dtable">
        <thead><tr><th colspan="2">营期安排</th></tr></thead>
        <tbody>${rows.map(([a, b], k) => `<tr style="--k:${k}">${a ? `<td>${esc(a)}</td><td>${esc(b)}</td>` : `<td colspan="2">${esc(b)}</td>`}</tr>`).join("")}</tbody>
        ${c.price ? `<tfoot><tr><td>营地费</td><td class="num" style="text-align:left">${esc(c.price)}</td></tr></tfoot>` : ""}
      </table>` : "";
    const photo = c.image_url && safeUrl(c.image_url) ? `<div class="camp-photo"><img src="${esc(c.image_url)}" alt="${esc(c.title)}" loading="lazy"></div>` : "";
    const gal = inDialog && (c.gallery || []).length ? `<div class="gallery">${c.gallery.filter(safeUrl).map((u) => `<img src="${esc(u)}" alt="" loading="lazy">`).join("")}</div>` : "";
    const rv = inDialog ? "in" : "reveal";
    return `
      <div class="detail">
        ${photo}
        <div class="${rv}">
          <p class="eyebrow" style="display:flex;gap:12px;align-items:center">营期详情 <span class="chip ${tone}" style="height:28px;font-size:13px;padding:0 12px">${label}</span></p>
          <h2>${inDialog ? esc(c.title) : "营期安排与费用"}</h2>
          ${summary ? `<p class="summary">${esc(summary).replace(/\n/g, "<br>")}</p>` : ""}
          ${kv.length ? `<dl class="kv">${kv.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>` : ""}
          <div class="actions">${isPast(c) ? "" : `<button class="btn" data-copy-wechat>复制微信号咨询这期</button>`}</div>
        </div>
        <div class="${rv}" style="--d:.1s">${table}${src ? `<p class="src">${esc(src)}</p>` : ""}</div>
        ${gal}
      </div>`;
  }
  function row(c) {
    const [label, tone] = statusOf(c);
    return `<button class="crow${isPast(c) ? " past" : ""}" data-id="${esc(c.id)}">
      <span class="when">${esc(fmtRange(c.start_date, c.end_date) || c.location || "")}</span>
      <span class="t">${esc(c.title)}</span>
      <span class="chip ${tone}" style="height:28px;font-size:13px;padding:0 12px">${label}</span></button>`;
  }

  let camps = [];
  function renderCamps() {
    const upcoming = camps.filter((c) => !isPast(c));
    const ordered = [...upcoming, ...camps.filter(isPast)];
    const root = $("#campRoot");
    if (!ordered.length) {
      root.innerHTML = `<div class="reveal"><p class="eyebrow">营期详情</p><h2 class="h1">下一期营期正在筹备中</h2><p class="lede" style="margin-bottom:28px">关注小红书或添加微信，新营期公布时第一时间告诉你。</p><button class="btn" data-copy-wechat>复制微信号</button></div>`;
    } else {
      const [first, ...rest] = ordered;
      root.innerHTML = detail(first) + (rest.length ? `<div class="more-camps reveal"><h3>更多营期</h3>${rest.map(row).join("")}</div>` : "");
    }
    observe(root);

    // hero = the next upcoming camp
    const c = upcoming[0];
    const hero = $("#hero");
    if (c) {
      const [name, loc] = splitTitle(c.title);
      $("#hTitle").innerHTML = `<span class="ln"><span>${esc(name)}</span></span>${loc ? `<span class="ln" style="--i:1"><span class="loc">${esc(loc)}</span></span>` : ""}`;
      $("#hTitleEn").textContent = c.title_en || "";
      $("#hStatus").textContent = statusOf(c)[0];
      $("#hStatus").className = "chip " + statusOf(c)[1];
      const facts = [["日期", fmtRange(c.start_date, c.end_date)], ["地点", c.location], ["适合年龄", c.ages], ["营地费", c.price, "price"], ["形式", c.format, "zh"]].filter((f) => f[1]);
      $("#hFacts").innerHTML = facts.map(([k, v, cls], i) => `<div style="--k:${i}"><dt>${k}</dt><dd${cls ? ` class="${cls}"` : ""}>${esc(v)}</dd></div>`).join("");
    } else {
      $("#hTitle").innerHTML = `<span class="ln"><span>下一期营期</span></span><span class="ln" style="--i:1"><span class="loc">筹备中</span></span>`;
      $("#hTitleEn").textContent = "";
      $("#hStatus").textContent = "即将公布";
      $("#hFacts").innerHTML = `<div><dt>关注</dt><dd class="zh">新营期公布时，小红书与微信会第一时间更新。</dd></div>`;
    }
    if (hero.classList.contains("ready")) $("#hTitle").classList.add("in");
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

    if (s.rednote_id) {
      $("#footRn").textContent = "小红书号 " + s.rednote_id;
      $("#hRn").textContent = s.rednote_id;
    }
    $("#hOr").hidden = !s.rednote_id;
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
  let applied = false;
  try {
    const cached = JSON.parse(localStorage.getItem("se_cache") || "null");
    if (cached) { apply(cached); applied = true; }
  } catch {}
  const withTimeout = (url, ms) => {
    const ctl = "AbortController" in window ? new AbortController() : null;
    const t = setTimeout(() => ctl && ctl.abort(), ms);
    return fetch(url, ctl ? { signal: ctl.signal } : {}).then((r) => { clearTimeout(t); if (!r.ok) throw new Error(r.status); return r.json(); });
  };
  withTimeout(API, 6000)
    .then((d) => { if (d.error) throw d.error; apply(d); try { localStorage.setItem("se_cache", JSON.stringify(d)); } catch {} })
    .catch(() => (applied ? null : withTimeout("data.json", 6000).then(apply)))
    .catch(() => { if (!applied) apply({ camps: [], settings: {} }); });

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
  const steps = $("#steps"), stepLine = steps.querySelector(".steps-line i"), stepEls = [...steps.querySelectorAll(".step")];
  const sections = ["camp", "about", "process", "contact"].map((id) => document.getElementById(id));
  const links = [...document.querySelectorAll(".nav-links a")];
  let lastY = scrollY, ticking = false;
  function onScroll() {
    const y = scrollY, vh = innerHeight, max = document.documentElement.scrollHeight - vh;
    nav.classList.toggle("solid", y > hero.offsetHeight - 72);
    if (!nav.classList.contains("open")) nav.classList.toggle("hide", y > lastY + 4 && y > vh * 0.9);
    if (y < lastY - 2) nav.classList.remove("hide");
    lastY = y;
    bar.style.setProperty("--p", max > 0 ? y / max : 0);
    dock.classList.toggle("show", y > hero.offsetHeight * 0.6 && contact.getBoundingClientRect().top > vh * 0.6);

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

  requestAnimationFrame(() => setTimeout(() => { hero.classList.add("ready"); $("#hTitle").classList.add("in"); }, 60));
})();
