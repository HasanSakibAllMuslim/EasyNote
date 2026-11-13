import { drawBackground, drawObjects, drawObject, FONT, setImageReady, preloadImages } from "./render.js";
import * as G from "./geom.js";
import { newId } from "./store.js";

const HANDLE = 9; // screen px
const r1 = (v) => Math.round(v * 10) / 10;

export class Editor {
  constructor(stage, hooks) {
    this.stage = stage; this.hooks = hooks;
    setImageReady(() => this.requestLive(true));
    const mk = (cls) => { const c = document.createElement("canvas"); c.className = cls; stage.appendChild(c); return c; };
    this.cBg = mk("layer"); this.cInk = mk("layer"); this.cLive = mk("layer live");
    // desynchronized = draw straight to the screen, skipping a compositor frame (much lower pen latency)
    // Not on Android: there Chrome shows a desynchronized canvas as an opaque overlay on top of the page,
    // so once a stroke moves from this live layer to the ink layer underneath, it looks erased.
    const android = /Android/i.test(navigator.userAgent);
    this.lctx = (!android && this.cLive.getContext("2d", { desynchronized: true })) || this.cLive.getContext("2d");
    this.pages = []; this.idx = 0; this.pdf = null;
    this.pdfCache = new Map(); this.textCache = new Map(); this.unitCache = new Map();
    this.view = { s: 1, x: 0, y: 0 }; this.fitMode = "auto";
    this.tool = "pen";
    this.pen = { type: "pen", c: "#ffffff", sw: 4 };
    this.hl = { c: "#ffe94d", sw: 26 };
    this.eraser = 30;
    this.shapeAssist = true; this.smartHl = true; this.fillShapes = false;
    this.insertKind = null;
    this.sel = []; this.hist = new Map(); this.clip = null;
    this.laser = []; this.pointers = new Map(); this.drawId = null;
    // Once an Apple Pencil / stylus has been used, fingers only move & zoom (palm rejection). Remembered per device.
    try { this.sawPen = localStorage.getItem("tn-pen") === "1"; } catch { this.sawPen = false; }
    new ResizeObserver(() => this.resize()).observe(stage);
    const L = this.cLive;
    L.addEventListener("pointerdown", (e) => this.down(e));
    L.addEventListener("pointermove", (e) => this.move(e));
    L.addEventListener("pointerup", (e) => this.up(e));
    L.addEventListener("pointercancel", (e) => this.up(e));
    L.addEventListener("pointerleave", () => { this.hover = null; this.drawLive(); });
    L.addEventListener("wheel", (e) => this.wheel(e), { passive: false });
    L.addEventListener("dblclick", (e) => this.dbl(e));
    // iPad: stop Safari from treating a pencil press as text selection / long-press (Copy, Translate…) or a magnifier.
    const stop = (e) => { if (e.cancelable) e.preventDefault(); };
    for (const t of ["touchstart", "touchmove", "touchend"]) L.addEventListener(t, stop, { passive: false });
    stage.addEventListener("contextmenu", stop);
    stage.addEventListener("selectstart", stop);
  }

  get page() { return this.pages[this.idx]; }

  load(pages, pdf) {
    this.pages = pages; this.pdf = pdf; this.idx = 0; this.sel = [];
    this.pdfCache.clear(); this.textCache.clear(); this.hist.clear();
    this.fit(); this.renderAll();
  }

  // ---------- view ----------
  resize() {
    const r = this.stage.getBoundingClientRect(), d = devicePixelRatio || 1;
    this.W = r.width; this.H = r.height; this.dpr = d;
    for (const c of [this.cBg, this.cInk, this.cLive]) {
      c.width = Math.round(r.width * d); c.height = Math.round(r.height * d);
      c.style.width = r.width + "px"; c.style.height = r.height + "px";
    }
    if (this.pages.length) { this.fit(true); this.renderAll(); }
  }

  fit(keep) {
    const p = this.page; if (!p || !this.W) return;
    const portrait = p.h > p.w * 1.05;
    const mode = this.fitMode === "auto" ? (portrait ? "width" : "page") : this.fitMode;
    this.curFit = mode;
    const s = mode === "width" ? this.W / p.w : Math.min(this.W / p.w, this.H / p.h);
    if (keep && this._fitFor === p.id && this._lastW === this.W) return this.clamp();
    this.view.s = s; this.view.x = (this.W - p.w * s) / 2; this.view.y = mode === "width" ? 0 : (this.H - p.h * s) / 2;
    this._fitFor = p.id; this._lastW = this.W;
    this.clamp();
  }

  clamp() {
    const p = this.page, v = this.view, pw = p.w * v.s, ph = p.h * v.s, m = 0;
    v.x = pw + 2 * m <= this.W ? (this.W - pw) / 2 : Math.min(m, Math.max(this.W - pw - m, v.x));
    v.y = ph + 2 * m <= this.H ? (this.H - ph) / 2 : Math.min(m, Math.max(this.H - ph - m, v.y));
  }

  zoomAt(f, sx, sy) {
    const v = this.view, ns = Math.max(0.1, Math.min(12, v.s * f));
    v.x = sx - ((sx - v.x) * ns) / v.s; v.y = sy - ((sy - v.y) * ns) / v.s; v.s = ns;
    this.clamp(); this.renderAll();
  }
  zoom(f) { this.zoomAt(f, this.W / 2, this.H / 2); }
  resetZoom(mode) { if (mode) this.fitMode = mode; this._fitFor = null; this.fit(); this.renderAll(); }

  wheel(e) {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) { this.zoomAt(Math.exp(-e.deltaY * 0.01), e.offsetX, e.offsetY); return; }
    this.view.x -= e.deltaX; this.view.y -= e.deltaY; this.clamp(); this.renderAll();
  }

  toPage(e) {
    const r = this.cLive.getBoundingClientRect();
    return [(e.clientX - r.left - this.view.x) / this.view.s, (e.clientY - r.top - this.view.y) / this.view.s];
  }
  toScreen(x, y) { return [x * this.view.s + this.view.x, y * this.view.s + this.view.y]; }
  setT(ctx) { const d = this.dpr, v = this.view; ctx.setTransform(d * v.s, 0, 0, d * v.s, d * v.x, d * v.y); }

  // ---------- rendering ----------
  renderAll() {
    if (this._raf) return;
    this._raf = requestAnimationFrame(() => { this._raf = 0; this.drawBg(); this.drawInk(); this.drawLive(); });
  }

  drawBg() {
    const p = this.page, ctx = this.cBg.getContext("2d");
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, this.cBg.width, this.cBg.height);
    if (!p) return;
    this.setT(ctx);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, p.w, p.h); ctx.clip();
    let img = null;
    if (p.bg === "pdf") {
      const want = Math.min(this.view.s * this.dpr, 4096 / p.w);
      const c = this.pdfCache.get(p.pdfPage);
      if (c) img = c.canvas;
      if (!c || Math.abs(c.scale - want) / want > 0.25) this.renderPdf(p, want);
    }
    drawBackground(ctx, p, img);
    ctx.restore();
  }

  async pdfUnit(n) {
    if (!this.unitCache.has(n)) { const pg = await this.pdf.getPage(n); this.unitCache.set(n, pg.getViewport({ scale: 1 }).width); }
    return this.unitCache.get(n);
  }

  async renderPdf(p, scale) {
    const key = p.pdfPage;
    if (!this.pdf || this._pdfBusy === key + ":" + scale) return;
    this._pdfBusy = key + ":" + scale;
    try {
      const pg = await this.pdf.getPage(key);
      const unit = p.w / pg.getViewport({ scale: 1 }).width;
      const vp = pg.getViewport({ scale: unit * scale });
      const c = document.createElement("canvas"); c.width = Math.ceil(vp.width); c.height = Math.ceil(vp.height);
      await pg.render({ canvasContext: c.getContext("2d"), viewport: vp }).promise;
      this.pdfCache.set(key, { canvas: c, scale });
      if (this.pdfCache.size > 12) this.pdfCache.delete(this.pdfCache.keys().next().value);
      if (this.page?.pdfPage === key) this.drawBg();
    } catch (e) { console.error(e); }
    this._pdfBusy = null;
  }

  drawInk() {
    const ctx = this.cInk.getContext("2d");
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, this.cInk.width, this.cInk.height);
    const p = this.page; if (!p) return;
    if (this.dragCache) {
      ctx.drawImage(this.dragCache, 0, 0);
      this.setT(ctx); ctx.save(); ctx.beginPath(); ctx.rect(0, 0, p.w, p.h); ctx.clip();
      drawObjects(ctx, this.selObjs()); ctx.restore(); return;
    }
    this.setT(ctx);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, p.w, p.h); ctx.clip();
    drawObjects(ctx, p.objects, this.editingText ? new Set([this.editingText]) : null);
    ctx.restore();
  }

  // Redraw at most once per frame (pens/boards fire pointermove far faster than the screen refreshes).
  requestLive(ink = false) {
    if (ink) this._inkDirty = true;
    if (this._liveRaf) return;
    this._liveRaf = requestAnimationFrame(() => {
      this._liveRaf = 0;
      if (this._inkDirty) { this._inkDirty = false; this.drawInk(); }
      this.drawLive();
    });
  }

  drawLive() {
    const ctx = this.lctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, this.cLive.width, this.cLive.height);
    if (!this.page) return;
    this.setT(ctx);
    if (this.cur) drawObject(ctx, this.cur);
    if (this.preview) drawObject(ctx, this.preview);
    const s = this.view.s;
    if (this.marquee) {
      const m = this.marquee;
      ctx.fillStyle = "rgba(56,139,253,.12)"; ctx.strokeStyle = "#388bfd"; ctx.lineWidth = 1 / s; ctx.setLineDash([5 / s, 4 / s]);
      ctx.fillRect(m.x, m.y, m.w, m.h); ctx.strokeRect(m.x, m.y, m.w, m.h); ctx.setLineDash([]);
    }
    const so = this.selObjs();
    if (so.length) {
      const b = G.unionBox(so);
      ctx.strokeStyle = "#388bfd"; ctx.lineWidth = 1.5 / s; ctx.setLineDash([6 / s, 4 / s]);
      ctx.strokeRect(b.x, b.y, b.w, b.h); ctx.setLineDash([]);
      ctx.fillStyle = "#fff";
      for (const [hx, hy] of this.handles(b)) {
        ctx.beginPath(); ctx.arc(hx, hy, HANDLE / 2 / s + 1 / s, 0, 7); ctx.fill(); ctx.stroke();
      }
    }
    if (this.hover && this.tool === "eraser") {
      ctx.strokeStyle = "rgba(255,255,255,.8)"; ctx.lineWidth = 1.5 / s; ctx.fillStyle = "rgba(255,80,80,.15)";
      ctx.beginPath(); ctx.arc(this.hover[0], this.hover[1], this.eraser / 2 / s, 0, 7); ctx.fill(); ctx.stroke();
    }
    if (this.laser.length) this.drawLaser(ctx);
    if (!this.cur && (so.length || this._hadSel)) this.hooks.onSelection?.(so.length ? this.selScreenBox() : null);
    this._hadSel = so.length > 0;
  }

  // Laser: a smooth red comet tail that thins out and fades, with a bright white dot at the tip.
  drawLaser(ctx) {
    const now = performance.now(), life = 800;
    this.laser = this.laser.filter((p) => now - p.t < life);
    const s = this.view.s, L = this.laser;
    // split into separate runs where the pen was lifted
    const runs = []; let run = [];
    for (const p of L) { if (p.brk && run.length) { runs.push(run); run = []; } run.push(p); }
    if (run.length) runs.push(run);
    const mid = (a, b) => [(a.x + b.x) / 2, (a.y + b.y) / 2];
    const width = (p) => { const k = Math.max(0, 1 - (now - p.t) / life); return (7 * Math.pow(k, 0.7)) / s; };
    ctx.save(); ctx.lineCap = "round"; ctx.lineJoin = "round";
    for (const pass of [0, 1, 2]) {
      // pass 0: soft red glow, 1: solid red body, 2: thin white core (opaque, so overlaps never look beaded)
      ctx.strokeStyle = pass === 2 ? "#fff" : pass ? "#ff2a3d" : "rgba(255,30,50,.22)";
      for (const R of runs) {
        if (R.length < 2) continue;
        let from = [R[0].x, R[0].y];
        for (let i = 1; i < R.length; i++) {
          const to = i < R.length - 1 ? mid(R[i], R[i + 1]) : [R[i].x, R[i].y];
          const w = width(R[i]); if (w <= 0.05 / s) { from = to; continue; }
          ctx.lineWidth = pass === 2 ? w * 0.38 : pass ? w : w * 3.2;
          ctx.beginPath(); ctx.moveTo(from[0], from[1]); ctx.quadraticCurveTo(R[i].x, R[i].y, to[0], to[1]); ctx.stroke();
          from = to;
        }
      }
    }
    const last = L[L.length - 1];
    if (last && this.laserOn) {
      const g = ctx.createRadialGradient(last.x, last.y, 0, last.x, last.y, 16 / s);
      g.addColorStop(0, "rgba(255,60,70,.55)"); g.addColorStop(1, "rgba(255,30,50,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(last.x, last.y, 16 / s, 0, 7); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(last.x, last.y, 4.5 / s, 0, 7); ctx.fill();
    }
    ctx.restore();
    if (L.length) this.requestLive();
  }

  // ---------- selection helpers ----------
  selObjs() { if (!this.sel.length) return []; const ids = new Set(this.sel); return this.page ? this.page.objects.filter((o) => ids.has(o.id)) : []; }
  handles(b) {
    const { x, y, w, h } = b;
    return [[x, y], [x + w / 2, y], [x + w, y], [x + w, y + h / 2], [x + w, y + h], [x + w / 2, y + h], [x, y + h], [x, y + h / 2]];
  }
  selScreenBox() {
    const b = G.unionBox(this.selObjs()), [x, y] = this.toScreen(b.x, b.y);
    return { x, y, w: b.w * this.view.s, h: b.h * this.view.s };
  }
  setSel(ids) { this.sel = ids; this.drawLive(); }

  // ---------- history ----------
  snap() {
    const p = this.page; let h = this.hist.get(p.id);
    if (!h) this.hist.set(p.id, (h = { u: [], r: [] }));
    h.u.push(p.objects.slice()); if (h.u.length > 150) h.u.shift(); h.r = [];
  }
  commit() { this.hooks.onChange?.(this.page); this.drawInk(); this.drawLive(); }
  undo() { this._hist("u", "r"); }
  redo() { this._hist("r", "u"); }
  _hist(a, b) {
    const p = this.page, h = this.hist.get(p.id); if (!h || !h[a].length) return;
    h[b].push(p.objects.slice()); p.objects = h[a].pop().slice(); this.sel = []; this.commit();
  }

  // ---------- pointer ----------
  down(e) {
    if (!this.page) return;
    const isPen = e.pointerType === "pen", isTouch = e.pointerType === "touch";
    if (isPen) {
      if (!this.sawPen) { this.sawPen = true; try { localStorage.setItem("tn-pen", "1"); } catch {} }
      // The pencil always wins: drop any palm/finger gesture that started first.
      this.gesture = null; this.pointers.clear();
      if (this.drawId != null && this.drawId !== e.pointerId) this.cancelDraw();
    } else if (this.drawId != null) {
      // A second finger right after a finger stroke began = two-finger gesture (swipe/zoom): drop the stroke.
      const young = performance.now() - (this.drawT || 0) < 350;
      if (isTouch && this.drawTouch && young && this.pointers.size === 1) {
        if (this.tool === "eraser" && this.erased) { this.erased = false; this.undo(); }
        this.cancelDraw(); this.drawLive();
      } else return; // ignore palms/fingers while something is being drawn
    }
    this.cLive.setPointerCapture(e.pointerId);
    if (isTouch) this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.textEl) { this.finishText(); return; }
    if (isTouch && this.pointers.size === 2) { this.gesture = this.pinchStart(); this.drawLive(); return; }
    if (isTouch && this.pointers.size > 2) return;
    const pan = e.button === 1 || this.tool === "hand" || this.spaceDown || (isTouch && this.sawPen);
    if (pan) { this.gesture = { pan: true, touch: isTouch, t: performance.now(), id: e.pointerId, x: e.clientX, y: e.clientY, vx: this.view.x, vy: this.view.y }; return; }
    if (e.button !== 0 && e.pointerType === "mouse") return;
    this.drawId = e.pointerId; this.drawTouch = isTouch; this.drawT = performance.now();
    const [x, y] = this.toPage(e), pr = e.pointerType === "mouse" ? 0.5 : e.pressure || 0.5;
    this.downAt = [x, y];
    switch (this.tool) {
      case "pen": this.cur = { t: "ink", pen: this.pen.type, c: this.pen.c, sw: this.pen.sw, pts: [[x, y, pr]] }; break;
      case "hl": this.cur = { t: "ink", pen: "hl", c: this.hl.c, sw: this.hl.sw, pts: [[x, y]] }; break;
      case "laser": this.laserOn = true; this.laser.push({ x, y, t: performance.now(), brk: true }); break;
      case "eraser": this.erased = false; this.eraseAt(x, y); break;
      case "select": this.selectDown(e, x, y); break;
      case "text": this.openText(x, y); break;
      case "insert": this.insertStart = [x, y]; break;
    }
    this.drawLive();
    if (this.cur) { this.liveIdx = 0; this.drawStrokeInc(); }
  }

  // Draw only the newest piece of the stroke instead of the whole stroke on every move.
  drawStrokeInc() {
    const o = this.cur, ctx = this.lctx, P = o.pts, n = P.length;
    if (o.pen !== "pen" && o.pen !== "brush") {
      // simple single-path pens are cheap to redraw whole (and must be, for even transparency/dashes)
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, this.cLive.width, this.cLive.height);
      this.setT(ctx); drawObject(ctx, o); return;
    }
    this.setT(ctx);
    ctx.strokeStyle = ctx.fillStyle = o.c; ctx.lineCap = "round"; ctx.lineJoin = "round";
    const pressured = o.pen === "pen" && P.some((p) => p[2] !== undefined && Math.abs(p[2] - 0.5) > 0.02);
    const width = (i) => {
      if (o.pen === "brush") {
        const a = P[Math.max(0, i - 1)], b = P[Math.min(n - 1, i + 1)];
        let dx = b[0] - a[0], dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
        return o.sw * (0.25 + 1.15 * Math.abs(dx * 0.707 - dy * 0.707));
      }
      return pressured ? o.sw * (0.35 + 0.9 * (P[i][2] ?? 0.5)) : o.sw;
    };
    if (this.liveIdx === 0 && n === 1) {
      ctx.beginPath(); ctx.arc(P[0][0], P[0][1], width(0) / 2, 0, 7); ctx.fill(); return;
    }
    const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    for (let i = Math.max(1, this.liveIdx); i < n - 1; i++) {
      const s = i === 1 ? P[0] : mid(P[i - 1], P[i]), t = mid(P[i], P[i + 1]);
      ctx.lineWidth = width(i);
      ctx.beginPath(); ctx.moveTo(s[0], s[1]); ctx.quadraticCurveTo(P[i][0], P[i][1], t[0], t[1]); ctx.stroke();
      this.liveIdx = i + 1;
    }
  }

  move(e) {
    if (this.pointers.has(e.pointerId)) this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = this.gesture;
    if (g?.pinch) { if (this.pointers.has(e.pointerId)) this.pinchMove(g); return; }
    if (g?.pan) { if (e.pointerId === g.id) { this.view.x = g.vx + e.clientX - g.x; this.view.y = g.vy + e.clientY - g.y; this.clamp(); this.renderAll(); } return; }
    // only the pointer that started the stroke may draw (a resting palm can't add to it)
    if (this.drawId != null && e.pointerId !== this.drawId) return;
    const [x, y] = this.toPage(e);
    this.hover = [x, y];
    if (this.tool === "laser") {
      const now = performance.now(), evs = this.laserOn && e.getCoalescedEvents ? e.getCoalescedEvents() : [];
      for (const ev of evs.length ? evs : [e]) { const [px, py] = this.toPage(ev); this.laser.push({ x: px, y: py, t: now, brk: !this.laserOn }); }
      this.requestLive(); return;
    }
    if (!this.downAt) { if (this.tool === "eraser") this.requestLive(); return; }
    if (this.cur) {
      const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      const minD = 0.8 / this.view.s;
      for (const ev of evs.length ? evs : [e]) {
        const [px, py] = this.toPage(ev), last = this.cur.pts[this.cur.pts.length - 1];
        if (Math.hypot(px - last[0], py - last[1]) < minD) continue;
        const pt = [px, py]; if (this.cur.pen !== "hl") pt.push(ev.pointerType === "mouse" ? 0.5 : ev.pressure || 0.5);
        this.cur.pts.push(pt);
      }
      this.drawStrokeInc(); return;
    }
    if (this.tool === "eraser") {
      const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
      for (const ev of evs.length ? evs : [e]) { const [px, py] = this.toPage(ev); this.eraseAt(px, py, true); }
      this.requestLive(); return;
    }
    if (this.tool === "select") { this.selectMove(e, x, y); return; }
    if (this.tool === "insert" && this.insertStart) {
      const [sx, sy] = this.insertStart;
      this.preview = this.makeInsert(this.insertKind, sx, sy, x - sx, y - sy, e.shiftKey);
      this.drawLive();
    }
  }

  up(e) {
    this.pointers.delete(e.pointerId);
    const g = this.gesture;
    if (g) {
      if (g.pan && e.pointerId === g.id) { this.gesture = null; if (g.touch) this.swipe(g, e.clientX - g.x, e.clientY - g.y, false); }
      else if (g.pinch && this.pointers.size < 2) { this.gesture = null; this.swipe(g, g.lx - g.cx, g.ly - g.cy, true); }
      return;
    }
    if (e.pointerId !== this.drawId) return;
    this.drawId = null;
    if (!this.downAt) return;
    const [x, y] = this.toPage(e); this.downAt = null;
    if (this.cur) { this.finishStroke(this.cur); this.cur = null; }
    else if (this.tool === "laser") { this.laserOn = false; this.laser.forEach((p) => (p.live = false)); }
    else if (this.tool === "eraser") { if (this.erased) this.commit(); }
    else if (this.tool === "select") this.selectUp(e, x, y);
    else if (this.tool === "insert" && this.insertStart) {
      const [sx, sy] = this.insertStart; this.insertStart = null; this.preview = null;
      const small = Math.abs(x - sx) * this.view.s < 8 && Math.abs(y - sy) * this.view.s < 8;
      const o = small ? this.makeInsert(this.insertKind, sx, sy, null, null) : this.makeInsert(this.insertKind, sx, sy, x - sx, y - sy, e.shiftKey);
      this.addObjects([o]); this.hooks.onToolDone?.();
    }
    this.drawLive();
  }

  // Throw away an unfinished stroke (e.g. a palm started drawing just before the pencil touched down).
  cancelDraw() {
    this.cur = null; this.downAt = null; this.drawId = null; this.insertStart = null; this.preview = null;
    this.marquee = null; this.drag = null; this.dragCache = null; this.laserOn = false;
    this.drawLive();
  }

  // A quick sideways finger swipe changes page (one finger once a pen has been used, or two fingers any time).
  // Only when the page isn't zoomed in sideways, so panning a zoomed page still works.
  swipe(g, dx, dy, pinch) {
    const dt = performance.now() - g.t;
    if (dt > 900 || Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.8) return;
    if (pinch && Math.abs(this.view.s / g.v.s - 1) > 0.15) return; // that was a zoom, not a swipe
    const zoomedIn = this.page.w * g.v.s > this.W + 2;
    if (zoomedIn) return;
    const to = this.idx + (dx < 0 ? 1 : -1);
    if (to < 0 || to >= this.pages.length) { this.view = { ...g.v }; this.clamp(); this.renderAll(); return; }
    this.go(to);
  }

  pinchStart() {
    const [a, b] = [...this.pointers.values()];
    const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
    return { pinch: true, t: performance.now(), d: Math.hypot(a.x - b.x, a.y - b.y), cx, cy, lx: cx, ly: cy, v: { ...this.view } };
  }
  pinchMove(g) {
    const [a, b] = [...this.pointers.values()]; if (!b) return;
    const r = this.cLive.getBoundingClientRect();
    const d = Math.hypot(a.x - b.x, a.y - b.y), cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
    g.lx = cx; g.ly = cy;
    if (this.tool !== "hand") return; // two fingers only change page; pinch-zoom needs the hand tool
    const ns = Math.max(0.1, Math.min(12, (g.v.s * d) / g.d));
    const px = (g.cx - r.left - g.v.x) / g.v.s, py = (g.cy - r.top - g.v.y) / g.v.s;
    this.view.s = ns; this.view.x = cx - r.left - px * ns; this.view.y = cy - r.top - py * ns;
    this.clamp(); this.renderAll();
  }

  // ---------- strokes ----------
  finishStroke(o) {
    o.pts = o.pts.map((p) => p.map(r1));
    let out = o;
    if (o.pen === "hl") out = this.smartHighlight(o) || o;
    else if (this.shapeAssist && o.pen !== "brush") {
      const rec = G.recognize(o.pts);
      if (rec) out = { ...rec, c: o.c, sw: Math.max(2, o.sw * (o.pen === "pencil" ? 0.6 : 1)), dash: o.pen === "dash" ? "dash" : undefined };
    }
    const list = Array.isArray(out) ? out : [out];
    // Freehand ink keeps only points that add visible detail (often 70-85% fewer): lighter to save, redraw and undo.
    for (const x of list) if (x.t === "ink" && x.pts.length > 6) x.pts = G.rdp(x.pts, 0.3);
    this.snap();
    for (const x of list) { x.id = newId(); this.page.objects.push(x); }
    this.sel = [];
    this.hooks.onChange?.(this.page);
    if (list.some((x) => (x.t === "ink" && x.pen === "hl") || x.k === "hl")) this.drawInk(); // highlights go underneath
    else {
      const ctx = this.cInk.getContext("2d"), p = this.page;
      this.setT(ctx); ctx.save(); ctx.beginPath(); ctx.rect(0, 0, p.w, p.h); ctx.clip();
      list.forEach((x) => drawObject(ctx, x)); ctx.restore();
    }
  }

  smartHighlight(o) {
    const P = o.pts; if (P.length < 2) return null;
    const a = P[0], b = P[P.length - 1];
    let L = 0; for (let i = 1; i < P.length; i++) L += G.dist(P[i - 1], P[i]);
    if (G.dist(a, b) / L < 0.85) return null; // freeform scribble stays freeform
    const ang = Math.abs(Math.atan2(b[1] - a[1], b[0] - a[0]));
    const horizontal = ang < 0.2 || ang > Math.PI - 0.2;
    const lines = this.page.bg === "pdf" && this.smartHl ? this.textCache.get(this.page.pdfPage) : null;
    if (horizontal && lines) {
      const ym = P.reduce((s, p) => s + p[1], 0) / P.length;
      const x0 = Math.min(a[0], b[0]), x1 = Math.max(a[0], b[0]);
      const hits = lines.filter((t) => ym >= t.y - 2 && ym <= t.y + t.h + 2 && t.x < x1 && t.x + t.w > x0);
      if (hits.length) {
        const near = hits.reduce((m, t) => (Math.abs(t.y + t.h / 2 - ym) < Math.abs(m.y + m.h / 2 - ym) ? t : m));
        const row = hits.filter((t) => Math.abs(t.y + t.h / 2 - (near.y + near.h / 2)) < near.h * 0.4);
        const top = Math.min(...row.map((t) => t.y)), bot = Math.max(...row.map((t) => t.y + t.h));
        const left = Math.max(x0, Math.min(...row.map((t) => t.x))), right = Math.min(x1, Math.max(...row.map((t) => t.x + t.w)));
        return { t: "shape", k: "hl", c: o.c, sw: 1, x: r1(left), y: r1(top), w: r1(right - left), h: r1(bot - top) };
      }
    }
    // straighten like a ruler-assisted highlighter
    const e = horizontal ? [b[0], (a[1] + b[1]) / 2] : b, s = horizontal ? [a[0], (a[1] + b[1]) / 2] : a;
    return { ...o, pts: [s, e] };
  }

  async loadText(p) {
    if (p.bg !== "pdf" || this.textCache.has(p.pdfPage) || !this.pdf) return;
    this.textCache.set(p.pdfPage, []);
    try {
      const pg = await this.pdf.getPage(p.pdfPage);
      const unit = p.w / pg.getViewport({ scale: 1 }).width, vp = pg.getViewport({ scale: unit });
      const tc = await pg.getTextContent(), out = [];
		const { Util } = await import("../libs/pdf.min.mjs");
      for (const it of tc.items) {
        if (!it.str || !it.str.trim()) continue;
        const tx = Util.transform(vp.transform, it.transform), fh = Math.hypot(tx[2], tx[3]);
        out.push({ x: tx[4], y: tx[5] - fh * 0.92, w: it.width * unit, h: fh * 1.18 });
      }
      this.textCache.set(p.pdfPage, out);
    } catch (e) { console.warn(e); }
  }

  eraseAt(x, y, defer = false) {
    const p = this.page, tol = this.eraser / 2 / this.view.s;
    const hit = p.objects.filter((o) => o.t !== "image" && G.hitTest(o, x, y, tol)); // pictures are removed with Select → Delete
    if (!hit.length) return;
    if (!this.erased) { this.snap(); this.erased = true; }
    const ids = new Set(hit.map((o) => o.id));
    p.objects = p.objects.filter((o) => !ids.has(o.id));
    if (defer) this._inkDirty = true; else this.drawInk();
  }

  // Put a picture in the middle of what is on screen, sized to fit comfortably.
  insertImage(src, iw, ih) {
    const v = this.view, cx = (this.W / 2 - v.x) / v.s, cy = (this.H / 2 - v.y) / v.s;
    const k = Math.min(1, (this.W * 0.6) / v.s / iw, (this.H * 0.6) / v.s / ih);
    const w = iw * k, h = ih * k;
    this.addObjects([{ t: "image", src, x: cx - w / 2, y: cy - h / 2, w, h }]);
  }

  addObjects(objs, select = true) {
    this.snap();
    for (const o of objs) { o.id = newId(); this.page.objects.push(o); }
    this.sel = select ? objs.map((o) => o.id) : [];
    this.commit();
  }

  // ---------- select / move / resize ----------
  selectDown(e, x, y) {
    const so = this.selObjs(), s = this.view.s;
    if (so.length) {
      const b = G.unionBox(so), hs = this.handles(b);
      for (let i = 0; i < 8; i++)
        if (Math.hypot((hs[i][0] - x) * s, (hs[i][1] - y) * s) < HANDLE + 4) return this.beginDrag("resize", x, y, so, b, i);
      if (x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h) return this.beginDrag("move", x, y, so, b);
    }
    const objs = this.page.objects;
    for (let i = objs.length - 1; i >= 0; i--) {
      if (G.hitTest(objs[i], x, y, 8 / s)) {
        if (e.shiftKey) this.sel = [...new Set([...this.sel, objs[i].id])]; else this.sel = [objs[i].id];
        const sel = this.selObjs();
        return this.beginDrag("move", x, y, sel, G.unionBox(sel));
      }
    }
    this.sel = []; this.marquee = { x, y, w: 0, h: 0 }; this.marqueeStart = [x, y];
  }

  beginDrag(mode, x, y, objs, box, handle) {
    this.drag = { mode, x, y, box, handle, orig: new Map(objs.map((o) => [o.id, JSON.stringify(o)])), moved: false };
  }

  selectMove(e, x, y) {
    const d = this.drag;
    if (this.marquee) {
      const [sx, sy] = this.marqueeStart;
      this.marquee = { x: Math.min(sx, x), y: Math.min(sy, y), w: Math.abs(x - sx), h: Math.abs(y - sy) };
      this.drawLive(); return;
    }
    if (!d) return;
    if (!d.moved) {
      if (Math.hypot(x - d.x, y - d.y) * this.view.s < 2) return;
      this.snap(); d.moved = true;
      const c = document.createElement("canvas"); c.width = this.cInk.width; c.height = this.cInk.height;
      const cx = c.getContext("2d"), p = this.page; this.setT(cx);
      cx.beginPath(); cx.rect(0, 0, p.w, p.h); cx.clip();
      drawObjects(cx, p.objects, new Set(this.sel)); this.dragCache = c;
    }
    const b = d.box; let nb;
    if (d.mode === "move") nb = { x: b.x + x - d.x, y: b.y + y - d.y, w: b.w, h: b.h };
    else {
      let x0 = b.x, y0 = b.y, x1 = b.x + b.w, y1 = b.y + b.h; const hi = d.handle;
      if ([0, 6, 7].includes(hi)) x0 = Math.min(x, x1 - 4);
      if ([2, 3, 4].includes(hi)) x1 = Math.max(x, x0 + 4);
      if ([0, 1, 2].includes(hi)) y0 = Math.min(y, y1 - 4);
      if ([4, 5, 6].includes(hi)) y1 = Math.max(y, y0 + 4);
      nb = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
      const keep = e.shiftKey || this.selObjs().every((o) => o.t === "text");
      if (keep && [0, 2, 4, 6].includes(hi)) {
        const k = Math.max(nb.w / b.w, nb.h / b.h); const w = b.w * k, h = b.h * k;
        nb = { x: [0, 6].includes(hi) ? x1 - w : x0, y: [0, 2].includes(hi) ? y1 - h : y0, w, h };
      }
    }
    const objs = this.page.objects;
    for (let i = 0; i < objs.length; i++) {
      const s = d.orig.get(objs[i].id); if (!s) continue;
      const o = JSON.parse(s); G.transformObj(o, b, nb); objs[i] = o;
    }
    this.drawInk(); this.drawLive();
  }

  selectUp(e, x, y) {
    if (this.marquee) {
      const m = this.marquee; this.marquee = null;
      if (m.w > 2 || m.h > 2) this.sel = this.page.objects.filter((o) => G.boxesIntersect(G.bbox(o), m)).map((o) => o.id);
    } else if (this.drag?.moved) { this.dragCache = null; this.commit(); }
    this.drag = null; this.dragCache = null;
  }

  dbl(e) {
    const [x, y] = this.toPage(e);
    const t = [...this.page.objects].reverse().find((o) => o.t === "text" && G.hitTest(o, x, y, 4));
    if (t) this.openText(t.x, t.y, t);
  }

  // ---------- selection actions ----------
  deleteSel() { if (!this.sel.length) return; this.snap(); const ids = new Set(this.sel); this.page.objects = this.page.objects.filter((o) => !ids.has(o.id)); this.sel = []; this.commit(); }
  copySel() { const so = this.selObjs(); if (so.length) this.clip = JSON.stringify(so); }
  paste(off = 24) {
    if (!this.clip) return;
    const objs = JSON.parse(this.clip), b = G.unionBox(objs);
    objs.forEach((o) => G.transformObj(o, b, { ...b, x: b.x + off, y: b.y + off }));
    this.addObjects(objs); this.clip = JSON.stringify(objs);
  }
  duplicate() { this.copySel(); this.paste(); }
  styleSel(patch) {
    const so = this.selObjs(); if (!so.length) return false;
    this.mapSel((o) => { const n = { ...o, ...patch }; if (patch.sw && o.t === "text") delete n.sw; return n; }); return true;
  }
  // Replace selected objects with changed copies (keeps undo history intact).
  mapSel(fn) {
    const ids = new Set(this.sel); if (!ids.size) return; this.snap();
    this.page.objects = this.page.objects.map((o) => (ids.has(o.id) ? fn(o) : o)); this.commit();
  }
  order(front) {
    const ids = new Set(this.sel); if (!ids.size) return; this.snap();
    const a = this.page.objects.filter((o) => ids.has(o.id)), r = this.page.objects.filter((o) => !ids.has(o.id));
    this.page.objects = front ? [...r, ...a] : [...a, ...r]; this.commit();
  }
  clearPage() { if (!this.page.objects.length) return; this.snap(); this.page.objects = []; this.sel = []; this.commit(); }

  // ---------- insert premade shapes ----------
  makeInsert(kind, x, y, w, h, square) {
    const c = this.pen.c, sw = Math.max(2, Math.min(this.pen.sw, 8)), fill = this.fillShapes || undefined;
    const def = INSERT_SIZES[kind] || [240, 180];
    if (w == null) { w = def[0]; h = def[1]; x -= w / 2; y -= h / 2; }
    const line = { "line": 0, "dline": 0, "dotline": 0, "arrow": 1, "darrow": 2 };
    if (kind in line) {
      const nb = { t: "line", c, sw, arrow: line[kind], pts: [[x, y], [x + w, y + h]] };
      if (kind === "dline") nb.dash = "dash"; if (kind === "dotline") nb.dash = "dot";
      return nb;
    }
    if (square) { const m = Math.max(Math.abs(w), Math.abs(h)); w = Math.sign(w || 1) * m; h = Math.sign(h || 1) * m; }
    if (x + w < x) { x += w; w = -w; } if (y + h < y) { y += h; h = -h; }
    const o = { t: "shape", k: kind, c, sw, x, y, w, h, fill };
    if (kind === "table") { o.rows = this.tableRows || 4; o.cols = this.tableCols || 4; delete o.fill; }
    if (kind === "truth") { o.rows = 5; o.cols = 3; delete o.fill; }
    return o;
  }

  // ---------- text ----------
  openText(x, y, existing) {
    if (existing) { this.editingText = existing.id; this.drawInk(); }
    const ta = document.createElement("textarea");
    const size = existing ? existing.size : this.textSize || 40;
    const [sx, sy] = this.toScreen(x, y);
    ta.className = "text-edit"; ta.value = existing ? existing.text : "";
    Object.assign(ta.style, { left: sx + "px", top: sy + "px", fontSize: size * this.view.s + "px", color: existing ? existing.c : this.pen.c, fontFamily: FONT });
    this.stage.appendChild(ta);
    const fitTA = () => { ta.style.height = "auto"; ta.style.height = ta.scrollHeight + "px"; ta.style.width = "auto"; ta.style.width = Math.max(60, ta.scrollWidth + 8) + "px"; };
    ta.addEventListener("input", fitTA);
    ta.addEventListener("keydown", (e) => { e.stopPropagation(); if (e.key === "Escape" || (e.key === "Enter" && (e.metaKey || e.ctrlKey))) this.finishText(); });
    this.textEl = { ta, x, y, size, existing };
    setTimeout(() => { ta.focus(); fitTA(); }, 0);
  }

  finishText() {
    const t = this.textEl; if (!t) return; this.textEl = null; this.editingText = null;
    const text = t.ta.value.replace(/\s+$/, ""); t.ta.remove();
    const ctx = this.cInk.getContext("2d"); ctx.font = `${t.size}px ${FONT}`;
    const lines = text.split("\n"), w = Math.max(...lines.map((l) => ctx.measureText(l).width), 10), h = lines.length * t.size * 1.25;
    if (t.existing) {
      this.snap();
      const id = t.existing.id;
      this.page.objects = text ? this.page.objects.map((o) => (o.id === id ? { ...o, text, w, h } : o)) : this.page.objects.filter((o) => o.id !== id);
      this.commit();
    } else if (text) this.addObjects([{ t: "text", x: t.x, y: t.y, w, h, size: t.size, text, c: this.pen.c }], false);
    else this.drawInk();
  }

  // ---------- pages ----------
  go(i) {
    if (i < 0 || i >= this.pages.length) return;
    if (this.textEl) this.finishText();
    this.idx = i; this.sel = []; this._fitFor = null; this.fit(); this.renderAll();
    this.loadText(this.page);
    this.hooks.onPage?.(i);
  }

  async pageCanvas(p, width, withBg = true, pdfQuality = 1) {
    const k = width / p.w, c = document.createElement("canvas");
    c.width = Math.round(width); c.height = Math.round(p.h * k);
    const ctx = c.getContext("2d"); ctx.scale(k, k);
    if (withBg) {
      let img = null;
      if (p.bg === "pdf" && this.pdf) {
        const pg = await this.pdf.getPage(p.pdfPage);
        const unit = p.w / pg.getViewport({ scale: 1 }).width, vp = pg.getViewport({ scale: unit * k * pdfQuality });
        img = document.createElement("canvas"); img.width = Math.ceil(vp.width); img.height = Math.ceil(vp.height);
        await pg.render({ canvasContext: img.getContext("2d"), viewport: vp }).promise;
      }
      drawBackground(ctx, p, img);
    }
    await preloadImages(p.objects);
    drawObjects(ctx, p.objects);
    return c;
  }
}

export const INSERT_SIZES = {
  "b-heart": [240, 260], "b-lungs": [320, 280], "b-cell": [300, 240], "b-pcell": [300, 220], "b-dna": [140, 320],
  "b-neuron": [440, 180], "b-kidney": [200, 240], "b-leaf": [300, 180], "b-bacteria": [300, 130], "b-mito": [260, 120],
  "b-flower": [200, 300], "b-eye": [280, 240],
  line: [300, 0], dline: [300, 0], dotline: [300, 0], arrow: [300, 0], darrow: [300, 0],
  table: [480, 240], truth: [300, 300], axes4: [600, 600], axes1: [520, 420], graph: [600, 600], numline: [700, 80],
  cube: [220, 220], cyl: [160, 240], cone: [180, 240], resistor: [240, 60], battery: [160, 80], barrow: [240, 120],
  "g-and": [200, 120], "g-or": [200, 120], "g-not": [200, 120], "g-nand": [200, 120], "g-nor": [200, 120], "g-xor": [200, 120], "g-xnor": [200, 120], "g-buf": [200, 120],
  ellipse: [220, 220], rtri: [240, 200], tri: [240, 200],
};
