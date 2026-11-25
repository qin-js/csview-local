import { S, setPref, D } from './store.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const P = {
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  sun: '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.4 5.4l1.6 1.6M17 17l1.6 1.6M18.6 5.4 17 7M7 17l-1.6 1.6"/>',
  moon: '<path d="M20 14.2A8.4 8.4 0 0 1 9.8 4 8.4 8.4 0 1 0 20 14.2Z"/>',
  right: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  left: '<path d="M19 12H5M11 18l-6-6 6-6"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  up: '<path d="m6 15 6-6 6 6"/>',
  star: '<path d="m12 3.6 2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.8l5.9-.8Z"/>',
  check: '<path d="m4.5 12.5 5 5 10-11"/>',
  checkCircle: '<circle cx="12" cy="12" r="9"/><path d="m8 12.2 2.8 2.8L16 9.6"/>',
  note: '<path d="M5 4.5h11l3 3V19a1.5 1.5 0 0 1-1.5 1.5h-12A1.5 1.5 0 0 1 4 19V6a1.5 1.5 0 0 1 1-1.5Z"/><path d="M8 10h8M8 14h5"/>',
  flame: '<path d="M12 3s5 4 5 8.5a5 5 0 0 1-10 0C7 9 9 7.5 9 7.5s.5 2 1.5 2.5c0-3 1.5-5 1.5-7Z"/>',
  book: '<path d="M4 5.5A2 2 0 0 1 6 3.5h13v14H6a2 2 0 0 0-2 2Z"/><path d="M4 19.5a2 2 0 0 1 2-2h13v3H6a2 2 0 0 1-2-1Z"/>',
  clock: '<circle cx="12" cy="12" r="8.6"/><path d="M12 7v5.2l3.2 2"/>',
  layers: '<path d="m12 3.4 8.4 4.3-8.4 4.3-8.4-4.3Z"/><path d="m4 12.4 8 4.1 8-4.1M4 16.6l8 4.1 8-4.1"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.6"/><circle cx="12" cy="12" r="1"/>',
  shuffle: '<path d="M17 4.5 20.5 8 17 11.5M17 12.5 20.5 16 17 19.5"/><path d="M3.5 8h4.2c2 0 3 1.4 4.3 3.4S14.5 16 16.5 16h4M3.5 16h4.2c1.6 0 2.6-.9 3.6-2.3M20.5 8h-4c-1.5 0-2.5.8-3.4 2"/>',
  refresh: '<path d="M20 11.5A8 8 0 1 0 18.4 17"/><path d="M20.5 4.5v5h-5"/>',
  download: '<path d="M12 3.5v11M7.5 10.5 12 15l4.5-4.5"/><path d="M4.5 17v2.5h15V17"/>',
  upload: '<path d="M12 15.5v-11M7.5 8.5 12 4l4.5 4.5"/><path d="M4.5 17v2.5h15V17"/>',
  trash: '<path d="M4.5 6.5h15M9.5 6.5V4.2h5v2.3M6.5 6.5l1 13h9l1-13"/><path d="M10.5 10v6M13.5 10v6"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  play: '<path d="M7.5 4.8 19 12 7.5 19.2Z"/>',
  spark: '<path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/><circle cx="12" cy="12" r="3.2"/>',
  grid: '<rect x="4" y="4" width="7" height="7" rx="1.6"/><rect x="13" y="4" width="7" height="7" rx="1.6"/><rect x="4" y="13" width="7" height="7" rx="1.6"/><rect x="13" y="13" width="7" height="7" rx="1.6"/>',
  list: '<path d="M8 6.5h12M8 12h12M8 17.5h12M4 6.5h.01M4 12h.01M4 17.5h.01"/>',
  chart: '<path d="M4 20V4"/><path d="M4 20h16"/><rect x="7" y="12" width="3.2" height="5" rx="1"/><rect x="12" y="8" width="3.2" height="9" rx="1"/><rect x="17" y="5" width="3.2" height="12" rx="1"/>',
  code: '<path d="m8.5 8-4.5 4 4.5 4M15.5 8l4.5 4-4.5 4M13.5 5l-3 14"/>',
  brain: '<path d="M9.5 4.5A3 3 0 0 0 6.6 8 3 3 0 0 0 5 13.4a3 3 0 0 0 2.4 4.4 2.6 2.6 0 0 0 4.6-1.4V6.6a2.1 2.1 0 0 0-2.5-2.1Z"/><path d="M14.5 4.5A3 3 0 0 1 17.4 8 3 3 0 0 1 19 13.4a3 3 0 0 1-2.4 4.4 2.6 2.6 0 0 1-4.6-1.4"/>',
  net: '<circle cx="12" cy="12" r="8.6"/><path d="M3.4 12h17.2M12 3.4c2.4 2.6 3.6 5.5 3.6 8.6S14.4 18.6 12 20.6c-2.4-2-3.6-5.5-3.6-8.6S9.6 6 12 3.4Z"/>',
  os: '<rect x="3.5" y="4.5" width="17" height="12" rx="2"/><path d="M8 20h8M12 16.5V20"/><path d="m7.5 8.5 2.5 2-2.5 2M12.5 12.5h4"/>',
  db: '<ellipse cx="12" cy="6.2" rx="7.5" ry="3"/><path d="M4.5 6.2v11.6c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3V6.2"/><path d="M4.5 12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3"/>',
  cache: '<path d="M13 2.5 4.5 13.5h6L11 21.5l8.5-11h-6Z"/>',
  cpp: '<path d="M12 3.2 20 7.6v8.8L12 20.8 4 16.4V7.6Z"/><path d="M14.8 9.6a3.4 3.4 0 1 0 0 4.8"/><path d="M17.4 11.2v1.6M16.6 12h1.6"/>',
  java: '<path d="M9.5 14.5c-3 .8-4.5 1.8-4.5 2.8 0 1.4 3.2 2.5 7 2.5s7-1.1 7-2.5c0-.9-1.2-1.7-3.3-2.3"/><path d="M10.5 3.5c2.5 2.5-2.5 4-2.5 6.5 0 1.6 1.6 2.6 2.5 3.5M14.5 6c1.6 1.8-2 3-2 4.8 0 1.2 1 1.9 1.6 2.6"/><path d="M7.5 16.6c1.4.6 3.4.9 5 .9 2.4 0 4.6-.6 5.6-1.4"/>',
  go: '<circle cx="9" cy="10.5" r="1.1"/><circle cx="15" cy="10.5" r="1.1"/><path d="M4.5 8.5C5.5 5.5 8.4 4 12 4s6.5 1.5 7.5 4.5c1 3 .6 6.5-1.5 8.6-1.6 1.6-3.7 2.4-6 2.4s-4.4-.8-6-2.4C3.9 15 3.5 11.5 4.5 8.5Z"/><path d="M10.5 14.5h3"/>',
  design: '<path d="M4 5.5h16v13H4Z"/><path d="M4 9.5h16M9 9.5v9"/><circle cx="6.5" cy="7.5" r=".6"/>',
  talk: '<path d="M20 12.5c0 3.6-3.6 6.5-8 6.5-1 0-2-.2-2.9-.5L4.5 20l1.2-3.3A6.6 6.6 0 0 1 4 12.5C4 8.9 7.6 6 12 6s8 2.9 8 6.5Z"/><path d="M9 12h.01M12 12h.01M15 12h.01"/>',
  mq: '<path d="M3.5 7.5h11v9h-11Z"/><path d="m14.5 10 6-3v10l-6-3"/><path d="M6.5 11h5"/>',
  k8s: '<path d="M12 3.2 19.5 7v10L12 20.8 4.5 17V7Z"/><circle cx="12" cy="12" r="3"/><path d="M12 3.2V9M12 15v5.8M4.5 7l4.8 3.2M14.7 13.8 19.5 17M19.5 7l-4.8 3.2M9.3 13.8 4.5 17"/>',
  compass: '<circle cx="12" cy="12" r="8.6"/><path d="m15 9-2 4.2-4 1.8 2-4.2Z"/>',
  algo: '<path d="M5 6.5h6M5 12h9M5 17.5h5"/><circle cx="17.5" cy="6.5" r="2.2"/><circle cx="18.5" cy="17.5" r="2.2"/><path d="M17.5 8.7v6.6"/>',
  eye: '<path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="M4 4.5 20 20M9.5 9.7A3 3 0 0 0 12 15a3 3 0 0 0 2.4-1.2"/><path d="M6.4 6.7C3.9 8.4 2.5 12 2.5 12S6 18.2 12 18.2c1.7 0 3.2-.5 4.5-1.2M18.6 15.2c1.9-1.6 2.9-3.2 2.9-3.2S18 5.8 12 5.8c-.8 0-1.5.1-2.2.3"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 14.5a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1v.3a2 2 0 1 1-4 0v-.2a1.6 1.6 0 0 0-2.8-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7H3a2 2 0 1 1 0-4h.2a1.6 1.6 0 0 0 1.1-2.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 2.7-1.1V3a2 2 0 1 1 4 0v.2a1.6 1.6 0 0 0 2.8 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7h.3a2 2 0 1 1 0 4h-.2a1.6 1.6 0 0 0-1.2 1.1Z"/>',
  external: '<path d="M14 4.5h5.5V10"/><path d="M19.5 4.5 11 13"/><path d="M18 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.6v.6"/>',
  alert: '<path d="M10.3 3.9 2.6 17.2A2 2 0 0 0 4.3 20h15.4a2 2 0 0 0 1.7-2.8L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 16.6v.4"/>',
  trophy: '<path d="M7 4.5h10v5a5 5 0 0 1-10 0Z"/><path d="M7 6H4.5v1.5A3 3 0 0 0 7 10.4M17 6h2.5v1.5a3 3 0 0 1-2.5 2.9"/><path d="M12 14.5v3M8.5 20h7l-.7-2.5h-5.6Z"/>',
  calendar: '<rect x="3.5" y="5.5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3.5v4M16 3.5v4"/>',
  bookmark: '<path d="M6.5 4.5h11v16l-5.5-4-5.5 4Z"/>',
  filter: '<path d="M4 6h16l-6.2 7.3V19l-3.6 1.6v-7.3Z"/>',
  keyboard: '<rect x="2.5" y="6" width="19" height="12" rx="2"/><path d="M6 9.5h.01M9.5 9.5h.01M13 9.5h.01M16.5 9.5h.01M6 13h.01M18 13h.01M9 15.5h6"/><path d="M9.5 13h5"/>',
  home: '<path d="m4 10.5 8-6.5 8 6.5V19a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19Z"/><path d="M9.5 20.5v-6h5v6"/>',
  zap: '<path d="M13 2.5 4.5 13.5h6L11 21.5l8.5-11h-6Z"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  pause: '<rect x="7" y="5" width="3.6" height="14" rx="1"/><rect x="13.4" y="5" width="3.6" height="14" rx="1"/>',
  bulb: '<path d="M9.5 17.5h5M10 20.5h4"/><path d="M12 3.5a5.5 5.5 0 0 0-3.2 10c.6.5.9 1.2.9 2h4.6c0-.8.3-1.5.9-2A5.5 5.5 0 0 0 12 3.5Z"/>',
};

export function icon(name, cls = '') {
  const body = P[name] || P.info;
  const fill = name === 'star' || name === 'flame' || name === 'play' || name === 'bookmark' ? 'currentColor' : 'none';
  return `<svg viewBox="0 0 24 24" width="16" height="16" fill="${fill}" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" class="${cls}" aria-hidden="true">${body}</svg>`;
}
export function iconOutline(name, cls = '') {
  return `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" class="${cls}" aria-hidden="true">${P[name] || P.info}</svg>`;
}

export const fmtK = (n) => (n >= 10000 ? `${(n / 10000).toFixed(1)}万` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));
export const readMin = (words) => Math.max(1, Math.round(words / 420));
export const catStyle = (c) => `--hue:${c.hue};--hue2:${c.hue2}`;

export function ringSvg(pct, size = 104, stroke = 9) {
  const r = (size / 2) - stroke - 1;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.max(0, Math.min(100, pct)) / 100);
  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"><circle class="rt" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}"/><circle class="rf" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}"/></svg>`;
}

export function markIcon(m) {
  if (m === 1) return icon('checkCircle');
  if (m === 2) return icon('alert');
  if (m === 3) return icon('x');
  return iconOutline('checkCircle');
}

/* ---------------- toast ---------------- */
let toastSeq = 0;
export function toast(msg, kind = 'ok', action) {
  const host = document.getElementById('toasts');
  const el = document.createElement('div');
  el.className = `toast ${kind}`;
  const ic = kind === 'ok' ? 'checkCircle' : kind === 'warn' ? 'alert' : kind === 'err' ? 'alert' : 'info';
  el.innerHTML = `${icon(ic)}<span>${esc(msg)}</span>`;
  if (action) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = action.label;
    b.addEventListener('click', () => { action.fn(); close(); });
    el.appendChild(b);
  }
  host.appendChild(el);
  const id = ++toastSeq;
  let timer = setTimeout(close, action ? 6500 : 2600);
  function close() {
    clearTimeout(timer);
    if (!el.isConnected) return;
    el.classList.add('out');
    setTimeout(() => el.remove(), 240);
  }
  el.addEventListener('mouseenter', () => clearTimeout(timer));
  el.addEventListener('mouseleave', () => { timer = setTimeout(close, 1800); });
  while (host.children.length > 4) host.firstChild.remove();
  return id;
}

/* ---------------- modal ---------------- */
export function modal({ title, body, confirmText = '确定', cancelText = '取消', danger = false, onConfirm, actions = true, wide = false }) {
  const host = document.getElementById('modal');
  host.hidden = false;
  host.innerHTML = `<div class="modal-box${wide ? ' wide' : ''}" role="document"><h3>${esc(title)}</h3><div class="modal-body">${body}</div>
    ${actions ? `<div class="modal-actions"><button class="btn btn-sm btn-ghost" data-mclose>${esc(cancelText)}</button>
    <button class="btn btn-sm ${danger ? 'btn-danger' : 'btn-primary'}" data-mok>${esc(confirmText)}</button></div>` : ''}</div>`;
  document.body.classList.add('locked');
  const close = () => { host.hidden = true; host.innerHTML = ''; document.body.classList.remove('locked'); document.removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
  document.addEventListener('keydown', onKey);
  host.querySelector('[data-mclose]')?.addEventListener('click', close);
  host.addEventListener('click', (e) => { if (e.target === host) close(); });
  host.querySelector('[data-mok]')?.addEventListener('click', async () => { const r = await onConfirm?.(); if (r !== false) close(); });
  (host.querySelector('[data-mok]') || host.querySelector('button'))?.focus();
  return close;
}

/* ---------------- prose behaviour ---------------- */
export function installProse(root) {
  root.addEventListener('click', async (e) => {
    const copy = e.target.closest('.cb-copy');
    if (copy) {
      const pre = copy.closest('.codeblock')?.querySelector('pre');
      const text = pre?.innerText ?? '';
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        const ta = document.createElement('textarea');
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); } catch { /* ignore */ }
        ta.remove();
      }
      copy.classList.add('done');
      copy.querySelector('span').textContent = '已复制';
      setTimeout(() => { copy.classList.remove('done'); const s = copy.querySelector('span'); if (s) s.textContent = '复制'; }, 1600);
      return;
    }
    const tab = e.target.closest('.ct-tab');
    if (tab) {
      const wrap = tab.closest('.code-tabs');
      const lang = tab.dataset.lang;
      wrap.querySelectorAll('.ct-tab').forEach((t) => t.classList.toggle('on', t === tab));
      wrap.querySelectorAll('.ct-pane').forEach((p) => p.classList.toggle('on', p.dataset.i === tab.dataset.i));
      if (lang && S.prefs.codeLang !== lang) { setPref('codeLang', lang); applyCodeLang(document); }
      return;
    }
    const img = e.target.closest('img.md-img');
    if (img) { openLightbox(img.currentSrc || img.src, img.alt); return; }
    const fn = e.target.closest('.fnref');
    if (fn) { showFootnote(fn); return; }
    const link = e.target.closest('a[data-mdlink]');
    if (link) {
      const target = resolveMdLink(link.dataset.mdlink, root.dataset.docid);
      if (target) { e.preventDefault(); location.hash = target; }
      else {
        e.preventDefault();
        const file = D.docIndex.get(root.dataset.docid)?.file;
        if (file) window.open(`https://github.com/zijing2333/CSView/blob/main/src/${file}`, '_blank', 'noopener');
      }
    }
  });

  root.addEventListener('error', (e) => {
    const img = e.target;
    if (img.tagName !== 'IMG' || img.dataset.failed) return;
    img.dataset.failed = '1';
    const box = document.createElement('div');
    box.className = 'img-fallback';
    box.innerHTML = `${icon('alert')}<span>图片未能加载</span><a href="${esc(img.src)}" target="_blank" rel="noopener">查看原图 ${icon('external')}</a>`;
    img.replaceWith(box);
  }, true);
}

export function applyCodeLang(root) {
  const lang = S.prefs.codeLang;
  root.querySelectorAll('.code-tabs').forEach((wrap) => {
    const tabs = [...wrap.querySelectorAll('.ct-tab')];
    const want = tabs.find((t) => t.dataset.lang === lang) || tabs[0];
    if (!want || want.classList.contains('on')) return;
    tabs.forEach((t) => t.classList.toggle('on', t === want));
    wrap.querySelectorAll('.ct-pane').forEach((p) => p.classList.toggle('on', p.dataset.i === want.dataset.i));
  });
}

function resolveMdLink(href, currentDocId) {
  if (!href) return null;
  const clean = href.split('#')[0];
  if (!clean) return null;
  const cur = D.docIndex.get(currentDocId);
  let p = clean;
  if (!p.startsWith('/')) {
    const baseDir = cur ? cur.file.split('/').slice(0, -1) : [];
    const parts = [...baseDir, ...p.split('/')];
    const out = [];
    for (const seg of parts) {
      if (seg === '.' || seg === '') continue;
      if (seg === '..') out.pop(); else out.push(seg);
    }
    p = out.join('/');
  } else p = p.slice(1);
  p = p.replace(/\/$/, '');
  if (!p) return '#/';
  if (!p.endsWith('.md')) p += /\.md$/.test(p) ? '' : '.md';
  const doc = D.manifest.docs.find((d) => d.file === p);
  if (doc) return `#/d/${doc.id}`;
  const noExt = p.replace(/\.md$/, '').replace(/\/README$/, '');
  const cat = D.manifest.categories.find((c) => c.dir === noExt || c.dir === noExt.split('/')[0]);
  if (cat) return `#/c/${cat.id}`;
  return null;
}

export function openLightbox(src, cap) {
  const lb = document.getElementById('lightbox');
  document.getElementById('lbImg').src = src;
  document.getElementById('lbCap').textContent = cap || '点击任意处关闭';
  lb.hidden = false;
  document.body.classList.add('locked');
}
export function closeLightbox() {
  const lb = document.getElementById('lightbox');
  lb.hidden = true;
  document.getElementById('lbImg').removeAttribute('src');
  document.body.classList.remove('locked');
}

let fnPop = null;
let fnSrc = null;
function onDocClick(e) {
  if (e.target.closest('.fn-pop') || e.target.closest('.fnref')) return;
  closeFootnote();
}
function showFootnote(el) {
  if (fnPop && fnSrc === el) { closeFootnote(); return; }
  closeFootnote();
  const pop = document.createElement('div');
  pop.className = 'fn-pop';
  pop.textContent = el.dataset.fn || '';
  document.body.appendChild(pop);
  const r = el.getBoundingClientRect();
  const w = Math.min(340, window.innerWidth - 24);
  pop.style.width = `${w}px`;
  pop.style.left = `${Math.max(12, Math.min(window.innerWidth - w - 12, r.left - 20))}px`;
  const ph = pop.offsetHeight;
  pop.style.top = `${r.top - ph - 10 > 70 ? r.top - ph - 10 : Math.min(window.innerHeight - ph - 12, r.bottom + 10)}px`;
  fnPop = pop;
  fnSrc = el;
  document.addEventListener('click', onDocClick);
}
export function closeFootnote() {
  if (fnPop) { fnPop.remove(); fnPop = null; fnSrc = null; document.removeEventListener('click', onDocClick); }
}

/* ---------------- misc ---------------- */
export function revealAll(root) {
  const items = root.querySelectorAll('[data-reveal]');
  if (!('IntersectionObserver' in window) || !S.prefs.motion) { items.forEach((i) => i.classList.add('in')); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) {
        const d = +(en.target.dataset.delay || 0);
        setTimeout(() => en.target.classList.add('in'), d);
        io.unobserve(en.target);
      }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
  items.forEach((i) => io.observe(i));
  return () => io.disconnect();
}

export function highlight(text, terms) {
  const safe = esc(text);
  if (!terms.length) return safe;
  const pattern = terms.filter(Boolean).map((t) => esc(t).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  if (!pattern) return safe;
  return safe.replace(new RegExp(`(${pattern})`, 'gi'), '<mark>$1</mark>');
}

export function snippet(text, terms, len = 92) {
  const t = text || '';
  if (!terms.length) return esc(t.slice(0, len));
  const lower = t.toLowerCase();
  let at = -1;
  for (const term of terms) { const i = lower.indexOf(term.toLowerCase()); if (i >= 0 && (at < 0 || i < at)) at = i; }
  if (at < 0) return esc(t.slice(0, len));
  const start = Math.max(0, at - 26);
  return (start > 0 ? '…' : '') + highlight(t.slice(start, start + len), terms);
}