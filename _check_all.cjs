const fs = require('fs');
const files = [
  'docs/public/class-workbench.js',
  'docs/public/class-workbench-views.js',
  'docs/public/seat-map/seat-map.html'
];
let ok = true;
for (const f of files) {
  const h = fs.readFileSync(f, 'utf8');
  const scripts = [...h.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  if (scripts.length === 0) {
    try { new Function(h); console.log(f + ' OK'); }
    catch (e) { ok = false; console.log(f + ' ERROR: ' + e.message); }
    continue;
  }
  scripts.forEach((m, i) => {
    try {
      new Function(m[1]);
      console.log(f + ' script[' + i + '] OK, len=' + m[1].length);
    } catch (e) {
      ok = false;
      console.log(f + ' script[' + i + '] ERROR: ' + e.message);
      const lines = m[1].split('\n');
      const match = e.message.match(/position (\d+)/);
      if (match) {
        const pos = parseInt(match[1], 10);
        let acc = 0;
        for (let li = 0; li < lines.length; li++) {
          acc += lines[li].length + 1;
          if (acc > pos) {
            console.log('  near line ' + (li + 1) + ':');
            console.log('  > ' + (lines[li - 1] || '').slice(0, 140));
            console.log('  > ' + lines[li].slice(0, 140));
            console.log('  > ' + (lines[li + 1] || '').slice(0, 140));
            break;
          }
        }
      }
    }
  });
}
// config JSON 结构检查
try {
  const cfgText = fs.readFileSync('docs/public/class-workbench-config.js', 'utf8');
  const m = cfgText.match(/window\.WB_CONFIG\s*=\s*({[\s\S]*?});?\s*$/);
  if (m) {
    const cleaned = m[1].replace(/,\s*([\]}])/g, '$1');
    const cfg = JSON.parse(cleaned);
    console.log('config OK, modules=' + cfg.modules.length);
    const ids = new Set();
    cfg.modules.forEach(mod => {
      if (ids.has(mod.id)) { ok = false; console.log('duplicate module id:', mod.id); }
      ids.add(mod.id);
      if (mod.subs) mod.subs.forEach(s => {
        if (ids.has(s.id)) { ok = false; console.log('duplicate sub id:', s.id); }
        ids.add(s.id);
      });
    });
  } else {
    console.log('config: cannot extract');
  }
} catch (e) {
  ok = false;
  console.log('config ERROR: ' + e.message);
}
process.exit(ok ? 0 : 1);
