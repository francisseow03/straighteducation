(() => {
  const API = window.SE_API;
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const STATUS = { open: ["报名中", "gold"], soon: ["即将开放", "jade"], full: ["已满额", "clay"], past: ["已结束", "ink"] };

  let pin = "";
  try { pin = sessionStorage.getItem("se_pin") || ""; } catch {}
  let state = { settings: {}, camps: [] };
  let editing = null; // camp being edited

  async function call(op, data = {}) {
    const r = await fetch(API, {
      method: "POST",
      headers: { "content-type": "application/json", ...(pin ? { "x-pin": pin } : {}) },
      body: JSON.stringify({ op, ...data }),
    });
    const d = await r.json().catch(() => ({ error: { message: "网络错误，请重试。" } }));
    if (d.error) {
      if (d.error.code === "bad_pin" && $("#app").hidden === false) { logout(); }
      throw new Error(d.error.message || "出错了");
    }
    return d;
  }
  function msg(el, text, ok) { el.textContent = text; el.className = "msg " + (ok ? "ok" : "err"); }
  let tt;
  function toast(t) { const el = $("#toast"); el.textContent = t; el.classList.add("show"); clearTimeout(tt); tt = setTimeout(() => el.classList.remove("show"), 2200); }

  // ---------- gate ----------
  async function boot() {
    $("#gate").hidden = false;
    try {
      if (pin) {
        try { await call("login"); return enter(); } catch { pin = ""; }
      }
      const { ready } = await call("status");
      $("#gateLoading").hidden = true;
      $(ready ? "#loginBox" : "#setupBox").hidden = false;
      $(ready ? "#lPin" : "#sCode").focus();
    } catch (e) {
      $("#gateLoading").textContent = "无法连接后台：" + e.message;
    }
  }
  $("#setupForm").onsubmit = async (e) => {
    e.preventDefault();
    const m = $("#setupMsg");
    if ($("#sPin").value !== $("#sPin2").value) return msg(m, "两次密码不一致。");
    try {
      await call("setup", { code: $("#sCode").value, pin: $("#sPin").value });
      pin = $("#sPin").value;
      enter();
    } catch (err) { msg(m, err.message); }
  };
  $("#loginForm").onsubmit = async (e) => {
    e.preventDefault();
    const m = $("#loginMsg");
    pin = $("#lPin").value;
    msg(m, "登录中…", true);
    try { await call("login"); enter(); } catch (err) { pin = ""; msg(m, err.message); }
  };
  async function enter() {
    try { sessionStorage.setItem("se_pin", pin); } catch {}
    $("#gate").hidden = true;
    $("#app").hidden = false;
    $("#topRight").hidden = false;
    await load();
  }
  function logout() {
    pin = "";
    try { sessionStorage.removeItem("se_pin"); } catch {}
    location.reload();
  }
  $("#logout").onclick = logout;

  async function load() {
    state = await call("all");
    renderList();
    fillSocial();
  }

  // ---------- tabs ----------
  function show(panel) {
    document.querySelectorAll("[data-panel]").forEach((p) => (p.hidden = p.dataset.panel !== panel));
    document.querySelectorAll("[data-tab]").forEach((b) => b.setAttribute("aria-selected", b.dataset.tab === (panel === "edit" ? "camps" : panel)));
    scrollTo({ top: 0, behavior: "smooth" });
  }
  document.querySelectorAll("[data-tab]").forEach((b) => (b.onclick = () => show(b.dataset.tab)));

  // ---------- camps ----------
  const range = (c) => [c.start_date, c.end_date].filter(Boolean).map((d) => d.replaceAll("-", ".")).join(" — ");
  function renderList() {
    const el = $("#campList");
    if (!state.camps.length) { el.innerHTML = `<div class="empty">还没有营期。点击「新增营期」添加第一期。</div>`; return; }
    el.innerHTML = state.camps.map((c) => {
      const [label, tone] = STATUS[c.status] || STATUS.open;
      return `
      <div class="row">
        <div class="th">${c.image_url ? `<img src="${esc(c.image_url)}" alt="">` : `<img class="ph" src="assets/icon-dark.png" alt="">`}</div>
        <div>
          <h3>${esc(c.title)}</h3>
          <div class="sub"><span class="chip mini ${tone}">${label}</span>${c.published ? "" : `<span class="chip mini">未显示</span>`}<span>${esc(range(c))}</span><span>排序 ${c.sort}</span></div>
        </div>
        <div class="acts">
          <button class="sm" data-edit="${c.id}">编辑</button>
          <button class="sm" data-toggle="${c.id}">${c.published ? "隐藏" : "显示"}</button>
          <button class="sm danger" data-del="${c.id}">删除</button>
        </div>
      </div>`;
    }).join("");
  }
  $("#campList").onclick = async (e) => {
    const b = e.target.closest("button"); if (!b) return;
    const find = (id) => state.camps.find((c) => c.id === id);
    if (b.dataset.edit) openEditor(find(b.dataset.edit));
    if (b.dataset.toggle) {
      const c = find(b.dataset.toggle);
      try { await call("save_camp", { camp: { id: c.id, published: !c.published } }); await load(); toast(c.published ? "已隐藏" : "已显示在网站"); } catch (err) { toast(err.message); }
    }
    if (b.dataset.del) {
      const c = find(b.dataset.del);
      if (!confirm(`删除「${c.title}」？此操作无法撤销。`)) return;
      try { await call("delete_camp", { id: c.id }); await load(); toast("已删除"); } catch (err) { toast(err.message); }
    }
  };
  $("#newCamp").onclick = () => openEditor(null);
  $("#backBtn").onclick = $("#cancelBtn").onclick = () => show("camps");

  function setCover(url) {
    editing.image_url = url || "";
    $("#coverPv").innerHTML = url ? `<img src="${esc(url)}" alt="">` : "未选择";
  }
  function renderGal() {
    $("#gal").innerHTML = (editing.gallery || []).map((u, i) => `<div class="g"><img src="${esc(u)}" alt=""><button type="button" data-rm="${i}" aria-label="移除">×</button></div>`).join("");
  }
  $("#gal").onclick = (e) => { const b = e.target.closest("[data-rm]"); if (b) { editing.gallery.splice(+b.dataset.rm, 1); renderGal(); } };

  function openEditor(c) {
    editing = c ? { ...c, gallery: [...(c.gallery || [])] } : { status: "open", published: true, sort: 0, gallery: [], highlights: [] };
    $("#editTitle").textContent = c ? "编辑营期" : "新增营期";
    $("#fTitle").value = editing.title || "";
    $("#fTitleEn").value = editing.title_en || "";
    $("#fStart").value = editing.start_date || "";
    $("#fEnd").value = editing.end_date || "";
    $("#fLoc").value = editing.location || "";
    $("#fAges").value = editing.ages || "";
    $("#fPrice").value = editing.price || "";
    $("#fStatus").value = editing.status || "open";
    $("#fSummary").value = editing.summary || "";
    $("#fFormat").value = editing.format || "";
    $("#fIncludes").value = editing.includes || "";
    $("#fService").value = editing.service_fee || "";
    $("#fHl").value = (editing.highlights || []).join("\n");
    $("#fSort").value = editing.sort ?? 0;
    $("#fPub").checked = editing.published !== false;
    $("#campMsg").textContent = "";
    setCover(editing.image_url);
    renderGal();
    show("edit");
  }

  $("#campForm").onsubmit = async (e) => {
    e.preventDefault();
    const m = $("#campMsg");
    const camp = {
      id: editing.id,
      title: $("#fTitle").value.trim(),
      title_en: $("#fTitleEn").value.trim(),
      start_date: $("#fStart").value,
      end_date: $("#fEnd").value,
      location: $("#fLoc").value.trim(),
      ages: $("#fAges").value.trim(),
      price: $("#fPrice").value.trim(),
      status: $("#fStatus").value,
      summary: $("#fSummary").value.trim(),
      format: $("#fFormat").value.trim(),
      includes: $("#fIncludes").value.trim(),
      service_fee: $("#fService").value.trim(),
      highlights: $("#fHl").value.split("\n"),
      sort: parseInt($("#fSort").value, 10) || 0,
      published: $("#fPub").checked,
      image_url: editing.image_url || "",
      gallery: editing.gallery || [],
    };
    if (camp.start_date && camp.end_date && camp.end_date < camp.start_date) return msg(m, "结束日期早于开始日期。");
    msg(m, "保存中…", true);
    try {
      await call("save_camp", { camp });
      await load();
      toast("营期已保存");
      show("camps");
    } catch (err) { msg(m, err.message); }
  };

  // ---------- image upload ----------
  function readAsDataURL(blob) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(blob); }); }
  async function shrink(file, max = 1800) {
    if (file.type === "image/gif") return file;
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
      const s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
      const cv = document.createElement("canvas");
      cv.width = Math.round(img.naturalWidth * s); cv.height = Math.round(img.naturalHeight * s);
      const cx = cv.getContext("2d");
      const png = file.type === "image/png" && max <= 800; // keep QR codes crisp
      if (!png) { cx.fillStyle = "#fff"; cx.fillRect(0, 0, cv.width, cv.height); }
      cx.drawImage(img, 0, 0, cv.width, cv.height);
      return await new Promise((res) => cv.toBlob(res, png ? "image/png" : "image/jpeg", 0.86));
    } finally { URL.revokeObjectURL(url); }
  }
  async function upload(file, max) {
    const blob = await shrink(file, max);
    const data = (await readAsDataURL(blob)).split(",")[1];
    const { url } = await call("upload", { type: blob.type, data });
    return url;
  }
  $("#coverFile").onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    $("#coverPv").textContent = "上传中…";
    try { setCover(await upload(f)); } catch (err) { setCover(editing.image_url); toast(err.message); }
    e.target.value = "";
  };
  $("#coverClear").onclick = () => setCover("");
  $("#galFile").onchange = async (e) => {
    const files = [...e.target.files].slice(0, 12 - (editing.gallery || []).length);
    for (const f of files) {
      toast("上传中…");
      try { editing.gallery.push(await upload(f, 1400)); renderGal(); } catch (err) { toast(err.message); }
    }
    e.target.value = "";
  };

  // ---------- socials ----------
  let qrUrl = "";
  function setQr(u) { qrUrl = u || ""; $("#qrPv").innerHTML = qrUrl ? `<img src="${esc(qrUrl)}" alt="">` : "无"; }
  function fillSocial() {
    const s = state.settings || {};
    $("#sRn").value = s.rednote_id || "";
    $("#sRnUrl").value = s.rednote_url || "";
    $("#sWx").value = s.wechat || "";
    $("#sIg").value = s.instagram || "";
    $("#sFb").value = s.facebook || "";
    $("#sEmail").value = s.email || "";
    setQr(s.wechat_qr);
  }
  $("#qrFile").onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    $("#qrPv").textContent = "上传中…";
    try { setQr(await upload(f, 800)); } catch (err) { setQr(qrUrl); toast(err.message); }
    e.target.value = "";
  };
  $("#qrClear").onclick = () => setQr("");
  $("#socialForm").onsubmit = async (e) => {
    e.preventDefault();
    const m = $("#socialMsg");
    const settings = {
      ...state.settings,
      rednote_id: $("#sRn").value, rednote_url: $("#sRnUrl").value,
      wechat: $("#sWx").value, wechat_qr: qrUrl,
      instagram: $("#sIg").value, facebook: $("#sFb").value, email: $("#sEmail").value,
    };
    msg(m, "保存中…", true);
    try { const d = await call("save_settings", { settings }); state.settings = d.settings; msg(m, "已保存，网站会在约 30 秒内更新。", true); } catch (err) { msg(m, err.message); }
  };

  // ---------- passcode ----------
  $("#pinForm").onsubmit = async (e) => {
    e.preventDefault();
    const m = $("#pinMsg");
    if ($("#nPin").value !== $("#nPin2").value) return msg(m, "两次密码不一致。");
    try {
      await call("change_pin", { new_pin: $("#nPin").value });
      pin = $("#nPin").value;
      try { sessionStorage.setItem("se_pin", pin); } catch {}
      e.target.reset();
      msg(m, "密码已更新。", true);
    } catch (err) { msg(m, err.message); }
  };

  boot();
})();
