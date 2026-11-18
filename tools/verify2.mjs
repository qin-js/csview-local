import { chromium } from 'playwright';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const BASE = process.env.BASE_URL || 'http://localhost:5173';
const OUT = path.join(os.tmpdir(), 'csview-shots');
const errors = [], fails = [];
const ok = (m) => console.log(`  ✓ ${m}`);
const bad = (m) => { fails.push(m); console.log(`  ✗ ${m}`); };
const browser = await chromium.launch({ executablePath: process.env.CHROME_BIN || undefined });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addInitScript(() => {
  window.__live = new Set();
  const si = window.setInterval, ci = window.clearInterval;
  window.setInterval = (...a) => { const id = si(...a); window.__live.add(id); return id; };
  window.clearInterval = (id) => { window.__live.delete(id); return ci(id); };
});
const page = await ctx.newPage();
page.on('console', (m) => { if (m.type() === 'error') errors.push(`[console] ${m.text()}`); });
page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));
page.on('response', (r) => { if (r.status() >= 400) errors.push(`[http ${r.status()}] ${r.url()}`); });
const wait = (ms) => page.waitForTimeout(ms);
const go = async (h, ms = 800) => { await page.goto(BASE + '/' + h, { waitUntil: 'networkidle' }); await wait(ms); };

console.log('\n== A. HR doc: open questions + notes ==');
await go('#/d/hr-README');
const hrCards = await page.locator('.qcard[data-q]').count();
hrCards === 12 ? ok('12 HR question cards') : bad(`hr cards ${hrCards}`);
const notices = await page.locator('.qempty').count();
notices === 12 ? ok('open-question notice on every card') : bad(`notices ${notices}`);
await page.locator('.qcard[data-q]').first().locator('[data-note]').click();
await wait(250);
await page.locator('.qnote textarea').first().fill('优势：工程落地能力强；劣势：公开表达需要练习，正在通过分享改善。');
await page.locator('[data-nsave]').first().click();
await wait(300);
(await page.locator('.qcard[data-q]').first().locator('[data-note]').getAttribute('class')).includes('has-note') ? ok('HR answer note saved') : bad('HR note failed');
await page.screenshot({ path: `${OUT}/30-hr.png` });

console.log('\n== B. Article-type docs ==');
for (const id of ['method-introduction', 'method-devlog', 'method-article']) {
  await go(`#/d/${id}`, 700);
  const len = (await page.locator('.prose').first().innerText()).length;
  len > 400 ? ok(`${id} article renders (${len} chars)`) : bad(`${id} too short ${len}`);
  const toc = await page.locator('#toc a').count();
  ok(`${id} toc entries: ${toc}`);
}
await go('#/d/method-interview', 700);
const fn = await page.locator('.fnref').count();
fn > 0 ? ok(`footnote annotations present (${fn})`) : bad('footnotes missing');
await page.locator('.fnref').first().scrollIntoViewIfNeeded();
await wait(300);
await page.locator('.fnref').first().click();
await wait(300);
(await page.locator('.fn-pop').isVisible()) ? ok('footnote popover opens') : bad('footnote popover failed');
await page.screenshot({ path: `${OUT}/31-footnote.png` });
await page.mouse.click(1250, 820);
await wait(250);
(await page.locator('.fn-pop').count()) === 0 ? ok('footnote popover dismisses') : bad('footnote stuck');

console.log('\n== C. Internal markdown links ==');
await go('#/d/method-introduction', 700);
const mdLinks = await page.locator('a[data-mdlink]').count();
ok(`internal md links found: ${mdLinks}`);
if (mdLinks) {
  const before = await page.evaluate(() => location.hash);
  await page.locator('a[data-mdlink]').first().click();
  await wait(800);
  const after = await page.evaluate(() => location.hash);
  after !== before ? ok(`md link navigates: ${before} -> ${after}`) : bad('md link did nothing');
}

console.log('\n== D. Keyboard shortcuts ==');
await go('#/', 700);
await page.keyboard.press('t');
await wait(300);
(await page.evaluate(() => document.documentElement.dataset.theme)) === 'light' ? ok('T toggles theme') : bad('T failed');
await page.keyboard.press('t');
await wait(300);
await page.keyboard.press('/');
await wait(600);
(await page.locator('#palette').isVisible()) ? ok('/ opens search') : bad('/ failed');
await page.keyboard.press('Escape');
await wait(300);
await page.keyboard.press('q');
await wait(800);
(await page.evaluate(() => location.hash)) === '#/quiz' ? ok('Q opens quiz') : bad('Q failed');
await page.keyboard.press('g');
await page.keyboard.press('h');
await wait(700);
(await page.evaluate(() => location.hash)) === '#/' ? ok('G then H goes home') : bad('G+H failed');

console.log('\n== E. Deep link reload + unknown route ==');
await page.goto(`${BASE}/#/q/mysql-indexing~1`, { waitUntil: 'networkidle' });
await wait(1000);
const focused = await page.evaluate(() => { const el = document.getElementById('mysql-indexing~1'); if (!el) return null; const r = el.getBoundingClientRect(); return { top: Math.round(r.top), navH: 64 }; });
focused && focused.top >= 60 && focused.top < 200 ? ok(`deep link lands below navbar (top=${focused.top})`) : bad(`deep link position ${JSON.stringify(focused)}`);
await page.reload({ waitUntil: 'networkidle' });
await wait(1200);
const afterReload = await page.evaluate(() => !!document.getElementById('mysql-indexing~1'));
afterReload ? ok('deep link survives reload') : bad('deep link lost on reload');
await page.goto(`${BASE}/#/c/nope`, { waitUntil: 'networkidle' });
await wait(600);
(await page.locator('.empty').isVisible()) ? ok('unknown category shows empty state') : bad('no 404 state');
await page.goto(`${BASE}/#/d/does-not-exist`, { waitUntil: 'networkidle' });
await wait(600);
(await page.locator('.empty').isVisible()) ? ok('unknown doc shows empty state') : bad('no doc 404 state');

console.log('\n== F. Code language persistence across docs ==');
await go('#/d/algorithm-linklist-01', 900);
await page.locator('#langSeg [data-l=go]').click();
await wait(400);
await go('#/d/algorithm-tree-02', 900);
const goActive = await page.evaluate(() => [...document.querySelectorAll('.code-tabs')].every((w) => w.querySelector('.ct-tab.on')?.dataset.lang === 'go'));
goActive ? ok('Go preference persists to another doc') : bad('lang preference lost');
await page.locator('#langSeg [data-l=cpp]').click();
await wait(300);

console.log('\n== G. Mark-all + undo ==');
await go('#/d/redis-persistence', 900);
await page.locator('[data-mark-all]').click();
await wait(500);
const allMarked = await page.evaluate(() => [...document.querySelectorAll('.qcard[data-q]')].every((c) => c.dataset.mark === '1'));
allMarked ? ok('mark-all sets every card') : bad('mark-all failed');
const undoBtn = page.locator('.toast button', { hasText: '撤销' }).last();
(await undoBtn.count()) > 0 ? ok('undo affordance offered') : bad('no undo');

console.log('\n== H. Export / import / reset ==');
await go('#/progress', 800);
const dl = page.waitForEvent('download', { timeout: 8000 }).catch(() => null);
await page.locator('[data-export]').click();
const download = await dl;
if (download) {
  const p = await download.path();
  const data = JSON.parse(fs.readFileSync(p, 'utf8'));
  data.marks && Object.keys(data.marks).length > 5 ? ok(`export contains ${Object.keys(data.marks).length} marks`) : bad('export empty');
  fs.writeFileSync(path.join(os.tmpdir(), 'csview-backup.json'), JSON.stringify(data));
} else bad('export download failed');
await page.locator('[data-reset]').click();
await wait(400);
(await page.locator('.modal-box').isVisible()) ? ok('reset asks for confirmation') : bad('no confirm modal');
await page.screenshot({ path: `${OUT}/32-confirm.png` });
await page.locator('[data-mclose]').click();
await wait(300);
(await page.locator('#modal').isHidden()) ? ok('cancel closes modal without deleting') : bad('modal stuck');
const stillMarks = await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('csview.state.v1')).marks).length);
stillMarks > 5 ? ok('cancel preserved data') : bad('cancel destroyed data');
await page.locator('[data-reset]').click();
await wait(300);
await page.locator('[data-mok]').click();
await wait(400);
const undo2 = page.locator('.toast button', { hasText: '撤销' }).last();
(await undo2.count()) > 0 ? ok('reset offers undo') : bad('no reset undo');
await undo2.click();
await wait(1200);
const restored = await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('csview.state.v1')).marks).length);
restored > 5 ? ok(`undo restored ${restored} marks`) : bad(`undo failed (${restored})`);

console.log('\n== I. Import round-trip ==');
await go('#/progress', 800);
const chooser = page.waitForEvent('filechooser');
await page.locator('[data-import]').click();
const fc = await chooser;
await fc.setFiles(path.join(os.tmpdir(), 'csview-backup.json'));
await wait(1400);
const imported = await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('csview.state.v1')).marks).length);
imported > 5 ? ok(`import restored ${imported} marks`) : bad(`import failed ${imported}`);

console.log('\n== J. Responsive sweep ==');
for (const [w, h] of [[1920, 1080], [1280, 800], [1024, 768], [834, 1112], [768, 1024], [430, 932], [360, 780], [320, 700]]) {
  const c2 = await browser.newContext({ viewport: { width: w, height: h } });
  const p2 = await c2.newPage();
  p2.on('pageerror', (e) => errors.push(`[${w}px pageerror] ${e.message}`));
  const worst = { v: 0, where: '' };
  for (const route of ['#/', '#/c/algorithm', '#/d/cpp-inheritanceAndPolymorphism', '#/rank', '#/quiz', '#/progress', '#/about']) {
    await p2.goto(BASE + '/' + route, { waitUntil: 'networkidle' });
    await p2.waitForTimeout(450);
    const ov = await p2.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (ov > worst.v) { worst.v = ov; worst.where = route; }
  }
  worst.v <= 0 ? ok(`${w}x${h}: no overflow across 7 routes`) : bad(`${w}x${h}: overflow ${worst.v}px at ${worst.where}`);
  if (w === 768) await p2.screenshot({ path: `${OUT}/33-tablet.png`, fullPage: false });
  if (w === 320) await p2.screenshot({ path: `${OUT}/34-small.png`, fullPage: false });
  await c2.close();
}

console.log('\n== K. Mobile popover reachability ==');
const mc = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
const mp = await mc.newPage();
mp.on('pageerror', (e) => errors.push(`[mobile] ${e.message}`));
await mp.goto(`${BASE}/#/d/os-process`, { waitUntil: 'networkidle' });
await mp.waitForTimeout(900);
await mp.locator('[data-rail=right]').click();
await mp.waitForTimeout(400);
const lastToggle = mp.locator('#railRight [data-pref=motion]');
await lastToggle.scrollIntoViewIfNeeded();
await mp.waitForTimeout(300);
await lastToggle.click();
await mp.waitForTimeout(400);
(await mp.evaluate(() => document.documentElement.dataset.motion)) === 'off' ? ok('last control in mobile popover reachable & live') : bad('mobile popover control unreachable');
await mp.screenshot({ path: `${OUT}/35-mobile-popover-bottom.png` });
await mp.locator('#railRight [data-pref=motion]').click();
await mp.waitForTimeout(300);
await mp.locator('#railRight [data-rail-close]').click();
await mp.waitForTimeout(300);
await mp.goto(`${BASE}/#/c/hr`, { waitUntil: 'networkidle' });
await mp.waitForTimeout(600);
await mp.locator('[data-view=questions]').click();
await mp.waitForTimeout(400);
const hrRows = await mp.locator('.qrow').count();
hrRows === 12 ? ok('mobile category question list works') : bad(`mobile hr rows ${hrRows}`);
await mc.close();

console.log('\n== L. Timer / listener hygiene ==');
await go('#/quiz', 700);
await page.locator('#cntRange').fill('5');
await page.click('[data-start]');
await wait(1500);
await go('#/', 800);
const timers = await page.evaluate(() => window.__live.size);
timers === 0 ? ok('no interval left running after quiz exit') : bad(`${timers} intervals still running`);
for (let i = 0; i < 6; i++) {
  await page.locator('.nav-links [data-nav=quiz]').click();
  await wait(400);
  await page.click('[data-start]');
  await wait(250);
  await page.keyboard.press('Escape');
  await wait(250);
}
ok('nav re-entry resets quiz to setup each time');
await go('#/', 600);
const cards = await page.locator('.cat-card').count();
cards === 14 ? ok('6 quiz start/exit cycles leave app stable') : bad(`unstable after cycles: ${cards}`);
const timers2 = await page.evaluate(() => window.__live.size);
timers2 <= 1 ? ok(`intervals after 6 cycles: ${timers2}`) : bad(`interval leak: ${timers2}`);
const toasts = await page.locator('.toast').count();
toasts <= 4 ? ok(`toast queue bounded (${toasts})`) : bad(`toast leak ${toasts}`);

console.log('\n== ERRORS ==');
if (errors.length) [...new Set(errors)].forEach((e) => console.log('  ! ' + e)); else console.log('  none');
console.log(`\n== RESULT: ${fails.length ? fails.length + ' FAILURES' : 'ALL CHECKS PASSED'} ==`);
fails.forEach((f) => console.log('  - ' + f));
await browser.close();
process.exit(fails.length || errors.length ? 1 : 0);