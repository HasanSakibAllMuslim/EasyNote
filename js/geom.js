// Geometry: bounding boxes, transforms, hit tests and shape recognition.
export const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const PTS_TYPES = new Set(["ink", "line", "poly"]);
export const hasPts = (o) => PTS_TYPES.has(o.t);

export function bounds(P) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of P) { if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

export function bbox(o) {
  if (hasPts(o)) {
    const b = bounds(o.pts), pad = (o.sw || 2) / 2;
    return { x: b.x - pad, y: b.y - pad, w: b.w + pad * 2, h: b.h + pad * 2 };
  }
  const x = Math.min(o.x, o.x + o.w), y = Math.min(o.y, o.y + o.h);
  return { x, y, w: Math.abs(o.w), h: Math.abs(o.h) };
}

export function unionBox(objs) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const o of objs) {
    const b = bbox(o);
    x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.w); y1 = Math.max(y1, b.y + b.h);
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

// Map an object from box `f` to box `t` (move + resize).
export function transformObj(o, f, t) {
  const sx = f.w ? t.w / f.w : 1, sy = f.h ? t.h / f.h : 1;
  const mx = (x) => t.x + (x - f.x) * sx, my = (y) => t.y + (y - f.y) * sy;
  if (hasPts(o)) {
    o.pts = o.pts.map((p) => { const q = [mx(p[0]), my(p[1])]; if (p.length > 2) q.push(p[2]); return q; });
  } else {
    o.x = mx(o.x); o.y = my(o.y); o.w *= sx; o.h *= sy;
    if (o.t === "text") o.size *= Math.abs(sy);
  }
}

function segDist(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1], l = dx * dx + dy * dy;
  let t = l ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
}

export function hitTest(o, x, y, tol) {
  const p = [x, y];
  if (hasPts(o)) {
    const lim = (o.sw || 2) / 2 + tol;
    const P = o.t === "poly" && o.closed ? [...o.pts, o.pts[0]] : o.pts;
    if (P.length === 1) return dist(p, P[0]) < lim;
    for (let i = 1; i < P.length; i++) if (segDist(p, P[i - 1], P[i]) < lim) return true;
    if (o.t === "poly" && o.fill) { const b = bbox(o); return x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h; }
    return false;
  }
  const b = bbox(o);
  return x > b.x - tol && x < b.x + b.w + tol && y > b.y - tol && y < b.y + b.h + tol;
}

export const boxesIntersect = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

function pathLen(P) { let L = 0; for (let i = 1; i < P.length; i++) L += dist(P[i - 1], P[i]); return L; }

export function rdp(P, eps) {
  if (P.length < 3) return P;
  let md = 0, mi = 0;
  for (let i = 1; i < P.length - 1; i++) { const d = segDist(P[i], P[0], P[P.length - 1]); if (d > md) { md = d; mi = i; } }
  if (md <= eps) return [P[0], P[P.length - 1]];
  return [...rdp(P.slice(0, mi + 1), eps).slice(0, -1), ...rdp(P.slice(mi), eps)];
}

function snapAngle(a, b) {
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0]), L = dist(a, b);
  const step = Math.PI / 4, s = Math.round(ang / step) * step;
  const tol = (s / step) % 2 === 0 ? 0.12 : 0.07; // looser for horizontal/vertical
  if (Math.abs(ang - s) < tol) return [a[0] + Math.cos(s) * L, a[1] + Math.sin(s) * L];
  return b;
}

// Turns a freehand stroke into a clean line / circle / ellipse / rectangle / triangle when it looks like one.
export function recognize(pts) {
  const P = pts.map((p) => [p[0], p[1]]);
  if (P.length < 4) return null;
  const L = pathLen(P); if (L < 30) return null;
  const a = P[0], b = P[P.length - 1], chord = dist(a, b), bb = bounds(P), diag = Math.hypot(bb.w, bb.h);

  if (chord / L > 0.93) {
    let md = 0; for (const p of P) md = Math.max(md, segDist(p, a, b));
    if (md < Math.max(0.06 * chord, 4)) return { t: "line", pts: [a, snapAngle(a, b)] };
  }
  const closed = chord < Math.max(0.2 * diag, 20) && L > diag * 1.6;
  if (!closed || bb.w < 15 || bb.h < 15) return null;

  const cx = bb.x + bb.w / 2, cy = bb.y + bb.h / 2, rx = bb.w / 2, ry = bb.h / 2;
  const rs = P.map((p) => Math.hypot((p[0] - cx) / rx, (p[1] - cy) / ry));
  const mean = rs.reduce((s, r) => s + r, 0) / rs.length;
  const std = Math.sqrt(rs.reduce((s, r) => s + (r - mean) ** 2, 0) / rs.length);
  const ellipse = () => {
    let w = bb.w, h = bb.h;
    if (Math.abs(w - h) / Math.max(w, h) < 0.18) w = h = (w + h) / 2; // near-round → perfect circle
    return { t: "shape", k: "ellipse", x: cx - w / 2, y: cy - h / 2, w, h };
  };
  if (std < 0.07) return ellipse();

  // polygon corners on the closed path
  let fi = 0, fd = 0; P.forEach((p, i) => { const d = dist(p, P[0]); if (d > fd) { fd = d; fi = i; } });
  const eps = 0.07 * diag;
  let V = [...rdp(P.slice(0, fi + 1), eps).slice(0, -1), ...rdp([...P.slice(fi), P[0]], eps).slice(0, -1)];
  V = V.filter((v, i) => dist(v, V[(i + 1) % V.length]) > diag * 0.12);
  // drop nearly-straight vertices
  for (let pass = 0; pass < 2; pass++) V = V.filter((v, i) => {
    if (V.length <= 3) return true;
    const p = V[(i - 1 + V.length) % V.length], n = V[(i + 1) % V.length];
    return segDist(v, p, n) > diag * 0.06;
  });
  if (V.length === 3) return { t: "poly", closed: true, pts: V };
  if (V.length === 4) {
    const axis = V.every((v, i) => {
      const n = V[(i + 1) % 4], ang = Math.abs(Math.atan2(n[1] - v[1], n[0] - v[0])) % (Math.PI / 2);
      return ang < 0.25 || ang > Math.PI / 2 - 0.25;
    });
    if (axis) { const r = bounds(V); return { t: "shape", k: "rect", ...r }; }
    return { t: "poly", closed: true, pts: V };
  }
  if (std < 0.16) return ellipse();
  return null;
}
