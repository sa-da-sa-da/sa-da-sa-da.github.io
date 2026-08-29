const fs = require('fs');
const file = process.argv[2];
const h = fs.readFileSync(file, 'utf8');
const scripts = [...h.matchAll(/<script>([\s\S]*?)<\/script>/g)];
let ok = true;
scripts.forEach((m, i) => {
  try {
    new Function(m[1]);
    console.log('script[' + i + '] OK, len=' + m[1].length);
  } catch (e) {
    ok = false;
    console.log('script[' + i + '] ERROR: ' + e.message);
    // 打印出错位置的上下文
    const lines = m[1].split('\n');
    const match = e.message.match(/position (\d+)/);
    if (match) {
      const pos = parseInt(match[1], 10);
      let acc = 0;
      for (let li = 0; li < lines.length; li++) {
        acc += lines[li].length + 1;
        if (acc > pos) {
          console.log('  near line ' + (li + 1) + ': ' + lines[Math.max(0, li - 1)].slice(0, 120));
          console.log('  > ' + lines[li].slice(0, 120));
          console.log('  > ' + lines[Math.min(lines.length - 1, li + 1)].slice(0, 120));
          break;
        }
      }
    }
  }
});
process.exit(ok ? 0 : 1);
