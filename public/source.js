import { S, D, LIB, loadManifest, resetData, detectLibrary, emit } from './store.js';
import * as lib from './library.js';
import { esc, icon, toast, modal, fmtK } from './ui.js';

const refresh = () => document.dispatchEvent(new CustomEvent('cs:refresh'));
const CMDS = 'git clone https://github.com/qin-js/csview-local.git\ncd csview-local\nnpm install && npm run fetch && npm run build';

let lastRemoved = null;
let busy = false;

export function libLabel() {
  if (LIB.mode === 'local') return { text: '本地题库', kind: 'local' };
  return D.manifest?.demo ? { text: '示例题库', kind: 'demo' } : { text: '完整题库', kind: 'full' };
}

export function paintLibButton() {
  const btn = document.getElementById('libBtn');
  if (!btn || !D.manifest) return;
  const { text, kind } = libLabel();
  btn.className = `libbtn ${kind}`;
  btn.innerHTML = `${icon(kind === 'local' ? 'download' : 'layers')}<span>${text}</span><i>${D.manifest.stats.questions}</i>`;
  btn.title = kind === 'demo'
    ? '当前是原创示例题库，点击可导入完整 747 题'
    : kind === 'local' ? '已导入本地题库，点击管理' : '当前是完整题库，点击管理来源';
}

function sourceCard() {
  const m = D.manifest;
  const { kind } = libLabel();
  const local = LIB.info;
  const title = kind === 'local' ? '本地导入的题库' : kind === 'demo' ? '内置原创示例题库' : '本地构建的完整题库';
  const note = kind === 'local'
    ? `导入于 ${new Date(local.importedAt).toLocaleString('zh-CN')} · 占用 ${(local.bytes / 1048576).toFixed(1)} MB · ${local.fileCount} 个文件`
    : kind === 'demo'
      ? '由本项目作者原创撰写，可自由分发。完整面经内容不在此公开站点上。'
      : '由 npm run build 从上游内容生成，仅存在于你本机。';
  return `<div class="src-card ${kind}">
    <div class="sc-top"><span class="sc-ic">${icon(kind === 'local' ? 'download' : kind === 'demo' ? 'spark' : 'book')}</span>
      <div><b>${title}</b><p>${esc(note)}</p></div></div>
    <div class="sc-stats">
      <span><b>${m.stats.questions}</b>题</span><span><b>${m.stats.docs}</b>篇</span>
      <span><b>${m.stats.categories}</b>方向</span><span><b>${fmtK(m.stats.words)}</b>字</span>
    </div>
  </div>`;
}

function bodyHtml() {
  const { kind } = libLabel();
  return `${sourceCard()}
  ${kind === 'demo' ? `<div class="adm adm-info" style="margin:16px 0 0"><div class="adm-head">${icon('info')}<span>为什么公开站点只有示例题</span></div>
    <div class="adm-body"><p>完整的 747 道题来自 <a href="https://github.com/zijing2333/CSView" target="_blank" rel="noopener">zijing2333/CSView</a>。上游未提供开源许可证，且作者明确声明禁止转载搬运，所以内容不随这个公开站点分发。你在本地构建后导入，数据只留在你自己的浏览器里。</p></div></div>` : ''}

  <div class="src-sec">
    <div class="src-lab"><span>${kind === 'local' ? '重新导入 / 更新' : '导入完整题库'}</span><span class="src-hint">需要先在本地构建</span></div>
    <div class="cmd-block"><pre>${esc(CMDS)}</pre><button class="cb-copy" type="button" data-copy-cmd>${icon('copy')}<span>复制</span></button></div>
    <p class="src-tip">构建完成后，把 <code>public/</code> 目录整个拖进下面区域，或点击选择。只会读取 <code>data/</code> 与 <code>img/</code>。</p>
    <div class="dropzone" id="libDrop" tabindex="0" role="button" aria-label="选择或拖入 public 目录">
      ${icon('upload')}
      <b>拖入 public 目录</b>
      <span>或点击选择目录 · 支持 Chrome / Edge / Firefox / Safari</span>
      <input type="file" id="libPick" webkitdirectory directory multiple hidden>
    </div>
    <div class="imp-bar" id="libProg" hidden><div class="mini-bar"><i></i></div><span></span></div>
  </div>

  <div class="src-foot">
    ${kind === 'local' ? `<button class="btn btn-danger btn-sm" data-lib-remove type="button">${icon('trash')}移除本地题库</button>` : ''}
    <button class="btn btn-ghost btn-sm" data-lib-close type="button" style="margin-left:auto">关闭</button>
  </div>`;
}

async function reload() {
  resetData();
  await detectLibrary();
  await loadManifest();
  paintLibButton();
  refresh();
}

function setProgress(host, done, total, label) {
  const box = host.querySelector('#libProg');
  box.hidden = false;
  const pct = total ? Math.round((done / total) * 100) : 0;
  box.querySelector('i').style.width = `${pct}%`;
  box.querySelector('span').textContent = `${label} ${done}/${total}`;
}

async function doImport(raw, host, close) {
  if (busy) return;
  busy = true;
  const drop = host.querySelector('#libDrop');
  drop.classList.add('busy');
  try {
    setProgress(host, 0, raw.length, '读取文件');
    const { entries, info } = await lib.buildEntries(raw, (d, t) => setProgress(host, d, t, '读取文件'));
    setProgress(host, 0, entries.length, '写入浏览器');
    await lib.writeLibrary(entries, info, (d, t) => setProgress(host, d, t, '写入浏览器'));
    try { await navigator.storage?.persist?.(); } catch { /* optional */ }
    await reload();
    toast(`已导入 ${info.questions} 道题，仅保存在本机浏览器`, 'ok');
    close();
  } catch (err) {
    toast(`导入失败：${err.message}`, 'err');
    host.querySelector('#libProg').hidden = true;
  } finally {
    busy = false;
    drop.classList.remove('busy');
  }
}

export function openLibraryPanel() {
  const close = modal({ title: '题库来源', body: bodyHtml(), actions: false, wide: true });
  const host = document.getElementById('modal');

  host.querySelector('[data-lib-close]').addEventListener('click', close);
  host.querySelector('[data-copy-cmd]').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    try { await navigator.clipboard.writeText(CMDS); } catch { /* ignore */ }
    btn.classList.add('done');
    btn.querySelector('span').textContent = '已复制';
    setTimeout(() => { btn.classList.remove('done'); const s = btn.querySelector('span'); if (s) s.textContent = '复制'; }, 1600);
  });

  const drop = host.querySelector('#libDrop');
  const pick = host.querySelector('#libPick');
  drop.addEventListener('click', () => { if (!busy) pick.click(); });
  drop.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick.click(); } });
  pick.addEventListener('change', () => { const raw = lib.fromInput(pick); if (raw.length) doImport(raw, host, close); });
  ['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', async (e) => {
    if (busy) return;
    const raw = await lib.fromDataTransfer(e.dataTransfer);
    if (raw.length) doImport(raw, host, close);
    else toast('没有读到文件，请拖入整个 public 目录', 'warn');
  });

  host.querySelector('[data-lib-remove]')?.addEventListener('click', () => {
    const info = LIB.info;
    modal({
      title: '移除本地题库？',
      body: `<p>将从浏览器中删除已导入的 ${info.questions} 道题与相关图片（约 ${(info.bytes / 1048576).toFixed(1)} MB），页面回到内置示例题库。</p><p style="margin-top:10px;color:var(--fg-3)">你的掌握度、收藏与笔记不会受影响，移除后 8 秒内可以撤销。</p>`,
      confirmText: '移除', danger: true,
      onConfirm: async () => {
        lastRemoved = await lib.exportEntries();
        await lib.clearLibrary();
        await reload();
        close();
        toast('已移除本地题库', 'warn', lastRemoved ? {
          label: '撤销',
          fn: async () => {
            await lib.writeLibrary(lastRemoved.entries, lastRemoved.info);
            lastRemoved = null;
            await reload();
            toast('已恢复本地题库', 'ok');
          },
        } : undefined);
      },
    });
  });
}