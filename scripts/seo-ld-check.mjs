import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = 'public';
let files = 0, blocks = 0, bad = 0;
const types = new Map();

async function walk(d) {
  for (const e of await readdir(d, { withFileTypes: true })) {
    const p = join(d, e.name);
    if (e.isDirectory()) await walk(p);
    else if (e.name.endsWith('.html')) {
      files++;
      const html = await readFile(p, 'utf8');
      for (const m of html.matchAll(/<script type=?"?application\/ld\+json"?[^>]*>([\s\S]*?)<\/script>/g)) {
        blocks++;
        try {
          const o = JSON.parse(m[1]);
          const t = o['@type'] || '?';
          types.set(t, (types.get(t) || 0) + 1);
        } catch (e) {
          bad++;
          if (bad <= 3) console.log('解析失败:', p, m[1].slice(0, 100));
        }
      }
    }
  }
}
await walk(root);
console.log('html 页面:', files, '| JSON-LD 块:', blocks, '| 解析失败:', bad);
console.log('类型分布:', JSON.stringify([...types.entries()]));
