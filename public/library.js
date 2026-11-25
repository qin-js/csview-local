const DB_NAME = 'csview-library';
const DB_VER = 1;
let dbp = null;

function open() {
  if (dbp) return dbp;
  dbp = new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) { reject(new Error('这个浏览器不支持 IndexedDB')); return; }
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('files')) db.createObjectStore('files');
      if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('IndexedDB 打开失败'));
    req.onblocked = () => reject(new Error('IndexedDB 被其他标签页占用，请关闭后重试'));
  });
  return dbp;
}

function tx(db, stores, mode) { return db.transaction(stores, mode); }

function reqp(r) { return new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }

export async function getInfo() {
  try {
    const db = await open();
    return (await reqp(tx(db, ['meta'], 'readonly').objectStore('meta').get('info'))) || null;
  } catch { return null; }
}

export async function getJson(path) {
  const db = await open();
  const v = await reqp(tx(db, ['files'], 'readonly').objectStore('files').get(path));
  if (v == null) throw new Error(`本地题库缺少 ${path}`);
  return v;
}

const urlCache = new Map();
export async function getAssetUrl(path) {
  if (urlCache.has(path)) return urlCache.get(path);
  const db = await open();
  const blob = await reqp(tx(db, ['files'], 'readonly').objectStore('files').get(path));
  if (!(blob instanceof Blob)) return null;
  const url = URL.createObjectURL(blob);
  urlCache.set(path, url);
  return url;
}

export function releaseAssets() {
  for (const u of urlCache.values()) URL.revokeObjectURL(u);
  urlCache.clear();
}

export async function writeLibrary(entries, info, onProgress) {
  const db = await open();
  releaseAssets();
  await new Promise((res, rej) => {
    const t = tx(db, ['files', 'meta'], 'readwrite');
    t.objectStore('files').clear();
    t.objectStore('meta').clear();
    t.oncomplete = res;
    t.onerror = () => rej(t.error);
    t.onabort = () => rej(t.error || new Error('写入被中断'));
  });
  const CHUNK = 40;
  let done = 0;
  for (let i = 0; i < entries.length; i += CHUNK) {
    const slice = entries.slice(i, i + CHUNK);
    await new Promise((res, rej) => {
      const t = tx(db, ['files'], 'readwrite');
      const store = t.objectStore('files');
      for (const e of slice) store.put(e.value, e.path);
      t.oncomplete = res;
      t.onerror = () => rej(t.error);
      t.onabort = () => rej(t.error || new Error('写入被中断'));
    });
    done += slice.length;
    onProgress?.(done, entries.length);
  }
  await new Promise((res, rej) => {
    const t = tx(db, ['meta'], 'readwrite');
    t.objectStore('meta').put(info, 'info');
    t.oncomplete = res;
    t.onerror = () => rej(t.error);
  });
}

export async function clearLibrary() {
  const db = await open();
  releaseAssets();
  await new Promise((res, rej) => {
    const t = tx(db, ['files', 'meta'], 'readwrite');
    t.objectStore('files').clear();
    t.objectStore('meta').clear();
    t.oncomplete = res;
    t.onerror = () => rej(t.error);
  });
}

export async function exportEntries() {
  const info = await getInfo();
  if (!info) return null;
  const db = await open();
  const store = tx(db, ['files'], 'readonly').objectStore('files');
  const keys = await reqp(store.getAllKeys());
  const values = await reqp(store.getAll());
  return { info, entries: keys.map((k, i) => ({ path: k, value: values[i] })) };
}

export async function estimate() {
  try { return await navigator.storage?.estimate?.() || null; } catch { return null; }
}

/* ---------- collecting files from a folder pick or a drop ---------- */

function walkEntry(entry, prefix, out) {
  return new Promise((resolve) => {
    if (entry.isFile) {
      entry.file((f) => { out.push({ path: prefix + entry.name, file: f }); resolve(); }, () => resolve());
    } else if (entry.isDirectory) {
      const reader = entry.createReader();
      const readBatch = () => reader.readEntries(async (batch) => {
        if (!batch.length) { resolve(); return; }
        for (const child of batch) await walkEntry(child, `${prefix}${entry.name}/`, out);
        readBatch();
      }, () => resolve());
      readBatch();
    } else resolve();
  });
}

export async function fromDataTransfer(dt) {
  const items = [...(dt.items || [])];
  const entries = items.map((i) => i.webkitGetAsEntry?.()).filter(Boolean);
  if (!entries.length) return [...(dt.files || [])].map((f) => ({ path: f.webkitRelativePath || f.name, file: f }));
  const out = [];
  for (const e of entries) await walkEntry(e, '', out);
  return out;
}

export function fromInput(input) {
  return [...input.files].map((f) => ({ path: f.webkitRelativePath || f.name, file: f }));
}

/* ---------- turning collected files into a library ---------- */

const JSON_RE = /\.json$/i;
const ASSET_RE = /\.(png|jpe?g|gif|webp|svg|ico)$/i;

function stripRoot(paths) {
  const idx = paths.findIndex((p) => /(^|\/)data\/manifest\.json$/.test(p));
  if (idx < 0) return null;
  return paths[idx].slice(0, paths[idx].lastIndexOf('data/manifest.json'));
}

export async function buildEntries(raw, onProgress) {
  const root = stripRoot(raw.map((r) => r.path));
  if (root == null) throw new Error('没找到 data/manifest.json，请选择构建产物里的 public 目录');
  const picked = raw
    .map((r) => ({ ...r, rel: r.path.startsWith(root) ? r.path.slice(root.length) : r.path }))
    .filter((r) => r.rel.startsWith('data/') || r.rel.startsWith('img/'));
  if (!picked.length) throw new Error('目录里没有 data/ 或 img/');

  const entries = [];
  let bytes = 0, manifest = null;
  for (let i = 0; i < picked.length; i++) {
    const { rel, file } = picked[i];
    bytes += file.size;
    if (JSON_RE.test(rel) && rel.startsWith('data/')) {
      let data;
      try { data = JSON.parse(await file.text()); } catch { throw new Error(`${rel} 不是合法 JSON`); }
      if (rel === 'data/manifest.json') manifest = data;
      entries.push({ path: rel, value: data });
    } else if (ASSET_RE.test(rel)) {
      entries.push({ path: rel, value: file });
    }
    if (i % 25 === 0) onProgress?.(i, picked.length);
  }
  if (!manifest || !manifest.docs?.length) throw new Error('manifest.json 内容不完整，请重新执行 npm run build');
  onProgress?.(picked.length, picked.length);
  return {
    entries,
    info: {
      importedAt: Date.now(),
      bytes,
      fileCount: entries.length,
      questions: manifest.stats?.questions || 0,
      docs: manifest.stats?.docs || 0,
      words: manifest.stats?.words || 0,
      categories: manifest.stats?.categories || 0,
      source: manifest.source || null,
      demo: !!manifest.demo,
    },
  };
}

/* ---------- asset rewriting for imported libraries ---------- */

const IMG_ATTR = /(src|href)="(\/?img\/[^"]+)"/g;

export async function resolveDocAssets(doc) {
  const fields = [];
  if (doc.intro) fields.push('intro');
  if (doc.html) fields.push('html');
  const texts = fields.map((f) => doc[f]).concat((doc.questions || []).map((q) => q.html || ''));
  const paths = new Set();
  for (const t of texts) for (const m of t.matchAll(IMG_ATTR)) paths.add(m[2]);
  if (!paths.size) return doc;
  const map = new Map();
  for (const p of paths) {
    const url = await getAssetUrl(p.replace(/^\//, ''));
    if (url) map.set(p, url);
  }
  const swap = (s) => s.replace(IMG_ATTR, (m, attr, p) => `${attr}="${map.get(p) || p}"`);
  for (const f of fields) doc[f] = swap(doc[f]);
  for (const q of doc.questions || []) if (q.html) q.html = swap(q.html);
  return doc;
}