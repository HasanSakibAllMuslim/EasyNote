// 100% Offline Local Storage using Browser IndexedDB (No Firebase / No Internet needed)
const DB_NAME = "NotationOfflineDB";
const DB_VER = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("notebooks")) db.createObjectStore("notebooks", { keyPath: "id" });
      if (!db.objectStoreNames.contains("pages")) db.createObjectStore("pages", { keyPath: "key" });
      if (!db.objectStoreNames.contains("pdfs")) db.createObjectStore("pdfs", { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbTx(storeName, mode, fn) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const req = fn(store);
    tx.oncomplete = () => resolve(req?.result);
    tx.onerror = () => reject(tx.error);
  });
}

export const auth = {};
export const ADMIN_EMAIL = "offline@local.pc";
let uid = "offline_user";
export const setUid = (u) => { uid = u || "offline_user"; };
export const newId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

// Auto-login offline user immediately
export function onUser(cb) {
  setTimeout(() => cb({
    uid: "offline_user",
    displayName: "Offline User",
    email: "offline@local.pc",
    photoURL: "assets/avatar.jpg"
  }), 10);
  return () => {};
}

export function googleSignIn() { return Promise.resolve(); }
export function logout() { return Promise.resolve(); }
export function touchLogin() { return Promise.resolve(); }

const unlimitedSub = { toMillis: () => Date.now() + 3650 * 864e5 };
export async function getProfile() {
  return { name: "Offline User", email: "offline@local.pc", role: "teacher", subEnd: unlimitedSub };
}
export async function createProfile(user, extra) {
  return { name: extra.name || "Offline User", email: "offline@local.pc", role: extra.role || "teacher", subEnd: unlimitedSub };
}
export async function ensureSub(prof) {
  return { ...prof, subEnd: unlimitedSub };
}
export async function getSettings() { return { trialDays: 3650 }; }
export function setTrialDays() { return Promise.resolve(); }
export async function adminLoad() { return { users: [], totals: { notes: 0, pages: 0, pdfs: 0, notes7: 0 } }; }
export function setPlans() { return Promise.resolve(); }
export const normTxn = (t) => String(t).toUpperCase().replace(/\s+/g, "");
export const validTxn = () => true;
export async function verifyPayment() { return { ok: true }; }
export async function submitPayment() { return Promise.resolve(); }
export async function myPayments() { return []; }
export async function adminPayments() { return []; }
export async function adminDecide() { return Promise.resolve(); }
export function adminSetSub() { return Promise.resolve(); }
export async function deleteAccount() { return Promise.resolve(); }

// Notebook Operations
export async function listNotebooks() {
  const list = await dbTx("notebooks", "readonly", (s) => s.getAll()) || [];
  return list
    .sort((a, b) => (b.updatedMs || 0) - (a.updatedMs || 0))
    .map((nb) => ({
      ...nb,
      updatedAt: { toDate: () => new Date(nb.updatedMs || Date.now()) }
    }));
}

export async function createNotebook({ title, pages, pdfBytes, onProgress }) {
  const id = newId();
  if (pdfBytes) {
    await dbTx("pdfs", "readwrite", (s) => s.put({ id, bytes: pdfBytes }));
    onProgress && onProgress(1);
  }
  const db = await openDB();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(["pages", "notebooks"], "readwrite");
    const pStore = tx.objectStore("pages");
    for (const p of pages) {
      pStore.put({ key: `${id}_${p.id}`, nbId: id, page: JSON.parse(JSON.stringify(p)) });
    }
    tx.objectStore("notebooks").put({
      id,
      title: title || "Untitled",
      pageOrder: pages.map((p) => p.id),
      pdfChunks: pdfBytes ? 1 : 0,
      createdMs: Date.now(),
      updatedMs: Date.now(),
      thumb: ""
    });
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  return id;
}

export async function loadNotebook(id) {
  const meta = await dbTx("notebooks", "readonly", (s) => s.get(id));
  if (!meta) throw new Error("Notebook not found");

  const allPages = await dbTx("pages", "readonly", (s) => s.getAll()) || [];
  const map = {};
  for (const item of allPages) {
    if (item.nbId === id) map[item.page.id] = item.page;
  }
  const pages = (meta.pageOrder || []).map((pid) => map[pid]).filter(Boolean);

  let pdfBytes = null;
  if (meta.pdfChunks) {
    const pdfRec = await dbTx("pdfs", "readonly", (s) => s.get(id));
    if (pdfRec) pdfBytes = pdfRec.bytes;
  }
  return { meta, pages, pdfBytes };
}

export function savePage(nbId, page) {
  return dbTx("pages", "readwrite", (s) =>
    s.put({ key: `${nbId}_${page.id}`, nbId, page: JSON.parse(JSON.stringify(page)) })
  );
}

export function deletePageDoc(nbId, pid) {
  return dbTx("pages", "readwrite", (s) => s.delete(`${nbId}_${pid}`));
}

export async function saveMeta(nbId, data) {
  const meta = await dbTx("notebooks", "readonly", (s) => s.get(nbId));
  if (!meta) return;
  Object.assign(meta, data, { updatedMs: Date.now() });
  return dbTx("notebooks", "readwrite", (s) => s.put(meta));
}

export async function deleteNotebook(id) {
  const allPages = await dbTx("pages", "readonly", (s) => s.getAll()) || [];
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(["notebooks", "pages", "pdfs"], "readwrite");
    tx.objectStore("notebooks").delete(id);
    tx.objectStore("pdfs").delete(id);
    const pStore = tx.objectStore("pages");
    for (const item of allPages) {
      if (item.nbId === id) pStore.delete(item.key);
    }
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}


