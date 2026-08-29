const { execSync } = require('child_process');
function ev(expr) {
  try { return execSync('playwright-cli eval --raw "' + expr + '"', { encoding: 'utf8' }).trim().slice(0, 500); }
  catch(e){ return 'ERR:'+String(e.message).slice(0,120); }
}
const q = [
  ["roster-count", "(window.WB.state.tables.roster||[]).length"],
  ["dorm-count", "(window.WB.state.tables.dorm||[]).length"],
  ["dorm-names", "(window.WB.state.tables.dorm||[]).map(function(r){return r.name}).join(',')"],
  ["dorm-unassigned", "(()=>{var rows=window.WB.state.tables.dorm||[];var rooms=(window.WB.state.dormLayout||{}).rooms||[];var un=rows.filter(function(r){return !r.roomNo||!parseInt(r.bedNo,10)||!rooms.some(function(rm){return String(r.roomNo).replace(/\\s+/g,'').toUpperCase()===String(rm.name).replace(/\\s+/g,'').toUpperCase()})});return un.length})()"],
  ["dormLayout-rooms", "((window.WB.state.dormLayout||{}).rooms||[]).map(function(r){return r.name}).join(',')"],
  ["current-view", "window.WB.state.view"],
];
for (const [k,e] of q) console.log(k, '=>', ev(e));
