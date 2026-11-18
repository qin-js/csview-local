import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import matter from 'gray-matter';
import MarkdownIt from 'markdown-it';
import footnote from 'markdown-it-footnote';
import { createHighlighter } from 'shiki';

const ROOT = path.resolve(import.meta.dirname, '..');
const CONTENT = path.join(ROOT, 'content');
const OUT = path.join(ROOT, 'public', 'data');
const IMG = path.join(ROOT, 'public', 'img');

export const CATEGORIES = [
  { id: 'algorithm', dir: 'algorithm-mandatory', name: '面试必刷算法', short: '算法', group: '刷题攻坚', hue: '#FF8A3D', hue2: '#FFD166', glyph: 'algo',
    desc: '力扣高频真题与手撕代码，按数据结构分册，附三语言题解',
    docs: ['linklist/01', 'linklist/02', 'linklist/03', 'tree/01', 'tree/02', 'tree/03', 'stark-queue/01', 'stark-queue/02', 'string/01', 'string/02', 'array', 'dp', 'dfs', 'backtrack', 'handtearing', 'other'] },
  { id: 'network', dir: 'network', name: '计算机网络', short: '网络', group: '计算机基础', hue: '#3D8BFF', hue2: '#22D3EE', glyph: 'net',
    desc: 'TCP/UDP、IP、HTTP 与 HTTPS，面试问得最细的一块',
    docs: ['summary', 'tcp', 'ip', 'http'] },
  { id: 'os', dir: 'os', name: '操作系统', short: '系统', group: '计算机基础', hue: '#4ADE80', hue2: '#A3E635', glyph: 'os',
    desc: '进程线程、并发同步、内存管理与服务器编程',
    docs: ['summary', 'concurrency', 'memory-management', 'process', 'filesystem', 'serverprogramming'] },
  { id: 'mysql', dir: 'mysql', name: 'MySQL', short: 'MySQL', group: '数据库', hue: '#2F7DF6', hue2: '#60A5FA', glyph: 'db',
    desc: '事务、索引、锁、存储引擎、日志与调优',
    docs: ['summary', 'transaction', 'indexing', 'lock', 'engine', 'log', 'optimize'] },
  { id: 'redis', dir: 'redis', name: 'Redis', short: 'Redis', group: '数据库', hue: '#FF4D4F', hue2: '#FF8A6B', glyph: 'cache',
    desc: '数据结构、持久化、缓存三兄弟与集群方案',
    docs: ['summary', 'data-structure', 'persistence', 'application', 'colony'] },
  { id: 'cpp', dir: 'cpp', name: 'C++', short: 'C++', group: '编程语言', hue: '#A855F7', hue2: '#E879F9', glyph: 'cpp',
    desc: '从语法基础到虚函数表、内存模型与 STL 源码',
    docs: ['summary', 'dataTypesAndTypeConversions', 'pointersAndReferences', 'functionAndOperationOverloaders', 'inheritanceAndPolymorphism', 'memoryManagement', 'compileAndLink', 'newFeatures', 'stl'] },
  { id: 'java', dir: 'java', name: 'Java', short: 'Java', group: '编程语言', hue: '#F59E0B', hue2: '#FBBF24', glyph: 'java',
    desc: '集合、并发、JVM 与 Spring 核心原理',
    docs: ['summary', 'collection', 'concurrent', 'jvm', 'spring'] },
  { id: 'golang', dir: 'golang', name: 'Golang', short: 'Go', group: '编程语言', hue: '#00C2D1', hue2: '#5EEAD4', glyph: 'go',
    desc: '关键字陷阱、GMP 调度与三色标记垃圾回收',
    docs: ['summary', 'keyword', 'gmp', 'gc'] },
  { id: 'design', dir: 'design', name: '系统设计', short: '设计', group: '刷题攻坚', hue: '#FF3D9A', hue2: '#C084FC', glyph: 'design',
    desc: '秒杀、限流、分布式 ID 与海量数据处理',
    docs: ['design', 'bigdata'] },
  { id: 'intelligence', dir: 'intelligence', name: '智力题', short: '智力', group: '刷题攻坚', hue: '#C6F135', hue2: '#FDE047', glyph: 'brain',
    desc: '概率、位运算与经典称球问题',
    docs: ['README'] },
  { id: 'hr', dir: 'hr', name: 'HR 面', short: 'HR', group: '刷题攻坚', hue: '#FB7185', hue2: '#FDA4AF', glyph: 'talk',
    desc: '行为面试高频问法，支持写下你自己的作答',
    docs: ['README'] },
  { id: 'rabbitmq', dir: 'rabbitmq', name: 'RabbitMQ', short: 'MQ', group: '中间件与云原生', hue: '#FF6600', hue2: '#FFA23D', glyph: 'mq',
    desc: '消息可靠性、重复消费、死信队列与削峰填谷',
    docs: ['summary', 'apply'] },
  { id: 'k8s', dir: 'k8s', name: 'Kubernetes', short: 'K8s', group: '中间件与云原生', hue: '#326CE5', hue2: '#7DD3FC', glyph: 'k8s',
    desc: '容器编排核心组件、网络模型与调度机制',
    docs: ['README'] },
  { id: 'method', dir: '_method', name: '面试方法论', short: '方法论', group: '通关指南', hue: '#8B9CFF', hue2: '#C7D2FE', glyph: 'compass',
    desc: '面试本质、准备节奏、项目复盘与精品文章',
    docs: ['interview', 'routine', 'article', 'introduction', 'devlog'] },
];

const METHOD_FILES = {
  interview: { file: 'start-learning/interview.md', title: '重新看待面试：本质、流程与准备', author: '子敬' },
  routine: { file: 'start-learning/routine.md', title: '校招准备节奏与学习路线', author: '子敬' },
  article: { file: 'article/02.md', title: '精品文章：秋招经验复盘', author: 'CSView' },
  introduction: { file: 'introduction/README.md', title: 'CSView 项目介绍', author: '子敬' },
  devlog: { file: 'development-log/README.md', title: '站点开发日志', author: 'CSView' },
};

const RANK_SOURCES = [
  ['algorithm-mandatory/rank.md', 'algorithm'],
  ['network/rank.md', 'network'],
  ['os/rank.md', 'os'],
  ['mysql/rank.md', 'mysql'],
  ['redis/rank.md', 'redis'],
  ['cpp/rank.md', 'cpp'],
  ['java/rank.md', 'java'],
  ['golang/rank.md', 'golang'],
  ['design/rank.md', 'design'],
  ['intelligence/rank.md', 'intelligence'],
  ['rabbitmq/rank.md', 'rabbitmq'],
  ['nginx/rank.md', 'k8s'],
  ['docker/rank.md', 'k8s'],
  ['data-structure/rank.md', 'algorithm'],
  ['project/rank.md', 'design'],
];

const DOC_TITLES = {
  'algorithm/stark-queue/01': '栈与队列必刷题（一）',
  'algorithm/stark-queue/02': '栈与队列必刷题（二）',
  'algorithm/string/01': '字符串必刷题（一）',
  'algorithm/string/02': '字符串必刷题（二）',
  'algorithm/dfs': 'DFS 深度优先搜索',
  'algorithm/array': '数组必刷题',
  'algorithm/dp': '动态规划必刷题',
  'algorithm/backtrack': '回溯必刷题',
  'cpp/newFeatures': 'C++11/14/17/20 新特性',
  'java/summary': 'Java 基础语法',
  'java/collection': 'Java 集合框架',
  'java/concurrent': 'Java 并发编程',
  'os/concurrency': '并发与同步',
  'network/summary': '计算机网络概述',
  'mysql/summary': 'MySQL 概述',
  'mysql/transaction': 'MySQL 事务与隔离级别',
  'mysql/indexing': 'MySQL 索引原理',
  'mysql/lock': 'MySQL 锁机制',
  'mysql/engine': 'MySQL 存储引擎',
  'mysql/log': 'MySQL 日志系统',
  'mysql/optimize': 'MySQL 性能优化',
  'redis/summary': 'Redis 概述',
  'redis/data-structure': 'Redis 数据结构',
  'redis/persistence': 'Redis 持久化',
  'redis/application': 'Redis 缓存与分布式锁',
  'redis/colony': 'Redis 集群与高可用',
  'cpp/stl': 'C++ STL 容器与实现',
  'java/jvm': 'JVM 内存与垃圾回收',
  'java/spring': 'Spring 核心原理',
  'golang/summary': 'Golang 基础概述',
  'golang/keyword': 'Golang 关键字与陷阱',
  'golang/gmp': 'GMP 调度模型',
  'golang/gc': 'Golang 垃圾回收',
  'design/design': '常见系统设计题',
  'design/bigdata': '海量数据处理题',
  'intelligence/README': '智力题精选',
  'rabbitmq/summary': 'RabbitMQ 概述',
  'rabbitmq/apply': '消息队列实战问题',
  'k8s/README': 'Kubernetes 面试题',
};

const LANG_ALIAS = { cpp: 'cpp', CPP: 'cpp', c: 'c', go: 'go', golang: 'go', GO: 'go', java: 'java', sql: 'sql', shell: 'bash', bash: 'bash', sh: 'bash', python: 'python', json: 'json', yaml: 'yaml', text: 'text', R: 'text', nginx: 'text', html: 'html', css: 'css', js: 'javascript', javascript: 'javascript', xml: 'xml', diff: 'diff', makefile: 'makefile' };
const LANG_LABEL = { cpp: 'C++', c: 'C', go: 'Go', java: 'Java', sql: 'SQL', bash: 'Shell', python: 'Python', json: 'JSON', yaml: 'YAML', text: 'Text', javascript: 'JS', html: 'HTML', css: 'CSS', xml: 'XML', diff: 'Diff', makefile: 'Make' };
const EMOJI = { one: '1️⃣', two: '2️⃣', three: '3️⃣', four: '4️⃣', five: '5️⃣', smile: '🙂', muscle: '💪', ledger: '📒', notebook: '📓', orange_book: '📙', page_facing_up: '📄', page_with_curl: '📃', notebook_with_decorative_cover: '📔', bulb: '💡', warning: '⚠️', heart: '❤️', star: '⭐', fire: '🔥', rocket: '🚀', white_check_mark: '✅', x: '❌' };

const ADM = {
  tip: { label: '要点', icon: 'spark' },
  info: { label: '说明', icon: 'info' },
  warning: { label: '注意', icon: 'warn' },
  danger: { label: '易错', icon: 'danger' },
  details: { label: '展开', icon: 'chevron' },
  center: { label: '', icon: '' },
};
const ICONS = {
  spark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/><circle cx="12" cy="12" r="3.2"/></svg>',
  info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.6v.6"/></svg>',
  warn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.9 2.6 17.2A2 2 0 0 0 4.3 20h15.4a2 2 0 0 0 1.7-2.8L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 16.6v.4"/></svg>',
  danger: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M15.5 8.5 8.5 15.5M8.5 8.5l7 7"/></svg>',
  chevron: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
};

let highlighter;
const imgMap = new Map();
const imgQueue = [];

function slugHash(s) { return crypto.createHash('sha1').update(s).digest('hex').slice(0, 16); }

function collectImage(url) {
  if (!/^https?:\/\//i.test(url)) return null;
  if (imgMap.has(url)) return imgMap.get(url);
  const ext = (url.match(/\.(png|jpe?g|gif|webp|svg)(?:\?|$)/i)?.[1] || 'jpg').toLowerCase().replace('jpeg', 'jpg');
  const local = `/img/${slugHash(url)}.${ext}`;
  imgMap.set(url, local);
  imgQueue.push({ url, local, file: path.join(IMG, path.basename(local)) });
  return local;
}

function preprocess(src) {
  let s = src.replace(/\r\n/g, '\n');
  // Badge component -> styled span
  s = s.replace(/<Badge\b([^>]*?)\/?>/gi, (_, attrs) => {
    const text = /text\s*=\s*"([^"]*)"/i.exec(attrs)?.[1] ?? '';
    const type = (/type\s*=\s*"([^"]*)"/i.exec(attrs)?.[1] ?? 'info').toLowerCase();
    const map = { tip: 'master', info: 'know', danger: 'key', warning: 'warn', primary: 'key' };
    return `<span class="qbadge qb-${map[type] || 'know'}">${text}</span>`;
  });
  // strip broken local windows paths
  s = s.replace(/!\[[^\]]*\]\([A-Za-z]:\\[^)]*\)/g, '');
  s = s.replace(/<img\b[^>]*src\s*=\s*"[A-Za-z]:\\[^"]*"[^>]*>/gi, '');
  // remote images -> local mirror
  s = s.replace(/(!\[[^\]]*\]\()(https?:\/\/[^)\s]+)(\))/g, (m, a, url, b) => {
    const clean = url.replace(/\s+.*$/, '');
    const local = collectImage(clean);
    return local ? `${a}${local}${b}` : m;
  });
  s = s.replace(/<img\b([^>]*?)>/gi, (m, attrs) => {
    const srcM = /src\s*=\s*"([^"]+)"/i.exec(attrs);
    if (!srcM) return m;
    const local = collectImage(srcM[1]) || srcM[1];
    const alt = /alt\s*=\s*"([^"]*)"/i.exec(attrs)?.[1] ?? '';
    return `<img src="${local}" alt="${alt}" loading="lazy" class="md-img">`;
  });
  // emoji shortcodes with strict boundaries (avoid std::chrono::)
  s = s.replace(/(^|[\s>]):([a-z_]+):(?!:)/g, (m, p, name) => (EMOJI[name] ? p + EMOJI[name] : m));
  // internal .md links -> app routes handled later in renderer
  s = s.replace(/^\s*-{4,}\s*$/gm, '');
  // footnotes -> inline annotations (avoids cross-chunk id collisions)
  const notes = new Map();
  s = s.replace(/^\[\^([^\]]+)\]:\s*([\s\S]*?)(?=\n\s*\n|\n\[\^|$)/gm, (_, id, body) => { notes.set(id, body.replace(/\s+/g, ' ').trim()); return ''; });
  if (notes.size) {
    s = s.replace(/\[\^([^\]]+)\]/g, (m, id) => {
      const note = notes.get(id);
      if (!note) return '';
      return `<sup class="fnref" tabindex="0" role="note" data-fn="${escapeHtml(note)}">${escapeHtml(id)}</sup>`;
    });
  }
  // normalize container opener without space
  s = s.replace(/^:::(?=[a-z])/gm, '::: ');
  return s;
}

function sanitize(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, '')
    .replace(/javascript:/gi, '');
}

function makeMd() {
  const md = new MarkdownIt({ html: true, linkify: true, breaks: false, typographer: false });
  md.use(footnote);

  md.block.ruler.before('fence', 'cs_container', (state, startLine, endLine, silent) => {
    const start = state.bMarks[startLine] + state.tShift[startLine];
    const line = state.src.slice(start, state.eMarks[startLine]);
    const m = /^ {0,3}:{3,}\s*([a-zA-Z-]+)[ \t]*(.*)$/.exec(line);
    if (!m) return false;
    const type = m[1].toLowerCase();
    if (!ADM[type] && type !== 'code-tabs') return false;
    if (silent) return true;
    let depth = 1, fence = null, end = -1;
    for (let i = startLine + 1; i < endLine; i++) {
      const p = state.bMarks[i] + state.tShift[i];
      const l = state.src.slice(p, state.eMarks[i]).trim();
      const f = /^(`{3,}|~{3,})/.exec(l);
      if (f) { fence = fence ? (l.startsWith(fence) ? null : fence) : f[1][0].repeat(3); continue; }
      if (fence) continue;
      if (/^:{3,}\s*[a-zA-Z-]+/.test(l)) depth++;
      else if (/^:{3,}\s*$/.test(l)) { depth--; if (!depth) { end = i; break; } }
    }
    if (end < 0) return false;
    const inner = state.getLines(startLine + 1, end, state.blkIndent, true);
    let html = '';
    if (type === 'code-tabs') html = renderCodeTabs(inner);
    else if (type === 'center') html = `<div class="md-center">${md.render(inner)}</div>`;
    else {
      const meta = ADM[type];
      const title = m[2].trim();
      if (type === 'details') {
        html = `<details class="adm adm-details"><summary>${ICONS.chevron}<span>${escapeHtml(title || meta.label)}</span></summary><div class="adm-body">${md.render(inner)}</div></details>`;
      } else {
        html = `<div class="adm adm-${type}"><div class="adm-head">${ICONS[meta.icon]}<span>${escapeHtml(title || meta.label)}</span></div><div class="adm-body">${md.render(inner)}</div></div>`;
      }
    }
    const token = state.push('html_block', '', 0);
    token.content = html;
    token.map = [startLine, end + 1];
    state.line = end + 1;
    return true;
  }, { alt: ['paragraph', 'reference', 'blockquote'] });

  function renderCodeTabs(inner) {
    const parts = [];
    let cur = null;
    for (const line of inner.split('\n')) {
      const t = /^@tab\s+(.+?)\s*$/.exec(line);
      if (t) { cur = { lang: t[1].trim(), body: [] }; parts.push(cur); }
      else if (cur) cur.body.push(line);
      else if (line.trim()) { cur = { lang: 'text', body: [line] }; parts.push(cur); }
    }
    if (!parts.length) return md.render(inner);
    const tabs = parts.map((p, i) => {
      const key = LANG_ALIAS[p.lang] || LANG_ALIAS[p.lang.toLowerCase()] || 'text';
      return `<button class="ct-tab${i === 0 ? ' on' : ''}" role="tab" data-lang="${key}" data-i="${i}">${LANG_LABEL[key] || p.lang}</button>`;
    }).join('');
    const panes = parts.map((p, i) => `<div class="ct-pane${i === 0 ? ' on' : ''}" data-i="${i}">${md.render(p.body.join('\n'))}</div>`).join('');
    return `<div class="code-tabs"><div class="ct-bar" role="tablist">${tabs}</div><div class="ct-body">${panes}</div></div>`;
  }

  const defaultFence = md.renderer.rules.fence;
  md.renderer.rules.fence = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    const raw = (token.info || '').trim().split(/\s+/)[0];
    const lang = LANG_ALIAS[raw] || LANG_ALIAS[raw?.toLowerCase()] || 'text';
    const code = token.content.replace(/\n$/, '');
    let body;
    try {
      body = highlighter.codeToHtml(code, { lang, themes: { light: 'github-light', dark: 'night-owl' }, defaultColor: false });
    } catch {
      body = `<pre class="plain-code"><code>${escapeHtml(code)}</code></pre>`;
    }
    const lines = code.split('\n').length;
    return `<figure class="codeblock" data-lang="${lang}"><figcaption class="cb-bar"><span class="cb-lang">${LANG_LABEL[lang] || lang}</span><span class="cb-meta">${lines} 行</span><button class="cb-copy" type="button" data-copy aria-label="复制代码"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/></svg><span>复制</span></button></figcaption>${body}</figure>`;
  };

  const defaultLink = md.renderer.rules.link_open || ((t, i, o, e, s) => s.renderToken(t, i, o));
  md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
    const href = tokens[idx].attrGet('href') || '';
    if (/^https?:/i.test(href)) { tokens[idx].attrSet('target', '_blank'); tokens[idx].attrSet('rel', 'noopener noreferrer'); }
    else if (/\.md(#|$)/.test(href) || href.startsWith('/') || href.startsWith('../')) tokens[idx].attrSet('data-mdlink', href);
    return defaultLink(tokens, idx, options, env, self);
  };

  const defaultImage = md.renderer.rules.image || ((t, i, o, e, s) => s.renderToken(t, i, o));
  md.renderer.rules.image = (tokens, idx, options, env, self) => {
    tokens[idx].attrSet('loading', 'lazy');
    tokens[idx].attrSet('class', 'md-img');
    tokens[idx].attrSet('data-zoom', '1');
    return defaultImage(tokens, idx, options, env, self);
  };

  md.renderer.rules.table_open = () => '<div class="table-wrap"><table>';
  md.renderer.rules.table_close = () => '</table></div>';
  return md;
}

function escapeHtml(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

function splitQuestions(src) {
  const lines = src.split('\n');
  const cuts = [];
  let fence = null, depth = 0;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const f = /^ {0,3}(`{3,}|~{3,})/.exec(l);
    if (f) { const mark = f[1][0].repeat(3); fence = fence ? (l.trim().startsWith(mark) && l.trim().replace(/`|~/g, '') === '' ? null : fence) : mark; continue; }
    if (fence) continue;
    if (/^ {0,3}:{3,}\s*[a-zA-Z-]+/.test(l)) depth++;
    else if (/^ {0,3}:{3,}\s*$/.test(l)) depth = Math.max(0, depth - 1);
    if (depth === 0 && /^###\s+\S/.test(l)) cuts.push(i);
  }
  if (!cuts.length) return { intro: src, chunks: [] };
  const intro = lines.slice(0, cuts[0]).join('\n');
  const chunks = cuts.map((c, i) => {
    const end = i + 1 < cuts.length ? cuts[i + 1] : lines.length;
    return lines.slice(c, end).join('\n');
  });
  return { intro, chunks };
}

function plainText(html) {
  return html
    .replace(/<figure class="codeblock"[\s\S]*?<\/figure>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function normTitle(s) {
  return String(s)
    .replace(/<[^>]+>/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[（(]\s*\d+\s*次\s*[)）]/g, '')
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .toLowerCase()
    .replace(/[\s？?。.、，,：:；;！!"'“”‘’（）()[\]{}/*\-—_~·]/g, '')
    .replace(/^(请|麻烦)?(介绍一下|介绍下|说一下|说下|讲一讲|讲讲|谈谈|简述|描述一下|说说|聊一聊|你知道)/, '')
    .replace(/(是什么|有哪些|有什么区别|的区别)$/, '');
}

function bigrams(s) { const g = new Set(); for (let i = 0; i < s.length - 1; i++) g.add(s.slice(i, i + 2)); if (!g.size && s) g.add(s); return g; }
function dice(a, b) { const A = bigrams(a), B = bigrams(b); let hit = 0; for (const x of A) if (B.has(x)) hit++; return (2 * hit) / (A.size + B.size || 1); }
function charOverlap(a, b) {
  const A = new Set(a), B = new Set(b);
  if (Math.min(A.size, B.size) < 4) return 0;
  if (Math.max(A.size, B.size) / Math.min(A.size, B.size) > 2.6) return 0;
  let hit = 0; for (const x of A) if (B.has(x)) hit++;
  return hit / Math.min(A.size, B.size);
}

async function downloadImages() {
  fs.mkdirSync(IMG, { recursive: true });
  let ok = 0, fail = 0;
  const queue = [...imgQueue];
  const workers = Array.from({ length: 6 }, async () => {
    while (queue.length) {
      const job = queue.shift();
      if (fs.existsSync(job.file) && fs.statSync(job.file).size > 0) { ok++; continue; }
      let done = false;
      for (let attempt = 0; attempt < 2 && !done; attempt++) {
        try {
          const ctrl = new AbortController();
          const timer = setTimeout(() => ctrl.abort(), 25000);
          const res = await fetch(job.url, { signal: ctrl.signal, redirect: 'follow', headers: { 'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124 Safari/537.36', accept: 'image/avif,image/webp,image/*,*/*' } });
          clearTimeout(timer);
          if (!res.ok) throw new Error(String(res.status));
          const buf = Buffer.from(await res.arrayBuffer());
          if (buf.length < 64) throw new Error('empty');
          fs.writeFileSync(job.file, buf);
          done = true; ok++;
        } catch { /* retry */ }
      }
      if (!done) { fail++; fs.writeFileSync(job.file + '.failed', '1'); }
    }
  });
  await Promise.all(workers);
  return { ok, fail, total: imgQueue.length };
}

function copyFonts() {
  const dir = path.join(ROOT, 'public', 'fonts');
  fs.mkdirSync(dir, { recursive: true });
  const pairs = [
    ['@fontsource-variable/inter/files/inter-latin-wght-normal.woff2', 'inter.woff2'],
    ['@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2', 'mono.woff2'],
  ];
  for (const [from, to] of pairs) {
    const src = path.join(ROOT, 'node_modules', from);
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(dir, to));
    else if (!fs.existsSync(path.join(dir, to))) throw new Error(`缺少字体 ${from}，请先运行 npm install`);
  }
}

function readSource() {
  try { return JSON.parse(fs.readFileSync(path.join(CONTENT, '.source.json'), 'utf8')); } catch { return null; }
}

async function main() {
  const t0 = Date.now();
  if (!fs.existsSync(CONTENT) || !fs.readdirSync(CONTENT).some((f) => !f.startsWith('.'))) {
    console.error('\n找不到面经内容。本仓库只包含界面代码，内容需要你自己从上游拉取：\n\n  npm run fetch\n  npm run build\n');
    process.exit(1);
  }
  copyFonts();
  highlighter = await createHighlighter({
    themes: ['night-owl', 'github-light'],
    langs: ['cpp', 'c', 'go', 'java', 'sql', 'bash', 'python', 'json', 'yaml', 'text', 'javascript', 'html', 'css', 'xml', 'diff', 'makefile'],
  });
  const md = makeMd();
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(path.join(OUT, 'd'), { recursive: true });

  const docs = [];
  const questions = [];
  const catStats = {};

  for (const cat of CATEGORIES) {
    catStats[cat.id] = { questions: 0, words: 0, docs: 0 };
    for (const rel of cat.docs) {
      const isMethod = cat.id === 'method';
      const file = isMethod ? METHOD_FILES[rel].file : `${cat.dir}/${rel}.md`;
      const abs = path.join(CONTENT, file);
      if (!fs.existsSync(abs)) { console.warn('missing', file); continue; }
      const raw = fs.readFileSync(abs, 'utf8');
      const parsed = matter(raw);
      const fm = parsed.data || {};
      const docId = isMethod ? `method-${rel}` : `${cat.id}-${rel.replace(/\//g, '-')}`;
      const src = preprocess(parsed.content);
      const { intro, chunks } = splitQuestions(src);
      const isQA = chunks.length >= 2;
      const title = DOC_TITLES[`${cat.id}/${rel}`] || (isMethod ? METHOD_FILES[rel].title : null) || fm.title || rel;
      let authors = fm.author || METHOD_FILES[rel]?.author || [];
      if (typeof authors === 'string') authors = [authors];
      if (!Array.isArray(authors)) authors = [String(authors)];

      const doc = { id: docId, cat: cat.id, title, file, authors, type: isQA ? 'qa' : 'article', questions: [], words: 0 };
      const introHtml = intro.trim() ? sanitize(md.render(intro)) : '';
      doc.intro = introHtml;

      if (isQA) {
        chunks.forEach((chunk, i) => {
          const headLine = chunk.split('\n')[0];
          const rawTitle = headLine.replace(/^###\s+/, '').trim();
          const badges = [...rawTitle.matchAll(/<span class="qbadge qb-(\w+)">([^<]*)<\/span>/g)].map((m) => ({ kind: m[1], text: m[2] }));
          const lcLink = /href="(https:\/\/leetcode[^"]+)"/.exec(md.renderInline(rawTitle))?.[1] || null;
          const titleText = plainText(md.renderInline(rawTitle.replace(/<span class="qbadge[^>]*>[^<]*<\/span>/g, ''))).trim();
          const qid = `${docId}~${i + 1}`;
          let bodyMd = chunk.split('\n').slice(1).join('\n');
          let html = sanitize(md.render(bodyMd));
          let sub = 0;
          const toc = [];
          html = html.replace(/<h([4-6])>/g, (m, lv) => {
            sub++;
            const id = `${qid}-s${sub}`;
            return `<h${lv} id="${id}">`;
          });
          html.replace(/<h([4-6]) id="([^"]+)">([\s\S]*?)<\/h\1>/g, (m, lv, id, inner) => { toc.push({ id, level: +lv, text: plainText(inner) }); return m; });
          const text = plainText(html);
          const q = { id: qid, n: i + 1, title: titleText, doc: docId, cat: cat.id, badges, leetcode: lcLink, words: text.length, html, toc, freq: 0 };
          doc.questions.push(q);
          questions.push({ ...q, text });
          doc.words += text.length;
        });
      } else {
        const html = sanitize(md.render(src));
        const text = plainText(html);
        doc.words = text.length;
        doc.text = text;
        doc.html = html;
        const toc = [];
        let k = 0;
        doc.html = doc.html.replace(/<h([1-6])>/g, (m, lv) => { k++; return `<h${lv} id="${docId}-h${k}">`; });
        doc.html.replace(/<h([1-6]) id="([^"]+)">([\s\S]*?)<\/h\1>/g, (m, lv, id, inner) => { if (+lv <= 3) toc.push({ id, level: +lv, text: plainText(inner) }); return m; });
        doc.toc = toc;
      }

      catStats[cat.id].questions += doc.questions.length;
      catStats[cat.id].words += doc.words;
      catStats[cat.id].docs++;
      docs.push(doc);
      fs.writeFileSync(path.join(OUT, 'd', `${docId}.json`), JSON.stringify(doc));
    }
  }

  // frequency board
  const rankEntries = [];
  for (const [file, cat] of RANK_SOURCES) {
    const abs = path.join(CONTENT, file);
    if (!fs.existsSync(abs)) continue;
    const body = matter(fs.readFileSync(abs, 'utf8')).content;
    for (const line of body.split('\n')) {
      const m = /^###\s+(.+?)\s*$/.exec(line);
      if (!m) continue;
      let t = m[1].trim();
      const fm2 = /[（(]\s*(\d+)\s*次\s*[)）]/.exec(t);
      const freq = fm2 ? +fm2[1] : 1;
      t = t.replace(/[（(]\s*\d+\s*次\s*[)）]/g, '').trim();
      const title = plainText(md.renderInline(t)).trim();
      if (!title) continue;
      rankEntries.push({ title, freq, cat, norm: normTitle(title) });
    }
  }
  // merge duplicates
  const merged = new Map();
  for (const e of rankEntries) {
    const key = e.cat + '|' + e.norm;
    if (merged.has(key)) merged.get(key).freq += e.freq;
    else merged.set(key, { ...e });
  }
  const rankList = [...merged.values()];

  const byNorm = new Map();
  for (const q of questions) {
    const n = normTitle(q.title);
    if (!byNorm.has(n)) byNorm.set(n, []);
    byNorm.get(n).push(q);
  }
  const catQuestions = new Map();
  for (const q of questions) {
    if (!catQuestions.has(q.cat)) catQuestions.set(q.cat, []);
    catQuestions.get(q.cat).push(q);
  }

  let matched = 0;
  const subIndex = [];
  for (const q of questions) for (const t of q.toc || []) subIndex.push({ q, norm: normTitle(t.text), anchor: t.id });

  const corpus = [...questions.map((q) => normTitle(q.title)), ...subIndex.map((s) => s.norm)];
  const df = new Map();
  for (const text of corpus) for (const c of new Set(text)) df.set(c, (df.get(c) || 0) + 1);
  const bdf = new Map();
  for (const text of corpus) for (const g of bigrams(text)) bdf.set(g, (bdf.get(g) || 0) + 1);
  const N = corpus.length;
  const cw = (c) => Math.log(1 + N / (1 + (df.get(c) || 0)));
  const SELF_TOKENS = { redis: ['redis'], mysql: ['mysql'], java: ['java'], golang: ['golang', 'go'], cpp: ['cpp', 'c++'], rabbitmq: ['rabbitmq', 'mq'], k8s: ['k8s', 'kubernetes', 'docker'], algorithm: ['leetcode'] };
  let ignoreTokens = new Set();
  const latin = (s) => new Set((s.match(/[a-z0-9+#.]{2,}/g) || []).filter((t) => !ignoreTokens.has(t)));
  const idfSim = (a, b) => {
    const A = new Set(a), B = new Set(b);
    let sa = 0, sb = 0, hit = 0;
    for (const c of A) sa += cw(c);
    for (const c of B) sb += cw(c);
    for (const c of A) if (B.has(c)) hit += cw(c);
    return hit / (0.6 * sb + 0.4 * sa || 1);
  };
  const scoreOf = (n, target) => {
    if (!n || !target) return 0;
    if (n === target) return 1;
    const shorter = n.length < target.length ? n : target;
    const longer = n.length < target.length ? target : n;
    if (shorter.length >= 3 && longer.length <= shorter.length * 4 && longer.includes(shorter)) return 0.94 - Math.min(0.14, (longer.length - shorter.length) / 90);
    if (shorter.length < 4 || longer.length > shorter.length * 3) return 0;
    let s = Math.max(dice(n, target), idfSim(n, target) * 0.92, charOverlap(n, target) * 0.75);
    if (target.length <= 8) {
      const rare = [...bigrams(target)].filter((g) => (bdf.get(g) || 0) <= 8);
      if (rare.length) {
        const nb = bigrams(n);
        if (!rare.some((g) => nb.has(g))) s *= 0.45;
      }
    }
    const la = latin(target), lb = latin(n);
    if (la.size) {
      let shared = 0;
      for (const t of la) if (lb.has(t)) shared++;
      if (!shared) s *= lb.size ? 0.45 : 0.3;
      else if (shared < la.size) s *= 0.82 + 0.18 * (shared / la.size);
    }
    return s;
  };
  const findBest = (pool, target, getNorm) => {
    let best = null, bestScore = 0;
    for (const item of pool) {
      const s = scoreOf(getNorm(item), target);
      if (s > bestScore) { bestScore = s; best = item; }
    }
    return { best, bestScore };
  };
  const globalPool = questions.filter((q) => q.cat !== 'method');
  const qNorm = (q) => normTitle(q.title);
  const sNorm = (s) => s.norm;
  for (const e of rankList) {
    ignoreTokens = new Set(SELF_TOKENS[e.cat] || []);
    let hit = null, anchor = null;
    const exact = byNorm.get(e.norm);
    if (exact) hit = exact[0];
    if (!hit) {
      const a = findBest(catQuestions.get(e.cat) || [], e.norm, qNorm);
      const b = findBest(subIndex.filter((s) => s.q.cat === e.cat && s.norm.length >= 4), e.norm, sNorm);
      if (b.bestScore > a.bestScore && b.bestScore >= 0.8) { hit = b.best.q; anchor = b.best.anchor; }
      else if (a.best && a.bestScore >= 0.55) hit = a.best;
      else {
        const g = findBest(globalPool, e.norm, qNorm);
        if (g.best && g.bestScore >= 0.88) hit = g.best;
      }
    }
    if (hit) {
      matched++;
      e.qid = hit.id;
      e.doc = hit.doc;
      e.cat = hit.cat;
      if (anchor) e.anchor = anchor;
      hit.freq += e.freq;
    } else { e.qid = null; }
  }
  rankList.sort((a, b) => b.freq - a.freq || a.title.localeCompare(b.title, 'zh'));

  // sync freq back into doc summaries
  const freqById = new Map(questions.map((q) => [q.id, q.freq]));
  for (const doc of docs) {
    for (const q of doc.questions) q.freq = freqById.get(q.id) || 0;
    fs.writeFileSync(path.join(OUT, 'd', `${doc.id}.json`), JSON.stringify(doc));
  }

  const images = await downloadImages();
  for (const job of imgQueue) {
    if (!fs.existsSync(job.file)) imgMap.set(job.url, job.url);
  }
  // rewrite failed mirrors back to remote in emitted html
  const failedLocals = new Set(imgQueue.filter((j) => !fs.existsSync(j.file)).map((j) => j.local));
  if (failedLocals.size) {
    const rev = new Map();
    for (const [url, local] of imgMap) if (failedLocals.has(local)) rev.set(local, url);
    for (const doc of docs) {
      let s = JSON.stringify(doc);
      for (const [local, url] of rev) s = s.split(local).join(url);
      fs.writeFileSync(path.join(OUT, 'd', `${doc.id}.json`), s);
    }
  }

  const totalWords = questions.reduce((a, q) => a + q.words, 0) + docs.filter((d) => d.type === 'article').reduce((a, d) => a + d.words, 0);
  const manifest = {
    builtAt: new Date().toISOString(),
    source: readSource(),
    repo: 'https://github.com/zijing2333/CSView',
    site: 'https://www.csview.cn',
    stats: { docs: docs.length, questions: questions.length, words: totalWords, categories: CATEGORIES.length, ranked: rankList.length, matched, images: images.ok },
    groups: [...new Set(CATEGORIES.map((c) => c.group))],
    categories: CATEGORIES.map((c) => ({ ...c, docs: undefined, ...catStats[c.id] })),
    docs: docs.map((d) => ({ id: d.id, cat: d.cat, title: d.title, type: d.type, authors: d.authors, words: d.words, file: d.file,
      questions: d.questions.map((q) => ({ id: q.id, n: q.n, title: q.title, badges: q.badges, leetcode: q.leetcode, words: q.words, freq: q.freq })) })),
  };
  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest));

  const search = questions.map((q) => ({ i: q.id, t: q.title, c: q.cat, d: q.doc, f: q.freq, b: q.badges.map((x) => x.kind).join(','), x: q.text }));
  for (const d of docs.filter((x) => x.type === 'article')) search.push({ i: d.id, t: d.title, c: d.cat, d: d.id, f: 0, b: '', x: d.text, a: 1 });
  for (const d of docs.filter((x) => x.type === 'qa' && x.intro)) {
    const t = plainText(d.intro);
    if (t.length > 20) search.push({ i: `${d.id}-intro`, t: d.title, c: d.cat, d: d.id, f: 0, b: '', x: t, a: 1 });
  }
  fs.writeFileSync(path.join(OUT, 'search.json'), JSON.stringify(search));
  fs.writeFileSync(path.join(OUT, "rank.json"), JSON.stringify(rankList.map((e) => ({ t: e.title, f: e.freq, c: e.cat, q: e.qid, d: e.doc || null, a: e.anchor || null }))));

  const size = (p) => (fs.statSync(p).size / 1024).toFixed(0) + 'KB';
  console.log(`docs=${docs.length} questions=${questions.length} words=${totalWords} rank=${rankList.length} matched=${matched}`);
  console.log(`images ok=${images.ok} fail=${images.fail}/${images.total}`);
  console.log(`manifest=${size(path.join(OUT, 'manifest.json'))} search=${size(path.join(OUT, 'search.json'))}`);
  console.log(`built in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

main().catch((e) => { console.error(e); process.exit(1); });