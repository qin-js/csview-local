import { chromium } from 'playwright';
const BIN = process.env.CHROME_BIN || undefined;
const b = await chromium.launch({ executablePath: BIN });
const c = await b.newContext({ viewport: { width: 1400, height: 880 }, deviceScaleFactor: 1 });
const p = await c.newPage();
const go = async (h, ms = 1100) => { await p.goto((process.env.BASE_URL || 'http://localhost:5173') + '/' + h, { waitUntil: 'networkidle' }); await p.waitForTimeout(ms); };

await go('#/d/network-tcp');
await p.click('[data-collapse-all]');
await p.waitForTimeout(500);
await p.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; scrollTo(0, 0); });
await p.waitForTimeout(300);
await p.screenshot({ path: 'docs/preview-reader.png' });

await go('#/quiz');
await p.screenshot({ path: 'docs/preview-quiz.png' });

await go('#/');
await p.evaluate(() => {
  const raw = JSON.parse(localStorage.getItem('csview.state.v1') || '{}');
  const marks = {};
  const plan = { network: [1, 1, 1, 2, 1, 3], os: [1, 1, 2, 1], mysql: [1, 2, 1, 1, 1], redis: [1, 1, 3], cpp: [1, 1, 2], java: [1, 1], golang: [1, 2, 1], algorithm: [1, 1, 1, 2], design: [1], k8s: [1, 2], rabbitmq: [1] };
  return fetch('/data/manifest.json').then((r) => r.json()).then((m) => {
    for (const [cat, seq] of Object.entries(plan)) {
      const ids = m.docs.filter((d) => d.cat === cat).flatMap((d) => d.questions.map((q) => q.id));
      seq.forEach((v, i) => { for (let k = 0; k < 4 && i * 4 + k < ids.length; k++) marks[ids[i * 4 + k]] = v; });
    }
    const activity = {};
    for (let i = 0; i < 6; i++) { const d = new Date(); d.setDate(d.getDate() - i); activity[`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`] = 8 + i * 3; }
    localStorage.setItem('csview.state.v1', JSON.stringify({ ...raw, marks, activity, stars: {}, notes: {}, recent: [], quiz: [{ at: Date.now() - 3600e3, n: 20, ok: 15, secs: 640 }, { at: Date.now() - 90000e3, n: 15, ok: 9, secs: 520 }], prefs: { ...(raw.prefs || {}) } }));
  });
});
const seeded = await p.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('csview.state.v1') || '{}').marks || {}).length);
console.log('seeded marks in localStorage:', seeded);
await p.reload({ waitUntil: 'networkidle' });
await p.waitForTimeout(700);
await go('#/progress');
console.log('after nav:', await p.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('csview.state.v1') || '{}').marks || {}).length));
await p.screenshot({ path: 'docs/preview-progress.png' });
await b.close();
console.log('previews written');
