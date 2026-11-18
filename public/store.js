const KEY = 'csview.state.v1';

const defaults = () => ({
  marks: {}, stars: {}, notes: {}, recent: [], activity: {},
  quiz: [], lastCat: null,
  prefs: { theme: 'dark', fontSize: 16, width: 'normal', codeLang: 'cpp', collapse: false, showFreq: true, motion: true },
});

export const S = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults();
    const parsed = JSON.parse(raw);
    const base = defaults();
    return { ...base, ...parsed, prefs: { ...base.prefs, ...(parsed.prefs || {}) } };
  } catch { return defaults(); }
}

let saveTimer = null;
export function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* quota */ }
  }, 180);
}

const listeners = new Set();
export function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export function emit() { save(); listeners.forEach((f) => f()); }

/* ---------------- data ---------------- */
export const D = { manifest: null, docs: new Map(), search: null, rank: null, qIndex: new Map(), docIndex: new Map(), catIndex: new Map() };
const pending = new Map();

async function jget(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

function once(key, url, assign) {
  if (pending.has(key)) return pending.get(key);
  const p = jget(url).then((data) => { assign(data); pending.delete(key); return data; })
    .catch((e) => { pending.delete(key); throw e; });
  pending.set(key, p);
  return p;
}

export async function loadManifest() {
  if (D.manifest) return D.manifest;
  return once('manifest', '/data/manifest.json', (m) => {
    D.manifest = m;
    for (const c of m.categories) D.catIndex.set(c.id, c);
    for (const d of m.docs) {
      D.docIndex.set(d.id, d);
      for (const q of d.questions) D.qIndex.set(q.id, { ...q, doc: d.id, cat: d.cat, docTitle: d.title });
    }
  });
}

export async function loadDoc(id) {
  if (D.docs.has(id)) return D.docs.get(id);
  return once(`doc:${id}`, `/data/d/${encodeURIComponent(id)}.json`, (d) => D.docs.set(id, d));
}

export async function loadSearch() {
  if (D.search) return D.search;
  return once('search', '/data/search.json', (s) => { D.search = s; });
}

export async function loadRank() {
  if (D.rank) return D.rank;
  return once('rank', '/data/rank.json', (r) => { D.rank = r; });
}

/* ---------------- mutations ---------------- */
export function setMark(qid, v) {
  if (v) S.marks[qid] = v; else delete S.marks[qid];
  bumpActivity();
  emit();
}
export function cycleMark(qid) {
  const cur = S.marks[qid] || 0;
  const next = cur === 0 ? 1 : cur === 1 ? 2 : cur === 2 ? 3 : 0;
  setMark(qid, next);
  return next;
}
export function toggleStar(qid) {
  if (S.stars[qid]) delete S.stars[qid]; else S.stars[qid] = Date.now();
  emit();
  return !!S.stars[qid];
}
export function setNote(qid, text) {
  const t = text.trim();
  if (t) S.notes[qid] = { t, at: Date.now() }; else delete S.notes[qid];
  emit();
}
export function touchRecent(docId, qid) {
  S.recent = [{ d: docId, q: qid || null, at: Date.now() }, ...S.recent.filter((r) => r.d !== docId)].slice(0, 10);
  S.lastCat = D.docIndex.get(docId)?.cat || S.lastCat;
  save();
}
function bumpActivity() {
  const k = todayKey();
  S.activity[k] = (S.activity[k] || 0) + 1;
}
export function todayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function streak() {
  let n = 0;
  const d = new Date();
  if (!S.activity[todayKey(d)]) d.setDate(d.getDate() - 1);
  for (let i = 0; i < 400; i++) {
    if (S.activity[todayKey(d)]) { n++; d.setDate(d.getDate() - 1); } else break;
  }
  return n;
}

export function setPref(k, v) { S.prefs[k] = v; emit(); }

export function resetAll() {
  const backup = JSON.stringify(S);
  const fresh = defaults();
  fresh.prefs = { ...S.prefs };
  Object.keys(S).forEach((k) => delete S[k]);
  Object.assign(S, fresh);
  emit();
  return backup;
}
export function restore(raw) {
  const data = JSON.parse(raw);
  const base = defaults();
  Object.keys(S).forEach((k) => delete S[k]);
  Object.assign(S, { ...base, ...data, prefs: { ...base.prefs, ...(data.prefs || {}) } });
  emit();
}
export function importState(text) {
  const data = JSON.parse(text);
  if (!data || typeof data !== 'object' || !('marks' in data || 'stars' in data)) throw new Error('文件格式不正确');
  const base = defaults();
  const merged = { ...base, ...data, prefs: { ...base.prefs, ...(data.prefs || {}) } };
  merged.marks = data.marks || {}; merged.stars = data.stars || {}; merged.notes = data.notes || {};
  merged.recent = Array.isArray(data.recent) ? data.recent.slice(0, 10) : [];
  merged.activity = data.activity || {};
  merged.quiz = Array.isArray(data.quiz) ? data.quiz.slice(0, 40) : [];
  Object.keys(S).forEach((k) => delete S[k]);
  Object.assign(S, merged);
  emit();
}

/* ---------------- derived ---------------- */
export function statsFor(ids) {
  let done = 0, fuzzy = 0, weak = 0;
  for (const id of ids) {
    const m = S.marks[id];
    if (m === 1) done++; else if (m === 2) fuzzy++; else if (m === 3) weak++;
  }
  const total = ids.length;
  return { total, done, fuzzy, weak, todo: total - done - fuzzy - weak, pct: total ? Math.round((done / total) * 100) : 0 };
}
export function catQuestionIds(catId) {
  const out = [];
  for (const d of D.manifest.docs) if (d.cat === catId) for (const q of d.questions) out.push(q.id);
  return out;
}
export function docQuestionIds(docId) { return (D.docIndex.get(docId)?.questions || []).map((q) => q.id); }
export function allQuestionIds() { return [...D.qIndex.keys()]; }
export function globalStats() { return statsFor(allQuestionIds()); }
export function starredIds() { return Object.keys(S.stars).filter((id) => D.qIndex.has(id)).sort((a, b) => S.stars[b] - S.stars[a]); }
export function weakIds() { return Object.keys(S.marks).filter((id) => S.marks[id] >= 2 && D.qIndex.has(id)); }
export function noteIds() { return Object.keys(S.notes).filter((id) => D.qIndex.has(id)).sort((a, b) => S.notes[b].at - S.notes[a].at); }

export const MARK_LABEL = { 0: '未标记', 1: '已掌握', 2: '有点模糊', 3: '还不会' };
export const WIDTHS = { narrow: '62ch', normal: '74ch', wide: '92ch' };