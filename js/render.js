// Draws page backgrounds and every annotation object onto a 2D canvas (page units).
// ---------- pictures ----------
const IMGS = new Map();
let onImageReady = null;
export const setImageReady = (fn) => (onImageReady = fn);
function getImage(src) {
  let im = IMGS.get(src);
  if (!im) { im = new Image(); im.onload = () => onImageReady?.(); im.src = src; IMGS.set(src, im); }
  return im;
}
// Wait until every picture on a page has loaded (for thumbnails and PDF export).
export function preloadImages(objs) {
  return Promise.all((objs || []).filter((o) => o.t === "image").map((o) => {
    const im = getImage(o.src);
    return im.complete ? null : new Promise((r) => { im.addEventListener("load", r, { once: true }); im.addEventListener("error", r, { once: true }); });
  }));
}

export const FONT = '"Inter", system-ui, -apple-system, sans-serif';

export function hexA(c, a) {
  const n = parseInt(c.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

export function drawBackground(ctx, page, pdfImg) {
  const { w, h, bg } = page;
  const dark = bg === "black" || bg === "dgrid" || bg === "board";
  ctx.fillStyle = bg === "board" ? "#123524" : dark ? "#000" : "#fff";
  ctx.fillRect(0, 0, w, h);
  if (bg === "pdf" && pdfImg) ctx.drawImage(pdfImg, 0, 0, w, h);
  const line = dark ? "rgba(255,255,255,.12)" : "rgba(0,80,160,.16)";
  ctx.strokeStyle = line; ctx.lineWidth = 1;
  if (bg === "grid" || bg === "dgrid") {
    ctx.beginPath();
    for (let x = 40; x < w; x += 40) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
    for (let y = 40; y < h; y += 40) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
    ctx.stroke();
  } else if (bg === "lines") {
    ctx.beginPath();
    for (let y = 70; y < h; y += 44) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
    ctx.stroke();
  } else if (bg === "dots") {
    ctx.fillStyle = "rgba(0,0,0,.25)";
    for (let x = 40; x < w; x += 40) for (let y = 40; y < h; y += 40) ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
  }
}

function dashFor(o) {
  if (o.dash === "dash") return [o.sw * 3, o.sw * 2.2];
  if (o.dash === "dot") return [0.01, o.sw * 2.4];
  return [];
}

// ---------- ink ----------
function smoothPath(ctx, P) {
  ctx.moveTo(P[0][0], P[0][1]);
  if (P.length < 3) { for (const p of P) ctx.lineTo(p[0], p[1]); if (P.length === 1) ctx.lineTo(P[0][0] + 0.01, P[0][1]); return; }
  for (let i = 1; i < P.length - 1; i++) {
    const mx = (P[i][0] + P[i + 1][0]) / 2, my = (P[i][1] + P[i + 1][1]) / 2;
    ctx.quadraticCurveTo(P[i][0], P[i][1], mx, my);
  }
  const l = P[P.length - 1]; ctx.lineTo(l[0], l[1]);
}

function outlineStroke(ctx, P, widthAt) {
  if (P.length < 2) { ctx.beginPath(); ctx.arc(P[0][0], P[0][1], widthAt(0) / 2, 0, 7); ctx.fill(); return; }
  const L = [], R = [];
  for (let i = 0; i < P.length; i++) {
    const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    const r = widthAt(i, dx, dy) / 2;
    L.push([P[i][0] - dy * r, P[i][1] + dx * r]); R.push([P[i][0] + dy * r, P[i][1] - dx * r]);
  }
  ctx.beginPath();
  smoothPath(ctx, L);
  const Rr = R.reverse(); ctx.lineTo(Rr[0][0], Rr[0][1]);
  for (let i = 1; i < Rr.length - 1; i++) ctx.quadraticCurveTo(Rr[i][0], Rr[i][1], (Rr[i][0] + Rr[i + 1][0]) / 2, (Rr[i][1] + Rr[i + 1][1]) / 2);
  ctx.lineTo(Rr[Rr.length - 1][0], Rr[Rr.length - 1][1]);
  ctx.closePath(); ctx.fill();
  const s = P[0], e = P[P.length - 1];
  ctx.beginPath(); ctx.arc(s[0], s[1], widthAt(0) / 2 * 0.95, 0, 7); ctx.arc(e[0], e[1], widthAt(P.length - 1) / 2 * 0.95, 0, 7); ctx.fill();
}

function drawInk(ctx, o) {
  const P = o.pts;
  ctx.strokeStyle = ctx.fillStyle = o.c;
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  if (o.pen === "pen") {
    const pressured = P.some((p) => p[2] !== undefined && Math.abs(p[2] - 0.5) > 0.02);
    // taper the first/last few points slightly for a natural pen look
    const n = P.length;
    outlineStroke(ctx, P, (i) => {
      const t = Math.min(1, (i + 1) / 4, (n - i) / 4);
      const pr = pressured ? 0.35 + 0.9 * (P[i][2] ?? 0.5) : 1;
      return o.sw * pr * (0.55 + 0.45 * t);
    });
    return;
  }
  if (o.pen === "brush") {
    outlineStroke(ctx, P, (i, dx = 1, dy = 0) => o.sw * (0.25 + 1.15 * Math.abs(dx * 0.707 - dy * 0.707)));
    return;
  }
  ctx.lineWidth = o.sw;
  if (o.pen === "hl") { ctx.globalAlpha = 0.38; ctx.lineCap = "butt"; }
  if (o.pen === "dash") ctx.setLineDash([o.sw * 2.5, o.sw * 2]);
  if (o.pen === "pencil") { ctx.globalAlpha = 0.75; ctx.lineWidth = Math.max(1, o.sw * 0.6); }
  ctx.beginPath(); smoothPath(ctx, P); ctx.stroke();
}

// ---------- geometric shapes ----------
function regPoly(ctx, x, y, w, h, n, rot = -Math.PI / 2) {
  for (let i = 0; i < n; i++) {
    const a = rot + (i * 2 * Math.PI) / n, px = x + w / 2 + (Math.cos(a) * w) / 2, py = y + h / 2 + (Math.sin(a) * h) / 2;
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  }
  ctx.closePath();
}

function arrowHead(ctx, from, to, size) {
  const a = Math.atan2(to[1] - from[1], to[0] - from[0]);
  ctx.save(); ctx.setLineDash([]); ctx.beginPath();
  ctx.moveTo(to[0], to[1]);
  ctx.lineTo(to[0] - size * Math.cos(a - 0.45), to[1] - size * Math.sin(a - 0.45));
  ctx.lineTo(to[0] - size * Math.cos(a + 0.45), to[1] - size * Math.sin(a + 0.45));
  ctx.closePath(); ctx.fill(); ctx.restore();
}

const PATHS = {
  rect: (c, x, y, w, h) => c.rect(x, y, w, h),
  rrect: (c, x, y, w, h) => c.roundRect(x, y, w, h, Math.min(Math.abs(w), Math.abs(h)) * 0.15),
  ellipse: (c, x, y, w, h) => c.ellipse(x + w / 2, y + h / 2, Math.abs(w / 2), Math.abs(h / 2), 0, 0, Math.PI * 2),
  tri: (c, x, y, w, h) => { c.moveTo(x + w / 2, y); c.lineTo(x + w, y + h); c.lineTo(x, y + h); c.closePath(); },
  rtri: (c, x, y, w, h) => { c.moveTo(x, y); c.lineTo(x, y + h); c.lineTo(x + w, y + h); c.closePath(); },
  diamond: (c, x, y, w, h) => { c.moveTo(x + w / 2, y); c.lineTo(x + w, y + h / 2); c.lineTo(x + w / 2, y + h); c.lineTo(x, y + h / 2); c.closePath(); },
  para: (c, x, y, w, h) => { c.moveTo(x + w * 0.25, y); c.lineTo(x + w, y); c.lineTo(x + w * 0.75, y + h); c.lineTo(x, y + h); c.closePath(); },
  trap: (c, x, y, w, h) => { c.moveTo(x + w * 0.22, y); c.lineTo(x + w * 0.78, y); c.lineTo(x + w, y + h); c.lineTo(x, y + h); c.closePath(); },
  pent: (c, x, y, w, h) => regPoly(c, x, y, w, h, 5),
  hex: (c, x, y, w, h) => regPoly(c, x, y, w, h, 6, 0),
  star: (c, x, y, w, h) => {
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 0.4 : 1;
      const px = x + w / 2 + (Math.cos(a) * w * r) / 2, py = y + h / 2 + (Math.sin(a) * h * r) / 2;
      i ? c.lineTo(px, py) : c.moveTo(px, py);
    }
    c.closePath();
  },
  barrow: (c, x, y, w, h) => {
    c.moveTo(x, y + h * 0.3); c.lineTo(x + w * 0.6, y + h * 0.3); c.lineTo(x + w * 0.6, y); c.lineTo(x + w, y + h / 2);
    c.lineTo(x + w * 0.6, y + h); c.lineTo(x + w * 0.6, y + h * 0.7); c.lineTo(x, y + h * 0.7); c.closePath();
  },
  cloud: (c, x, y, w, h) => { c.roundRect(x, y, w, h * 0.78, h * 0.3); c.moveTo(x + w * 0.2, y + h * 0.78); c.lineTo(x + w * 0.12, y + h); c.lineTo(x + w * 0.38, y + h * 0.78); },
};

function drawSpecial(ctx, o) {
  const { x, y, w, h } = o, sw = o.sw;
  const line = (x1, y1, x2, y2) => { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); };
  const fs = Math.max(10, Math.min(Math.abs(w), Math.abs(h)) * 0.045);
  ctx.font = `${fs}px ${FONT}`;
  switch (o.k) {
    case "table": {
      const r = o.rows || 3, c = o.cols || 3;
      ctx.beginPath(); ctx.rect(x, y, w, h);
      for (let i = 1; i < r; i++) { ctx.moveTo(x, y + (h * i) / r); ctx.lineTo(x + w, y + (h * i) / r); }
      for (let i = 1; i < c; i++) { ctx.moveTo(x + (w * i) / c, y); ctx.lineTo(x + (w * i) / c, y + h); }
      ctx.stroke();
      ctx.fillStyle = hexA(o.c, 0.12); ctx.fillRect(x, y, w, h / r);
      return true;
    }
    case "truth": { // truth table header A B | Y
      const r = o.rows || 5, c = o.cols || 3;
      ctx.beginPath(); ctx.rect(x, y, w, h);
      for (let i = 1; i < r; i++) { ctx.moveTo(x, y + (h * i) / r); ctx.lineTo(x + w, y + (h * i) / r); }
      for (let i = 1; i < c; i++) { ctx.moveTo(x + (w * i) / c, y); ctx.lineTo(x + (w * i) / c, y + h); }
      ctx.stroke();
      ctx.save(); ctx.lineWidth = sw * 2; line(x + (w * (c - 1)) / c, y, x + (w * (c - 1)) / c, y + h); ctx.restore();
      ctx.fillStyle = o.c; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.font = `bold ${Math.min(h / r, w / c) * 0.45}px ${FONT}`;
      const names = ["A", "B", "C", "D"];
      for (let i = 0; i < c; i++) ctx.fillText(i === c - 1 ? "Y" : names[i], x + (w * (i + 0.5)) / c, y + h / r / 2);
      return true;
    }
    case "axes4": case "axes1": case "graph": case "numline": {
      const q1 = o.k === "axes1", nl = o.k === "numline";
      const ox = q1 ? x + w * 0.06 : x + w / 2, oy = nl ? y + h / 2 : q1 ? y + h * 0.94 : y + h / 2;
      const n = 10, stepX = q1 ? (w * 0.88) / n : (w * 0.46) / n, stepY = q1 ? (h * 0.88) / n : (h * 0.46) / n;
      if (o.k === "graph") {
        ctx.save(); ctx.globalAlpha = 0.25; ctx.lineWidth = 1; ctx.beginPath();
        for (let i = -n; i <= n; i++) { ctx.moveTo(ox + i * stepX, y + h * 0.04); ctx.lineTo(ox + i * stepX, y + h * 0.96); ctx.moveTo(x + w * 0.04, oy + i * stepY); ctx.lineTo(x + w * 0.96, oy + i * stepY); }
        ctx.stroke(); ctx.restore();
      }
      const head = Math.max(8, sw * 4);
      ctx.fillStyle = o.c;
      line(q1 ? ox : x, oy, x + w, oy); arrowHead(ctx, [x, oy], [x + w, oy], head);
      if (!q1) arrowHead(ctx, [x + w, oy], [x, oy], head);
      if (!nl) {
        line(ox, q1 ? oy : y + h, ox, y); arrowHead(ctx, [ox, y + h], [ox, y], head);
        if (!q1) arrowHead(ctx, [ox, y], [ox, y + h], head);
      }
      ctx.textAlign = "center"; ctx.textBaseline = "top";
      const t = Math.max(4, fs * 0.35);
      for (let i = q1 ? 1 : -n + 1; i < n; i++) {
        if (!i) continue;
        line(ox + i * stepX, oy - t, ox + i * stepX, oy + t);
        ctx.fillText(String(i), ox + i * stepX, oy + t + 2);
        if (!nl) { line(ox - t, oy - i * stepY, ox + t, oy - i * stepY); ctx.textAlign = "right"; ctx.textBaseline = "middle"; ctx.fillText(String(i), ox - t - 3, oy - i * stepY); ctx.textAlign = "center"; ctx.textBaseline = "top"; }
      }
      if (nl) { line(ox, oy - t * 1.4, ox, oy + t * 1.4); }
      ctx.fillText("0", ox - (nl ? 0 : fs * 0.6), oy + t + 2);
      ctx.font = `bold ${fs * 1.4}px ${FONT}`;
      ctx.fillText("X", x + w - fs, oy + t + fs * 0.4);
      if (!nl) { ctx.textAlign = "left"; ctx.fillText("Y", ox + t + 6, y); }
      return true;
    }
    case "cube": {
      const d = Math.min(w, h) * 0.3;
      ctx.beginPath(); ctx.rect(x, y + d, w - d, h - d);
      ctx.moveTo(x, y + d); ctx.lineTo(x + d, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w - d, y + d);
      ctx.moveTo(x + w, y); ctx.lineTo(x + w, y + h - d); ctx.lineTo(x + w - d, y + h);
      ctx.stroke();
      ctx.save(); ctx.setLineDash([sw * 3, sw * 3]); ctx.beginPath();
      ctx.moveTo(x + d, y); ctx.lineTo(x + d, y + h - d); ctx.lineTo(x + w, y + h - d); ctx.moveTo(x + d, y + h - d); ctx.lineTo(x, y + h);
      ctx.stroke(); ctx.restore();
      return true;
    }
    case "cyl": {
      const e = h * 0.12;
      ctx.beginPath(); ctx.ellipse(x + w / 2, y + e, w / 2, e, 0, 0, Math.PI * 2);
      ctx.moveTo(x, y + e); ctx.lineTo(x, y + h - e); ctx.moveTo(x + w, y + e); ctx.lineTo(x + w, y + h - e);
      ctx.moveTo(x + w, y + h - e); ctx.ellipse(x + w / 2, y + h - e, w / 2, e, 0, 0, Math.PI);
      ctx.stroke();
      ctx.save(); ctx.setLineDash([sw * 3, sw * 3]); ctx.beginPath(); ctx.ellipse(x + w / 2, y + h - e, w / 2, e, 0, Math.PI, Math.PI * 2); ctx.stroke(); ctx.restore();
      return true;
    }
    case "cone": {
      const e = h * 0.1;
      ctx.beginPath(); ctx.moveTo(x, y + h - e); ctx.lineTo(x + w / 2, y); ctx.lineTo(x + w, y + h - e);
      ctx.moveTo(x + w, y + h - e); ctx.ellipse(x + w / 2, y + h - e, w / 2, e, 0, 0, Math.PI); ctx.stroke();
      ctx.save(); ctx.setLineDash([sw * 3, sw * 3]); ctx.beginPath(); ctx.ellipse(x + w / 2, y + h - e, w / 2, e, 0, Math.PI, Math.PI * 2); ctx.stroke(); ctx.restore();
      return true;
    }
    case "resistor": {
      const my = y + h / 2; ctx.beginPath(); ctx.moveTo(x, my); ctx.lineTo(x + w * 0.2, my);
      for (let i = 0; i < 6; i++) ctx.lineTo(x + w * (0.2 + (i + 0.5) * 0.1), my + (i % 2 ? h : -h) * 0.4);
      ctx.lineTo(x + w * 0.8, my); ctx.lineTo(x + w, my); ctx.stroke(); return true;
    }
    case "battery": {
      const my = y + h / 2; ctx.beginPath(); ctx.moveTo(x, my); ctx.lineTo(x + w * 0.45, my); ctx.moveTo(x + w * 0.55, my); ctx.lineTo(x + w, my);
      ctx.moveTo(x + w * 0.45, y); ctx.lineTo(x + w * 0.45, y + h); ctx.stroke();
      ctx.save(); ctx.lineWidth = sw * 2.5; line(x + w * 0.55, y + h * 0.25, x + w * 0.55, y + h * 0.75); ctx.restore(); return true;
    }
  }
  if (o.k.startsWith("g-")) { drawGate(ctx, o, o.k.slice(2)); return true; }
  if (o.k.startsWith("b-")) { drawBio(ctx, o, o.k.slice(2)); return true; }
  return false;
}

// ---------- biology diagrams (line art in a 0..1 box, so they resize and recolour like any shape) ----------
function drawBio(ctx, o, kind) {
  const { x, y, w, h } = o, sw = o.sw;
  const X = (u) => x + u * w, Y = (v) => y + v * h;
  const fillC = o.fill ? hexA(o.c, 0.18) : null;
  const M = (u, v) => ctx.moveTo(X(u), Y(v)), L = (u, v) => ctx.lineTo(X(u), Y(v));
  const C = (a, b, c, d, e, f) => ctx.bezierCurveTo(X(a), Y(b), X(c), Y(d), X(e), Y(f));
  const Q = (a, b, c, d) => ctx.quadraticCurveTo(X(a), Y(b), X(c), Y(d));
  const E = (u, v, ru, rv, rot = 0) => { ctx.moveTo(X(u) + Math.abs(ru * w) * Math.cos(rot), Y(v) + Math.abs(ru * w) * Math.sin(rot)); ctx.ellipse(X(u), Y(v), Math.abs(ru * w), Math.abs(rv * h), rot, 0, Math.PI * 2); };
  const shape = (fn, fill = true) => { ctx.beginPath(); fn(); if (fill && fillC) { ctx.fillStyle = fillC; ctx.fill(); } ctx.stroke(); };
  const open = (fn) => { ctx.beginPath(); fn(); ctx.stroke(); };
  const line = (a, b, c, d) => open(() => { M(a, b); L(c, d); });
  const dot = (u, v, r) => { ctx.beginPath(); ctx.arc(X(u), Y(v), r, 0, Math.PI * 2); ctx.fillStyle = o.c; ctx.fill(); };
  const solid = (fn) => { ctx.beginPath(); fn(); ctx.fillStyle = o.c; ctx.fill(); };
  const thin = (fn) => { ctx.save(); ctx.lineWidth = Math.max(1, sw * 0.6); fn(); ctx.restore(); };

  switch (kind) {
    case "heart": {
      // aorta arch (tube) and its three branches
      open(() => { M(0.42, 0.30); C(0.38, 0.03, 0.80, 0.00, 0.80, 0.26); M(0.52, 0.28); C(0.51, 0.13, 0.70, 0.12, 0.70, 0.28); });
      for (const u of [0.50, 0.59, 0.68]) open(() => { M(u - 0.02, 0.10); L(u - 0.03, 0.0); M(u + 0.02, 0.09); L(u + 0.02, 0.0); });
      // superior vena cava
      open(() => { M(0.22, 0.04); L(0.24, 0.40); M(0.31, 0.04); L(0.32, 0.30); });
      // body
      shape(() => { M(0.28, 0.33); C(0.06, 0.50, 0.24, 0.82, 0.56, 0.98); C(0.83, 0.80, 0.98, 0.55, 0.84, 0.36); C(0.74, 0.22, 0.44, 0.22, 0.28, 0.33); ctx.closePath(); });
      // groove between the ventricles
      thin(() => open(() => { M(0.56, 0.38); C(0.48, 0.58, 0.54, 0.78, 0.60, 0.93); }));
      return;
    }
    case "lungs": {
      const lobe = (m) => {
        const U = (u) => (m ? 1 - u : u);
        shape(() => { M(U(0.44), 0.33); C(U(0.40), 0.20, U(0.30), 0.18, U(0.24), 0.26); C(U(0.10), 0.45, U(0.03), 0.75, U(0.07), 0.95); C(U(0.20), 0.99, U(0.36), 0.95, U(0.44), 0.87); Q(U(0.40), 0.60, U(0.44), 0.33); ctx.closePath(); });
        thin(() => open(() => { M(U(0.47), 0.31); Q(U(0.44), 0.37, U(0.36), 0.43); L(U(0.27), 0.53); M(U(0.36), 0.43); L(U(0.32), 0.62); M(U(0.30), 0.50); L(U(0.20), 0.58); M(U(0.32), 0.62); L(U(0.24), 0.74); M(U(0.32), 0.62); L(U(0.36), 0.78); }));
      };
      lobe(false); lobe(true);
      // trachea with cartilage rings
      open(() => { M(0.46, 0.0); L(0.46, 0.30); M(0.54, 0.0); L(0.54, 0.30); });
      thin(() => { for (let v = 0.04; v < 0.29; v += 0.05) line(0.46, v, 0.54, v); });
      return;
    }
    case "cell": { // animal cell
      shape(() => { M(0.50, 0.04); C(0.80, 0.02, 0.99, 0.25, 0.97, 0.52); C(0.96, 0.82, 0.74, 0.98, 0.48, 0.96); C(0.20, 0.95, 0.02, 0.76, 0.03, 0.48); C(0.04, 0.20, 0.24, 0.05, 0.50, 0.04); ctx.closePath(); });
      shape(() => E(0.40, 0.46, 0.15, 0.19));
      solid(() => E(0.43, 0.48, 0.045, 0.06));
      // mitochondria
      for (const [u, v, r] of [[0.74, 0.28, 0.5], [0.72, 0.74, -0.4], [0.22, 0.80, 0.2]]) {
        shape(() => E(u, v, 0.09, 0.045, r), false);
        thin(() => open(() => { for (let i = 0; i <= 6; i++) { const t = -0.06 + i * 0.02; const p = [u + t * Math.cos(r), v + t * Math.sin(r) * (w / h) + (i % 2 ? 0.02 : -0.02)]; i ? L(p[0], p[1]) : M(p[0], p[1]); } }));
      }
      // endoplasmic reticulum
      thin(() => { for (let i = 0; i < 3; i++) open(() => { M(0.58 + i * 0.035, 0.32); Q(0.65 + i * 0.035, 0.47, 0.58 + i * 0.035, 0.62); }); });
      // ribosomes
      const r = Math.max(1.5, sw * 0.8);
      for (const [u, v] of [[0.62, 0.30], [0.70, 0.45], [0.66, 0.62], [0.30, 0.20], [0.20, 0.40], [0.86, 0.50], [0.55, 0.85], [0.35, 0.72], [0.82, 0.66]]) dot(u, v, r);
      return;
    }
    case "pcell": { // plant cell
      const rr = Math.min(w, h) * 0.08;
      shape(() => ctx.roundRect(X(0.02), Y(0.02), w * 0.96, h * 0.96, rr));
      open(() => ctx.roundRect(X(0.06), Y(0.07), w * 0.88, h * 0.86, rr * 0.8));
      shape(() => ctx.roundRect(X(0.32), Y(0.22), w * 0.50, h * 0.56, rr));
      shape(() => E(0.18, 0.32, 0.07, 0.11));
      solid(() => E(0.19, 0.33, 0.022, 0.035));
      for (const [u, v] of [[0.16, 0.70], [0.42, 0.87], [0.70, 0.13], [0.88, 0.82], [0.89, 0.45]]) {
        shape(() => E(u, v, 0.055, 0.035), false);
        thin(() => { for (const d of [-0.02, 0, 0.02]) line(u + d, v - 0.018, u + d, v + 0.018); });
      }
      return;
    }
    case "dna": {
      const turns = 2, N = 80, A = 0.40;
      for (const ph of [0, Math.PI]) open(() => { for (let i = 0; i <= N; i++) { const t = i / N, u = 0.5 + A * Math.sin(2 * Math.PI * turns * t + ph); i ? L(u, t) : M(u, t); } });
      thin(() => { for (let k = 1; k < 16; k++) { const t = k / 16, s = Math.sin(2 * Math.PI * turns * t); if (Math.abs(s) > 0.15) line(0.5 + A * s, t, 0.5 - A * s, t); } });
      return;
    }
    case "neuron": {
      // dendrites
      thin(() => open(() => {
        for (const [a, b, c, d, e, f, g, i] of [
          [0.10, 0.38, 0.04, 0.12, 0.00, 0.02, 0.08, 0.00], [0.18, 0.36, 0.20, 0.08, 0.16, 0.00, 0.26, 0.02],
          [0.08, 0.62, 0.03, 0.88, 0.00, 0.98, 0.08, 1.00], [0.18, 0.64, 0.22, 0.92, 0.18, 1.00, 0.28, 0.98],
          [0.07, 0.50, 0.01, 0.50, 0.00, 0.40, 0.00, 0.60]]) { M(a, b); L(c, d); L(e, f); M(c, d); L(g, i); }
      }));
      shape(() => E(0.14, 0.50, 0.075, 0.20));
      solid(() => E(0.14, 0.50, 0.022, 0.055));
      line(0.215, 0.50, 0.82, 0.50); // axon
      for (let i = 0; i < 4; i++) shape(() => ctx.roundRect(X(0.27 + i * 0.135), Y(0.42), w * 0.105, h * 0.16, h * 0.08));
      thin(() => open(() => { M(0.82, 0.50); L(0.93, 0.28); M(0.82, 0.50); L(0.96, 0.50); M(0.82, 0.50); L(0.93, 0.72); }));
      const kr = Math.max(2.5, Math.min(w, h) * 0.035);
      for (const [u, v] of [[0.93, 0.28], [0.96, 0.50], [0.93, 0.72]]) { ctx.beginPath(); ctx.arc(X(u), Y(v), kr, 0, Math.PI * 2); if (fillC) { ctx.fillStyle = fillC; ctx.fill(); } ctx.stroke(); }
      return;
    }
    case "kidney": {
      shape(() => { M(0.55, 0.05); C(0.85, 0.02, 0.99, 0.35, 0.93, 0.60); C(0.87, 0.88, 0.60, 1.00, 0.40, 0.92); C(0.24, 0.85, 0.22, 0.70, 0.35, 0.62); C(0.45, 0.56, 0.45, 0.44, 0.35, 0.38); C(0.22, 0.30, 0.25, 0.10, 0.55, 0.05); ctx.closePath(); });
      open(() => { M(0.37, 0.52); C(0.22, 0.58, 0.12, 0.74, 0.08, 1.0); M(0.39, 0.58); C(0.26, 0.64, 0.19, 0.78, 0.16, 1.0); }); // ureter
      thin(() => open(() => { M(0.45, 0.40); Q(0.60, 0.50, 0.45, 0.60); M(0.53, 0.45); L(0.72, 0.28); M(0.55, 0.50); L(0.80, 0.50); M(0.53, 0.56); L(0.72, 0.74); }));
      thin(() => { ctx.save(); ctx.setLineDash([sw * 2, sw * 2]); open(() => { M(0.58, 0.12); C(0.85, 0.12, 0.92, 0.45, 0.86, 0.62); C(0.80, 0.82, 0.62, 0.90, 0.46, 0.84); }); ctx.restore(); });
      return;
    }
    case "leaf": {
      shape(() => { M(0.12, 0.50); Q(0.50, -0.05, 0.98, 0.50); Q(0.50, 1.05, 0.12, 0.50); ctx.closePath(); });
      line(0.0, 0.56, 0.98, 0.50);
      thin(() => { for (const u of [0.24, 0.38, 0.52, 0.66, 0.80]) { const env = 0.40 * (1 - ((u - 0.55) / 0.45) ** 2); line(u, 0.51, u + 0.08, 0.51 - env * 0.85); line(u, 0.52, u + 0.08, 0.52 + env * 0.85); } });
      return;
    }
    case "bacteria": {
      shape(() => ctx.roundRect(X(0.06), Y(0.18), w * 0.70, h * 0.64, h * 0.32));
      thin(() => open(() => { for (let i = 0; i <= 40; i++) { const t = i / 40, u = 0.20 + 0.42 * t, v = 0.50 + 0.10 * Math.sin(t * Math.PI * 6); i ? L(u, v) : M(u, v); } }));
      open(() => { for (let i = 0; i <= 40; i++) { const t = i / 40, u = 0.76 + 0.24 * t, v = 0.50 + 0.14 * Math.sin(t * Math.PI * 4); i ? L(u, v) : M(u, v); } }); // flagellum
      thin(() => { for (const u of [0.20, 0.32, 0.44, 0.56, 0.66]) { line(u, 0.18, u - 0.02, 0.04); line(u, 0.82, u - 0.02, 0.96); } }); // pili
      return;
    }
    case "mito": {
      shape(() => E(0.5, 0.5, 0.48, 0.44));
      open(() => { M(0.10, 0.50); for (let i = 0; i < 8; i++) { const u0 = 0.10 + i * 0.10, up = i % 2 === 0; Q(u0 + 0.05, up ? 0.16 : 0.84, u0 + 0.10, 0.50); } });
      return;
    }
    case "flower": {
      const R = Math.min(w, h) * 0.22;
      for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; shape(() => { const cx = X(0.5) + Math.cos(a) * R, cy = Y(0.30) + Math.sin(a) * R; ctx.moveTo(cx + Math.cos(a) * R * 0.75, cy + Math.sin(a) * R * 0.75); ctx.ellipse(cx, cy, R * 0.75, R * 0.36, a, 0, Math.PI * 2); }); }
      shape(() => { ctx.moveTo(X(0.5) + R * 0.5, Y(0.30)); ctx.arc(X(0.5), Y(0.30), R * 0.5, 0, Math.PI * 2); });
      line(0.5, 0.48, 0.5, 1.0);
      shape(() => { M(0.5, 0.80); Q(0.70, 0.62, 0.84, 0.70); Q(0.70, 0.84, 0.5, 0.80); });
      shape(() => { M(0.5, 0.70); Q(0.30, 0.54, 0.16, 0.62); Q(0.30, 0.76, 0.5, 0.70); });
      return;
    }
    case "eye": {
      shape(() => E(0.46, 0.5, 0.42, 0.42));
      open(() => { M(0.84, 0.20); Q(1.0, 0.5, 0.84, 0.80); }); // cornea bulge
      shape(() => E(0.80, 0.50, 0.05, 0.16), false); // lens
      open(() => { M(0.86, 0.24); L(0.80, 0.34); M(0.86, 0.76); L(0.80, 0.66); }); // iris
      thin(() => { ctx.save(); ctx.setLineDash([sw * 2, sw * 2]); open(() => { M(0.30, 0.13); C(0.08, 0.25, 0.08, 0.75, 0.30, 0.87); }); ctx.restore(); }); // retina
      open(() => { M(0.06, 0.44); L(0.0, 0.44); M(0.06, 0.56); L(0.0, 0.56); }); // optic nerve
      return;
    }
  }
}

function drawGate(ctx, o, kind) {
  const { x, y, w, h } = o;
  const base = { and: "and", nand: "and", or: "or", nor: "or", xor: "xor", xnor: "xor", not: "buf", buf: "buf" }[kind];
  const bubble = ["nand", "nor", "xnor", "not"].includes(kind);
  const r = h * 0.08, bx = x + w * 0.2, right = x + w * 0.8 - (bubble ? 2 * r : 0), bw = right - bx;
  const fill = o.fill ? hexA(o.c, 0.15) : null;
  ctx.beginPath();
  if (base === "and") {
    const mid = bx + bw * 0.45;
    ctx.moveTo(bx, y); ctx.lineTo(mid, y); ctx.ellipse(mid, y + h / 2, right - mid, h / 2, 0, -Math.PI / 2, Math.PI / 2);
    ctx.lineTo(bx, y + h); ctx.closePath();
  } else if (base === "buf") {
    ctx.moveTo(bx, y); ctx.lineTo(right, y + h / 2); ctx.lineTo(bx, y + h); ctx.closePath();
  } else {
    const s = base === "xor" ? bw * 0.12 : 0, l = bx + s;
    ctx.moveTo(l, y); ctx.quadraticCurveTo(l + (right - l) * 0.6, y, right, y + h / 2);
    ctx.quadraticCurveTo(l + (right - l) * 0.6, y + h, l, y + h); ctx.quadraticCurveTo(l + bw * 0.28, y + h / 2, l, y);
    if (s) { ctx.moveTo(bx, y); ctx.quadraticCurveTo(bx + bw * 0.28, y + h / 2, bx, y + h); }
  }
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  ctx.stroke();
  if (bubble) { ctx.beginPath(); ctx.arc(right + r, y + h / 2, r, 0, 7); ctx.stroke(); }
  ctx.beginPath();
  const inset = base === "buf" || base === "and" ? 0 : bw * (base === "xor" ? 0.1 : 0.12);
  const ins = base === "buf" ? [0.5] : [0.3, 0.7];
  for (const f of ins) { ctx.moveTo(x, y + h * f); ctx.lineTo(bx + inset, y + h * f); }
  ctx.moveTo(right + (bubble ? 2 * r : 0), y + h / 2); ctx.lineTo(x + w, y + h / 2);
  ctx.stroke();
}

export function drawObject(ctx, o) {
  ctx.save();
  ctx.strokeStyle = ctx.fillStyle = o.c;
  ctx.lineWidth = o.sw || 2; ctx.lineCap = "round"; ctx.lineJoin = "round";
  if (o.t === "ink") drawInk(ctx, o);
  else if (o.t === "line") {
    ctx.setLineDash(dashFor(o));
    const [a, b] = o.pts;
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    const hs = Math.max(10, o.sw * 4);
    if (o.arrow >= 1) arrowHead(ctx, a, b, hs);
    if (o.arrow === 2) arrowHead(ctx, b, a, hs);
  } else if (o.t === "poly") {
    ctx.setLineDash(dashFor(o));
    ctx.beginPath(); o.pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    if (o.closed) ctx.closePath();
    if (o.fill) { ctx.fillStyle = hexA(o.c, 0.2); ctx.fill(); }
    ctx.stroke();
  } else if (o.t === "text") {
    ctx.font = `${o.size}px ${FONT}`; ctx.textBaseline = "top";
    String(o.text).split("\n").forEach((ln, i) => ctx.fillText(ln, o.x, o.y + i * o.size * 1.25));
  } else if (o.t === "image") {
    const im = getImage(o.src);
    if (im.complete && im.naturalWidth) ctx.drawImage(im, o.x, o.y, o.w, o.h);
  } else if (o.t === "shape") {
    if (o.k === "hl") { ctx.globalAlpha = 0.38; ctx.fillRect(o.x, o.y, o.w, o.h); }
    else if (!drawSpecial(ctx, o)) {
      ctx.setLineDash(dashFor(o));
      ctx.beginPath(); (PATHS[o.k] || PATHS.rect)(ctx, o.x, o.y, o.w, o.h);
      if (o.fill) { ctx.fillStyle = hexA(o.c, 0.2); ctx.fill(); }
      ctx.stroke();
    }
  }
  ctx.restore();
}

// Highlighter marks are drawn under everything else so ink stays crisp on top.
export function drawObjects(ctx, objs, skip) {
  for (const o of objs) if (!skip?.has(o.id) && ((o.t === "ink" && o.pen === "hl") || o.k === "hl")) drawObject(ctx, o);
  for (const o of objs) if (!skip?.has(o.id) && !((o.t === "ink" && o.pen === "hl") || o.k === "hl")) drawObject(ctx, o);
}
