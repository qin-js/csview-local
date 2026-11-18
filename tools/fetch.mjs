import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(import.meta.dirname, '..');
const CONTENT = path.join(ROOT, 'content');
const REPO = process.env.CSVIEW_REPO || 'https://github.com/zijing2333/CSView.git';
const REF = process.env.CSVIEW_REF || 'main';
const TARBALL = REPO.replace(/\.git$/, '').replace('github.com', 'codeload.github.com') + `/tar.gz/refs/heads/${REF}`;

const log = (...a) => console.log(' ', ...a);

function has(cmd) {
  try { execFileSync(cmd, ['--version'], { stdio: 'ignore' }); return true; } catch { return false; }
}

async function viaGit(tmp) {
  log(`git clone --depth 1 ${REPO} (${REF})`);
  execFileSync('git', ['clone', '--depth', '1', '--branch', REF, '--single-branch', REPO, tmp], { stdio: ['ignore', 'ignore', 'pipe'] });
  const sha = execFileSync('git', ['-C', tmp, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  return sha;
}

async function viaTarball(tmp) {
  log(`downloading ${TARBALL}`);
  const res = await fetch(TARBALL, { redirect: 'follow' });
  if (!res.ok) throw new Error(`下载失败 HTTP ${res.status}`);
  const tgz = path.join(os.tmpdir(), `csview-${Date.now()}.tar.gz`);
  await fsp.writeFile(tgz, Buffer.from(await res.arrayBuffer()));
  await fsp.mkdir(tmp, { recursive: true });
  execFileSync('tar', ['-xzf', tgz, '-C', tmp, '--strip-components=1'], { stdio: 'ignore' });
  await fsp.unlink(tgz).catch(() => {});
  return REF;
}

async function copySrc(from) {
  const src = path.join(from, 'src');
  if (!fs.existsSync(src)) throw new Error('上游仓库结构变化：找不到 src 目录');
  await fsp.mkdir(CONTENT, { recursive: true });
  let n = 0;
  const walk = async (dir, rel = '') => {
    for (const ent of await fsp.readdir(dir, { withFileTypes: true })) {
      if (ent.name.startsWith('.')) continue;
      const r = rel ? `${rel}/${ent.name}` : ent.name;
      if (ent.isDirectory()) await walk(path.join(dir, ent.name), r);
      else if (ent.name.endsWith('.md')) {
        const dest = path.join(CONTENT, r);
        await fsp.mkdir(path.dirname(dest), { recursive: true });
        await fsp.copyFile(path.join(dir, ent.name), dest);
        n++;
      }
    }
  };
  await walk(src);
  return n;
}

async function main() {
  console.log('\n拉取 CSView 面经内容（仅存于本地，不随本仓库分发）\n');
  if (fs.existsSync(CONTENT) && fs.readdirSync(CONTENT).length && !process.argv.includes('--force')) {
    log('content/ 已存在，跳过。要重新拉取请加 --force');
    return;
  }
  const tmp = await fsp.mkdtemp(path.join(os.tmpdir(), 'csview-src-'));
  let sha;
  try {
    sha = has('git') ? await viaGit(tmp) : await viaTarball(tmp);
    const n = await copySrc(tmp);
    await fsp.writeFile(path.join(CONTENT, '.source.json'), JSON.stringify({ repo: REPO.replace(/\.git$/, ''), ref: REF, sha, fetchedAt: new Date().toISOString(), files: n }, null, 2));
    log(`已写入 ${n} 篇 markdown → content/`);
    log(`来源快照 ${String(sha).slice(0, 12)}`);
    console.log('\n下一步：npm run build && npm start\n');
  } finally {
    await fsp.rm(tmp, { recursive: true, force: true }).catch(() => {});
  }
}

main().catch((e) => {
  console.error(`\n拉取失败：${e.message}`);
  console.error('可以手动把 https://github.com/zijing2333/CSView 的 src/ 目录（去掉 .vuepress）复制到 content/ 后重试。\n');
  process.exit(1);
});