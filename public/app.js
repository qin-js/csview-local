import { S, D, loadManifest, loadSearch, loadRank, setPref, onChange, globalStats, detectLibrary } from './store.js';
import { openLibraryPanel, paintLibButton } from './source.js';
import { Views } from './views.js';
import { esc, icon, iconOutline, toast, installProse, revealAll, closeLightbox, closeFootnote, highlight, snippet, catStyle } from './ui.js';

const main = document.getElementById('main');
const nav = document.getElementById('nav');
let current = null;
let routeKey = '';

const NAV = [
  { t: '首页', h: '#/', k: 'home' },
  { t: '题库', h: '#/c/algorithm', k: 'lib' },
  { t: '高频榜', h: '#/rank', k: 'rank' },
  { t: '自测', h: '#/quiz', k: 'quiz' },
  { t: '进度', h: '#/progress', k: 'progress' },
  { t: '关于', h: '#/about', k: 'about' },
];

/* ---------------- prefs ---------------- */
function applyPrefs() {
  const p = S.prefs;
  document.documentElement.dataset.theme = p.theme;
  document.documentElement.dataset.motion = p.motion ? 'on' : 'off';
  document.documentElement.style.setProperty('--read-size', `${p.fontSize}px`);
  document.documentElement.style.setProperty('--read-w', { narrow: '62ch', normal: '74ch', wide: '92ch' }[p.width] || '74ch');
  const meta = document.querySelector('meta[name=theme-color]');
  if (meta) meta.content = p.theme === 'dark' ? '#070A16' : '#F3F0E9';
  const tb = document.getElementById('themeBtn');
  tb.innerHTML = p.theme === 'dark' ? icon('sun') : icon('moon');
  tb.title = p.theme === 'dark' ? '切换到浅色阅读' : '切换到深色阅读';
  document.querySelectorAll('[data-pref]').forEach((b) => b.classList.toggle('on', !!p[b.dataset.pref]));
  document.querySelectorAll('#themeSeg [data-t]').forEach((b) => b.classList.toggle('on', b.dataset.t === p.theme));
}

function updateNavProgress() {
  if (!D.manifest) return;
  const g = globalStats();
  const fill = document.getElementById('ppFill');
  const c = 2 * Math.PI * 15.5;
  fill.style.strokeDasharray = c.toFixed(1);
  fill.style.strokeDashoffset = (c * (1 - g.pct / 100)).toFixed(1);
  document.getElementById('ppText').textContent = `${g.pct}%`;
  document.getElementById('navProgress').title = `已掌握 ${g.done} / ${g.total} 题`;
}

/* ---------------- nav ---------------- */
function buildNav() {
  const host = document.getElementById('navLinks');
  host.innerHTML = NAV.map((n) => `<a class="navlink" href="${n.h}" data-nav="${n.k}">${n.t}${n.k === 'lib' ? `<span class="nb">${D.manifest.stats.questions}</span>` : ''}</a>`).join('');
  const lib = host.querySelector('[data-nav=lib]');
  lib.addEventListener('click', (e) => { e.preventDefault(); toggleNavDrop(); });
  lib.setAttribute('role', 'button');
  lib.setAttribute('aria-haspopup', 'true');

  const drop = document.createElement('div');
  drop.className = 'navdrop';
  drop.id = 'navDrop';
  drop.hidden = true;
  drop.innerHTML = `<div class="nd-in">${D.manifest.groups.map((g) => `
    <div class="nd-col"><h5>${esc(g)}</h5>${D.manifest.categories.filter((c) => c.group === g).map((c) => `
      <a href="#/c/${c.id}" style="${catStyle(c)}"><span class="nd-ic">${iconOutline(c.glyph)}</span><span class="nd-t">${esc(c.name)}<i>${c.questions} 题 · ${c.docs} 篇</i></span></a>`).join('')}</div>`).join('')}
    </div>`;
  nav.appendChild(drop);
  drop.addEventListener('click', (e) => { if (e.target.closest('a')) closeNavDrop(); });

  const db = document.getElementById('drawerBody');
  db.innerHTML = NAV.map((n) => `<a class="navlink" href="${n.h}" data-nav="${n.k}">${n.t}</a>`).join('')
    + `<button class="navlink" type="button" data-open-lib style="width:100%;text-align:left">题库来源与导入</button>`
    + D.manifest.groups.map((g) => `<div class="drawer-sec">${esc(g)}</div>` + D.manifest.categories.filter((c) => c.group === g).map((c) => `<a class="navlink" href="#/c/${c.id}" style="${catStyle(c)}"><span class="cdot" style="display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--hue);margin-right:8px"></span>${esc(c.name)}<span class="nb">${c.questions}</span></a>`).join('')).join('');
  db.addEventListener('click', (e) => { if (e.target.closest('a')) closeDrawer(); if (e.target.closest('[data-open-lib]')) { closeDrawer(); openLibraryPanel(); } });

  document.getElementById('footStats').textContent = `${D.manifest.stats.questions} 题 · ${D.manifest.stats.docs} 篇 · ${D.manifest.stats.categories} 个方向 · ${D.manifest.stats.images} 张图示`;
}
function toggleNavDrop() {
  const d = document.getElementById('navDrop');
  if (d.hidden) { d.hidden = false; setTimeout(() => document.addEventListener('click', outsideDrop), 0); }
  else closeNavDrop();
}
function outsideDrop(e) { if (!e.target.closest('#navDrop') && !e.target.closest('[data-nav=lib]')) closeNavDrop(); }
function closeNavDrop() {
  const d = document.getElementById('navDrop');
  if (d && !d.hidden) { d.hidden = true; document.removeEventListener('click', outsideDrop); }
}
function setActiveNav(kind) {
  document.querySelectorAll('[data-nav]').forEach((a) => a.classList.toggle('on', a.dataset.nav === kind));
}
function openDrawer() {
  document.getElementById('drawer').hidden = false;
  document.getElementById('scrim').hidden = false;
  document.getElementById('burger').setAttribute('aria-expanded', 'true');
  document.body.classList.add('locked');
}
function closeDrawer() {
  document.getElementById('drawer').hidden = true;
  document.getElementById('scrim').hidden = true;
  document.getElementById('burger').setAttribute('aria-expanded', 'false');
  document.body.classList.remove('locked');
}
function closePopovers() {
  document.querySelectorAll('.rail.as-pop').forEach((x) => x.classList.remove('as-pop'));
  if (document.getElementById('drawer').hidden) document.getElementById('scrim').hidden = true;
}

/* ---------------- router ---------------- */
function parseHash() {
  const raw = location.hash.replace(/^#/, '') || '/';
  const [path, qs] = raw.split('?');
  const params = Object.fromEntries(new URLSearchParams(qs || ''));
  const seg = path.split('/').filter(Boolean);
  return { seg, params, path };
}

async function route() {
  const { seg, params } = parseHash();
  const key = location.hash;
  if (key === routeKey && current) return;
  routeKey = key;
  closeNavDrop();
  closeDrawer();
  closePopovers();
  current?.cleanup?.();
  current = null;

  let view, kind = 'home', title = 'CSView · 面经知识库';
  const head = seg[0] || '';
  try {
    if (!head) { view = await Views.home(); kind = 'home'; }
    else if (head === 'c') { view = await Views.category({ cat: seg[1] }); kind = 'lib'; title = `${D.catIndex.get(seg[1])?.name || '题库'} · CSView`; }
    else if (head === 'd') { view = await Views.doc({ doc: seg[1] }); kind = 'lib'; title = `${D.docIndex.get(seg[1])?.title || '阅读'} · CSView`; }
    else if (head === 'q') {
      const qid = decodeURIComponent(seg.slice(1).join('/'));
      const meta = D.qIndex.get(qid);
      if (meta) { view = await Views.doc({ doc: meta.doc, q: qid }); title = `${meta.title} · CSView`; }
      else view = await Views.doc({ doc: 'missing' });
      kind = 'lib';
    }
    else if (head === 'rank') { view = await Views.rank(); kind = 'rank'; title = '面经高频榜 · CSView'; }
    else if (head === 'quiz') { view = await Views.quiz(params); kind = 'quiz'; title = '自测模式 · CSView'; }
    else if (head === 'progress') { view = await Views.progress(); kind = 'progress'; title = '学习进度 · CSView'; }
    else if (head === 'about') { view = await Views.about(); kind = 'about'; title = '关于 · CSView'; }
    else { view = await Views.home(); kind = 'home'; }
  } catch (err) {
    console.error(err);
    view = { html: `<div class="empty">${icon('alert')}<b>内容加载失败</b><p>${esc(err.message)}</p><button class="btn btn-sm btn-primary" onclick="location.reload()">重新加载</button></div>`, mount: () => {} };
  }

  document.title = title;
  main.classList.toggle('wide', kind === 'lib' && (head === 'd' || head === 'q'));
  main.innerHTML = view.html;
  current = view;
  setActiveNav(kind);
  view.mount?.(main);
  revealAll(main);
  updateNavProgress();
  if (!params.q && !(head === 'q')) window.scrollTo({ top: 0, behavior: 'auto' });
  requestAnimationFrame(onScroll);
}

/* ---------------- scroll ---------------- */
let ticking = false;
function onScroll() {
  const y = window.scrollY;
  nav.classList.toggle('stuck', y > 8);
  const doc = document.documentElement;
  const max = doc.scrollHeight - window.innerHeight;
  const pct = max > 40 ? Math.min(100, (y / max) * 100) : 0;
  document.querySelector('#readbar i').style.width = `${pct}%`;
  ticking = false;
}
window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });

/* ---------------- search palette ---------------- */
const pal = document.getElementById('palette');
const palInput = document.getElementById('palInput');
const palResults = document.getElementById('palResults');
const palCount = document.getElementById('palCount');
let palItems = [];
let palSel = 0;
let palCat = 'all';
let palLoading = false;

function buildPalFilters() {
  const host = document.getElementById('palFilters');
  const cats = D.manifest.categories;
  host.innerHTML = `<button class="chip ${palCat === 'all' ? 'on' : ''}" data-pc="all" type="button">全部方向</button>`
    + cats.map((c) => `<button class="chip ${palCat === c.id ? 'on' : ''}" data-pc="${c.id}" style="${catStyle(c)}" type="button"><span class="cdot"></span>${esc(c.short)}</button>`).join('');
  host.querySelectorAll('[data-pc]').forEach((b) => b.addEventListener('click', () => {
    palCat = b.dataset.pc;
    buildPalFilters();
    runSearch();
    palInput.focus();
  }));
}

async function openPalette() {
  pal.hidden = false;
  document.body.classList.add('locked');
  buildPalFilters();
  palInput.value = '';
  palInput.focus();
  if (!D.search && !palLoading) {
    palLoading = true;
    palResults.innerHTML = `<div class="pal-group">正在建立本地索引…</div>${Array.from({ length: 5 }, () => '<div class="skeleton" style="height:46px;margin:6px 8px"></div>').join('')}`;
    try { await loadSearch(); } catch { toast('搜索索引加载失败', 'err'); }
    palLoading = false;
  }
  runSearch();
}
function closePalette() {
  pal.hidden = true;
  document.body.classList.remove('locked');
}

function searchEntries(q) {
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  const idx = D.search || [];
  const out = [];
  for (const e of idx) {
    if (palCat !== 'all' && e.c !== palCat) continue;
    const t = e.t.toLowerCase();
    const x = e.x ? e.x.toLowerCase() : '';
    let tHit = 0, xHit = 0;
    for (const term of terms) { if (t.includes(term)) tHit++; if (x.includes(term)) xHit++; }
    if (!tHit && !xHit) continue;
    let score = 0;
    if (tHit === terms.length) score += 1000 + (t.startsWith(terms[0]) ? 240 : 0) + Math.max(0, 90 - e.t.length);
    else if (tHit) score += 420 * (tHit / terms.length);
    if (xHit === terms.length) score += 300;
    else if (xHit) score += 120 * (xHit / terms.length);
    score += (e.f || 0) * 22;
    if (e.a) score -= 90;
    out.push({ e, score, terms });
  }
  out.sort((a, b) => b.score - a.score);
  return out.slice(0, 60);
}

function runSearch() {
  const q = palInput.value.trim();
  if (!q) {
    const recent = S.recent.filter((r) => D.docIndex.has(r.d)).slice(0, 4);
    const hot = [...D.qIndex.values()].filter((x) => x.freq > 0 && (palCat === 'all' || x.cat === palCat)).sort((a, b) => b.freq - a.freq).slice(0, 8);
    palItems = [];
    let html = '';
    if (recent.length) {
      html += `<div class="pal-group">最近浏览</div>`;
      html += recent.map((r) => {
        const d = D.docIndex.get(r.d); const c = D.catIndex.get(d.cat);
        return palItemHtml({ id: `#/d/${d.id}`, title: d.title, sub: `${c.name} · ${d.questions.length} 题`, hue: c.hue, tag: '分册' });
      }).join('');
    }
    html += `<div class="pal-group">面经高频</div>`;
    html += hot.map((x) => {
      const c = D.catIndex.get(x.cat);
      return palItemHtml({ id: `#/q/${x.id}`, title: x.title, sub: `${c.name} · ${x.docTitle}`, hue: c.hue, tag: `${x.freq}次` });
    }).join('');
    palResults.innerHTML = html || `<div class="pal-group">输入关键词开始搜索</div>`;
    palCount.textContent = `${D.search ? D.search.length : D.manifest.stats.questions} 条索引`;
    bindPalItems();
    return;
  }
  if (!D.search) { palCount.textContent = '索引加载中'; return; }
  const res = searchEntries(q);
  palCount.textContent = `${res.length} 条结果`;
  palItems = res;
  palSel = 0;
  if (!res.length) {
    palResults.innerHTML = `<div class="empty" style="margin:14px;border:0;background:none">${iconOutline('search')}<b>没有找到「${esc(q)}」</b><p>试试更短的关键词，比如「握手」「索引」「GMP」「跳表」。</p></div>`;
    return;
  }
  palResults.innerHTML = res.map((r, i) => {
    const c = D.catIndex.get(r.e.c);
    const d = D.docIndex.get(r.e.d);
    return `<button class="pal-item ${i === 0 ? 'sel' : ''}" data-pi="${i}" style="--hue:${c.hue}" type="button">
      <span class="pi-dot"></span>
      <span class="pi-main"><span class="pi-t">${highlight(r.e.t, r.terms)}</span><span class="pi-s">${esc(c.name)} · ${esc(d?.title || '')} — ${snippet(r.e.x, r.terms)}</span></span>
      <span class="pi-x">${r.e.f ? `${r.e.f}次` : r.e.a ? '长文' : ''}</span>
    </button>`;
  }).join('');
  bindPalItems();
}

function palItemHtml({ id, title, sub, hue, tag }) {
  return `<button class="pal-item" data-href="${esc(id)}" style="--hue:${hue}" type="button">
    <span class="pi-dot"></span><span class="pi-main"><span class="pi-t">${esc(title)}</span><span class="pi-s">${esc(sub)}</span></span><span class="pi-x">${esc(tag)}</span></button>`;
}

function bindPalItems() {
  palResults.querySelectorAll('.pal-item').forEach((b) => {
    b.addEventListener('click', (e) => {
      const href = b.dataset.href || (palItems[+b.dataset.pi] ? gotoOf(palItems[+b.dataset.pi].e) : null);
      if (!href) return;
      closePalette();
      if (e.metaKey || e.ctrlKey) window.open(`${location.pathname}${href}`, '_blank');
      else location.hash = href;
    });
    b.addEventListener('mousemove', () => {
      if (b.dataset.pi === undefined) return;
      palSel = +b.dataset.pi;
      markSel();
    });
  });
}
function gotoOf(e) { return e.a ? `#/d/${e.d}` : `#/q/${e.i}`; }
function markSel() {
  const nodes = [...palResults.querySelectorAll('.pal-item[data-pi]')];
  nodes.forEach((n, i) => n.classList.toggle('sel', i === palSel));
  nodes[palSel]?.scrollIntoView({ block: 'nearest' });
}
function palMove(d) {
  if (!palItems.length) return;
  palSel = (palSel + d + palItems.length) % palItems.length;
  markSel();
}
function palOpen(newTab) {
  const it = palItems[palSel];
  if (!it) return;
  const href = gotoOf(it.e);
  closePalette();
  if (newTab) window.open(`${location.pathname}${href}`, '_blank');
  else location.hash = href;
}

/* ---------------- global events ---------------- */
function installGlobal() {
  installProse(main);

  document.addEventListener('click', (e) => {
    const anchor = e.target.closest('a[href^="#/"]');
    if (anchor && anchor.getAttribute('href') === location.hash && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      routeKey = '';
      route();
      return;
    }
    const goto = e.target.closest('[data-goto]');
    if (goto) {
      const h = goto.dataset.goto;
      if (h) location.hash = h;
      else if (goto.dataset.title) { openPalette(); palInput.value = goto.dataset.title.slice(0, 18); runSearch(); }
      return;
    }
    if (e.target.closest('[data-open-search]')) { openPalette(); return; }
    if (e.target.closest('[data-open-lib]')) { openLibraryPanel(); return; }
  });

  document.getElementById('searchBtn').addEventListener('click', openPalette);
  document.getElementById('libBtn').addEventListener('click', openLibraryPanel);
  document.getElementById('palClose').addEventListener('click', closePalette);
  pal.addEventListener('click', (e) => { if (e.target === pal) closePalette(); });
  palInput.addEventListener('input', runSearch);
  palInput.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); palMove(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); palMove(-1); }
    else if (e.key === 'Enter') { e.preventDefault(); palOpen(e.metaKey || e.ctrlKey); }
    else if (e.key === 'Escape') { e.preventDefault(); closePalette(); }
  });

  document.getElementById('themeBtn').addEventListener('click', () => {
    setPref('theme', S.prefs.theme === 'dark' ? 'light' : 'dark');
  });
  document.getElementById('burger').addEventListener('click', openDrawer);
  document.getElementById('drawerClose').addEventListener('click', closeDrawer);
  document.getElementById('scrim').addEventListener('click', () => { closeDrawer(); closePopovers(); });
  document.getElementById('lightbox').addEventListener('click', closeLightbox);
  document.getElementById('lbClose').addEventListener('click', closeLightbox);

  let gPending = false;
  document.addEventListener('keydown', (e) => {
    const typing = e.target.matches('input,textarea,select') || e.target.isContentEditable;
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); pal.hidden ? openPalette() : closePalette(); return; }
    if (e.key === 'Escape') {
      if (!pal.hidden) { closePalette(); return; }
      if (!document.getElementById('lightbox').hidden) { closeLightbox(); return; }
      if (!document.getElementById('drawer').hidden) { closeDrawer(); return; }
      closeNavDrop();
      closePopovers();
      closeFootnote();
      return;
    }
    if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === '/') { e.preventDefault(); openPalette(); return; }
    if (e.key.toLowerCase() === 'q' && !e.shiftKey) { e.preventDefault(); location.hash = '#/quiz'; return; }
    if (e.key.toLowerCase() === 't') { setPref('theme', S.prefs.theme === 'dark' ? 'light' : 'dark'); return; }
    if (e.key.toLowerCase() === 'g') { gPending = true; setTimeout(() => { gPending = false; }, 1200); return; }
    if (gPending && e.key.toLowerCase() === 'h') { gPending = false; location.hash = '#/'; }
  });

  window.addEventListener('hashchange', route);
  document.addEventListener('cs:refresh', () => { routeKey = ''; route(); });
  onChange(() => { applyPrefs(); updateNavProgress(); paintLibButton(); });
  document.addEventListener('cs:refresh', paintLibButton);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) updateNavProgress(); });
}

/* ---------------- boot ---------------- */
async function boot() {
  applyPrefs();
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  defs.setAttribute('width', '0'); defs.setAttribute('height', '0');
  defs.style.position = 'absolute';
  defs.innerHTML = `<defs><linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4C7DFF"/><stop offset=".55" stop-color="#22D3EE"/><stop offset="1" stop-color="#B6F135"/></linearGradient></defs>`;
  document.body.appendChild(defs);

  main.innerHTML = `<div style="display:grid;gap:16px"><div class="skeleton" style="height:300px"></div><div class="skeleton" style="height:180px"></div></div>`;
  try {
    await detectLibrary();
    await loadManifest();
  } catch (err) {
    main.innerHTML = `<div class="empty">${icon('alert')}<b>题库数据加载失败</b><p>${esc(err.message)}。请确认本地服务正在运行。</p><button class="btn btn-sm btn-primary" onclick="location.reload()">重试</button></div>`;
    return;
  }
  buildNav();
  paintLibButton();
  installGlobal();
  loadRank().catch(() => {});
  if (!location.hash) history.replaceState(null, '', '#/');
  await route();
  updateNavProgress();
}

boot();