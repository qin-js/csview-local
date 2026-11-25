import { chromium } from 'playwright';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

const BASE = process.env.BASE_URL || 'http://localhost:5199/csview-local';
const FULL_DIR = process.env.FULL_DIR || '/root/code/csview/public';
const OUT = path.join(os.tmpdir(), 'csview-shots');
fs.mkdirSync(OUT, { recursive: true });
const errors = [], fails = [];
const ok = (m) => console.log(`  ✓ ${m}`);
const bad = (m) => { fails.push(m); console.log(`  ✗ ${m}`); };

const browser = await chromium.launch({ executablePath: process.env.CHROME_BIN || undefined });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.on('console', (m) => { if (m.type() === 'error') errors.push(`[console] ${m.text()}`); });
page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));
page.on('requestfailed', (r) => errors.push(`[reqfail] ${r.url()} ${r.failure()?.errorText}`));
page.on('response', (r) => { if (r.status() >= 400) errors.push(`[http ${r.status()}] ${r.url()}`); });
const wait = (ms) => page.waitForTimeout(ms);
const go = async (h, ms = 800) => { await page.goto(`${BASE}/${h}`, { waitUntil: 'networkidle' }); await wait(ms); };
const settled = async (sel, timeout = 30000) => { await page.locator(sel).first().waitFor({ timeout }).catch(() => {}); return page.locator(sel).count(); };

console.log('\n== A. SUBPATH BOOT (demo library) ==');
await go('', 1200);
const url = page.url();
url.includes('/csview-local/') ? ok(`served under subpath: ${url}`) : bad(`url ${url}`);
await settled('.hero-stats dt');
const qCount = await page.locator('.hero-stats dt').first().innerText();
qCount === '58' ? ok('demo library loaded: 58 questions') : bad(`questions ${qCount}`);
const cats = await settled('.cat-card');
cats === 10 ? ok('10 demo categories') : bad(`cats ${cats}`);
(await page.locator('.demo-strip').isVisible()) ? ok('demo disclosure strip visible') : bad('no disclosure');
const libTxt = await page.locator('#libBtn').innerText();
libTxt.includes('示例题库') ? ok(`library chip: ${libTxt.replace(/\n/g, ' ')}`) : bad(`chip ${libTxt}`);
const fontOk = await page.evaluate(() => document.fonts.check('16px "Inter var"'));
fontOk ? ok('self-hosted font loaded from subpath') : bad('font failed');
await page.screenshot({ path: `${OUT}/p1-demo-home.png` });

console.log('\n== B. DEMO CONTENT RENDERS ==');
await go('#/d/network-tcp', 900);
const cards = await settled('.qcard[data-q]');
cards === 6 ? ok('6 TCP questions') : bad(`cards ${cards}`);
const svgImg = await page.locator('.prose img.md-img').count();
svgImg === 1 ? ok('local SVG diagram present') : bad(`img ${svgImg}`);
await page.locator('.prose img.md-img').first().scrollIntoViewIfNeeded();
await page.waitForFunction(() => { const i = document.querySelector('.prose img.md-img'); return i && i.complete && i.naturalWidth > 0; }, null, { timeout: 20000 }).catch(() => {});
const imgOk = await page.locator('.prose img.md-img').first().evaluate((i) => i.complete && i.naturalWidth > 0);
imgOk ? ok('SVG actually decoded') : bad('SVG broken');
const broken = await page.locator('.img-fallback').count();
broken === 0 ? ok('no broken assets') : bad(`${broken} broken`);
const tables = await page.locator('.table-wrap table').count();
tables >= 1 ? ok(`tables rendered: ${tables}`) : bad('no table');
const adm = await page.locator('.adm').count();
adm >= 3 ? ok(`admonitions: ${adm}`) : bad(`adm ${adm}`);
await page.screenshot({ path: `${OUT}/p2-demo-reader.png` });
await page.locator('.prose img.md-img').first().click();
await wait(400);
(await page.locator('#lightbox').isVisible()) ? ok('lightbox works on subpath') : bad('lightbox failed');
await page.keyboard.press('Escape');
await wait(250);

await go('#/d/algorithm-linklist', 900);
const tabs = await settled('.code-tabs');
tabs === 3 ? ok('3 tri-language code tab groups') : bad(`tabs ${tabs}`);
const tokens = await page.locator('.shiki span[style]').count();
tokens > 100 ? ok(`syntax highlighting: ${tokens} tokens`) : bad(`tokens ${tokens}`);
await page.locator('.code-tabs').first().locator('.ct-tab[data-lang=java]').click();
await wait(300);
const allJava = await page.evaluate(() => [...document.querySelectorAll('.code-tabs')].every((w) => w.querySelector('.ct-tab.on')?.dataset.lang === 'java'));
allJava ? ok('language switch propagates') : bad('lang switch failed');
await page.screenshot({ path: `${OUT}/p3-demo-code.png` });

console.log('\n== C. PRIMARY LOOP ON DEMO DATA ==');
await go('#/d/redis-application', 900);
await settled('.qcard[data-q]');
await page.locator('.qcard[data-q]').first().locator('[data-mark-btn]').click();
await wait(250);
(await page.locator('.qcard[data-q]').first().getAttribute('data-mark')) === '1' ? ok('mark works') : bad('mark failed');
await page.locator('.qcard[data-q]').first().locator('[data-star]').click();
await wait(250);
await page.locator('.qcard[data-q]').first().locator('[data-note]').click();
await wait(250);
await page.locator('.qnote textarea').first().fill('穿透=数据不存在；击穿=单热点key过期；雪崩=大批key同时过期。');
await page.locator('[data-nsave]').first().click();
await wait(300);
(await page.locator('.qcard[data-q]').first().locator('[data-note]').getAttribute('class')).includes('has-note') ? ok('note saved') : bad('note failed');

await page.keyboard.press('Control+k');
await wait(400);
await page.fill('#palInput', 'MVCC');
await page.locator('.pal-item[data-pi]').first().waitFor({ timeout: 25000 });
const hits = await page.locator('.pal-item[data-pi]').count();
hits > 0 ? ok(`search MVCC -> ${hits} hits`) : bad('no hits');
await page.keyboard.press('Enter');
await page.waitForFunction(() => location.hash.startsWith('#/q/'), null, { timeout: 20000 }).catch(() => {});
await wait(600);
(page.url().includes('#/q/')) ? ok('search deep link works') : bad('deep link failed');

await go('#/rank', 800);
const rows = await settled('#rankBody .rank-row');
rows === 46 ? ok(`46 frequency rows`) : bad(`rows ${rows}`);
await page.click('[data-rf=linked]');
await wait(300);
ok(`linked-only -> ${await page.locator('#rankBody .rank-row').count()}`);

await go('#/quiz', 800);
await settled('[data-no-cats]');
await page.click('[data-no-cats]');
await page.click('[data-qc=redis]');
await page.locator('#cntRange').fill('5');
await page.click('[data-start]');
await wait(600);
await page.keyboard.press('Space');
await wait(700);
const ans = await page.locator('.qf-answer .prose, .qf-answer .qempty').count();
ans > 0 ? ok('quiz answer renders') : bad('quiz answer missing');
for (let i = 0; i < 5; i++) {
  if (i) { await page.keyboard.press('Space'); await wait(450); }
  await page.keyboard.press(i % 2 ? '2' : '1');
  await wait(450);
}
await wait(500);
(await page.locator('.qsum').isVisible()) ? ok('quiz loop completes on demo data') : bad('quiz summary missing');
await page.screenshot({ path: `${OUT}/p4-demo-quiz.png` });

await go('#/progress', 800);
await settled('.pg-fact b');
const facts = await page.locator('.pg-fact b').allInnerTexts();
ok(`progress: ${facts.join(' / ')}`);
await go('#/about', 800);
await settled('.prose');
const aboutTxt = await page.locator('.prose').first().innerText();
aboutTxt.includes('示例题库') ? ok('about explains demo provenance') : bad('about missing demo notice');
await page.screenshot({ path: `${OUT}/p5-demo-about.png` });

console.log('\n== D. IMPORT FULL LIBRARY ==');
await go('', 900);
await page.click('#libBtn');
await wait(500);
(await page.locator('.modal-box.wide').isVisible()) ? ok('library panel opens') : bad('panel failed');
(await page.locator('.cmd-block pre').isVisible()) ? ok('build commands shown') : bad('no commands');
await page.screenshot({ path: `${OUT}/p6-library-panel.png` });
await page.locator('[data-copy-cmd]').click();
await wait(300);
(await page.locator('[data-copy-cmd]').innerText()).includes('已复制') ? ok('command copy works') : bad('copy failed');

const pick = page.locator('#libPick');
await pick.setInputFiles(FULL_DIR);
await wait(1000);
let imported = false;
for (let i = 0; i < 60; i++) {
  const n = await page.locator('.hero-stats dt').first().innerText().catch(() => '');
  if (n === '747') { imported = true; break; }
  await wait(500);
}
imported ? ok('folder import switched library to 747 questions') : bad('import did not complete');
const chip = await page.locator('#libBtn').innerText();
chip.includes('本地题库') ? ok(`chip switched: ${chip.replace(/\n/g, ' ')}`) : bad(`chip ${chip}`);
(await page.locator('.demo-strip').count()) === 0 ? ok('demo disclosure removed after import') : bad('disclosure still shown');
const navCount = await page.locator('[data-nav=lib] .nb').innerText();
navCount === '747' ? ok('nav count follows imported library') : bad(`nav count ${navCount}`);
(await page.locator('#navDrop').count()) === 1 ? ok('nav dropdown not duplicated after rebuild') : bad('navDrop duplicated');
await page.screenshot({ path: `${OUT}/p7-imported-home.png` });

console.log('\n== E. IMPORTED LIBRARY WORKS ==');
await go('#/d/network-tcp', 1200);
const fullCards = await settled('.qcard[data-q]');
fullCards === 24 ? ok('full TCP chapter: 24 questions') : bad(`cards ${fullCards}`);
await page.locator('[data-expand-all]').first().click();
await page.evaluate(async () => {
  document.documentElement.style.scrollBehavior = 'auto';
  const h = document.documentElement.scrollHeight;
  for (let y = 0; y < h; y += 500) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); }
  window.scrollTo(0, 0);
});
await wait(1400);
const imgs = await page.locator('.prose img.md-img').count();
const decoded = await page.evaluate(() => [...document.querySelectorAll('.prose img.md-img')].filter((i) => i.complete && i.naturalWidth > 0).length);
imgs > 0 && decoded === imgs ? ok(`imported images resolved via blob URLs (${decoded}/${imgs})`) : bad(`images ${decoded}/${imgs}`);
const blobSrc = await page.locator('.prose img.md-img').first().getAttribute('src');
blobSrc.startsWith('blob:') ? ok('image src is a blob URL') : bad(`src ${blobSrc}`);
await page.screenshot({ path: `${OUT}/p8-imported-reader.png` });
await go('#/d/algorithm-linklist-01', 1200);
const fullTabs = await settled('.code-tabs');
fullTabs >= 7 ? ok(`full algorithm tabs: ${fullTabs}`) : bad(`tabs ${fullTabs}`);
await go('#/rank', 900);
const fullRows = await settled('#rankBody .rank-row');
fullRows === 287 ? ok('full frequency board: 287 rows') : bad(`rows ${fullRows}`);
await page.keyboard.press('Control+k');
await wait(400);
await page.fill('#palInput', '跳表');
await page.locator('.pal-item[data-pi]').first().waitFor({ timeout: 25000 }).catch(() => {});
const h2 = await page.locator('.pal-item[data-pi]').count();
h2 > 0 ? ok(`full-text search on imported index: ${h2} hits`) : bad('imported search failed');
await page.keyboard.press('Escape');
await wait(300);

console.log('\n== F. PERSISTENCE + REMOVE + UNDO ==');
await page.reload({ waitUntil: 'networkidle' });
await wait(1200);
await go('', 1200);
await settled('.hero-stats dt');
const afterReload = await page.locator('.hero-stats dt').first().innerText();
afterReload === '747' ? ok('imported library survives reload (IndexedDB)') : bad(`after reload ${afterReload}`);
const marksKept = await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('csview.state.v1')).marks || {}).length);
marksKept > 0 ? ok(`progress preserved across library switch (${marksKept} marks)`) : bad('progress lost');
await page.click('#libBtn');
await wait(500);
(await page.locator('[data-lib-remove]').isVisible()) ? ok('remove action available') : bad('no remove');
await page.click('[data-lib-remove]');
await wait(400);
await page.click('[data-mok]');
await wait(1500);
const backToDemo = await page.locator('.hero-stats dt').first().innerText();
backToDemo === '58' ? ok('remove returns to demo library') : bad(`after remove ${backToDemo}`);
const undo = page.locator('.toast button', { hasText: '撤销' }).last();
(await undo.count()) > 0 ? ok('remove offers undo') : bad('no undo');
await undo.click();
await wait(2500);
const restored = await page.locator('.hero-stats dt').first().innerText();
restored === '747' ? ok('undo restored the imported library') : bad(`undo gave ${restored}`);

console.log('\n== G. RESPONSIVE + MOBILE ==');
for (const [w, h] of [[1920, 1080], [1280, 800], [1024, 768], [768, 1024], [430, 932], [390, 844], [320, 700]]) {
  const c2 = await browser.newContext({ viewport: { width: w, height: h } });
  const p2 = await c2.newPage();
  p2.on('pageerror', (e) => errors.push(`[${w}px] ${e.message}`));
  let worst = { v: 0, where: '' };
  for (const r of ['', '#/c/algorithm', '#/d/algorithm-linklist', '#/rank', '#/quiz', '#/progress', '#/about']) {
    await p2.goto(`${BASE}/${r}`, { waitUntil: 'networkidle' });
    await p2.waitForFunction(() => {
      const s = document.querySelector('.stage');
      return s && s.children.length > 0 && !s.querySelector('.skeleton');
    }, null, { timeout: 30000 }).catch(() => {});
    await p2.waitForTimeout(400);
    const ov = await p2.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (ov > worst.v) worst = { v: ov, where: r };
  }
  worst.v <= 0 ? ok(`${w}x${h}: no overflow across 7 routes`) : bad(`${w}x${h}: ${worst.v}px at ${worst.where}`);
  if (w === 390) {
    await p2.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    await p2.waitForTimeout(700);
    await p2.screenshot({ path: `${OUT}/p9-mobile-home.png`, fullPage: false });
    await p2.click('#libBtn');
    await p2.waitForTimeout(500);
    const ov = await p2.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    ov <= 0 ? ok('mobile library panel: no overflow') : bad(`panel overflow ${ov}`);
    await p2.screenshot({ path: `${OUT}/p10-mobile-panel.png` });
    await p2.locator('.modal-x').click();
    await p2.waitForTimeout(350);
    (await p2.locator('#modal').isHidden()) ? ok('mobile library panel closes via header X') : bad('panel stuck open');
  }
  await c2.close();
}

console.log('\n== ERRORS ==');
if (errors.length) [...new Set(errors)].forEach((e) => console.log('  ! ' + e)); else console.log('  none');
console.log(`\n== RESULT: ${fails.length ? fails.length + ' FAILURES' : 'ALL CHECKS PASSED'} ==`);
fails.forEach((f) => console.log('  - ' + f));
await browser.close();
process.exit(fails.length || errors.length ? 1 : 0);