const { spawnSync } = require('child_process');
const PW = process.env.APPDATA + '\\npm\\playwright-cli.cmd';
function pw(args) {
  const r = spawnSync(PW, args, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  return (r.stdout || '') + (r.stderr || '');
}
const code = `async page => {
  await page.evaluate("window.WB.navigate('grades')");
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.evaluate("document.querySelector('[data-act=import-scores]').click()")
  ]);
  await chooser.setFiles('D:/00同步文件/00程序/docs-xx/_test_scores.csv');
  await page.waitForTimeout(600);
  return await page.evaluate("(()=>{const m=document.getElementById('modal-mask');const st=document.getElementById('si-total');return 'shown='+(m.className.indexOf('show')>=0)+' totalSel='+(st?st.value:'NO-SI-TOTAL')+' subs='+Array.from(document.querySelectorAll('.si-subj:checked')).map(cb=>cb.dataset.col).join('|')})()");
}`;
const out = pw(['run-code', code]);
console.log('RAW-LEN=' + out.length);
console.log(out.slice(0, 1200));
