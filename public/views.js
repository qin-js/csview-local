import {
  S, D, loadDoc, loadRank, loadSearch, setMark, cycleMark, toggleStar, setNote, touchRecent,
  statsFor, catQuestionIds, docQuestionIds, globalStats, starredIds, weakIds, noteIds,
  MARK_LABEL, WIDTHS, setPref, streak, todayKey, resetAll, restore, importState, emit,
} from './store.js';
import {
  esc, icon, iconOutline, fmtK, readMin, catStyle, ringSvg, markIcon, toast, modal,
  applyCodeLang, revealAll, highlight, snippet,
} from './ui.js';

const AUTHORS = [
  ['枫长', '算法页面作者，某 C9 高校硕士，曾在字节跳动和阿里云各实习两个月，力扣刷题 800+，主要技术栈 C++。'],
  ['LH', '985 硕士，22 年秋招上岸字节核心部门，主要技术栈 C++。'],
  ['jjd', '操作系统和 C++ 页面作者，国内 top3 计算机专业硕士在读，本科专业 top5%，数学建模国奖一等奖。'],
  ['xmy', 'Java 页面作者，985 计算机硕士，曾在网易实习三个月，主要技术栈 Java。'],
  ['fawn', 'CSView 图片绘制人，华五计算机专业。'],
  ['小羊', '专业的图案创意设计者。'],
  ['子敬', '某 985 大学软件工程研二，CSView 发起人，主要技术栈 Golang。'],
];

const refresh = () => document.dispatchEvent(new CustomEvent('cs:refresh'));
const catOf = (id) => D.catIndex.get(id);
const docsOf = (catId) => D.manifest.docs.filter((d) => d.cat === catId);
const qMeta = (id) => D.qIndex.get(id);

function freqChip(f) {
  if (!f || !S.prefs.showFreq) return '';
  return `<span class="freq${f >= 3 ? ' hot' : ''}" title="在面经中出现 ${f} 次">${icon('flame')}${f}次</span>`;
}
function badgeHtml(badges) {
  return (badges || []).map((b) => `<span class="qbadge qb-${b.kind}">${esc(b.text)}</span>`).join('');
}
function crumb(items) {
  return `<nav class="crumb">${items.map((it, i) => `${i ? icon('right') : ''}${it.href ? `<a href="${it.href}">${esc(it.t)}</a>` : `<span>${esc(it.t)}</span>`}`).join('')}</nav>`;
}
function emptyState(title, desc, ic = 'search', action = '') {
  return `<div class="empty">${iconOutline(ic)}<b>${esc(title)}</b><p>${esc(desc)}</p>${action}</div>`;
}

/* ============================ HOME ============================ */
async function home() {
  const m = D.manifest;
  const g = globalStats();
  const rank = await loadRank();
  const hot = rank.filter((r) => r.q).slice(0, 8);
  const top10 = rank.filter((r) => r.q).slice(0, 10);
  const st = streak();
  const today = S.activity[todayKey()] || 0;
  const recent = S.recent.filter((r) => D.docIndex.has(r.d)).slice(0, 4);
  const starters = ['network-tcp', 'os-process', 'mysql-indexing', 'redis-application'].filter((id) => D.docIndex.has(id));
  const contDocs = recent.length ? recent.map((r) => D.docIndex.get(r.d)) : starters.map((id) => D.docIndex.get(id));
  const methodDocs = docsOf('method').slice(0, 3);

  const demo = !!m.demo;
  const html = `
  ${demo ? `<div class="demo-strip" data-reveal>
    <span class="ds-ic">${icon('spark')}</span>
    <div><b>你正在浏览原创示例题库</b><p>公开站点只托管界面代码。完整 ${'747'} 道面经题来自上游 CSView，作者声明禁止转载，因此需你在本地构建后导入——数据只留在你的浏览器里。</p></div>
    <button class="btn btn-primary btn-sm" data-open-lib type="button">${icon('download')}导入完整题库</button>
  </div>` : ''}
  <section class="hero">
    <div class="hero-copy">
      <div class="kicker" data-reveal><span class="dot"></span>${demo ? '原创示例 · 功能完整 · 可导入题库' : '面经驱动 · 真实考题 · 开源免费'}</div>
      <h1 data-reveal data-delay="60">把<span class="grad">面经</span>，<br>练成<em>肌肉记忆</em>。</h1>
      <p class="lede" data-reveal data-delay="120">${demo
        ? `${m.stats.questions} 道原创示例题，覆盖网络、系统、数据库、C++/Go 与算法设计。折叠自测、题频排序、掌握度追踪、全文搜索在这里全部真实可用——导入本地构建的题库即可换成完整 747 题。`
        : `${m.stats.questions} 道从数百篇真实面经里提炼出来的高频题，覆盖算法、网络、操作系统、数据库与三大语言。边读边测，把「看过」变成「答得出」。`}</p>
      <div class="hero-cta" data-reveal data-delay="180">
        <a class="btn btn-primary" href="#/quiz">${icon('target')}开始自测<kbd>Q</kbd></a>
        <a class="btn btn-ghost" href="#/c/algorithm">${icon('layers')}浏览题库</a>
        <button class="btn btn-quiet" data-open-search type="button">${icon('search')}搜索题目<kbd>⌘K</kbd></button>
      </div>
      <dl class="hero-stats" data-reveal data-delay="240">
        <div><dt>${m.stats.questions}</dt><dd>高频面试题</dd></div>
        <div><dt>${m.stats.docs}</dt><dd>知识分册</dd></div>
        <div><dt>${fmtK(m.stats.words)}</dt><dd>解析字数</dd></div>
        <div><dt>${m.stats.ranked}</dt><dd>面经频次记录</dd></div>
      </dl>
    </div>
    <aside class="hero-panel" data-reveal data-delay="140">
      <div class="hp-head"><b>面试作战面板</b><span class="live">LIVE</span></div>
      <div class="hp-main">
        <div class="ring">${ringSvg(g.pct)}<b>${g.pct}%</b></div>
        <div class="hp-facts">
          <div class="fact"><span>已掌握</span><b class="ok">${g.done}</b></div>
          <div class="fact"><span>待巩固</span><b class="warn">${g.fuzzy + g.weak}</b></div>
          <div class="fact"><span>连续打卡</span><b class="flare">${st} 天</b></div>
          <div class="fact"><span>今日标记</span><b>${today}</b></div>
        </div>
      </div>
      <div class="hp-card" id="hotCard"></div>
      <div class="hp-dots" id="hotDots">${hot.map((_, i) => `<i class="${i === 0 ? 'on' : ''}"></i>`).join('')}</div>
    </aside>
  </section>

  <section class="sec" id="categories">
    <div class="sec-head" data-reveal>
      <div><div class="sec-title"><span class="idx">01</span><h2>知识矩阵</h2></div><p class="sec-sub">${m.categories.length} 个方向 · 按面试考察密度组织，点进去就是题目本身</p></div>
      <a class="link-more" href="#/rank">${icon('flame')}看高频榜${icon('right')}</a>
    </div>
    <div class="cat-grid">
      ${m.categories.map((c, i) => {
        const s = statsFor(catQuestionIds(c.id));
        return `<a class="cat-card" href="#/c/${c.id}" style="${catStyle(c)}" data-reveal data-delay="${Math.min(i * 35, 320)}">
          <div class="cc-top"><span class="cc-glyph">${iconOutline(c.glyph)}</span><span class="cc-group">${esc(c.group)}</span></div>
          <h3>${esc(c.name)}</h3>
          <p>${esc(c.desc)}</p>
          <div class="cc-meta"><span>${c.docs} 篇</span><i>·</i><span>${c.questions} 题</span><i>·</i><span>${fmtK(c.words)}字</span></div>
          <div class="cc-bar"><i style="width:${s.pct}%"></i><u style="width:${s.total ? ((s.fuzzy + s.weak) / s.total) * 100 : 0}%"></u></div>
          <div class="cc-foot"><span>掌握 ${s.done}/${s.total}</span>${icon('right')}</div>
        </a>`;
      }).join('')}
    </div>
  </section>

  <section class="sec">
    <div class="sec-head" data-reveal>
      <div><div class="sec-title"><span class="idx">02</span><h2>面经高频 TOP 10</h2></div><p class="sec-sub">统计自 ${m.stats.ranked} 条面经记录，数字是这道题被问到的次数</p></div>
      <a class="link-more" href="#/rank">完整榜单${icon('right')}</a>
    </div>
    <div class="rank-list" data-reveal>
      ${top10.map((r, i) => rankRow(r, i, top10[0].f)).join('')}
    </div>
  </section>

  <section class="sec">
    <div class="sec-head" data-reveal>
      <div><div class="sec-title"><span class="idx">03</span><h2>${recent.length ? '继续学习' : '从这里开始'}</h2></div><p class="sec-sub">${recent.length ? '上次读到的位置已经帮你记住了' : '面试官最爱追问的四篇，先啃下来性价比最高'}</p></div>
      <a class="link-more" href="#/progress">${icon('chart')}我的进度${icon('right')}</a>
    </div>
    <div class="cont-grid" data-reveal>
      ${contDocs.map((d) => {
        const c = catOf(d.cat); const s = statsFor(docQuestionIds(d.id));
        return `<a class="cont-card" href="#/d/${d.id}" style="${catStyle(c)}">
          <span class="ct">${iconOutline(c.glyph)}${esc(c.name)}</span>
          <b>${esc(d.title)}</b>
          <div class="mini-bar"><i style="width:${s.pct}%"></i></div>
          <div class="cm"><span>${d.questions.length} 题 · 约 ${readMin(d.words)} 分钟</span><span>${s.pct}%</span></div>
        </a>`;
      }).join('')}
    </div>
  </section>

  <section class="sec">
    <div class="sec-head" data-reveal>
      <div><div class="sec-title"><span class="idx">04</span><h2>面试方法论</h2></div><p class="sec-sub">八股之外，决定 offer 的那些事</p></div>
      <a class="link-more" href="#/c/method">全部文章${icon('right')}</a>
    </div>
    <div class="cont-grid" data-reveal>
      ${methodDocs.map((d) => {
        const c = catOf('method');
        return `<a class="cont-card" href="#/d/${d.id}" style="${catStyle(c)}">
          <span class="ct">${iconOutline('compass')}方法论</span><b>${esc(d.title)}</b>
          <div class="cm"><span>${fmtK(d.words)} 字 · 约 ${readMin(d.words)} 分钟</span>${icon('right')}</div>
        </a>`;
      }).join('')}
    </div>
  </section>`;

  let timer = null, idx = 0, paused = false;
  function mount(root) {
    const card = root.querySelector('#hotCard');
    const dots = [...root.querySelectorAll('#hotDots i')];
    const paint = () => {
      const r = hot[idx];
      if (!r) return;
      const c = catOf(r.c);
      card.style.cssText = catStyle(c);
      card.innerHTML = `<div class="hc-top"><span style="color:var(--hue)">${esc(c.name)}</span><span>·</span>${freqChip(r.f)}</div>
        <div class="hc-q hc-anim">${esc(r.t)}</div>
        <div class="hc-go">看解析 ${icon('right')}</div>`;
      card.onclick = () => { location.hash = `#/q/${r.q}`; };
      dots.forEach((d, i) => d.classList.toggle('on', i === idx));
    };
    paint();
    card.addEventListener('mouseenter', () => { paused = true; });
    card.addEventListener('mouseleave', () => { paused = false; });
    if (S.prefs.motion && hot.length > 1) {
      timer = setInterval(() => { if (!paused && !document.hidden) { idx = (idx + 1) % hot.length; paint(); } }, 4600);
    }
  }
  return { html, mount, cleanup: () => clearInterval(timer) };
}

function rankRow(r, i, max) {
  const c = catOf(r.c);
  const q = r.q ? qMeta(r.q) : null;
  return `<button class="rank-row ${i < 3 ? 'top' + (i + 1) : ''}" style="${catStyle(c)}" data-goto="${r.q ? `#/q/${r.q}` : ''}" data-title="${esc(r.t)}" type="button">
    <span class="rk">${String(i + 1).padStart(2, '0')}</span>
    <span class="rt"><b>${esc(r.t)}</b><span><em>${esc(c.name)}</em>${q ? `· ${esc(q.docTitle)}` : '· 面经真题，站内暂无对应解析'}</span></span>
    <span class="rbar"><i style="width:${Math.max(6, (r.f / max) * 100)}%"></i></span>
    <span class="rf"><b>${r.f}</b> 次</span>
  </button>`;
}

/* ============================ CATEGORY ============================ */
async function category(params) {
  const c = catOf(params.cat);
  if (!c) return notFound('没有这个分类');
  const docs = docsOf(c.id);
  const ids = catQuestionIds(c.id);
  const s = statsFor(ids);
  const allQ = docs.flatMap((d) => d.questions.map((q) => ({ ...q, docTitle: d.title, docId: d.id })));

  const html = `
  <div style="${catStyle(c)}">
    ${crumb([{ t: '首页', href: '#/' }, { t: c.group }, { t: c.name }])}
    <header class="cat-hero">
      <div class="ch-row">
        <span class="ch-glyph">${iconOutline(c.glyph)}</span>
        <div class="ch-main">
          <h1>${esc(c.name)}</h1>
          <p>${esc(c.desc)}</p>
          <div class="ch-stats">
            <div><b>${docs.length}</b><span>知识分册</span></div>
            <div><b>${s.total}</b><span>面试题</span></div>
            <div><b>${fmtK(c.words)}</b><span>解析字数</span></div>
            <div><b style="color:var(--ok)">${s.done}</b><span>已掌握</span></div>
            <div><b style="color:var(--warn)">${s.fuzzy + s.weak}</b><span>待巩固</span></div>
          </div>
        </div>
        <div class="ch-actions">
          <a class="btn btn-primary btn-sm" href="#/quiz?cat=${c.id}">${icon('target')}自测本方向</a>
          <button class="btn btn-ghost btn-sm" data-random type="button">${icon('shuffle')}随机一题</button>
        </div>
      </div>
    </header>

    <div class="toolbar">
      <div class="tabs" style="margin:0">
        <button class="on" data-view="docs" type="button">${icon('layers')}分册 <span class="tn">${docs.length}</span></button>
        <button data-view="questions" type="button">${icon('list')}全部题目 <span class="tn">${allQ.length}</span></button>
      </div>
      <div class="tb-sep"></div>
      <label class="tb-search">${icon('search')}<input type="text" id="catSearch" placeholder="在 ${esc(c.name)} 内筛选题目…" autocomplete="off"></label>
      <div class="selectwrap">
        <select id="catFilter" aria-label="状态筛选">
          <option value="all">全部状态</option><option value="todo">未标记</option><option value="1">已掌握</option>
          <option value="2">有点模糊</option><option value="3">还不会</option><option value="star">已收藏</option><option value="hot">高频（≥2次）</option>
        </select>${icon('down')}
      </div>
      <div class="selectwrap">
        <select id="catSort" aria-label="排序">
          <option value="default">默认顺序</option><option value="freq">按面经频次</option><option value="words">按解析长度</option>
        </select>${icon('down')}
      </div>
      <span class="tb-count" id="catCount"></span>
    </div>
    <div id="catBody"></div>
  </div>`;

  let view = 'docs', term = '', filter = 'all', sort = 'default';

  function matchQ(q) {
    if (term && !q.title.toLowerCase().includes(term)) return false;
    const mk = S.marks[q.id] || 0;
    if (filter === 'todo') return mk === 0;
    if (filter === 'star') return !!S.stars[q.id];
    if (filter === 'hot') return (q.freq || 0) >= 2;
    if (filter !== 'all') return mk === +filter;
    return true;
  }

  function paint(root) {
    const body = root.querySelector('#catBody');
    const count = root.querySelector('#catCount');
    if (view === 'docs') {
      const list = docs.filter((d) => !term || d.title.toLowerCase().includes(term) || d.questions.some((q) => q.title.toLowerCase().includes(term)));
      count.textContent = `${list.length} 篇`;
      body.innerHTML = list.length ? `<div class="doc-grid">${list.map((d, i) => {
        const ds = statsFor(docQuestionIds(d.id));
        return `<a class="doc-card" href="#/d/${d.id}">
          <div class="dc-top"><span class="dc-n">${String(i + 1).padStart(2, '0')}</span>${ds.pct === 100 && ds.total ? `<span class="qbadge qb-master">已读完</span>` : ''}</div>
          <h3>${esc(d.title)}</h3>
          <div class="dc-auth">${(d.authors || []).slice(0, 3).map((a) => `<span class="av">${esc(String(a).slice(0, 1))}</span>`).join('')}${(d.authors || []).length ? esc((d.authors || []).join(' · ')) : 'CSView 整理'}</div>
          <div class="dc-meta"><span>${d.questions.length || '—'} 题</span><span>${fmtK(d.words)} 字</span><span>${readMin(d.words)} 分钟</span></div>
          <div class="dc-prog"><div class="mini-bar"><i style="width:${ds.pct}%"></i></div><span>${ds.done}/${ds.total}</span></div>
        </a>`;
      }).join('')}</div>` : emptyState('没有匹配的分册', '换个关键词试试，或切到「全部题目」按题搜索。');
    } else {
      let list = allQ.filter(matchQ);
      if (sort === 'freq') list = [...list].sort((a, b) => (b.freq || 0) - (a.freq || 0));
      if (sort === 'words') list = [...list].sort((a, b) => b.words - a.words);
      count.textContent = `${list.length} / ${allQ.length} 题`;
      body.innerHTML = list.length ? `<div class="qlist">${list.map((q) => {
        const mk = S.marks[q.id] || 0;
        return `<button class="qrow" data-goto="#/q/${q.id}" type="button">
          <span class="qn">${String(q.n).padStart(2, '0')}</span>
          <span class="qt"><b>${term ? highlight(q.title, [term]) : esc(q.title)}</b><small>${esc(q.docTitle)} · ${q.words} 字</small></span>
          <span class="qa">${badgeHtml(q.badges)}${freqChip(q.freq)}${S.stars[q.id] ? icon('star', 'star-on') : ''}<span class="mark-dot m${mk}" title="${MARK_LABEL[mk]}"></span></span>
        </button>`;
      }).join('')}</div>` : emptyState('没有符合条件的题目', '调整筛选条件，或先去做几道题标记状态。', 'filter');
    }
  }

  function mount(root) {
    paint(root);
    root.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => {
      view = b.dataset.view;
      root.querySelectorAll('[data-view]').forEach((x) => x.classList.toggle('on', x === b));
      paint(root);
    }));
    const si = root.querySelector('#catSearch');
    si.addEventListener('input', () => { term = si.value.trim().toLowerCase(); if (term && view === 'docs') { view = 'questions'; root.querySelectorAll('[data-view]').forEach((x) => x.classList.toggle('on', x.dataset.view === 'questions')); } paint(root); });
    root.querySelector('#catFilter').addEventListener('change', (e) => { filter = e.target.value; view = 'questions'; root.querySelectorAll('[data-view]').forEach((x) => x.classList.toggle('on', x.dataset.view === 'questions')); paint(root); });
    root.querySelector('#catSort').addEventListener('change', (e) => { sort = e.target.value; view = 'questions'; root.querySelectorAll('[data-view]').forEach((x) => x.classList.toggle('on', x.dataset.view === 'questions')); paint(root); });
    root.querySelector('[data-random]').addEventListener('click', () => {
      const pool = allQ.filter((q) => q.words > 30);
      const pick = (pool.length ? pool : allQ)[Math.floor(Math.random() * (pool.length || allQ.length))];
      if (pick) location.hash = `#/q/${pick.id}`;
    });
  }
  return { html, mount, repaint: () => paint(document.getElementById('main')) };
}

/* ============================ READER ============================ */
function controlsHtml() {
  const p = S.prefs;
  return `<div class="rail-box">
    <div class="rail-title"><span>阅读设置</span><button data-reset-prefs type="button">重置</button></div>
    <div class="ctrl">
      <div class="ctrl-row"><div class="ctrl-lab"><span>正文字号</span><b id="fsVal">${p.fontSize}px</b></div>
        <input type="range" id="fsRange" min="14" max="21" step="1" value="${p.fontSize}" aria-label="正文字号"></div>
      <div class="ctrl-row"><div class="ctrl-lab"><span>阅读行宽</span></div>
        <div class="seg" id="widthSeg">${[['narrow', '紧凑'], ['normal', '标准'], ['wide', '宽阔']].map(([v, t]) => `<button data-w="${v}" class="${p.width === v ? 'on' : ''}" type="button">${t}</button>`).join('')}</div></div>
      <div class="ctrl-row"><div class="ctrl-lab"><span>代码语言</span></div>
        <div class="seg" id="langSeg">${[['cpp', 'C++'], ['java', 'Java'], ['go', 'Go']].map(([v, t]) => `<button data-l="${v}" class="${p.codeLang === v ? 'on' : ''}" type="button">${t}</button>`).join('')}</div></div>
      <div class="ctrl-row"><div class="ctrl-lab"><span>页面主题</span></div>
        <div class="seg" id="themeSeg">${[['dark', '深色'], ['light', '浅色']].map(([v, t]) => `<button data-t="${v}" class="${p.theme === v ? 'on' : ''}" type="button">${t}</button>`).join('')}</div></div>
      <button class="toggle ${p.collapse ? 'on' : ''}" data-pref="collapse" type="button"><span>默认折叠答案</span><span class="tsw"></span></button>
      <button class="toggle ${p.showFreq ? 'on' : ''}" data-pref="showFreq" type="button"><span>显示面经频次</span><span class="tsw"></span></button>
      <button class="toggle ${p.motion ? 'on' : ''}" data-pref="motion" type="button"><span>背景动效</span><span class="tsw"></span></button>
    </div>
  </div>`;
}

function questionCard(q, c, opts = {}) {
  const mk = S.marks[q.id] || 0;
  const starred = !!S.stars[q.id];
  const note = S.notes[q.id];
  const collapsed = opts.collapsed ?? S.prefs.collapse;
  const body = q.html && q.html.trim()
    ? `<div class="prose">${q.html}</div>`
    : `<div class="qempty">${icon('bulb')}<span>这是一道开放性问题，站内没有标准解析。把你自己的版本写下来，面试前直接背这份。</span></div>`;
  return `<article class="qcard${collapsed ? ' collapsed' : ''}" id="${esc(q.id)}" data-q="${esc(q.id)}" data-mark="${mk}" style="${catStyle(c)}">
    <header class="qhead" data-toggle>
      <span class="qn">${String(q.n).padStart(2, '0')}</span>
      <div class="qtitle">
        <h3>${esc(q.title)}</h3>
        <div class="qtags">${badgeHtml(q.badges)}${freqChip(q.freq)}${q.leetcode ? `<a class="qbadge qb-know" href="${esc(q.leetcode)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">力扣原题 ↗</a>` : ''}<span class="qwc" style="font-family:var(--mono);font-size:10.5px;color:var(--fg-4)">${q.words} 字</span></div>
      </div>
      <div class="qtools">
        <button class="qtool ${starred ? 'on' : ''}" data-star="${esc(q.id)}" title="收藏" aria-label="收藏">${iconOutline('star')}</button>
        <button class="qtool ${note ? 'has-note' : ''}" data-note="${esc(q.id)}" title="我的笔记" aria-label="我的笔记">${icon('note')}</button>
        <button class="qtool mark${mk}" data-mark-btn="${esc(q.id)}" title="${MARK_LABEL[mk]}（点击切换）" aria-label="标记掌握程度">${markIcon(mk)}</button>
        <span class="qtool qcaret" aria-hidden="true">${icon('down')}</span>
      </div>
    </header>
    <div class="qbody">${body}</div>
    <div class="qnote" hidden></div>
  </article>`;
}

async function docView(params) {
  const meta = D.docIndex.get(params.doc);
  if (!meta) return notFound('没有找到这篇文档');
  const d = await loadDoc(params.doc);
  const c = catOf(d.cat);
  const siblings = docsOf(d.cat);
  const di = siblings.findIndex((x) => x.id === d.id);
  const prev = siblings[di - 1], next = siblings[di + 1];
  const ds = statsFor(docQuestionIds(d.id));
  touchRecent(d.id, params.q || null);

  const isQA = d.type === 'qa';
  const hasIntro = isQA && d.intro && d.intro.trim();
  const tocItems = isQA
    ? [...(hasIntro ? [{ id: `${d.id}-intro`, text: '导语', lv: 3 }] : []), ...d.questions.map((q) => ({ id: q.id, text: `${String(q.n).padStart(2, '0')} · ${q.title}`, lv: 3 }))]
    : (d.toc || []).map((t) => ({ id: t.id, text: t.text, lv: t.level }));

  const html = `
  <div class="reader" style="${catStyle(c)}">
    <aside class="rail rail-left" id="railLeft">
      <div class="rail-popbar"><span>分册目录</span><button data-rail-close type="button" aria-label="关闭目录">${icon('x')}</button></div>
      <div class="rail-box rail-scroll inner-scroll">
        <div class="rail-title"><span>${esc(c.name)}</span><a href="#/c/${c.id}">全部</a></div>
        ${siblings.map((x) => {
          const xs = statsFor(docQuestionIds(x.id));
          return `<a class="tree-doc ${x.id === d.id ? 'on' : ''}" href="#/d/${x.id}">${esc(x.title)}${xs.pct === 100 && xs.total ? '<span class="tdone">✓</span>' : ''}</a>`;
        }).join('')}
        <div class="rail-title" style="margin-top:16px"><span>其他方向</span></div>
        ${D.manifest.categories.filter((x) => x.id !== c.id).map((x) => `<a class="tree-cat" href="#/c/${x.id}" style="${catStyle(x)}"><span class="cdot"></span>${esc(x.name)}<span class="tn">${x.questions}</span></a>`).join('')}
      </div>
    </aside>

    <div class="doc-main" data-docid="${esc(d.id)}">
      <div class="mobile-tools">
        <button class="btn btn-ghost btn-sm" data-rail="left" type="button">${icon('list')}分册目录</button>
        <button class="btn btn-ghost btn-sm" data-rail="right" type="button">${icon('settings')}阅读设置</button>
      </div>
      ${crumb([{ t: '首页', href: '#/' }, { t: c.name, href: `#/c/${c.id}` }, { t: d.title }])}
      <header class="doc-head">
        <h1>${esc(d.title)}</h1>
        <div class="dh-meta">
          <span>${icon('book')}${isQA ? `${d.questions.length} 道题` : '长文'}</span>
          <span>${icon('clock')}约 ${readMin(d.words)} 分钟</span>
          <span>${icon('code')}${fmtK(d.words)} 字</span>
          ${(d.authors || []).length ? `<span>${icon('talk')}${esc(d.authors.join(' · '))}</span>` : ''}
          <a href="https://github.com/zijing2333/CSView/blob/main/src/${esc(d.file)}" target="_blank" rel="noopener" style="color:var(--volt-2);display:inline-flex;align-items:center;gap:5px">${icon('external')}源文件</a>
        </div>
        <div class="dh-prog"><div class="mini-bar"><i id="docBar" style="width:${ds.pct}%"></i></div><span id="docProgTxt">${ds.done}/${ds.total} 已掌握</span></div>
        <div class="dh-actions">
          ${isQA ? `<a class="btn btn-primary btn-sm" href="#/quiz?doc=${d.id}">${icon('target')}自测本篇</a>
          <button class="btn btn-ghost btn-sm" data-collapse-all type="button">${icon('eyeOff')}全部折叠</button>
          <button class="btn btn-ghost btn-sm" data-expand-all type="button">${icon('eye')}全部展开</button>
          <button class="btn btn-quiet btn-sm" data-mark-all type="button">${icon('checkCircle')}本篇全标记掌握</button>` : `<a class="btn btn-ghost btn-sm" href="#/c/${d.cat}">${icon('left')}返回 ${esc(c.name)}</a>`}
        </div>
      </header>

      ${hasIntro ? `<article class="qcard" id="${esc(d.id)}-intro"><div class="qbody" style="border:0;padding-top:18px"><div class="prose">${d.intro}</div></div></article>` : ''}
      ${isQA ? `<div id="qlist">${d.questions.map((q) => questionCard(q, c)).join('')}</div>`
        : `<article class="qcard" style="${catStyle(c)}"><div class="qbody" style="border:0;padding-top:18px"><div class="prose">${d.html}</div></div></article>`}

      <nav class="doc-pager">
        ${prev ? `<a class="pg" href="#/d/${prev.id}"><span>${icon('left')}上一篇</span><b>${esc(prev.title)}</b></a>` : '<span class="pg disabled"><span>已是第一篇</span><b>—</b></span>'}
        ${next ? `<a class="pg next" href="#/d/${next.id}"><span>下一篇${icon('right')}</span><b>${esc(next.title)}</b></a>` : '<span class="pg next disabled"><span>已是最后一篇</span><b>—</b></span>'}
      </nav>
    </div>

    <aside class="rail rail-right" id="railRight">
      <div class="rail-popbar"><span>本篇目录与设置</span><button data-rail-close type="button" aria-label="关闭设置">${icon('x')}</button></div>
      <div class="rail-box">
        <div class="rail-title"><span>本篇目录</span><span id="tocPos" style="font-family:var(--mono);color:var(--fg-4)"></span></div>
        <nav class="toc inner-scroll" id="toc">
          ${tocItems.map((t) => `<a href="#${esc(t.id)}" data-toc="${esc(t.id)}" class="${t.lv >= 4 ? 'lv4' : ''}">${esc(t.text)}</a>`).join('')}
        </nav>
      </div>
      ${controlsHtml()}
    </aside>
  </div>`;

  let io = null, io2 = null;
  function mount(root) {
    applyCodeLang(root);
    wireControls(root);
    const cards = [...root.querySelectorAll('.qcard[data-q]')];

    root.querySelectorAll('[data-toggle]').forEach((h) => h.addEventListener('click', (e) => {
      if (e.target.closest('.qtools') || e.target.closest('a')) return;
      h.closest('.qcard').classList.toggle('collapsed');
    }));
    root.querySelectorAll('[data-star]').forEach((b) => b.addEventListener('click', (e) => {
      e.stopPropagation();
      const on = toggleStar(b.dataset.star);
      b.classList.toggle('on', on);
      b.innerHTML = on ? icon('star') : iconOutline('star');
      toast(on ? '已加入收藏' : '已取消收藏', on ? 'ok' : 'info');
    }));
    root.querySelectorAll('[data-mark-btn]').forEach((b) => b.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = b.dataset.markBtn;
      const v = cycleMark(id);
      b.className = `qtool mark${v}`;
      b.innerHTML = markIcon(v);
      b.title = `${MARK_LABEL[v]}（点击切换）`;
      b.closest('.qcard').dataset.mark = v;
      updateDocProgress(root, d);
      toast(`标记为「${MARK_LABEL[v]}」`, v === 1 ? 'ok' : v === 0 ? 'info' : 'warn');
    }));
    root.querySelectorAll('.qtool[data-note]').forEach((b) => b.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleNote(root, b.dataset.note, b);
    }));
    root.querySelector('[data-collapse-all]')?.addEventListener('click', () => { cards.forEach((x) => x.classList.add('collapsed')); toast('已折叠全部答案，适合自测', 'info'); });
    root.querySelector('[data-expand-all]')?.addEventListener('click', () => { cards.forEach((x) => x.classList.remove('collapsed')); });
    root.querySelector('[data-mark-all]')?.addEventListener('click', () => {
      const ids = docQuestionIds(d.id);
      const backup = ids.map((id) => [id, S.marks[id] || 0]);
      ids.forEach((id) => { S.marks[id] = 1; });
      emit();
      cards.forEach((x) => { x.dataset.mark = '1'; const b = x.querySelector('[data-mark-btn]'); b.className = 'qtool mark1'; b.innerHTML = markIcon(1); });
      updateDocProgress(root, d);
      toast(`已把本篇 ${ids.length} 题标记为掌握`, 'ok', { label: '撤销', fn: () => { backup.forEach(([id, v]) => { if (v) S.marks[id] = v; else delete S.marks[id]; }); emit(); refresh(); } });
    });

    const scrim = document.getElementById('scrim');
    const closePops = () => {
      root.querySelectorAll('.rail.as-pop').forEach((x) => x.classList.remove('as-pop'));
      if (document.getElementById('drawer').hidden) scrim.hidden = true;
    };
    root.querySelectorAll('[data-rail]').forEach((b) => b.addEventListener('click', () => {
      const el = root.querySelector(b.dataset.rail === 'left' ? '#railLeft' : '#railRight');
      const other = root.querySelector(b.dataset.rail === 'left' ? '#railRight' : '#railLeft');
      other?.classList.remove('as-pop');
      const open = el.classList.toggle('as-pop');
      scrim.hidden = !open;
      if (open) el.scrollTop = 0;
    }));
    root.querySelectorAll('[data-rail-close]').forEach((b) => b.addEventListener('click', closePops));

    root.querySelectorAll('[data-toc]').forEach((a) => a.addEventListener('click', (e) => {
      e.preventDefault();
      const el = document.getElementById(a.dataset.toc);
      if (el) {
        el.classList.remove('collapsed');
        el.scrollIntoView({ behavior: S.prefs.motion ? 'smooth' : 'auto', block: 'start' });
        flash(el);
      }
      root.querySelector('#railRight')?.classList.remove('as-pop');
      if (document.getElementById('drawer').hidden) document.getElementById('scrim').hidden = true;
    }));

    const tocLinks = new Map([...root.querySelectorAll('[data-toc]')].map((a) => [a.dataset.toc, a]));
    const introEl = root.querySelector(`[id="${d.id}-intro"]`);
    const targets = isQA ? [...(introEl ? [introEl] : []), ...cards] : [...root.querySelectorAll('.prose h1[id],.prose h2[id],.prose h3[id]')];
    if (targets.length) {
      let active = null;
      io = new IntersectionObserver((entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (!visible.length) return;
        const id = visible[0].target.id;
        if (id === active) return;
        active = id;
        tocLinks.forEach((a, k) => a.classList.toggle('on', k === id));
        const link = tocLinks.get(id);
        if (link) {
          const box = root.querySelector('#toc');
          const lt = link.offsetTop - box.offsetTop;
          if (lt < box.scrollTop || lt > box.scrollTop + box.clientHeight - 30) box.scrollTop = Math.max(0, lt - 60);
          const pos = root.querySelector('#tocPos');
          if (pos && isQA) pos.textContent = `${tocLinks.size ? [...tocLinks.keys()].indexOf(id) + 1 : 0}/${tocLinks.size}`;
        }
      }, { rootMargin: '-80px 0px -62% 0px', threshold: 0 });
      targets.forEach((t) => io.observe(t));
    }

    if (params.q) {
      const el = document.getElementById(params.q);
      if (el) {
        el.classList.remove('collapsed');
        requestAnimationFrame(() => { el.scrollIntoView({ behavior: 'auto', block: 'start' }); flash(el); });
      }
    }
  }
  return { html, mount, cleanup: () => { io?.disconnect(); io2?.disconnect(); } };
}

function flash(el) {
  el.classList.add('flash');
  setTimeout(() => el.classList.remove('flash'), 1800);
}

function toggleNote(root, qid, btn) {
  const card = root.querySelector(`.qcard[data-q="${CSS.escape(qid)}"]`);
  const box = card.querySelector('.qnote');
  if (!box.hidden) { box.hidden = true; box.innerHTML = ''; return; }
  const cur = S.notes[qid]?.t || '';
  box.hidden = false;
  box.innerHTML = `<textarea placeholder="写下你自己的答法、踩过的坑、面试时的追问…">${esc(cur)}</textarea>
    <div class="qnote-bar"><span>${cur ? `上次修改 ${new Date(S.notes[qid].at).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}` : '仅保存在这台设备的浏览器里'}</span>
    <span style="display:flex;gap:8px"><button class="btn btn-sm btn-quiet" data-ndel type="button">删除</button><button class="btn btn-sm btn-primary" data-nsave type="button">保存笔记</button></span></div>`;
  const ta = box.querySelector('textarea');
  ta.focus();
  ta.setSelectionRange(ta.value.length, ta.value.length);
  box.querySelector('[data-nsave]').addEventListener('click', () => {
    setNote(qid, ta.value);
    btn.classList.toggle('has-note', !!S.notes[qid]);
    box.hidden = true; box.innerHTML = '';
    toast(S.notes[qid] ? '笔记已保存' : '笔记已清空', 'ok');
  });
  box.querySelector('[data-ndel]').addEventListener('click', () => {
    setNote(qid, '');
    btn.classList.remove('has-note');
    box.hidden = true; box.innerHTML = '';
    toast('笔记已删除', 'info');
  });
  ta.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') box.querySelector('[data-nsave]').click();
    e.stopPropagation();
  });
}

function updateDocProgress(root, d) {
  const s = statsFor(docQuestionIds(d.id));
  const bar = root.querySelector('#docBar');
  const txt = root.querySelector('#docProgTxt');
  if (bar) bar.style.width = `${s.pct}%`;
  if (txt) txt.textContent = `${s.done}/${s.total} 已掌握`;
}

export function wireControls(root) {
  const fs = root.querySelector('#fsRange');
  fs?.addEventListener('input', () => {
    setPref('fontSize', +fs.value);
    document.documentElement.style.setProperty('--read-size', `${fs.value}px`);
    const v = root.querySelector('#fsVal'); if (v) v.textContent = `${fs.value}px`;
  });
  root.querySelectorAll('#widthSeg [data-w]').forEach((b) => b.addEventListener('click', () => {
    setPref('width', b.dataset.w);
    document.documentElement.style.setProperty('--read-w', WIDTHS[b.dataset.w]);
    root.querySelectorAll('#widthSeg [data-w]').forEach((x) => x.classList.toggle('on', x === b));
  }));
  root.querySelectorAll('#langSeg [data-l]').forEach((b) => b.addEventListener('click', () => {
    setPref('codeLang', b.dataset.l);
    root.querySelectorAll('#langSeg [data-l]').forEach((x) => x.classList.toggle('on', x === b));
    applyCodeLang(document);
    toast(`题解默认展示 ${b.textContent}`, 'info');
  }));
  root.querySelectorAll('#themeSeg [data-t]').forEach((b) => b.addEventListener('click', () => {
    setPref('theme', b.dataset.t);
    root.querySelectorAll('#themeSeg [data-t]').forEach((x) => x.classList.toggle('on', x === b));
  }));
  root.querySelectorAll('[data-pref]').forEach((b) => b.addEventListener('click', () => {
    const k = b.dataset.pref;
    const v = !S.prefs[k];
    setPref(k, v);
    b.classList.toggle('on', v);
    if (k === 'collapse') {
      document.querySelectorAll('.qcard[data-q]').forEach((x) => x.classList.toggle('collapsed', v));
      toast(v ? '答案已折叠，先自己想一遍' : '答案已展开', 'info');
    }
    if (k === 'showFreq') document.querySelectorAll('.freq').forEach((f) => { f.style.display = v ? '' : 'none'; });
  }));
  root.querySelector('[data-reset-prefs]')?.addEventListener('click', () => {
    const d = { fontSize: 16, width: 'normal', codeLang: 'cpp', collapse: false, showFreq: true, motion: true };
    Object.entries(d).forEach(([k, v]) => setPref(k, v));
    toast('阅读设置已重置', 'ok');
    refresh();
  });
}

/* ============================ RANK ============================ */
async function rankView() {
  const rank = await loadRank();
  const max = rank[0]?.f || 1;
  const chart = rank.slice(0, 14);
  const cats = D.manifest.categories.filter((c) => rank.some((r) => r.c === c.id));

  const html = `
  ${crumb([{ t: '首页', href: '#/' }, { t: '面经高频榜' }])}
  <header class="rank-hero">
    <div>
      <h1>面经高频榜</h1>
      <p>把 ${rank.length} 条${D.manifest.demo ? '示例题频' : '面经'}记录里出现过的问法做了归并统计。次数越高，说明面试官越爱问 —— 复习时间有限时，从上往下刷就对了。其中 ${rank.filter((r) => r.q).length} 条已经匹配到站内解析，点击直达。</p>
      <div class="ch-stats" style="margin-top:18px">
        <div><b>${rank.length}</b><span>面经问法</span></div>
        <div><b style="color:var(--flare)">${rank.filter((r) => r.f >= 3).length}</b><span>出现 ≥3 次</span></div>
        <div><b style="color:var(--ok)">${rank.filter((r) => r.q).length}</b><span>已有解析</span></div>
      </div>
    </div>
    <div class="rh-chart">${chart.map((r) => `<i style="height:${Math.max(8, (r.f / max) * 100)}%" data-v="${r.f}" title="${esc(r.t)}"></i>`).join('')}</div>
  </header>
  <div class="toolbar">
    <label class="tb-search">${icon('search')}<input id="rankSearch" type="text" placeholder="筛选问法关键词…" autocomplete="off"></label>
    <div class="tb-sep"></div>
    <button class="chip on" data-rf="all" type="button">全部</button>
    <button class="chip" data-rf="linked" type="button">${icon('checkCircle')}有解析</button>
    <button class="chip" data-rf="hot" type="button">${icon('flame')}≥3 次</button>
    <span class="tb-count" id="rankCount"></span>
  </div>
  <div class="chips" style="margin-bottom:16px" id="rankCats">
    <button class="chip on" data-rc="all" type="button">全部方向</button>
    ${cats.map((c) => `<button class="chip" data-rc="${c.id}" style="${catStyle(c)}" type="button"><span class="cdot"></span>${esc(c.name)}<span class="cn">${rank.filter((r) => r.c === c.id).length}</span></button>`).join('')}
  </div>
  <div class="rank-list" id="rankBody"></div>`;

  let cat = 'all', mode = 'all', term = '';
  function paint(root) {
    let list = rank.filter((r) => (cat === 'all' || r.c === cat)
      && (mode === 'all' || (mode === 'linked' ? !!r.q : r.f >= 3))
      && (!term || r.t.toLowerCase().includes(term)));
    const body = root.querySelector('#rankBody');
    root.querySelector('#rankCount').textContent = `${list.length} 条`;
    const mx = list[0]?.f || 1;
    body.innerHTML = list.length
      ? list.map((r, i) => rankRow(r, i, mx)).join('')
      : emptyState('没有匹配的面经问法', '换个关键词，或把筛选放宽一点。', 'filter');
  }
  function mount(root) {
    paint(root);
    root.querySelector('#rankSearch').addEventListener('input', (e) => { term = e.target.value.trim().toLowerCase(); paint(root); });
    root.querySelectorAll('[data-rf]').forEach((b) => b.addEventListener('click', () => {
      mode = b.dataset.rf;
      root.querySelectorAll('[data-rf]').forEach((x) => x.classList.toggle('on', x === b));
      paint(root);
    }));
    root.querySelectorAll('[data-rc]').forEach((b) => b.addEventListener('click', () => {
      cat = b.dataset.rc;
      root.querySelectorAll('[data-rc]').forEach((x) => x.classList.toggle('on', x === b));
      paint(root);
    }));
  }
  return { html, mount };
}

/* ============================ QUIZ ============================ */
async function quizView(params) {
  const allCats = D.manifest.categories;
  let selected = params.cat ? [params.cat] : allCats.map((c) => c.id);
  let scopeDoc = params.doc || null;
  let mode = 'random';
  let count = 15;
  let phase = 'setup';
  let deck = [], idx = 0, revealed = false, results = [], startedAt = 0, qStart = 0, tick = null;

  const docMeta = scopeDoc ? D.docIndex.get(scopeDoc) : null;
  if (docMeta) selected = [docMeta.cat];

  const html = `<div class="quiz-wrap" id="quizRoot"></div>`;

  function poolFor() {
    let ids = scopeDoc ? docQuestionIds(scopeDoc) : selected.flatMap((c) => catQuestionIds(c));
    if (mode === 'weak') ids = ids.filter((id) => (S.marks[id] || 0) >= 2);
    if (mode === 'star') ids = ids.filter((id) => S.stars[id]);
    if (mode === 'todo') ids = ids.filter((id) => !S.marks[id]);
    let metas = ids.map((id) => qMeta(id)).filter(Boolean);
    if (mode === 'freq') metas = metas.filter((q) => q.freq > 0).sort((a, b) => b.freq - a.freq);
    else shuffle(metas);
    return metas.slice(0, count);
  }
  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  function setupHtml() {
    const avail = poolFor().length;
    return `<div class="quiz-setup">
      ${crumb([{ t: '首页', href: '#/' }, { t: '自测模式' }])}
      <h1>先别看答案。</h1>
      <p class="lede">抽一组题，自己讲一遍，再翻开解析对照。三个自评档位会直接写进你的掌握度，错题会自动进错题本。</p>
      ${scopeDoc ? `<div class="qempty" style="margin-top:18px">${icon('book')}<span>范围锁定在 <b>${esc(docMeta.title)}</b>（${docQuestionIds(scopeDoc).length} 题）</span><button class="btn btn-sm btn-quiet" data-clear-scope type="button" style="margin-left:auto">解除</button></div>` : ''}
      <div class="qs-block">
        <div class="qs-lab"><span>抽题方式</span></div>
        <div class="mode-grid">
          ${[['random', 'shuffle', '随机抽题', '打乱顺序，覆盖最广'], ['freq', 'flame', '高频优先', '按面经出现次数从高到低'], ['weak', 'alert', '错题攻坚', '只抽标记为模糊/不会的题'], ['star', 'star', '我的收藏', '只抽收藏过的题'], ['todo', 'target', '未学清单', '只抽还没标记过的题']].map(([v, ic, t, d]) => {
            const n = (() => { const m0 = mode; mode = v; const k = poolFor().length; mode = m0; return k; })();
            return `<button class="mode-card ${mode === v ? 'on' : ''}" data-mode="${v}" type="button"><b>${icon(ic)}${t}</b><span>${d}</span><em>${n} 题可选</em></button>`;
          }).join('')}
        </div>
      </div>
      ${scopeDoc ? '' : `<div class="qs-block">
        <div class="qs-lab"><span>考察方向</span><b><button data-all-cats type="button" style="color:var(--volt-2)">全选</button> · <button data-no-cats type="button" style="color:var(--fg-3)">清空</button></b></div>
        <div class="chips">${allCats.map((c) => `<button class="chip ${selected.includes(c.id) ? 'on' : ''}" data-qc="${c.id}" style="${catStyle(c)}" type="button"><span class="cdot"></span>${esc(c.name)}<span class="cn">${c.questions}</span></button>`).join('')}</div>
      </div>`}
      <div class="qs-block">
        <div class="qs-lab"><span>本轮题量</span><b id="cntVal">${count} 题</b></div>
        <input type="range" id="cntRange" min="5" max="60" step="5" value="${count}" aria-label="题量">
      </div>
      <div class="qs-block" style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
        <button class="btn btn-primary" data-start type="button" ${avail ? '' : 'disabled'}>${icon('play')}开始自测（${avail} 题）</button>
        <span style="font-size:12.5px;color:var(--fg-3)">${avail ? '空格翻答案 · 1 / 2 / 3 自评 · Esc 退出' : '当前筛选下没有题目，换个方式或方向试试'}</span>
      </div>
    </div>`;
  }

  function playHtml() {
    const q = deck[idx];
    const c = catOf(q.cat);
    const done = results.length;
    const g1 = results.filter((r) => r.g === 1).length, g2 = results.filter((r) => r.g === 2).length, g3 = results.filter((r) => r.g === 3).length;
    const note = S.notes[q.id];
    return `<div class="quiz-play" style="${catStyle(c)}">
      <div class="qp-top">
        <span class="qp-count"><b>${String(idx + 1).padStart(2, '0')}</b> / ${deck.length}</span>
        <div class="qp-bar">
          <i class="s1" style="width:${(g1 / deck.length) * 100}%"></i>
          <i class="s2" style="width:${(g2 / deck.length) * 100}%"></i>
          <i class="s3" style="width:${(g3 / deck.length) * 100}%"></i>
        </div>
        <span class="qp-count" id="qTimer">00:00</span>
        <button class="btn btn-sm btn-quiet" data-end type="button">${icon('x')}结束本轮</button>
      </div>
      <div class="qflash">
        <div class="qf-head">
          <div class="qf-meta"><span style="color:var(--hue)">${esc(c.name)}</span><span>·</span><span>${esc(q.docTitle)}</span>${badgeHtml(q.badges)}${freqChip(q.freq)}</div>
          <div class="qf-q">${esc(q.title)}</div>
        </div>
        ${revealed ? `<div class="qf-body inner-scroll"><div class="qf-answer">${answerHtml(q, note)}</div></div>` : `
        <div class="qf-hidden">
          <div class="timer" id="thinkTimer">00:00</div>
          <p class="think">先在心里（或者出声）把这道题讲一遍：定义 → 原理 → 细节 → 场景。讲不顺的地方，就是等下要重点看的地方。</p>
          <button class="btn btn-primary" data-reveal type="button">${icon('eye')}翻开答案<kbd>Space</kbd></button>
        </div>`}
        <div class="qf-foot">
          ${revealed ? `
            <button class="grade g1" data-grade="1" type="button">${icon('checkCircle')}答得上来<kbd>1</kbd></button>
            <button class="grade g2" data-grade="2" type="button">${icon('alert')}有点模糊<kbd>2</kbd></button>
            <button class="grade g3" data-grade="3" type="button">${icon('x')}还不会<kbd>3</kbd></button>`
            : `<button class="btn btn-ghost btn-sm" data-skip type="button">${icon('right')}跳过这题</button>
               <span style="font-size:12px;color:var(--fg-4);margin-left:auto">已自评 ${done} 题</span>`}
        </div>
      </div>
      <div class="quiz-hint"><span><kbd>Space</kbd> 翻答案</span><span><kbd>1</kbd><kbd>2</kbd><kbd>3</kbd> 自评</span><span><kbd>→</kbd> 跳过</span><span><kbd>Esc</kbd> 退出</span></div>
    </div>`;
  }

  function answerHtml(q, note) {
    const full = D.docs.get(q.doc);
    const body = full ? full.questions?.find((x) => x.id === q.id)?.html : null;
    const noteHtml = note ? `<div class="adm adm-info" style="margin-bottom:14px"><div class="adm-head">${icon('note')}<span>我的笔记</span></div><div class="adm-body"><p style="white-space:pre-wrap">${esc(note.t)}</p></div></div>` : '';
    if (body && body.trim()) return noteHtml + `<div class="prose">${body}</div>`;
    if (body === null) return noteHtml + `<div class="qempty">${icon('clock')}<span>解析加载中…</span></div>`;
    return noteHtml + `<div class="qempty">${icon('bulb')}<span>开放性问题，没有标准解析。${note ? '上面是你自己写的版本。' : '退出后可以在阅读页里写下你的答法。'}</span></div>`;
  }

  function summaryHtml() {
    const total = results.length;
    const g1 = results.filter((r) => r.g === 1).length, g2 = results.filter((r) => r.g === 2).length, g3 = results.filter((r) => r.g === 3).length;
    const pct = total ? Math.round((g1 / total) * 100) : 0;
    const secs = Math.round((Date.now() - startedAt) / 1000);
    const wrong = results.filter((r) => r.g >= 2);
    const byCat = {};
    results.forEach((r) => { const c = r.q.cat; byCat[c] = byCat[c] || { n: 0, ok: 0 }; byCat[c].n++; if (r.g === 1) byCat[c].ok++; });
    return `<div class="qsum">
      <h2>${pct >= 80 ? '这一轮很稳。' : pct >= 50 ? '有进步空间，继续。' : '别急，错题才是收获。'}</h2>
      <p style="color:var(--fg-3);font-size:13.5px;margin-top:8px">完成 ${total} 题 · 用时 ${Math.floor(secs / 60)} 分 ${secs % 60} 秒</p>
      <div class="ring">${ringSvg(pct, 132, 10)}<b>${pct}%</b></div>
      <div class="sum-grid">
        <div class="sum-cell"><b style="color:var(--ok)">${g1}</b><span>答得上来</span></div>
        <div class="sum-cell"><b style="color:var(--warn)">${g2}</b><span>有点模糊</span></div>
        <div class="sum-cell"><b style="color:var(--danger)">${g3}</b><span>还不会</span></div>
        <div class="sum-cell"><b>${total ? Math.round(secs / total) : 0}s</b><span>平均每题</span></div>
      </div>
      ${Object.keys(byCat).length > 1 ? `<div class="stack-list" style="text-align:left">${Object.entries(byCat).map(([cid, v]) => {
        const c = catOf(cid);
        return `<div class="stack-row" style="${catStyle(c)}"><span class="sn"><i></i><span>${esc(c.name)}</span></span>
        <span class="sbar"><i class="s1" style="width:${(v.ok / v.n) * 100}%"></i><i class="s3" style="width:${((v.n - v.ok) / v.n) * 100}%"></i></span>
        <span class="sv"><b>${v.ok}</b>/${v.n}</span></div>`;
      }).join('')}</div>` : ''}
      ${wrong.length ? `<div class="sum-wrong"><h4>本轮需要回炉的 ${wrong.length} 题</h4><div class="qlist">${wrong.map((r) => {
        const c = catOf(r.q.cat);
        return `<button class="qrow" data-goto="#/q/${r.q.id}" type="button" style="${catStyle(c)}"><span class="qn">${r.g === 2 ? '模糊' : '不会'}</span><span class="qt"><b>${esc(r.q.title)}</b><small>${esc(c.name)} · ${esc(r.q.docTitle)}</small></span><span class="qa">${icon('right')}</span></button>`;
      }).join('')}</div></div>` : ''}
      <div style="display:flex;gap:10px;justify-content:center;margin-top:24px;flex-wrap:wrap">
        <button class="btn btn-primary" data-again type="button">${icon('refresh')}再来一轮</button>
        ${wrong.length ? `<button class="btn btn-flare" data-retry-weak type="button">${icon('target')}只练这 ${wrong.length} 道错题</button>` : ''}
        <a class="btn btn-ghost" href="#/progress">${icon('chart')}查看学习进度</a>
      </div>
    </div>`;
  }

  function render(root) {
    const host = root.querySelector('#quizRoot');
    host.innerHTML = phase === 'setup' ? setupHtml() : phase === 'play' ? playHtml() : summaryHtml();
    if (phase === 'play') {
      applyCodeLang(host);
      const q = deck[idx];
      if (revealed && !D.docs.has(q.doc)) {
        loadDoc(q.doc).then(() => {
          if (phase === 'play' && deck[idx]?.id === q.id && revealed) render(root);
        }).catch(() => toast('解析加载失败，请重试', 'err'));
      }
    }
    bind(root, host);
    revealAll(host);
  }

  function bind(root, host) {
    host.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => { mode = b.dataset.mode; render(root); }));
    host.querySelectorAll('[data-qc]').forEach((b) => b.addEventListener('click', () => {
      const id = b.dataset.qc;
      selected = selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id];
      render(root);
    }));
    host.querySelector('[data-all-cats]')?.addEventListener('click', () => { selected = allCats.map((c) => c.id); render(root); });
    host.querySelector('[data-no-cats]')?.addEventListener('click', () => { selected = []; render(root); });
    host.querySelector('[data-clear-scope]')?.addEventListener('click', () => { scopeDoc = null; render(root); });
    const cr = host.querySelector('#cntRange');
    cr?.addEventListener('input', () => {
      count = +cr.value;
      host.querySelector('#cntVal').textContent = `${count} 题`;
      const btn = host.querySelector('[data-start]');
      const n = poolFor().length;
      btn.innerHTML = `${icon('play')}开始自测（${n} 题）`;
      btn.disabled = !n;
    });
    host.querySelector('[data-start]')?.addEventListener('click', () => start(root));
    host.querySelector('[data-reveal]')?.addEventListener('click', () => doReveal(root));
    host.querySelector('[data-skip]')?.addEventListener('click', () => next(root, null));
    host.querySelectorAll('[data-grade]').forEach((b) => b.addEventListener('click', () => next(root, +b.dataset.grade)));
    host.querySelector('[data-end]')?.addEventListener('click', () => finish(root));
    host.querySelector('[data-again]')?.addEventListener('click', () => { phase = 'setup'; render(root); });
    host.querySelector('[data-retry-weak]')?.addEventListener('click', () => {
      deck = results.filter((r) => r.g >= 2).map((r) => r.q);
      shuffle(deck);
      idx = 0; results = []; revealed = false; phase = 'play'; startedAt = Date.now(); qStart = Date.now();
      deck.forEach((q) => loadDoc(q.doc).catch(() => {}));
      render(root);
    });
  }

  function start(root) {
    deck = poolFor();
    if (!deck.length) return;
    idx = 0; results = []; revealed = false; phase = 'play';
    startedAt = Date.now(); qStart = Date.now();
    deck.slice(0, 6).forEach((q) => loadDoc(q.doc).catch(() => {}));
    render(root);
    startTick(root);
  }
  function startTick(root) {
    clearInterval(tick);
    tick = setInterval(() => {
      if (phase !== 'play') return;
      const el = root.querySelector('#thinkTimer') || root.querySelector('#qTimer');
      const secs = Math.floor((Date.now() - qStart) / 1000);
      const txt = `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;
      const a = root.querySelector('#thinkTimer'); const b = root.querySelector('#qTimer');
      if (a) a.textContent = txt;
      if (b) b.textContent = txt;
    }, 1000);
  }
  function doReveal(root) {
    if (phase !== 'play' || revealed) return;
    revealed = true;
    render(root);
  }
  function next(root, grade) {
    if (phase !== 'play') return;
    const q = deck[idx];
    if (grade) { setMark(q.id, grade); results.push({ q, g: grade, t: Date.now() - qStart }); }
    if (idx + 1 >= deck.length) { finish(root); return; }
    idx++; revealed = false; qStart = Date.now();
    loadDoc(deck[Math.min(idx + 1, deck.length - 1)].doc).catch(() => {});
    render(root);
  }
  function finish(root) {
    clearInterval(tick);
    phase = 'summary';
    if (results.length) {
      S.quiz = [{ at: Date.now(), n: results.length, ok: results.filter((r) => r.g === 1).length, secs: Math.round((Date.now() - startedAt) / 1000) }, ...S.quiz].slice(0, 30);
      emit();
    }
    render(root);
  }

  function onKey(e) {
    if (phase !== 'play') return;
    if (e.target.matches('input,textarea')) return;
    const root = document.getElementById('main');
    if (e.code === 'Space' || e.key === 'Enter') { e.preventDefault(); if (!revealed) doReveal(root); }
    else if (e.key === '1' && revealed) next(root, 1);
    else if (e.key === '2' && revealed) next(root, 2);
    else if (e.key === '3' && revealed) next(root, 3);
    else if (e.key === 'ArrowRight') next(root, null);
    else if (e.key === 'Escape') finish(root);
  }

  function mount(root) {
    render(root);
    document.addEventListener('keydown', onKey);
    if (params.autostart) start(root);
  }
  return { html, mount, cleanup: () => { clearInterval(tick); document.removeEventListener('keydown', onKey); } };
}

/* ============================ PROGRESS ============================ */
async function progressView() {
  const g = globalStats();
  const st = streak();
  const stars = starredIds(), weak = weakIds(), notes = noteIds();
  const days = Object.keys(S.activity).length;
  const todayN = S.activity[todayKey()] || 0;

  const html = `
  ${crumb([{ t: '首页', href: '#/' }, { t: '学习进度' }])}
  <header class="pg-hero">
    <div class="ring">${ringSvg(g.pct, 132, 10)}<b>${g.pct}%</b></div>
    <div>
      <h1 style="font-size:26px;letter-spacing:-.02em">你的面试准备度</h1>
      <p style="color:var(--fg-2);font-size:13.5px;margin:8px 0 18px;max-width:60ch">掌握度来自你在阅读页和自测里的每一次标记，全部保存在本机浏览器，不会上传。</p>
      <div class="pg-facts">
        <div class="pg-fact"><b style="color:var(--ok)">${g.done}</b><span>已掌握</span></div>
        <div class="pg-fact"><b style="color:var(--warn)">${g.fuzzy}</b><span>有点模糊</span></div>
        <div class="pg-fact"><b style="color:var(--danger)">${g.weak}</b><span>还不会</span></div>
        <div class="pg-fact"><b>${g.todo}</b><span>还没标记</span></div>
        <div class="pg-fact"><b style="color:var(--flare)">${st}</b><span>连续打卡天数</span></div>
        <div class="pg-fact"><b>${todayN}</b><span>今日标记</span></div>
      </div>
    </div>
  </header>

  <div class="sec" style="margin-top:28px">
    <div class="sec-head"><div><div class="sec-title"><span class="idx">01</span><h2>各方向掌握分布</h2></div><p class="sec-sub">实心=已掌握，斜纹=模糊，反斜纹=不会，底色=未标记</p></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-ghost btn-sm" data-export type="button">${icon('download')}导出进度</button>
        <button class="btn btn-ghost btn-sm" data-import type="button">${icon('upload')}导入</button>
        <button class="btn btn-danger btn-sm" data-reset type="button">${icon('trash')}清空</button>
      </div>
    </div>
    <div class="stack-list">
      ${D.manifest.categories.map((c) => {
        const s = statsFor(catQuestionIds(c.id));
        const p = (n) => (s.total ? (n / s.total) * 100 : 0);
        return `<a class="stack-row" href="#/c/${c.id}" style="${catStyle(c)}">
          <span class="sn"><i></i><span>${esc(c.name)}</span></span>
          <span class="sbar"><i class="s1" style="width:${p(s.done)}%"></i><i class="s2" style="width:${p(s.fuzzy)}%"></i><i class="s3" style="width:${p(s.weak)}%"></i></span>
          <span class="sv"><b>${s.done}</b>/${s.total} · ${s.pct}%</span>
        </a>`;
      }).join('')}
    </div>
    <div class="legend"><span><i style="background:var(--ok)"></i>已掌握</span><span><i style="background:repeating-linear-gradient(45deg,var(--warn),var(--warn) 3px,#8a6508 3px,#8a6508 6px)"></i>有点模糊</span><span><i style="background:repeating-linear-gradient(-45deg,var(--danger),var(--danger) 3px,#8c3546 3px,#8c3546 6px)"></i>还不会</span><span><i style="background:var(--chip-bg);border:1px solid var(--line-2)"></i>未标记</span><span>累计活跃 ${days} 天</span></div>
  </div>

  <div class="sec">
    <div class="sec-head"><div><div class="sec-title"><span class="idx">02</span><h2>我的题单</h2></div><p class="sec-sub">收藏、错题和笔记都在这儿，面试前一晚直接过一遍</p></div></div>
    <div class="tabs" id="pgTabs">
      <button class="on" data-tab="star" type="button">${icon('star')}收藏 <span class="tn">${stars.length}</span></button>
      <button data-tab="weak" type="button">${icon('alert')}错题本 <span class="tn">${weak.length}</span></button>
      <button data-tab="note" type="button">${icon('note')}笔记 <span class="tn">${notes.length}</span></button>
      <button data-tab="quiz" type="button">${icon('target')}自测记录 <span class="tn">${S.quiz.length}</span></button>
    </div>
    <div id="pgBody"></div>
  </div>`;

  function listHtml(ids, kind) {
    if (!ids.length) {
      const map = {
        star: ['还没有收藏题目', '在阅读页点题目右上角的星标，把想反复看的题收进来。', 'star'],
        weak: ['错题本是空的', '自测时选「有点模糊」或「还不会」，题目会自动进这里。', 'checkCircle'],
        note: ['还没有写笔记', 'HR 面和项目题没有标准答案，写下你自己的版本最有价值。', 'note'],
      }[kind];
      return emptyState(map[0], map[1], map[2], `<a class="btn btn-sm btn-ghost" href="#/quiz">${icon('target')}去自测</a>`);
    }
    return `<div class="qlist">${ids.map((id) => {
      const q = qMeta(id); if (!q) return '';
      const c = catOf(q.cat); const mk = S.marks[id] || 0;
      return `<div class="qrow" style="${catStyle(c)};cursor:default">
        <span class="qn"><span class="mark-dot m${mk}"></span></span>
        <button class="qt" data-goto="#/q/${id}" type="button" style="text-align:left;background:none"><b>${esc(q.title)}</b><small>${esc(c.name)} · ${esc(q.docTitle)}${S.notes[id] ? ' · 有笔记' : ''}</small></button>
        <span class="qa">${freqChip(q.freq)}<button class="qtool" data-unstar="${esc(id)}" title="移除" type="button">${icon(kind === 'star' ? 'star' : 'x')}</button></span>
      </div>`;
    }).join('')}</div>`;
  }

  function paint(root, tab) {
    const body = root.querySelector('#pgBody');
    if (tab === 'quiz') {
      body.innerHTML = S.quiz.length ? `<div class="stack-list">${S.quiz.map((s) => {
        const pct = Math.round((s.ok / s.n) * 100);
        return `<div class="stack-row" style="--hue:var(--volt)"><span class="sn"><i></i><span>${new Date(s.at).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span></span>
        <span class="sbar"><i class="s1" style="width:${pct}%"></i><i class="s3" style="width:${100 - pct}%"></i></span>
        <span class="sv"><b>${s.ok}</b>/${s.n} · ${Math.floor(s.secs / 60)}分${s.secs % 60}秒</span></div>`;
      }).join('')}</div>` : emptyState('还没有自测记录', '去自测模式跑一轮，这里会留下每一轮的正确率和用时。', 'target', `<a class="btn btn-sm btn-primary" href="#/quiz">${icon('play')}开始自测</a>`);
      return;
    }
    const ids = tab === 'star' ? starredIds() : tab === 'weak' ? weakIds() : noteIds();
    if (tab === 'note') {
      body.innerHTML = ids.length ? `<div class="cont-grid">${ids.map((id) => {
        const q = qMeta(id); const c = catOf(q.cat);
        return `<div class="note-card" style="${catStyle(c)}">
          <div class="nt"><b>${esc(q.title)}</b><button class="qtool" data-goto="#/q/${id}" type="button">${icon('right')}</button></div>
          <p>${esc(S.notes[id].t)}</p>
          <span class="nm">${esc(c.name)} · ${new Date(S.notes[id].at).toLocaleDateString('zh-CN')}</span>
        </div>`;
      }).join('')}</div>` : emptyState('还没有写笔记', 'HR 面和项目题没有标准答案，写下你自己的版本最有价值。', 'note');
      return;
    }
    body.innerHTML = listHtml(ids, tab);
    body.querySelectorAll('[data-unstar]').forEach((b) => b.addEventListener('click', () => {
      const id = b.dataset.unstar;
      if (tab === 'star') { toggleStar(id); toast('已取消收藏', 'info'); }
      else { const old = S.marks[id]; setMark(id, 0); toast('已移出错题本', 'info', { label: '撤销', fn: () => { setMark(id, old); paint(root, tab); } }); }
      paint(root, tab);
    }));
  }

  function mount(root) {
    let tab = 'star';
    paint(root, tab);
    root.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => {
      tab = b.dataset.tab;
      root.querySelectorAll('[data-tab]').forEach((x) => x.classList.toggle('on', x === b));
      paint(root, tab);
    }));
    root.querySelector('[data-export]').addEventListener('click', () => {
      const blob = new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `csview-progress-${todayKey()}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      toast('进度已导出为 JSON', 'ok');
    });
    root.querySelector('[data-import]').addEventListener('click', () => {
      const inp = document.createElement('input');
      inp.type = 'file'; inp.accept = 'application/json,.json';
      inp.addEventListener('change', async () => {
        const f = inp.files?.[0]; if (!f) return;
        try { importState(await f.text()); toast('进度已导入', 'ok'); refresh(); }
        catch (err) { toast(`导入失败：${err.message}`, 'err'); }
      });
      inp.click();
    });
    root.querySelector('[data-reset]').addEventListener('click', () => {
      modal({
        title: '清空所有学习记录？',
        body: `<p>将删除 ${g.done + g.fuzzy + g.weak} 条掌握度标记、${stars.length} 个收藏、${notes.length} 篇笔记和 ${S.quiz.length} 条自测记录。阅读设置会保留。</p><p style="margin-top:10px;color:var(--fg-3)">清空后 8 秒内可以撤销。</p>`,
        confirmText: '确认清空', danger: true,
        onConfirm: () => {
          const backup = resetAll();
          toast('学习记录已清空', 'warn', { label: '撤销', fn: () => { restore(backup); toast('已恢复', 'ok'); refresh(); } });
          refresh();
        },
      });
    });
  }
  return { html, mount };
}

/* ============================ ABOUT ============================ */
async function aboutView() {
  const intro = await loadDoc('method-introduction');
  const m = D.manifest;
  const html = `
  ${crumb([{ t: '首页', href: '#/' }, { t: '关于本站' }])}
  <div class="about-grid">
    <div>
      <header class="doc-head" style="--hue:#8B9CFF;--hue2:#C7D2FE">
        <h1>关于 CSView</h1>
        <div class="dh-meta"><span>${icon('book')}${m.stats.docs} 篇 · ${m.stats.questions} 题</span><span>${icon('code')}${fmtK(m.stats.words)} 字解析</span><span>${icon('flame')}${m.stats.ranked} 条面经频次</span></div>
        <div class="dh-actions">
          <a class="btn btn-primary btn-sm" href="${m.repo}" target="_blank" rel="noopener">${icon('external')}GitHub 原项目</a>
          <a class="btn btn-ghost btn-sm" href="${m.site}" target="_blank" rel="noopener">${icon('net')}作者原站 csview.cn</a>
          <button class="btn btn-quiet btn-sm" data-open-lib type="button">${icon('layers')}题库来源</button>
        </div>
      </header>
      <article class="qcard"><div class="qbody" style="border:0;padding-top:18px"><div class="prose" style="--hue:#8B9CFF">${intro.html}</div></div></article>

      <div class="sec" style="margin-top:32px">
        <div class="sec-head"><div><div class="sec-title"><h2>这个界面做了什么</h2></div><p class="sec-sub">内容完全来自原仓库，阅读与练习方式重新设计</p></div></div>
        <div class="cont-grid">
          ${[
            ['target', '题目级自测', '每道题都能折叠答案先自己想，三档自评直接写入掌握度，错题自动归集。'],
            ['flame', '面经频次排序', '把仓库里 15 份题频记录归并成一张榜，并自动匹配到站内对应解析。'],
            ['search', '全文检索', `${m.stats.questions} 道题的题干与解析全部建立本地索引，⌘K 即时搜索，支持方向过滤。`],
            ['note', '个人笔记', 'HR 面与项目题没有标准答案，可以写下自己的版本，随进度一起导出。'],
            ['code', '三语言题解', '算法题的 C++ / Java / Go 题解切换一次，全站记住你的选择。'],
            ['chart', '进度与打卡', '掌握分布、连续打卡、自测记录都在本机保存，可导出 JSON 备份。'],
          ].map(([ic, t, d]) => `<div class="cont-card" style="--hue:var(--volt);--hue2:var(--cyan)"><span class="ct">${icon(ic)}${t}</span><p style="font-size:12.5px;color:var(--fg-3);line-height:1.7">${d}</p></div>`).join('')}
        </div>
      </div>
    </div>
    <aside style="display:flex;flex-direction:column;gap:16px">
      <div class="rail-box">
        <div class="rail-title"><span>题目标注含义</span></div>
        <div style="display:flex;flex-direction:column;gap:11px;font-size:12.5px;color:var(--fg-2)">
          <div><span class="qbadge qb-key">重要</span><p style="margin-top:5px;color:var(--fg-3);line-height:1.65">面试必问。简历上写了相关内容就一定要会。</p></div>
          <div><span class="qbadge qb-master">掌握</span><p style="margin-top:5px;color:var(--fg-3);line-height:1.65">出现几率较高，应当作为掌握内容。</p></div>
          <div><span class="qbadge qb-know">了解</span><p style="margin-top:5px;color:var(--fg-3);line-height:1.65">偶尔出现，可作为补充学习或深入探究。</p></div>
          <div>${freqChip(4)}<p style="margin-top:5px;color:var(--fg-3);line-height:1.65">该问法在面经中被记录的次数。</p></div>
        </div>
      </div>
      <div class="rail-box">
        <div class="rail-title"><span>键盘快捷键</span></div>
        <div class="kbd-list">
          ${[['⌘ / Ctrl + K', '打开搜索'], ['/', '快速搜索'], ['Q', '进入自测'], ['G 然后 H', '回首页'], ['Space', '自测翻开答案'], ['1 / 2 / 3', '自测三档自评'], ['→', '跳过当前题'], ['Esc', '关闭浮层 / 结束自测'], ['T', '切换深浅色']].map(([k, v]) => `<div class="kbd-row"><span>${v}</span><kbd>${k}</kbd></div>`).join('')}
        </div>
      </div>
      <div class="rail-box">
        <div class="rail-title"><span>内容作者</span></div>
        <div class="author-list">
          ${AUTHORS.map(([n, d]) => `<div class="author"><span class="av">${esc(n.slice(0, 1))}</span><div><b>${esc(n)}</b><p>${esc(d)}</p></div></div>`).join('')}
        </div>
      </div>
      <div class="rail-box">
        <div class="rail-title"><span>版权与来源</span></div>
        <p style="font-size:12.5px;color:var(--fg-3);line-height:1.75">${m.demo
          ? `当前展示的题目、解析与图示由本项目作者原创撰写，可自由分发。完整面经内容来自 <a href="${m.repo}" target="_blank" rel="noopener" style="color:var(--volt-2)">zijing2333/CSView</a>，版权归原作者所有，上游声明禁止转载，故不随本公开站点分发；请在本地构建后通过「题库来源」导入。原项目特别鸣谢 <a href="https://xiaolincoding.com/" target="_blank" rel="noopener" style="color:var(--volt-2)">小林 coding</a>。`
          : `全部文字、题解与图片均来自 <a href="${m.repo}" target="_blank" rel="noopener" style="color:var(--volt-2)">zijing2333/CSView</a>，版权归原作者所有。本页面只是为这批内容重新做了一套本地阅读与自测界面，禁止将内容整合搬运到任何公众号。原项目特别鸣谢 <a href="https://xiaolincoding.com/" target="_blank" rel="noopener" style="color:var(--volt-2)">小林 coding</a>。`}</p>
        <p style="font-size:11.5px;color:var(--fg-4);margin-top:12px;font-family:var(--mono);line-height:1.9">内容构建于 ${new Date(m.builtAt).toLocaleString('zh-CN')}${m.source ? `<br>上游快照 ${esc(String(m.source.sha).slice(0, 12))} · 拉取于 ${new Date(m.source.fetchedAt).toLocaleDateString('zh-CN')}` : ''}</p>
      </div>
    </aside>
  </div>`;
  return { html, mount: (root) => applyCodeLang(root) };
}

function notFound(msg) {
  return { html: emptyState(msg, '链接可能过期了，回首页重新挑一个方向吧。', 'alert', `<a class="btn btn-sm btn-primary" href="#/">${icon('home')}回到首页</a>`), mount: () => {} };
}

export const Views = { home, category, doc: docView, rank: rankView, quiz: quizView, progress: progressView, about: aboutView };