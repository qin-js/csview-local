import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const DIST = path.join(ROOT, 'dist');
const PUBLIC = path.join(ROOT, 'public');
const DEMO = path.join(ROOT, 'demo');

async function copyDir(from, to, filter = () => true) {
  await fsp.mkdir(to, { recursive: true });
  let n = 0;
  for (const ent of await fsp.readdir(from, { withFileTypes: true })) {
    const src = path.join(from, ent.name);
    const dst = path.join(to, ent.name);
    if (ent.isDirectory()) n += await copyDir(src, dst, filter);
    else if (filter(ent.name)) { await fsp.copyFile(src, dst); n++; }
  }
  return n;
}

async function main() {
  if (!fs.existsSync(path.join(DEMO, 'data', 'manifest.json'))) {
    console.error('缺少 demo/data/manifest.json，请先运行：node tools/build.mjs --demo');
    process.exit(1);
  }
  await fsp.rm(DIST, { recursive: true, force: true });
  await fsp.mkdir(DIST, { recursive: true });

  let n = 0;
  for (const f of await fsp.readdir(PUBLIC)) {
    if (/\.(html|js|css)$/i.test(f)) { await fsp.copyFile(path.join(PUBLIC, f), path.join(DIST, f)); n++; }
  }
  n += await copyDir(path.join(PUBLIC, 'fonts'), path.join(DIST, 'fonts'));
  n += await copyDir(path.join(DEMO, 'data'), path.join(DIST, 'data'));
  if (fs.existsSync(path.join(DEMO, 'img'))) n += await copyDir(path.join(DEMO, 'img'), path.join(DIST, 'img'));
  await fsp.writeFile(path.join(DIST, '.nojekyll'), '');

  const manifest = JSON.parse(await fsp.readFile(path.join(DIST, 'data', 'manifest.json'), 'utf8'));
  if (!manifest.demo) { console.error('dist 里的 manifest 不是示例题库，拒绝发布'); process.exit(1); }

  const bytes = await (async function size(dir) {
    let t = 0;
    for (const ent of await fsp.readdir(dir, { withFileTypes: true })) {
      const p = path.join(dir, ent.name);
      t += ent.isDirectory() ? await size(p) : (await fsp.stat(p)).size;
    }
    return t;
  })(DIST);

  console.log(`dist 就绪：${n} 个文件 · ${(bytes / 1048576).toFixed(2)} MB`);
  console.log(`示例题库：${manifest.stats.questions} 题 / ${manifest.stats.docs} 篇 / ${manifest.stats.categories} 方向`);
}

main().catch((e) => { console.error(e); process.exit(1); });