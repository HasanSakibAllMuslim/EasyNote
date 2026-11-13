import * as S from "./store.js";
import { Editor, INSERT_SIZES } from "./editor.js";
import { drawObject } from "./render.js";

// Heavy PDF libraries load only when a PDF is actually used (faster start).
let _pdfjs;
function pdfjs() {
  return (_pdfjs ||= import("https://cdn.jsdelivr.net/npm/pdfjs-dist@4.7.76/build/pdf.min.mjs").then((lib) => {
    lib.GlobalWorkerOptions.workerSrc = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.7.76/build/pdf.worker.min.mjs";
    return lib;
  }));
}
const openPdf = async (bytes) => (await pdfjs()).getDocument({ data: bytes.slice() }).promise;
let _pdflib;
function pdfLib() {
  return (_pdflib ||= new Promise((res, rej) => {
    if (window.PDFLib) return res(window.PDFLib);
    const s = document.createElement("script"); s.src = "https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js";
    s.onload = () => res(window.PDFLib); s.onerror = () => { _pdflib = null; rej(new Error("Couldn't load the PDF tools. Check your internet.")); };
    document.head.appendChild(s);
  }));
}
// warm the PDF reader in the background once the page is idle
setTimeout(() => (window.requestIdleCallback || ((f) => f()))(() => pdfjs().catch(() => {})), 3000);

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

// ---------- icons ----------
const P = {
  pen: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  hl: '<path d="m9 11-6 6v3h9l3-3"/><path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"/>',
  laser: '<path d="M3.5 20.5 13 11"/><path d="m11 9 4 4"/><circle cx="17" cy="7" r="1.6" fill="currentColor"/><path d="M17 2.5v1.5M21.5 7H20M20.2 3.8l-1 1M20.2 10.2l-1-1M13.8 3.8l1 1"/>',
  eraser: '<path d="m7 21-4.3-4.3a1 1 0 0 1 0-1.4l10-10a1 1 0 0 1 1.4 0l5.6 5.6a1 1 0 0 1 0 1.4L11 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/>',
  cursor: '<path d="m4 4 7.07 17 2.51-7.39L21 11.07Z"/>',
  shapes: '<rect x="3" y="13" width="8" height="8" rx="1"/><circle cx="17" cy="17" r="4"/><path d="M12 3 7 11h10Z"/>',
  text: '<path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/>',
  hand: '<path d="M18 11V6a2 2 0 0 0-4 0v5"/><path d="M14 10V4a2 2 0 0 0-4 0v6"/><path d="M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.9-6-2.4l-3.6-3.6a2 2 0 0 1 2.8-2.8L7 15"/>',
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
  redo: '<path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>',
  trash: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  left: '<path d="m15 18-6-6 6-6"/>', right: '<path d="m9 18 6-6-6-6"/>', up: '<path d="m18 15-6-6-6 6"/>', down: '<path d="m6 9 6 6 6-6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>', x: '<path d="M18 6 6 18M6 6l12 12"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  home: '<path d="m3 10 9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/><path d="M9 22V12h6v10"/>',
  cloud: '<path d="M17.5 19H9a7 7 0 1 1 6.7-9h1.8a4.5 4.5 0 1 1 0 9Z"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
  min: '<path d="M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3M16 21v-3a2 2 0 0 1 2-2h3"/>',
  book: '<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>',
  chart: '<path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M7 16v-4M12 16V8M17 16v-7"/>',
  wallet: '<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  settings: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
  refresh: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
  crown: '<path d="M11.56 3.27a.5.5 0 0 1 .88 0l2.95 5.6a1 1 0 0 0 1.52.29l4.27-3.66a.5.5 0 0 1 .82.52l-2.83 10.25a1 1 0 0 1-.96.73H5.8a1 1 0 0 1-.96-.73L2.02 6.02a.5.5 0 0 1 .82-.52l4.27 3.66a1 1 0 0 0 1.52-.29z"/><path d="M5 21h14"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
  shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
  max: '<path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><path d="M12 18v-6M9 15l3-3 3 3"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>',
  copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  fill: '<path d="m19 11-8-8-8.6 8.6a2 2 0 0 0 0 2.8l5.2 5.2c.8.8 2 .8 2.8 0Z"/><path d="m5 2 5 5"/><path d="M2 13h15"/><path d="M22 20a2 2 0 1 1-4 0c0-1.6 1.7-2.4 2-4 .3 1.6 2 2.4 2 4Z"/>',
  pencil: '<path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/>',
  marker: '<path d="m15 4 5 5"/><path d="M13 6 4 15l-1 6 6-1 9-9"/><path d="m3 21 4-4"/>',
  brush: '<path d="M9.06 11.9 17.1 3.86a2.9 2.9 0 1 1 4.1 4.1l-8.04 8.04"/><path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 0 0-3-3.02z"/>',
  dash: '<path d="M3 21 6 18M9 15l3-3M15 9l3-3M20 4l1-1" />',
};
const icon = (n) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${P[n] || ""}</svg>`;
const paintIcons = (root = document) => $$("i[data-icon]", root).forEach((el) => (el.innerHTML = icon(el.dataset.icon)));
paintIcons();

// ---------- screens ----------
function show(id) { $$(".screen").forEach((s) => s.classList.toggle("hidden", s.id !== id)); }
function busy(text) { $("#busy").classList.toggle("hidden", !text); if (text) $("#busy-text").textContent = text; }
let toastT;
function toast(msg, ms = 2600) { const t = $("#toast"); t.textContent = msg; t.classList.remove("hidden"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.add("hidden"), ms); }
// Full screen turns on/off only from the full-screen button (or F / opening a note).
// Tapping the board never touches full screen, so the browser never shows its exit prompt mid-class.
// Installed as an app (Add to Home Screen) it is always full screen and this does nothing.
const standalone = matchMedia("(display-mode: fullscreen), (display-mode: standalone)").matches || navigator.standalone;
const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement;
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
let iosHintShown = false;
function fullscreen(on) {
  if (standalone) return;
  if (isIOS) {
    // Safari's own full screen adds an ✕ and drops out on a swipe; the Home Screen app has neither.
    if (on === undefined || !iosHintShown) {
      iosHintShown = true;
      if (on === undefined || !sessionStorage.getItem("tn-ios-hint")) {
        try { sessionStorage.setItem("tn-ios-hint", "1"); } catch {}
        dialog({ msg: "For a true full screen on iPad, open EasyNote as an app:\n\n1. Tap the Share button (□↑) in Safari\n2. Tap \"Add to Home Screen\"\n3. Open EasyNote from your Home Screen\n\nIt opens full screen every time, with no ✕ button, and it never drops out.", ok: "Got it", cancel: null });
      }
    }
    return;
  }
  const want = on ?? !fsEl(), el = document.documentElement;
  if (want && !fsEl()) {
    const p = (el.requestFullscreen || el.webkitRequestFullscreen)?.call(el, { navigationUI: "hide" });
    p?.then?.(lockKeys).catch(() => {});
  } else if (!want && fsEl()) {
    navigator.keyboard?.unlock?.();
    (document.exitFullscreen || document.webkitExitFullscreen)?.call(document)?.catch?.(() => {});
  }
}
// Chrome/Edge: Esc no longer exits full screen (only the button does).
function lockKeys() { navigator.keyboard?.lock?.(["Escape"]).catch(() => {}); }

// In-app dialogs (browser alert/confirm/prompt would throw you out of full screen).
function dialog({ msg, input, ok = "OK", cancel = "Cancel", danger }) {
  return new Promise((res) => {
    const m = $("#dlg"), inp = $("#dlg-input"), okB = $("#dlg-ok"), cB = $("#dlg-cancel");
    $("#dlg-msg").textContent = msg; okB.textContent = ok;
    okB.className = "btn " + (danger ? "danger-solid" : "primary");
    cB.classList.toggle("hidden", cancel === null); cB.textContent = cancel || "";
    inp.classList.toggle("hidden", input == null); inp.value = input ?? "";
    m.classList.remove("hidden");
    setTimeout(() => (input != null ? (inp.focus(), inp.select()) : okB.focus()), 0);
    const done = (v) => { m.classList.add("hidden"); $("#dlg-form").onsubmit = cB.onclick = m.onkeydown = null; res(v); };
    $("#dlg-form").onsubmit = (e) => { e.preventDefault(); done(input != null ? inp.value : true); };
    cB.onclick = () => done(input != null ? null : false);
    m.onkeydown = (e) => { e.stopPropagation(); if (e.key === "Escape") done(input != null ? null : false); };
  });
}
const uiAlert = (msg) => dialog({ msg, cancel: null });
const uiConfirm = (msg, ok = "Delete") => dialog({ msg, ok, danger: true });
const uiPrompt = (msg, def) => dialog({ msg, input: def });

// ---------- auth ----------
let user = null;
S.onUser(async (u) => {
  user = u;
  if (!u) { show("scr-auth"); return; }
  S.setUid(u.uid);
  show("scr-loading");
  try {
    const prof = await S.getProfile();
    if (!prof) {
      $("#su-photo").src = u.photoURL || ""; $("#su-email").textContent = u.email; $("#su-name").value = u.displayName || "";
      show("scr-signup"); return;
    }
    S.touchLogin(); profile = await S.ensureSub(prof); enterLibrary(profile);
  } catch (e) {
    console.error(e); show("scr-auth");
    $("#auth-err").textContent = "Couldn't reach the database: " + e.message;
  }
});
$("#btn-google").onclick = async () => {
  $("#auth-err").textContent = "";
  try { await S.googleSignIn(); } catch (e) { if (e.code !== "auth/popup-closed-by-user") $("#auth-err").textContent = e.message; }
};
$("#signup-form").onsubmit = async (e) => {
  e.preventDefault(); busy("Creating your account…");
  try { profile = await S.createProfile(user, { name: $("#su-name").value.trim(), phone: $("#su-phone").value.replace(/\s|-/g, ""), role: $("#su-role").value }); enterLibrary(profile); }
  catch (err) { uiAlert(err.message); }
  busy(null);
};
$("#su-cancel").onclick = () => S.logout();
$("#btn-logout").onclick = () => S.logout();

// ---------- subscription ----------
let profile = null;
const isAdmin = () => user?.email === S.ADMIN_EMAIL;
const subLeft = () => (isAdmin() ? Infinity : (profile?.subEnd?.toMillis?.() ?? 0) - Date.now());
const expired = () => subLeft() <= 0;
function fmtLeft(ms) {
  const m = Math.floor(ms / 60000), d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), mm = m % 60;
  return `${d} day${d === 1 ? "" : "s"} ${h} hr ${mm} min left`;
}
function tickSub() {
  if (!user || !profile) return;
  const left = subLeft();
  const txt = isAdmin() ? "Admin · unlimited" : left > 0 ? fmtLeft(left) : "Subscription ended";
  const cls = "sub-badge" + (isAdmin() ? "" : left <= 0 ? " over" : left < 864e5 ? " warn" : "");
  for (const id of ["#sub-drawer"]) { const b = $(id); b.textContent = txt; b.className = cls; b.title = isAdmin() ? "" : "Ends " + new Date(profile.subEnd.toMillis()).toLocaleString(); }
  // Upgrade only shows when 30 days or less are left (never for admin).
  const showUp = !isAdmin() && left <= 30 * 864e5;
  $("#btn-upgrade").classList.toggle("hidden", !showUp);
  $(".upgrade-item").classList.toggle("hidden", !showUp);
  $("#scr-library").classList.toggle("locked", expired());
  $("#expired-banner").classList.toggle("hidden", !expired());
  // Ran out while a note is open: save what we have and go back to the list.
  if (expired() && nb && !$("#scr-editor").classList.contains("hidden") && !tickSub.kicked) {
    tickSub.kicked = true;
    flush().finally(() => { nb = null; enterLibrary(); uiAlert("Your subscription has ended. You can still download your notes as PDF."); tickSub.kicked = false; });
  }
}
setInterval(tickSub, 10000);
function blockedIfExpired() {
  if (!expired()) return false;
  uiAlert("Your subscription has ended.\nYou can still download your notes, but you can't create or open them until it's extended.");
  return true;
}

// ---------- library ----------
let notebooks = [];
async function enterLibrary(prof) {
  if (prof) {
    $("#me-name").textContent = prof.name || user.displayName;
    $("#me-email").textContent = user.email || "";
    $("#me-phone").textContent = prof.phone || "";
    $("#me-photo").src = $("#me-photo-top").src = user.photoURL || "assets/user-avatar.svg";
  }
  $("#btn-admin").classList.toggle("hidden", !isAdmin());
  show("scr-library"); tickSub();
  maybeShowGuide(user.uid);
  try { notebooks = await S.listNotebooks(); } catch (e) { toast("Couldn't load notes: " + e.message); notebooks = []; }
  const g = $("#nb-grid"); g.innerHTML = "";
  $("#nb-empty").classList.toggle("hidden", notebooks.length > 0);
  for (const nb of notebooks) {
    const el = document.createElement("div"); el.className = "nb";
    const when = nb.updatedAt?.toDate ? nb.updatedAt.toDate().toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "";
    el.innerHTML = `<div class="thumb"></div><div class="meta"><b></b><span>${nb.pageOrder?.length || 0} pages · ${when}</span></div><div class="card-acts"><button class="ren" title="Rename">${icon("pencil")}</button><button class="dl" title="Download as PDF">${icon("download")}</button><button class="del" title="Delete">${icon("trash")}</button></div>`;
    $("b", el).textContent = nb.title || "Untitled";
    if (nb.thumb) $(".thumb", el).style.backgroundImage = `url(${nb.thumb})`;
    el.onclick = () => openNotebook(nb.id);
    $(".dl", el).onclick = async (e) => {
      e.stopPropagation(); busy("Opening…");
      try {
        const { meta, pages, pdfBytes: bytes } = await S.loadNotebook(nb.id);
        const pdf = bytes ? await openPdf(bytes) : null;
        // reuse the editor's page renderer without opening the editor
        const renderer = { pdf, pageCanvas: Editor.prototype.pageCanvas };
        await exportPdf(meta.title, pages, bytes, renderer);
      } catch (err) { console.error(err); uiAlert("Download failed: " + err.message); }
      busy(null);
    };
    $(".ren", el).onclick = async (e) => {
      e.stopPropagation();
      const v = await uiPrompt("Rename note", nb.title || "Untitled"); if (v == null) return;
      const title = v.trim() || "Untitled"; if (title === nb.title) return;
      nb.title = title; $("b", el).textContent = title;
      try { await S.saveMeta(nb.id, { title }); toast("Renamed"); } catch (err) { uiAlert("Couldn't rename: " + err.message); }
    };
    $(".del", el).onclick = async (e) => {
      e.stopPropagation();
      if (!(await uiConfirm(`Delete "${nb.title}" permanently?`))) return;
      busy("Deleting…"); try { await S.deleteNotebook(nb.id, nb); } catch (err) { uiAlert(err.message); } busy(null); enterLibrary();
    };
    g.appendChild(el);
  }
}
// Blank pages take the shape of this screen so the board fills it edge to edge.
const screenH = () => Math.round((1600 * Math.min(screen.width, screen.height)) / Math.max(screen.width, screen.height));
const blankPage = (bg = "black") => ({ id: S.newId(), w: 1600, h: screenH(), bg, pdfPage: null, objects: [] });

async function newBlank(bg) {
  if (blockedIfExpired()) return;
  busy("Creating…");
  try { const id = await S.createNotebook({ title: "Untitled note " + new Date().toLocaleDateString(), pages: [blankPage(bg)] }); busy(null); openNotebook(id); }
  catch (e) { busy(null); uiAlert(e.message); }
}
$("#new-black").onclick = () => newBlank("black");
$("#new-white").onclick = () => newBlank("white");
$("#new-pdf").onclick = () => { if (!blockedIfExpired()) $("#pdf-input").click(); };
$("#btn-full-lib").onclick = () => fullscreen();
// Label says what the button will do: enter or exit full screen.
const syncFullLabel = () => {
  const on = !!(document.fullscreenElement || document.webkitFullscreenElement);
  $("#full-lib-label").textContent = $("#full-top-label").textContent = on ? "Exit full screen" : "Full screen";
  $("#btn-full-lib i").innerHTML = $("#btn-full-top i").innerHTML = icon(on ? "min" : "max");
};
document.addEventListener("fullscreenchange", syncFullLabel);
document.addEventListener("webkitfullscreenchange", syncFullLabel);
if (standalone) { $("#btn-full-lib").classList.add("hidden"); $("#btn-full-top").classList.add("hidden"); }
$("#btn-full-top").onclick = () => fullscreen();
$("#pdf-input").onchange = async (e) => {
  const f = e.target.files[0]; e.target.value = ""; if (!f) return;
  busy("Reading PDF…");
  try {
    const bytes = new Uint8Array(await f.arrayBuffer());
    const doc = await openPdf(bytes);
    const pages = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const vp = (await doc.getPage(i)).getViewport({ scale: 1 });
      pages.push({ id: S.newId(), w: 1600, h: Math.round((1600 * vp.height) / vp.width), bg: "pdf", pdfPage: i, objects: [] });
    }
    const id = await S.createNotebook({
      title: f.name.replace(/\.pdf$/i, ""), pages, pdfBytes: bytes,
      onProgress: (p) => busy(`Uploading PDF to the cloud… ${Math.round(p * 100)}%`)
    });
    busy(null); openNotebook(id);
  } catch (err) { busy(null); console.error(err); uiAlert("Couldn't open this PDF: " + err.message); }
};

// ---------- editor ----------
let nb = null, pdfBytes = null;
const editor = new Editor($("#stage"), {
  onChange: (p) => markDirty(p),
  onPage: () => updatePageUI(),
  onSelection: (b) => placeSelbar(b),
  onToolDone: () => {}, // stay on the shape tool until another tool is picked
});
window.editor = editor;

async function openNotebook(id) {
  if (blockedIfExpired()) return;
  busy("Opening…");
  try {
    const { meta, pages, pdfBytes: bytes } = await S.loadNotebook(id);
    nb = meta; pdfBytes = bytes;
    const pdf = bytes ? await openPdf(bytes) : null;
    if (!pages.length) pages.push(blankPage());
    show("scr-editor");
    $("#nb-title").value = meta.title || "Untitled";
    editor.load(pages, pdf);
    editor.go(0);
    setTool("pen");
    setStatus("ok");
    fullscreen(true);
  } catch (e) { console.error(e); uiAlert("Couldn't open: " + e.message); }
  busy(null);
}

$("#btn-home").onclick = async () => {
  if (editor.textEl) editor.finishText();
  await flush(true);
  nb = null; enterLibrary();
};
$("#nb-title").onchange = (e) => { nb.title = e.target.value.trim() || "Untitled"; S.saveMeta(nb.id, { title: nb.title }).catch(() => {}); };
$("#nb-title").onkeydown = (e) => { e.stopPropagation(); if (e.key === "Enter") e.target.blur(); };

// ---------- autosave ----------
const dirty = new Set(); let saveTimer = null, metaDirty = false, thumbDirty = false, inflight = 0;
function setStatus(s) {
  const el = $("#save-status"); el.className = "save " + s;
  $("span", el).textContent = s === "ok" ? "Saved" : s === "busy" ? "Saving…" : s === "offline" ? "Offline: kept on this device" : "Not saved";
}
function markDirty(p) {
  dirty.add(p.id); if (editor.pages[0] === p) thumbDirty = true;
  setStatus(navigator.onLine ? "busy" : "offline");
  // Save once you pause (1.5 s), and only when the browser is idle, so saving never competes with your pen.
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => (window.requestIdleCallback ? requestIdleCallback(() => flush(), { timeout: 2000 }) : flush()), 1500);
}
let lastThumb = 0;
async function flush(force) {
  clearTimeout(saveTimer);
  if (!nb) return;
  // never do save work while the pen is on the board
  if (!force && editor.downAt) { saveTimer = setTimeout(flush, 400); return; }
  const nbId = nb.id, jobs = [];
  for (const id of dirty) {
    const p = editor.pages.find((x) => x.id === id); if (!p) continue;
    try { jobs.push(S.savePage(nbId, p)); } catch (e) { toast(e.message, 5000); setStatus("bad"); }
  }
  dirty.clear();
  const doThumb = thumbDirty && (force || Date.now() - lastThumb > 20000);
  if (doThumb || metaDirty) {
    const data = { pageOrder: editor.pages.map((p) => p.id) };
    if (doThumb) { lastThumb = Date.now(); thumbDirty = false; try { data.thumb = (await editor.pageCanvas(editor.pages[0], 320)).toDataURL("image/jpeg", 0.6); } catch {} }
    metaDirty = false; jobs.push(S.saveMeta(nbId, data));
  }
  if (!jobs.length) return;
  inflight++;
  if (!navigator.onLine) setStatus("offline");
  try { await Promise.all(jobs); } catch (e) { console.error(e); setStatus("bad"); toast("Save failed: " + e.message, 5000); inflight--; return; }
  inflight--;
  if (!inflight && !dirty.size && nb?.id === nbId) setStatus("ok");
}
addEventListener("online", () => { if (nb && !dirty.size) setStatus(inflight ? "busy" : "ok"); });
addEventListener("offline", () => nb && setStatus("offline"));
addEventListener("pagehide", () => flush());
document.addEventListener("visibilitychange", () => document.hidden && flush());
addEventListener("beforeunload", (e) => { if (dirty.size) { flush(); e.preventDefault(); } });

// Pop-ups sit just above the bottom dock, whatever its height.
new ResizeObserver(([e]) => $("#scr-editor").style.setProperty("--dock-h", e.target.offsetHeight + "px")).observe($("#dock"));

// iPad: inside a note, nothing except text boxes may start a selection (it pops up Copy/Translate and eats the stroke).
const editableTarget = (t) => t.closest?.("input, textarea, [contenteditable]");
document.addEventListener("selectstart", (e) => { if (boardOpen() && !editableTarget(e.target)) e.preventDefault(); });
document.addEventListener("contextmenu", (e) => { if (boardOpen() && !editableTarget(e.target)) e.preventDefault(); });
document.addEventListener("selectionchange", () => {
  if (!boardOpen() || editableTarget(document.activeElement || document.body)) return;
  const s = getSelection(); if (s && s.rangeCount && !s.isCollapsed) s.removeAllRanges();
});

// ---------- tools ----------
const COLORS = ["#ffffff", "#000000", "#ff3b30", "#ff9500", "#ffcc00", "#34c759", "#00c7be", "#0a84ff", "#5e5ce6", "#bf5af2", "#ff2d92", "#a2845e", "#8e8e93", "#1f7a3a", "#003a8c"];
const HL_COLORS = ["#ffe94d", "#7dff6b", "#5ee7ff", "#ff8ad8", "#ffb347", "#b18cff", "#ff5e5e"];
const PEN_TYPES = [["pen", "Pen", "pen"], ["pencil", "Pencil", "pencil"], ["marker", "Marker", "marker"], ["brush", "Brush", "brush"], ["dash", "Dashed", "dash"]];

function swatches(el, colors, get, set, custom = true) {
  el.innerHTML = "";
  for (const c of colors) {
    const b = document.createElement("button"); b.className = "sw"; b.style.background = c; b.dataset.c = c;
    b.onclick = () => { set(c); refresh(); }; el.appendChild(b);
  }
  if (custom) {
    const b = document.createElement("label"); b.className = "sw custom"; b.title = "Any color";
    b.innerHTML = '<input type="color" />'; $("input", b).oninput = (e) => { set(e.target.value); refresh(); }; el.appendChild(b);
  }
  const refresh = () => { $$(".sw", el).forEach((s) => s.classList.toggle("active", s.dataset.c === get())); syncUI(); };
  refresh(); el._refresh = refresh;
}

function syncUI() {
  $("#pen-dot").style.background = editor.pen.c; $("#hl-dot").style.background = editor.hl.c;
  const sp = $("#pen-size-prev"); sp.style.setProperty("--s", editor.pen.sw + "px"); sp.style.setProperty("--c", editor.pen.c);
  const hp = $("#hl-size-prev"); hp.style.setProperty("--s", editor.hl.sw + "px"); hp.style.setProperty("--c", editor.hl.c);
  $$(".pen-type").forEach((b) => b.classList.toggle("active", b.dataset.t === editor.pen.type));
  $("#text-size-v").textContent = editor.textSize;
  try { localStorage.setItem("tn-tools", JSON.stringify({ pen: editor.pen, hl: editor.hl, eraser: editor.eraser, sa: editor.shapeAssist, sh: editor.smartHl, ts: editor.textSize })); } catch {}
}
try {
  const s = JSON.parse(localStorage.getItem("tn-tools") || "null");
  if (s) { Object.assign(editor.pen, s.pen); Object.assign(editor.hl, s.hl); editor.eraser = s.eraser || 30; editor.shapeAssist = s.sa !== false; editor.smartHl = s.sh !== false; editor.textSize = s.ts || 40; }
} catch {}
editor.textSize ||= 40;

$("#pen-types").innerHTML = PEN_TYPES.map(([t, n, i]) => `<button class="pen-type" data-t="${t}">${icon(i)}${n}</button>`).join("");
$$(".pen-type").forEach((b) => (b.onclick = () => { editor.pen.type = b.dataset.t; syncUI(); }));
swatches($("#pen-colors"), COLORS, () => editor.pen.c, (c) => (editor.pen.c = c));
swatches($("#text-colors"), COLORS, () => editor.pen.c, (c) => (editor.pen.c = c));
swatches($("#hl-colors"), HL_COLORS, () => editor.hl.c, (c) => (editor.hl.c = c));
const range = (id, get, set) => { const r = $(id); r.value = get(); r.oninput = () => { set(+r.value); syncUI(); }; };
range("#pen-size", () => editor.pen.sw, (v) => (editor.pen.sw = v));
range("#hl-size", () => editor.hl.sw, (v) => (editor.hl.sw = v));
range("#eraser-size", () => editor.eraser, (v) => (editor.eraser = v));
range("#text-size", () => editor.textSize, (v) => (editor.textSize = v));
$("#shape-assist").checked = editor.shapeAssist; $("#shape-assist").onchange = (e) => { editor.shapeAssist = e.target.checked; syncUI(); };
$("#smart-hl").checked = editor.smartHl; $("#smart-hl").onchange = (e) => { editor.smartHl = e.target.checked; syncUI(); };
$("#fill-shapes").onchange = (e) => (editor.fillShapes = e.target.checked);
$("#eraser-clear").onclick = async () => { closePops(); if (await uiConfirm("Clear everything on this page?", "Clear")) editor.clearPage(); };
$("#btn-clear").onclick = async () => { if (await uiConfirm("Clear everything on this page?", "Clear")) editor.clearPage(); };
syncUI();

const POPS = { pen: "#pop-pen", hl: "#pop-hl", eraser: "#pop-eraser", insert: "#pop-shapes", text: "#pop-text" };
function closePops() { $$(".pop").forEach((p) => p.classList.add("hidden")); }
function setTool(t) {
  if (editor.textEl) editor.finishText();
  editor.tool = t; if (t !== "select") editor.setSel([]);
  $("#scr-editor").dataset.tool = t;
  $$(".tool[data-tool]").forEach((b) => b.classList.toggle("active", b.dataset.tool === t));
  editor.drawLive();
}
$$(".tool[data-tool]").forEach((b) => (b.onclick = () => {
  const t = b.dataset.tool, pop = POPS[t];
  if (t === "insert") { const open = $(pop).classList.contains("hidden"); closePops(); if (open) $(pop).classList.remove("hidden"); return; }
  if (editor.tool === t && pop) { const open = $(pop).classList.contains("hidden"); closePops(); if (open) $(pop).classList.remove("hidden"); return; }
  closePops(); setTool(t);
}));
$("#stage").addEventListener("pointerdown", () => closePops(), true);
$("#btn-undo").onclick = () => editor.undo();
$("#btn-redo").onclick = () => editor.redo();
$("#btn-zoom-in").onclick = () => editor.zoom(1.25);
$("#btn-zoom-out").onclick = () => editor.zoom(0.8);
$("#btn-fit").onclick = () => { const m = editor.curFit === "page" && Math.abs(editor.view.s - Math.min(editor.W / editor.page.w, editor.H / editor.page.h)) < 1e-3 ? "width" : "page"; editor.resetZoom(m); $("#btn-fit").textContent = m === "page" ? "Fit" : "Width"; };
$("#btn-full").onclick = () => fullscreen();

// ---------- ready-made shapes ----------
const GROUPS = [
  ["Lines", [["line", "Line"], ["dline", "Dashed"], ["dotline", "Dotted"], ["arrow", "Arrow"], ["darrow", "Both ways"]]],
  ["Shapes", [["rect", "Rectangle"], ["rrect", "Rounded"], ["ellipse", "Circle"], ["tri", "Triangle"], ["rtri", "Right triangle"], ["diamond", "Diamond"], ["para", "Parallelogram"], ["trap", "Trapezium"], ["pent", "Pentagon"], ["hex", "Hexagon"], ["star", "Star"], ["barrow", "Block arrow"], ["cloud", "Speech"]]],
  ["Math & graphs", [["axes4", "XY axes"], ["axes1", "1st quadrant"], ["graph", "Graph paper"], ["numline", "Number line"], ["table", "Table"], ["cube", "Cube"], ["cyl", "Cylinder"], ["cone", "Cone"]]],
  ["Logic gates (ICT)", [["g-and", "AND"], ["g-or", "OR"], ["g-not", "NOT"], ["g-nand", "NAND"], ["g-nor", "NOR"], ["g-xor", "XOR"], ["g-xnor", "XNOR"], ["g-buf", "Buffer"], ["truth", "Truth table"]]],
  ["Circuit", [["resistor", "Resistor"], ["battery", "Cell"]]],
  ["Biology", [["b-heart", "Heart"], ["b-lungs", "Lungs"], ["b-cell", "Animal cell"], ["b-pcell", "Plant cell"], ["b-dna", "DNA"], ["b-neuron", "Neuron"],
    ["b-kidney", "Kidney"], ["b-eye", "Eye"], ["b-leaf", "Leaf"], ["b-flower", "Flower"], ["b-bacteria", "Bacteria"], ["b-mito", "Mitochondria"]]],
];
$("#shape-groups").innerHTML = GROUPS.map(([g, items]) => `<div class="shape-group"><h4>${g}</h4><div class="shape-items">${items.map(([k, n]) => `<button class="shape-item" data-k="${k}"><canvas width="120" height="80"></canvas>${n}</button>`).join("")}</div></div>`).join("");
$$(".shape-item").forEach((b) => {
  const k = b.dataset.k, cv = $("canvas", b), ctx = cv.getContext("2d");
  const [dw, dh] = INSERT_SIZES[k] || [240, 180];
  const isLine = ["line", "dline", "dotline", "arrow", "darrow"].includes(k);
  const sc = isLine ? 100 / dw : Math.min(100 / dw, 64 / Math.max(dh, 1));
  const o = isLine ? { t: "line", c: "#dfe5f0", sw: 3 / sc, arrow: k === "arrow" ? 1 : k === "darrow" ? 2 : 0, dash: k === "dline" ? "dash" : k === "dotline" ? "dot" : undefined, pts: [[0, 0], [dw, 0]] }
    : { t: "shape", k, c: "#dfe5f0", sw: 2.5 / sc, x: 0, y: 0, w: dw, h: dh, rows: k === "truth" ? 5 : 3, cols: 3 };
  ctx.translate(60 - (dw * sc) / 2, 40 - (isLine ? 0 : (dh * sc) / 2)); ctx.scale(sc, sc); drawObject(ctx, o);
  b.onclick = async () => {
    if (k === "table") {
      const v = await uiPrompt("Rows × columns (for example 4x3)", `${editor.tableRows || 4}x${editor.tableCols || 4}`); if (!v) return;
      const [r, c] = v.toLowerCase().split(/[x×*, ]+/).map((n) => Math.max(1, Math.min(30, parseInt(n) || 3)));
      editor.tableRows = r; editor.tableCols = c || r;
    }
    editor.insertKind = k; closePops(); setTool("insert");
    $$(".shape-item").forEach((x) => x.classList.toggle("active", x === b));
    toast("Drag on the page to place it, or tap for the default size");
  };
});

// ---------- first-time guide ----------
const GUIDE = [
  ["book", "Welcome to EasyNote", "A smart board for teaching. Here's a quick tour of every tool — it takes about a minute.", [
    "Tap <b>New note</b> for a blank board, or open a <b>PDF</b> to write on it.",
    "Everything saves by itself — on this device straight away, and to the cloud seconds later."]],
  ["pen", "Pen <kbd>P</kbd>", "Write and draw. Tap the pen again to change it.", [
    "Pen, pencil, marker, brush and dashed pens, any colour and size.",
    "<b>Shape assist</b>: rough lines turn straight, rough circles, boxes and triangles turn clean.",
    "With a stylus, your palm and fingers won't draw — one finger moves the page."]],
  ["hl", "Highlighter <kbd>H</kbd>", "See-through ink that sits under your writing.", [
    "On a PDF, swipe across text and the highlight snaps neatly onto the line."]],
  ["laser", "Laser pointer <kbd>L</kbd>", "A glowing red trail that fades away — point at things while you explain without leaving marks."],
  ["eraser", "Eraser <kbd>E</kbd>", "Rub over a stroke to remove it. Tap the eraser again to change its size.", [
    "Pictures are safe from the eraser — select one and delete it instead."]],
  ["cursor", "Select <kbd>V</kbd>", "Tap or drag a box around things to select them.", [
    "Drag to move, pull the corners to resize.",
    "The bar above lets you change colour or thickness, fill, duplicate, delete, or bring to front."]],
  ["shapes", "Shapes <kbd>S</kbd>", "Lines, arrows, polygons, tables, XY axes, graph paper, 3D shapes, logic gates, circuits and biology diagrams.", [
    "Pick a shape, then drag on the page (or just tap for the default size).",
    "The shape stays picked, so you can draw it again and again until you switch tools.",
    "Hold Shift for a perfect square or circle."]],
  ["text", "Text <kbd>T</kbd>", "Tap anywhere on the page to type. Double-tap text later to edit it."],
  ["image", "Pictures", "Tap the picture button to add a photo from your gallery, files or camera.", [
    "It lands in the middle of the screen, ready to move and resize.",
    "On a computer you can also paste a copied picture with Ctrl/⌘ V."]],
  ["hand", "Move and zoom", "Use the hand tool or hold Space to move the page.", [
    "With the hand tool picked, pinch with two fingers to zoom (or use Ctrl/⌘ + / − or the + / − buttons). <b>Fit</b> switches between whole page and full width.",
    "<kbd>F</kbd> or the full-screen button gives you the whole screen for teaching."]],
  ["undo", "Undo and redo", "Made a mistake? Undo with the arrow button or Ctrl/⌘ Z, redo with Ctrl/⌘ ⇧ Z."],
  ["grid", "Pages <kbd>G</kbd>", "The arrows at the bottom change page; <b>+</b> adds a new one.", [
    "On iPad or a tablet, swipe sideways quickly with your finger to go to the next or previous page.",
    "<b>All pages</b> shows every page: reorder, duplicate, add or delete them.",
    "Pick a background there — black, white, grid, lined, dark grid or green board. The <b>+</b> button remembers your choice."]],
  ["download", "Download as PDF", "Download any note with your writing on it — from inside the note or from My notes."],
  ["cloud", "You're all set!", "You can see this tour again any time from the user manual. Happy teaching!", []],
];
let guideI = 0;
function renderGuide() {
  const [ic, title, text, tips = []] = GUIDE[guideI];
  $("#guide-ic").innerHTML = icon(ic);
  $("#guide-title").innerHTML = title; $("#guide-text").innerHTML = text;
  $("#guide-tips").innerHTML = tips.map((t) => `<li>${t}</li>`).join("");
  $("#guide-dots").innerHTML = GUIDE.map((_, i) => `<i class="${i === guideI ? "on" : ""}"></i>`).join("");
  $("#guide-back").style.visibility = guideI ? "visible" : "hidden";
  $("#guide-next").textContent = guideI === GUIDE.length - 1 ? "Start teaching" : guideI === 0 ? "Show me" : "Next";
}
function openGuide() { guideI = 0; renderGuide(); $("#guide").classList.remove("hidden"); }
function closeGuide() { $("#guide").classList.add("hidden"); try { localStorage.setItem("tn-guide-" + guideUid, "1"); } catch {} }
function maybeShowGuide(uid) {
  let seen = false; try { seen = !!localStorage.getItem("tn-guide-" + uid); } catch {}
  if (seen) return;
  guideUid = uid; openGuide();
}
let guideUid = null;
$("#guide-next").onclick = () => { if (guideI < GUIDE.length - 1) { guideI++; renderGuide(); } else closeGuide(); };
$("#guide-back").onclick = () => { if (guideI) { guideI--; renderGuide(); } };
$("#guide-skip").onclick = () => closeGuide();
$("#guide").addEventListener("keydown", (e) => { if (e.key === "ArrowRight") $("#guide-next").click(); if (e.key === "ArrowLeft") $("#guide-back").click(); });
$("#guide-replay").onclick = () => { $$(".modal").forEach((m) => m.id !== "guide" && m.classList.add("hidden")); openGuide(); };

// ---------- pictures ----------
// Shrink to at most 1600px and re-encode, so a page stays well under the cloud's 1 MB per-page limit.
async function loadPicture(file) {
  if (!file || !file.type.startsWith("image/")) return;
  if (!editor.page) return;
  busy("Adding picture…");
  try {
    const url = URL.createObjectURL(file);
    const im = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = url; });
    let max = 1600, src, w, h;
    const png = file.type === "image/png" || file.type === "image/gif" || file.type === "image/webp";
    for (let q = 0.85; ; q -= 0.1) {
      const k = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight));
      w = Math.round(im.naturalWidth * k); h = Math.round(im.naturalHeight * k);
      const c = document.createElement("canvas"); c.width = w; c.height = h;
      c.getContext("2d").drawImage(im, 0, 0, w, h);
      src = c.toDataURL(png && q > 0.8 ? "image/png" : "image/jpeg", q);
      if (src.length < 450000 || max < 500) break;
      if (q < 0.55) { max = Math.round(max * 0.75); q = 0.85; }
    }
    URL.revokeObjectURL(url);
    const pageBytes = JSON.stringify(editor.page.objects).length;
    if (pageBytes + src.length > 900000) { busy(null); toast("This page is too full for another picture — add it on a new page"); return; }
    setTool("select");
    editor.insertImage(src, w, h);
    toast("Picture added — drag to move, corners to resize");
  } catch { toast("Couldn't open that picture"); }
  busy(null);
}
$("#btn-image").onclick = () => { closePops(); $("#image-file").value = ""; $("#image-file").click(); };
$("#image-file").onchange = (e) => loadPicture(e.target.files[0]);
// paste a copied picture straight onto the board
document.addEventListener("paste", (e) => {
  if ($("#scr-editor").classList.contains("hidden") || e.target.closest?.("input,textarea,[contenteditable]")) return;
  const f = [...(e.clipboardData?.files || [])].find((x) => x.type.startsWith("image/"));
  if (f) { e.preventDefault(); loadPicture(f); }
});

// ---------- selection bar ----------
swatches($("#sel-colors"), ["#ffffff", "#000000", "#ff3b30", "#ffcc00", "#34c759", "#0a84ff", "#bf5af2"], () => null, (c) => editor.styleSel({ c }), false);
function placeSelbar(b) {
  const bar = $("#selbar");
  if (!b || editor.drag?.moved || editor.tool !== "select") { bar.classList.add("hidden"); return; }
  bar.classList.remove("hidden");
  const bw = bar.offsetWidth, bh = bar.offsetHeight, W = innerWidth;
  let top = b.y - bh - 14; if (top < 70) top = b.y + b.h + 14;
  bar.style.left = Math.max(8, Math.min(W - bw - 8, b.x + b.w / 2 - bw / 2)) + "px";
  bar.style.top = Math.min(innerHeight - bh - 100, Math.max(70, top)) + "px";
}
$$("[data-sel]").forEach((b) => (b.onclick = () => {
  const a = b.dataset.sel;
  if (a === "del") editor.deleteSel();
  else if (a === "dup") editor.duplicate();
  else if (a === "front") editor.order(true);
  else if (a === "back") editor.order(false);
  else if (a === "fill") { const so = editor.selObjs(); editor.styleSel({ fill: !so.every((o) => o.fill) || undefined }); }
  else {
    const f = a === "thick" ? 1.3 : 1 / 1.3;
    editor.mapSel((o) => (o.t === "text" ? { ...o, size: o.size * f, w: o.w * f, h: o.h * f } : o.k === "hl" ? o : { ...o, sw: Math.max(1, Math.min(80, o.sw * f)) }));
  }
}));

// ---------- pages ----------
function updatePageUI() { $("#pg-count").textContent = `${editor.idx + 1} / ${editor.pages.length}`; }
$("#pg-prev").onclick = () => editor.go(editor.idx - 1);
$("#pg-next").onclick = () => editor.go(editor.idx + 1);
function addPage(bg, at = editor.idx + 1) {
  const cur = editor.page;
  let pref = null; try { pref = localStorage.getItem("tn-addbg"); } catch {}
  bg ||= pref || (cur && cur.bg !== "pdf" ? cur.bg : "black");
  const p = blankPage(bg);
  editor.pages.splice(at, 0, p);
  metaDirty = true; markDirty(p);
  editor.go(at);
  return p;
}
$("#pg-add").onclick = () => addPage();
$("#pg-count").onclick = () => openPages();
$("#pg-all").onclick = () => openPages();
$("#pages-close").onclick = () => $("#pages-view").classList.add("hidden");
$$("[data-addbg]").forEach((b) => (b.onclick = () => { try { localStorage.setItem("tn-addbg", b.dataset.addbg); } catch {} addPage(b.dataset.addbg, editor.idx + 1); openPages(); }));

let thumbObs;
function openPages() {
  closePops();
  const g = $("#pages-grid"); g.innerHTML = "";
  $("#pages-view").classList.remove("hidden");
  thumbObs?.disconnect();
  thumbObs = new IntersectionObserver((ents) => ents.forEach(async (en) => {
    if (!en.isIntersecting) return; thumbObs.unobserve(en.target);
    const p = editor.pages[+en.target.dataset.i]; if (!p) return;
    try { const c = await editor.pageCanvas(p, 320, true, 1); $(".pimg", en.target).replaceChildren(c); } catch {}
  }), { root: g });
  editor.pages.forEach((p, i) => {
    const el = document.createElement("div"); el.className = "pthumb" + (i === editor.idx ? " current" : ""); el.dataset.i = i;
    el.innerHTML = `<div class="pimg"><div class="spinner"></div></div><div class="plabel"><span>Page ${i + 1}</span><div class="pacts">
      <button class="ibtn" data-a="up" title="Move earlier">${icon("left")}</button>
      <button class="ibtn" data-a="down" title="Move later">${icon("right")}</button>
      <button class="ibtn" data-a="copy" title="Duplicate page">${icon("copy")}</button>
      <button class="ibtn" data-a="add" title="Add blank page after">${icon("plus")}</button>
      <button class="ibtn danger" data-a="del" title="Delete page">${icon("trash")}</button></div></div>`;
    el.onclick = (e) => {
      const a = e.target.closest("[data-a]")?.dataset.a;
      if (!a) { $("#pages-view").classList.add("hidden"); editor.go(i); return; }
      e.stopPropagation();
      if (a === "del") deletePage(i);
      else if (a === "add") { addPage(null, i + 1); openPages(); }
      else if (a === "copy") { copyPage(i); openPages(); }
      else movePage(i, a === "up" ? i - 1 : i + 1);
    };
    g.appendChild(el); thumbObs.observe(el);
  });
}
function copyPage(i) {
  const p = JSON.parse(JSON.stringify(editor.pages[i]));
  p.id = S.newId(); (p.objects || []).forEach((o) => (o.id = S.newId()));
  editor.pages.splice(i + 1, 0, p);
  metaDirty = true; thumbDirty = true; markDirty(p);
  editor.go(i + 1);
}
function movePage(i, j) {
  if (j < 0 || j >= editor.pages.length) return;
  const cur = editor.page, [p] = editor.pages.splice(i, 1); editor.pages.splice(j, 0, p);
  editor.idx = editor.pages.indexOf(cur); metaDirty = true; thumbDirty = true; markDirty(cur); updatePageUI(); openPages();
}
async function deletePage(i) {
  const p = editor.pages[i];
  if (!(await uiConfirm(`Delete page ${i + 1}?`))) return;
  if (editor.pages.length === 1) { editor.pages.push(blankPage()); }
  editor.pages.splice(i, 1);
  S.deletePageDoc(nb.id, p.id).catch(() => {});
  dirty.delete(p.id); metaDirty = true; thumbDirty = true; markDirty(editor.pages[0]);
  editor.go(Math.min(editor.idx, editor.pages.length - 1)); updatePageUI();
  if (!$("#pages-view").classList.contains("hidden")) openPages();
}

// ---------- export ----------
$("#btn-export").onclick = () => exportPdf(nb.title, editor.pages, pdfBytes, editor);
async function exportPdf(title, pages, pdfBytes, editor) {
  const { PDFDocument } = await pdfLib();
  busy("Making your PDF…");
  try {
    const out = await PDFDocument.create();
    const src = pdfBytes ? await PDFDocument.load(pdfBytes, { ignoreEncryption: true }) : null;
    const png = async (c) => out.embedPng(new Uint8Array(await (await new Promise((r) => c.toBlob(r, "image/png"))).arrayBuffer()));
    for (let i = 0; i < pages.length; i++) {
      const p = pages[i];
      busy(`Making your PDF… page ${i + 1} of ${pages.length}`);
      if (p.bg === "pdf" && src && !src.getPage(p.pdfPage - 1).getRotation().angle) {
        const [pg] = await out.copyPages(src, [p.pdfPage - 1]); out.addPage(pg);
        if (p.objects.length) {
          const img = await png(await editor.pageCanvas(p, 2400, false));
          const b = pg.getCropBox(); pg.drawImage(img, { x: b.x, y: b.y, width: b.width, height: b.height });
        }
      } else {
        const img = await png(await editor.pageCanvas(p, 2400, true, 1.5));
        const pg = out.addPage([p.w * 0.6, p.h * 0.6]); pg.drawImage(img, { x: 0, y: 0, width: p.w * 0.6, height: p.h * 0.6 });
      }
    }
    const blob = new Blob([await out.save()], { type: "application/pdf" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = (title || "notes") + ".pdf"; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);
  } catch (e) { console.error(e); uiAlert("Export failed: " + e.message); }
  busy(null);
}

// ---------- keyboard ----------
const KEYS = { v: "select", p: "pen", h: "hl", l: "laser", e: "eraser", t: "text" };
addEventListener("keydown", (e) => {
  if (!nb || $("#scr-editor").classList.contains("hidden")) { if (e.key === "f" && !e.target.closest("input,textarea")) fullscreen(true); return; }
  if (e.target.closest("input,textarea,select")) return;
  const mod = e.metaKey || e.ctrlKey, k = e.key.toLowerCase();
  if (mod && k === "z") { e.preventDefault(); e.shiftKey ? editor.redo() : editor.undo(); return; }
  if (mod && k === "y") { e.preventDefault(); editor.redo(); return; }
  if (mod && k === "c") { editor.copySel(); return; }
  if (mod && k === "v") { if (editor.clip) { e.preventDefault(); editor.paste(); } return; } // no board clip: let a copied picture paste
  if (mod && k === "d") { e.preventDefault(); editor.duplicate(); return; }
  if (mod && k === "a") { e.preventDefault(); setTool("select"); editor.setSel(editor.page.objects.map((o) => o.id)); return; }
  if (mod && k === "s") { e.preventDefault(); flush(); toast("Saved to the cloud"); return; }
  if (mod) return;
  if (e.key === " ") { e.preventDefault(); editor.spaceDown = true; return; }
  if (e.key === "Delete" || e.key === "Backspace") { editor.deleteSel(); return; }
  if (e.key === "Escape") { closePops(); $("#pages-view").classList.add("hidden"); editor.setSel([]); return; }
  if (e.key === "ArrowRight" || e.key === "PageDown") { editor.go(editor.idx + 1); return; }
  if (e.key === "ArrowLeft" || e.key === "PageUp") { editor.go(editor.idx - 1); return; }
  if (k === "f") { fullscreen(true); return; }
  if (k === "g") { $("#pages-view").classList.contains("hidden") ? openPages() : $("#pages-view").classList.add("hidden"); return; }
  if (k === "s") { $(".tool[data-tool=insert]").click(); return; }
  if (k === "n") { addPage(); return; }
  if (KEYS[k]) { closePops(); setTool(KEYS[k]); }
});
addEventListener("keyup", (e) => { if (e.key === " ") editor.spaceDown = false; });

// Ctrl/Cmd + plus/minus/0 and Ctrl+scroll never zoom the whole page (it would break the board layout).
// On an open note they zoom the board instead.
const boardOpen = () => nb && !$("#scr-editor").classList.contains("hidden");
addEventListener("keydown", (e) => {
  if (!(e.ctrlKey || e.metaKey)) return;
  const k = e.key, code = e.code;
  const plus = k === "+" || k === "=" || code === "Equal" || code === "NumpadAdd";
  const minus = k === "-" || k === "_" || code === "Minus" || code === "NumpadSubtract";
  const zero = k === "0" || code === "Digit0" || code === "Numpad0";
  if (!plus && !minus && !zero) return;
  // Ctrl/Cmd+0 still reaches the browser so a page that was already zoomed can go back to 100%.
  if (!zero) e.preventDefault();
  e.stopImmediatePropagation();
  if (!boardOpen()) return;
  if (plus) editor.zoom(1.25); else if (minus) editor.zoom(0.8); else editor.resetZoom();
}, { capture: true });
addEventListener("wheel", (e) => { if (e.ctrlKey || e.metaKey) e.preventDefault(); }, { passive: false });
// Safari trackpad pinch on the page
for (const t of ["gesturestart", "gesturechange", "gestureend"]) document.addEventListener(t, (e) => e.preventDefault());

// ---------- admin ----------
let adm = null;
const fmtDate = (ms) => (ms ? new Date(ms).toLocaleDateString([], { dateStyle: "medium" }) : "—");
const toLocalInput = (ms) => new Date(ms - new Date(ms).getTimezoneOffset() * 60000).toISOString().slice(0, 16);
async function openAdmin() {
  if (!isAdmin()) return;
  show("scr-admin"); busy("Loading admin data…");
  try {
    const [data, settings, pays] = await Promise.all([S.adminLoad(), S.getSettings(), S.adminPayments()]);
    adm = data; adm.pays = pays; adm.settings = settings; $("#adm-trial").value = settings.trialDays;
    $("#adm-p6").value = settings.price6m || ""; $("#adm-p12").value = settings.price1y || "";
    $("#adm-l6").value = settings.link6m || PAY_LINKS["6m"]; $("#adm-l12").value = settings.link1y || PAY_LINKS["1y"];
    renderAdmin();
  } catch (e) { console.error(e); uiAlert("Couldn't load admin data: " + e.message); }
  busy(null);
}
function renderAdmin() {
  const now = Date.now(), U = adm.users, T = adm.totals, week = now - 7 * 864e5;
  const active = U.filter((u) => u.email === S.ADMIN_EMAIL || u.subEnd?.toMillis() > now).length;
  const stats = [
    ["Users", U.length, true], ["Active subscriptions", active], ["Expired", U.length - active],
    ["New users (7 days)", U.filter((u) => u.createdAt?.toMillis() > week).length],
    ["Active today", U.filter((u) => u.lastLogin?.toMillis() > now - 864e5).length],
    ["Notes", T.notes, true], ["Slides / pages", T.pages, true], ["PDFs uploaded", T.pdfs], ["Notes made (7 days)", T.notes7],
  ];
  renderPays(); renderRevenue();
  $("#adm-stats").innerHTML = stats.map(([l, v, hi]) => `<div class="stat${hi ? " hi" : ""}"><b>${v.toLocaleString()}</b><span>${l}</span></div>`).join("");
  const q = $("#adm-search").value.trim().toLowerCase();
  const rows = U.filter((u) => !q || (u.name || "").toLowerCase().includes(q) || (u.email || "").toLowerCase().includes(q) || (u.phone || "").includes(q))
    .sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
  const tb = $("#adm-users"); tb.innerHTML = "";
  for (const u of rows) {
    const end = u.subEnd?.toMillis() || 0, admin = u.email === S.ADMIN_EMAIL, on = admin || end > now;
    const tr = document.createElement("tr");
    tr.innerHTML = `<td><div class="who"><img class="avatar" alt="" /><div><b></b><small></small></div></div></td>
      <td>${fmtDate(u.createdAt?.toMillis())}</td><td>${fmtDate(Math.max(u.lastLogin?.toMillis() || 0, u.lastEdit || 0))}</td>
      <td class="num">${u.notes}</td><td class="num">${u.pages}</td>
      <td><span class="pill ${admin ? "adm" : on ? "on" : "off"}">${admin ? "Admin" : on ? fmtLeft(end - now).replace(" left", "") : "Expired"}</span></td>
      <td>${admin ? '<span class="muted">Unlimited</span>' : `<div class="sub-edit"><input type="datetime-local" value="${end ? toLocalInput(end) : ""}" />
        <button class="btn" data-add="7">+7d</button><button class="btn" data-add="30">+30d</button><button class="btn" data-add="365">+1y</button>
        <button class="btn primary" data-save>Save</button><button class="btn" data-end title="End now">End</button></div>`}</td>`;
    $("img", tr).src = u.photo || ""; $("b", tr).textContent = u.name || "—"; $("small", tr).textContent = (u.email || "") + (u.phone ? " · " + u.phone : "") + (u.role ? " · " + u.role : "");
    const inp = $("input", tr);
    const save = async (ms) => {
      try { await S.adminSetSub(u.uid, ms); u.subEnd = { toMillis: () => ms }; toast(`Updated ${u.name || u.email}`); renderAdmin(); }
      catch (e) { uiAlert("Couldn't update: " + e.message); }
    };
    $$("[data-add]", tr).forEach((b) => (b.onclick = () => save(Math.max(Date.now(), end) + +b.dataset.add * 864e5)));
    if (inp) {
      $("[data-save]", tr).onclick = () => { const ms = new Date(inp.value).getTime(); if (ms) save(ms); };
      $("[data-end]", tr).onclick = async () => { if (await uiConfirm(`End ${u.name || u.email}'s subscription now?`, "End now")) save(Date.now()); };
    }
    tb.appendChild(tr);
  }
}
$("#btn-admin").onclick = openAdmin;
$("#adm-back").onclick = () => enterLibrary();
$("#adm-refresh").onclick = openAdmin;
$("#adm-search").oninput = () => adm && renderAdmin();
$("#adm-trial-form").onsubmit = async (e) => {
  e.preventDefault();
  const d = Math.max(0, Math.round(+$("#adm-trial").value));
  try { await S.setTrialDays(d); toast(`Free trial set to ${d} days for new users`); } catch (err) { uiAlert(err.message); }
};

// ---------- plans & payments ----------
const PAY_LINKS = {
  "6m": "https://invoice.sslcommerz.com/invoice-form?&refer=6AEEFB4601918",
  "1y": "https://invoice.sslcommerz.com/invoice-form?&refer=6AEEFB2E17995",
};
let payLinks = { ...PAY_LINKS };
const PLAN_NAME = { "6m": "6 months", "1y": "1 year" };
const addMonths = (ms, n) => { const d = new Date(ms); d.setMonth(d.getMonth() + n); return d.getTime(); };
const planEnd = (fromMs, plan) => addMonths(Math.max(Date.now(), fromMs || 0), plan === "1y" ? 12 : 6);

function planStep(n) {
  $("#plans-step1").classList.toggle("hidden", n !== 1);
  $("#pay-form").classList.toggle("hidden", n !== 2);
  if (n === 2) setTimeout(() => $("#pay-txn").focus(), 50);
}
function setPayPlan(v) {
  $("#pay-plan").value = v;
  $$("#pay-plan-seg button").forEach((b) => b.classList.toggle("on", b.dataset.v === v));
}
async function openPlans() {
  $("#plans").classList.remove("hidden"); planStep(1);
  const left = subLeft();
  $("#plans-sub").textContent = left > 0 ? `You have ${fmtLeft(left)}. A new plan adds to the time you have left.` : "Your subscription has ended. Choose a plan to keep using your notes.";
  try {
    const st = await S.getSettings(), n = (v) => parseFloat(String(v).replace(/[^0-9.]/g, ""));
    payLinks = { "6m": st.link6m || PAY_LINKS["6m"], "1y": st.link1y || PAY_LINKS["1y"] };
    $("#price-6m").textContent = st.price6m ? "৳" + st.price6m : "";
    $("#price-1y").textContent = st.price1y ? "৳" + st.price1y : "";
    $("#per-6m").textContent = st.price6m ? `৳${Math.round(n(st.price6m) / 6)} / month` : "";
    $("#per-1y").textContent = st.price1y ? `৳${Math.round(n(st.price1y) / 12)} / month` : "";
  } catch {}
  renderMyPays();
}
async function renderMyPays() {
  const box = $("#my-pays"); box.innerHTML = "";
  let list = []; try { list = await S.myPayments(); } catch { return; }
  const pending = list.find((p) => p.status === "pending");
  $("#plans-pending").classList.toggle("hidden", !pending);
  if (pending) $("#plans-pending").textContent = `Your ${PLAN_NAME[pending.plan]} payment (${pending.txn}) is waiting for approval.`;
  for (const p of list.slice(0, 3)) {
    const el = document.createElement("div"); el.className = "my-pay";
    const st = { pending: ["wait", "Waiting"], approved: ["on", "Approved"], rejected: ["off", "Not approved"] }[p.status] || ["wait", p.status];
    el.innerHTML = `<span></span><span class="pill ${st[0]}">${st[1]}</span>`;
    $("span", el).textContent = `${PLAN_NAME[p.plan]} · ${p.txn} · ${fmtDate(p.createdAt?.toMillis?.())}`;
    box.appendChild(el);
  }
}
$("#btn-upgrade").onclick = openPlans;
$("#btn-renew").onclick = openPlans;
$("#plans-close").onclick = () => $("#plans").classList.add("hidden");
$("#plans-paid").onclick = () => planStep(2);
$("#plans-back").onclick = () => planStep(1);
$$("#pay-plan-seg button").forEach((b) => (b.onclick = () => setPayPlan(b.dataset.v)));
setPayPlan("1y");
$$("[data-pay]").forEach((b) => (b.onclick = () => {
  setPayPlan(b.dataset.pay);
  window.open(payLinks[b.dataset.pay], "_blank", "noopener");
  planStep(2);
}));
$("#pay-form").onsubmit = async (e) => {
  e.preventDefault();
  const plan = $("#pay-plan").value, txn = $("#pay-txn").value.trim().replace(/\s+/g, ""), from = "";
  if (!S.validTxn(S.normTxn(txn))) { uiAlert("Please check the transaction ID. Use only letters, numbers, - _ or ."); return; }
  busy("Checking your payment with SSLCommerz…");
  try {
    const r = await S.verifyPayment({ plan, txn, from });
    $("#pay-txn").value = "";
    busy(null);
    if (r.status === "approved") {
      profile = { ...profile, subEnd: { toMillis: () => r.subEnd } };
      tickSub(); $("#plans").classList.add("hidden");
      await dialog({ msg: `Payment confirmed ✓\n\nYour ${r.planName} plan is active until ${new Date(r.subEnd).toLocaleString([], { dateStyle: "long", timeStyle: "short" })}.\n\nThank you!`, ok: "Start using EasyNote", cancel: null });
    } else {
      await renderMyPays(); planStep(1);
      uiAlert("We found your payment, but it needs a quick check by our team. We'll switch your plan on soon.");
    }
  } catch (err) {
    busy(null);
    uiAlert(err.message || "Couldn't check the payment. Please try again.");
  }
};

function renderPays() {
  const all = $("#adm-pay-all").checked, list = (adm.pays || []).filter((p) => all || p.status === "pending");
  const tb = $("#adm-pays"); tb.innerHTML = "";
  $("#adm-pays-empty").classList.toggle("hidden", list.length > 0);
  const byUid = Object.fromEntries(adm.users.map((u) => [u.uid, u]));
  for (const p of list) {
    const u = byUid[p.uid], tr = document.createElement("tr");
    const st = { pending: "wait", approved: "on", rejected: "off" }[p.status];
    tr.innerHTML = `<td><div class="who"><div><b></b><small></small></div></div></td><td>${PLAN_NAME[p.plan] || p.plan}</td>
      <td class="num">${payAmount(p) ? taka(payAmount(p)) : "—"}</td>
      <td><code></code></td><td class="from"></td><td>${fmtDate(p.createdAt?.toMillis?.())}</td>
      <td><span class="pill ${st}">${p.status}${p.auto && p.status === "approved" ? " · auto" : ""}</span><small class="pay-note"></small></td>
      <td>${p.status === "pending" ? '<div class="sub-edit"><button class="btn primary" data-ok>Approve</button><button class="btn" data-no>Reject</button></div>' : ""}</td>`;
    $("b", tr).textContent = u?.name || p.name || "—"; $("small", tr).textContent = p.email || "";
    $("code", tr).textContent = p.txn; $(".from", tr).textContent = methodName(p) + (p.from ? " · " + p.from : "");
    $(".pay-note", tr).textContent = p.note || "";
    if (p.status === "pending") {
      $("[data-ok]", tr).onclick = async () => {
        const end = planEnd(u?.subEnd?.toMillis?.(), p.plan);
        if (!(await dialog({ msg: `Approve ${PLAN_NAME[p.plan]} for ${u?.name || p.email}?\nTheir subscription will run until ${new Date(end).toLocaleString()}.`, ok: "Approve" }))) return;
        try { await S.adminDecide(p, true, end); p.status = "approved"; if (u) u.subEnd = { toMillis: () => end }; toast("Approved"); renderAdmin(); }
        catch (e) { uiAlert("Couldn't approve: " + e.message); }
      };
      $("[data-no]", tr).onclick = async () => {
        if (!(await uiConfirm(`Reject this payment from ${u?.name || p.email}?`, "Reject"))) return;
        try { await S.adminDecide(p, false); p.status = "rejected"; renderAdmin(); } catch (e) { uiAlert(e.message); }
      };
    }
    tb.appendChild(tr);
  }
}
$("#adm-pay-all").onchange = () => adm && renderPays();
$("#adm-plans-form").onsubmit = async (e) => {
  e.preventDefault();
  const v = (id) => $(id).value.trim();
  const price6m = v("#adm-p6"), price1y = v("#adm-p12"), link6m = v("#adm-l6"), link1y = v("#adm-l12");
  for (const l of [link6m, link1y]) if (l && !/^https:\/\//i.test(l)) return uiAlert("Payment links must start with https://");
  for (const p of [price6m, price1y]) if (p && !(parseFloat(p.replace(/[^0-9.]/g, "")) > 0)) return uiAlert("Prices must be numbers, for example 1250.");
  try { await S.setPlans({ price6m, price1y, link6m, link1y }); adm.settings = { ...adm.settings, price6m, price1y, link6m, link1y }; renderRevenue(); toast("Plans saved. Users see the new prices and links right away."); }
  catch (err) { uiAlert(err.message); }
};

// ---------- delete my account ----------
$("#btn-delete-account").onclick = async () => {
  const typed = await dialog({
    msg: "Delete your EasyNote account?\n\nThis permanently deletes all your notes, PDFs and your profile. It can't be undone. Download anything you want to keep first.\n\nType DELETE to confirm.",
    input: "", ok: "Delete my account", danger: true,
  });
  if (typed == null) return;
  if (typed.trim().toUpperCase() !== "DELETE") { uiAlert("Account not deleted. You need to type DELETE to confirm."); return; }
  busy("Confirm with Google…");
  try {
    await S.deleteAccount((t) => busy(t));
    busy(null);
    await uiAlert("Your account and all your notes have been deleted.");
  } catch (e) {
    busy(null);
    if (e.code !== "auth/popup-closed-by-user" && e.code !== "auth/cancelled-popup-request") uiAlert("Couldn't delete your account: " + e.message);
  }
};

// ---------- side bar (☰) ----------
function drawer(open) {
  $("#drawer").classList.toggle("open", open);
  $("#drawer-scrim").classList.toggle("hidden", !open);
  $("#drawer").setAttribute("aria-hidden", String(!open));
  $("#btn-menu").setAttribute("aria-expanded", String(open));
}
$("#btn-menu").onclick = () => drawer(true);
$("#btn-avatar").onclick = () => drawer(true);
$("#drawer-close").onclick = () => drawer(false);
$("#drawer-scrim").onclick = () => drawer(false);
addEventListener("keydown", (e) => { if (e.key === "Escape" && $("#drawer").classList.contains("open")) drawer(false); });
// every menu action closes the side bar first
$("#drawer").addEventListener("click", (e) => {
  const item = e.target.closest(".menu-item"); if (!item) return;
  if (item.dataset.act === "upgrade") openPlans();
  if (item.dataset.act === "manual") openManual();
  if (item.id !== "btn-full-lib") drawer(false);
});

// ---------- user manual ----------
function manualTab(t) {
  $$(".manual-tabs button").forEach((b) => b.classList.toggle("on", b.dataset.tab === t));
  $$(".manual-pane").forEach((p) => p.classList.toggle("hidden", p.dataset.pane !== t));
}
function openManual() { manualTab(isIOS ? "ipad" : "desktop"); $("#manual").classList.remove("hidden"); }
$$(".manual-tabs button").forEach((b) => (b.onclick = () => manualTab(b.dataset.tab)));
$("#manual-close").onclick = () => $("#manual").classList.add("hidden");
$("#manual").addEventListener("click", (e) => { if (e.target.id === "manual") $("#manual").classList.add("hidden"); });
addEventListener("keydown", (e) => { if (e.key === "Escape") $("#manual").classList.add("hidden"); });

// ---------- admin: side menu ----------
function adminSection(sec) {
  $$(".adm-nav button").forEach((b) => b.classList.toggle("on", b.dataset.sec === sec));
  $$(".adm-sec").forEach((s) => s.classList.toggle("hidden", s.dataset.sec !== sec));
  $(".adm-main").scrollTop = 0; $("#scr-admin").scrollTop = 0;
}
$$(".adm-nav button").forEach((b) => (b.onclick = () => adminSection(b.dataset.sec)));

// ---------- admin: revenue ----------
const taka = (n) => "৳" + Math.round(n).toLocaleString("en-IN");
const numP = (v) => parseFloat(String(v ?? "").replace(/[^0-9.]/g, "")) || 0;
function payAmount(p) {
  if (p.amount) return numP(p.amount);
  const st = adm.settings || {};
  return numP(p.plan === "1y" ? st.price1y : st.price6m); // approved by hand: use plan price
}
const payTime = (p) => p.decidedAt?.toMillis?.() || p.createdAt?.toMillis?.() || 0;
const methodName = (p) => {
  const m = String(p.method || "").trim(); if (!m) return p.auto ? "SSLCommerz" : "Manual";
  return m.includes("-") ? m.split("-").slice(1).join("-") : m;
};
function renderRevenue() {
  if (!adm) return;
  const pending = (adm.pays || []).filter((p) => p.status === "pending").length;
  const pc = $("#adm-pending-count"); pc.textContent = pending; pc.classList.toggle("hidden", !pending);

  const ok = (adm.pays || []).filter((p) => p.status === "approved");
  const now = new Date(), t30 = Date.now() - 30 * 864e5;
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const total = ok.reduce((s, p) => s + payAmount(p), 0);
  const month = ok.filter((p) => payTime(p) >= monthStart).reduce((s, p) => s + payAmount(p), 0);
  const last30 = ok.filter((p) => payTime(p) >= t30).reduce((s, p) => s + payAmount(p), 0);
  const tiles = [
    ["Total revenue", taka(total), `${ok.length} paid subscription${ok.length === 1 ? "" : "s"}`, true],
    ["This month", taka(month), now.toLocaleString([], { month: "long" })],
    ["Last 30 days", taka(last30), ""],
    ["Average payment", taka(ok.length ? total / ok.length : 0), ""],
    ["Waiting for you", String(pending), "payment requests"],
  ];
  $("#adm-rev-tiles").innerHTML = tiles.map(([l, v, sub, hi]) => `<div class="stat${hi ? " hi" : ""}"><b>${v}</b><span>${l}</span>${sub ? `<small>${sub}</small>` : ""}</div>`).join("");

  // revenue by month, last 12 months
  const months = [];
  for (let k = 11; k >= 0; k--) { const d = new Date(now.getFullYear(), now.getMonth() - k, 1); months.push({ start: d.getTime(), end: new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime(), label: d.toLocaleString([], { month: "short" }), full: d.toLocaleString([], { month: "long", year: "numeric" }), sum: 0, n: 0 }); }
  for (const p of ok) { const t = payTime(p), mo = months.find((m) => t >= m.start && t < m.end); if (mo) { mo.sum += payAmount(p); mo.n++; } }
  drawMonthChart(months);
  $("#adm-rev-table").innerHTML = "<thead><tr><th>Month</th><th>Payments</th><th>Revenue</th></tr></thead><tbody>" +
    months.map((m) => `<tr><td>${m.full}</td><td class="num">${m.n}</td><td class="num">${taka(m.sum)}</td></tr>`).join("") + "</tbody>";

  // by plan & by method (single hue: these are magnitudes, the label carries identity)
  const group = (keyFn) => { const g = {}; for (const p of ok) { const k = keyFn(p); g[k] ||= { sum: 0, n: 0 }; g[k].sum += payAmount(p); g[k].n++; } return Object.entries(g).sort((a, b) => b[1].sum - a[1].sum); };
  const bars = (el, rows) => {
    const max = Math.max(1, ...rows.map(([, v]) => v.sum));
    $(el).innerHTML = rows.length ? rows.map(([k, v]) => `<div class="hbar"><span class="lbl"></span><span class="track"><span class="fill" style="width:${Math.max(2, (v.sum / max) * 100)}%"></span></span><span class="val"><b>${taka(v.sum)}</b> · ${v.n}</span></div>`).join("") : '<p class="muted small">No paid subscriptions yet.</p>';
    $$(".hbar .lbl", $(el)).forEach((l, i) => (l.textContent = rows[i][0]));
  };
  bars("#adm-rev-plan", group((p) => PLAN_NAME[p.plan] || p.plan));
  bars("#adm-rev-method", group(methodName).slice(0, 6));
}

function drawMonthChart(months) {
  const W = 760, H = 260, pl = 56, pr = 12, pt = 14, pb = 28, iw = W - pl - pr, ih = H - pt - pb;
  const max = Math.max(...months.map((m) => m.sum));
  // a "nice" top for the axis
  const step = (() => { if (!max) return 1000; const raw = max / 4, p = 10 ** Math.floor(Math.log10(raw)), f = raw / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p; })();
  const top = Math.max(step * 4, step * Math.ceil(max / step));
  const y = (v) => pt + ih - (v / top) * ih, slot = iw / months.length, bw = Math.min(36, slot * 0.6);
  let g = "";
  for (let v = 0; v <= top + 1e-9; v += step) g += `<line x1="${pl}" x2="${W - pr}" y1="${y(v)}" y2="${y(v)}"/>`;
  let ax = "";
  for (let v = 0; v <= top + 1e-9; v += step) ax += `<text x="${pl - 8}" y="${y(v) + 4}" text-anchor="end">${v >= 1000 ? (v / 1000).toLocaleString() + "k" : v}</text>`;
  months.forEach((m, i) => { ax += `<text x="${pl + slot * i + slot / 2}" y="${H - 8}" text-anchor="middle">${m.label}</text>`; });
  let cols = "";
  months.forEach((m, i) => {
    const x = pl + slot * i + (slot - bw) / 2, h = Math.max(0, ih - (y(m.sum) - pt)), r = Math.min(4, h);
    const bar = h > 0 ? `<path class="bar" d="M${x},${pt + ih} V${pt + ih - h + r} Q${x},${pt + ih - h} ${x + r},${pt + ih - h} H${x + bw - r} Q${x + bw},${pt + ih - h} ${x + bw},${pt + ih - h + r} V${pt + ih} Z"/>` : "";
    cols += `<g class="col" data-i="${i}"><rect class="bar-hit" x="${pl + slot * i}" y="${pt}" width="${slot}" height="${ih}"/>${bar}</g>`;
  });
  const el = $("#adm-rev-chart");
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Revenue by month for the last 12 months"><g class="grid">${g}</g><g class="ax">${ax}</g>${cols}</svg>`;
  const tip = $("#chart-tip");
  $$("g.col", el).forEach((c) => {
    c.onpointerenter = c.onpointermove = (e) => {
      const m = months[+c.dataset.i];
      tip.innerHTML = `<span class="muted"></span><b></b><span class="muted"></span>`;
      const [a, b, d] = tip.children; a.textContent = m.full; b.textContent = taka(m.sum); d.textContent = `${m.n} payment${m.n === 1 ? "" : "s"}`;
      tip.classList.remove("hidden");
      tip.style.left = Math.min(innerWidth - tip.offsetWidth - 8, e.clientX + 14) + "px"; tip.style.top = (e.clientY - tip.offsetHeight - 10) + "px";
    };
    c.onpointerleave = () => tip.classList.add("hidden");
  });
}


