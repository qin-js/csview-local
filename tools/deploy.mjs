import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const REPO = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).repository.url.replace(/^git\+/, '');
const msg = process.argv[2] || 'deploy: update site';
const git = (...args) => execFileSync('git', args, { cwd: DIST, stdio: 'inherit' });

execFileSync('node', [path.join(ROOT, 'tools', 'dist.mjs')], { cwd: ROOT, stdio: 'inherit' });

if (!fs.existsSync(path.join(DIST, '.git'))) {
  git('init', '-q', '-b', 'gh-pages');
  git('remote', 'add', 'origin', REPO);
}
execFileSync('git', ['fetch', '-q', 'origin', 'gh-pages'], { cwd: DIST, stdio: ['inherit', 'inherit', 'ignore'] });
try { git('reset', '-q', '--soft', 'FETCH_HEAD'); } catch { /* first deploy: no remote branch yet */ }
git('add', '-A');
try { git('-c', 'user.name=csview-deploy', '-c', 'user.email=csview-deploy@users.noreply.github.com', 'commit', '-q', '-m', msg); }
catch { console.log('没有变化，跳过提交'); }
git('push', '-q', 'origin', 'gh-pages');
console.log('\n已推送 gh-pages。首次部署请在仓库 Settings → Pages 选择 gh-pages / root。');