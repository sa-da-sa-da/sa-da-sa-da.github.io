/**
 * 部署前产物清理
 *
 * 背景：EdgeOne Pages 对单个文件有 25MiB 上限，超限会直接 Build error。
 *       站点里的大体积媒体（本地视频等）位于 ../docs/public，构建时被挂载进产物。
 *
 * 用法：node scripts/prepare-deploy.mjs [产物目录，默认 public]
 * 行为：递归扫描产物目录，删除超过上限的文件并列出清单。
 *       只删产物副本，源文件（../docs/public 下）不受影响。
 */
import { readdir, stat, unlink } from 'node:fs/promises';
import { join, relative } from 'node:path';

const LIMIT_MB = Number(process.env.DEPLOY_FILE_LIMIT_MB || 25);
const LIMIT = LIMIT_MB * 1024 * 1024;
const root = process.argv[2] || 'public';

async function walk(dir, out = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) await walk(p, out);
    else out.push(p);
  }
  return out;
}

let files;
try {
  files = await walk(root);
} catch (err) {
  console.error(`[deploy] 找不到产物目录：${root}（请先执行构建）`);
  process.exit(1);
}

const oversize = [];
for (const file of files) {
  const s = await stat(file);
  if (s.size > LIMIT) oversize.push({ file, mb: s.size / 1048576 });
}

if (!oversize.length) {
  console.log(`[deploy] 检查通过：${files.length} 个文件，无超过 ${LIMIT_MB}MiB 的单文件`);
} else {
  console.log(`[deploy] 移除 ${oversize.length} 个超过 ${LIMIT_MB}MiB 的文件（源文件不受影响）：`);
  for (const o of oversize) {
    await unlink(o.file);
    console.log(`  - ${o.mb.toFixed(1)}MiB  ${relative(root, o.file)}`);
  }
  console.log('[deploy] 如需这些资源在线可用：压缩到 25MiB 以下，或上传到对象存储/CDN 后改用外链。');
}
