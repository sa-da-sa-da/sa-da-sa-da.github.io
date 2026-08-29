// ==================== 全局状态 ====================
let currentStudents = [];
let currentLayout = { columns: 7, rows: 7 };
let columnConfigs = []; // 每列的配置：{ type: 'merge' | 'separator' }
let lastSeating = null;  // 最近一次生成的座次（rows×cols 二维数组），用于重排/拖拽后恢复
let vipAssignments = []; // VIP 座位分配：长度 = VIP 数，每项为 seat 对象或 null（空 VIP）
let layoutLocked = false; // 布局是否已锁定（确定布局后为 true，修改布局后为 false）

// 工作台嵌入模式：URL 带 ?wb=1 时启用
// - 从 localStorage(wb_seatmap_roster) 同步全班花名册
// - 生成座次后 postMessage 回传给父页面写回 seating 表
const WB_MODE = new URLSearchParams(location.search).has('wb');

// ==================== 初始化 ====================
document.addEventListener('DOMContentLoaded', () => {
    // 工作台嵌入模式：从 localStorage 同步花名册到 currentStudents
    if (WB_MODE) syncRosterFromWorkbench();
    applyLayoutLive(false);
    bindLayoutInputs();
    updateRuleAvailability(); // 初始布局未确认，禁用所有规则复选框
    updateLayoutButtonAvailability(); // 初始未上传名单，禁用「确定布局」
});

// 从工作台 localStorage 读取花名册并填入 currentStudents
// 数据源：parent 页面写入的 wb_seatmap_roster（结构 [{name, studentNo, gender, remark}]）
function syncRosterFromWorkbench() {
    try {
        const raw = localStorage.getItem('wb_seatmap_roster');
        if (!raw) {
            showToast('工作台未提供花名册数据', 'warning');
            return;
        }
        const roster = JSON.parse(raw);
        if (!Array.isArray(roster) || roster.length === 0) {
            showToast('花名册为空，请先到「学生档案库 · 全班花名册」添加学生', 'warning');
            return;
        }
        currentStudents = roster.map((r, i) => ({
            name: r.name || `学生${i + 1}`,
            student_id: r.studentNo || r.name || ('S' + (i + 1)),
            gender: r.gender || '未知',
            height: r.height || null,
            vision: r.vision || null,
            score: r.score != null ? r.score : null
        }));
        updateRuleAvailability();
        updateLayoutButtonAvailability();
        showToast(`已从工作台同步 ${currentStudents.length} 名学生`);
    } catch (e) {
        console.error('同步花名册失败:', e);
        showToast('同步花名册失败：' + (e.message || e), 'error');
    }
}

// 列数/行数输入框实时（所见即所得）刷新座位网格
function bindLayoutInputs() {
    ['colCount', 'rowCount', 'vipCount'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', () => applyLayoutLive(false));
    });
    const vipCheck = document.getElementById('vipCheck');
    if (vipCheck) vipCheck.addEventListener('change', onVipToggle);
    bindRuleOptions();
}

// 绑定排座规则的交互：性别配对勾选后展开子选项；男女搭配下显示"女左/男左"
function bindRuleOptions() {
    const g = document.getElementById('ruleGender');
    const opts = document.getElementById('genderOptions');
    const posOpts = document.getElementById('genderPositionOptions');
    if (g && opts) {
        g.addEventListener('change', () => {
            opts.style.display = g.checked ? 'block' : 'none';
            updateGenderPositionVisibility();
        });
    }
    document.querySelectorAll('input[name="genderMode"]').forEach(r => {
        r.addEventListener('change', updateGenderPositionVisibility);
    });
}

function updateGenderPositionVisibility() {
    const g = document.getElementById('ruleGender');
    const mode = document.querySelector('input[name="genderMode"]:checked');
    const posOpts = document.getElementById('genderPositionOptions');
    if (posOpts) {
        posOpts.style.display = (g && g.checked && mode && mode.value === 'mixed') ? 'block' : 'none';
    }
}

// 依据已上传名单的数据，自动启用/禁用各规则（无对应数据则禁用并取消勾选）
// 布局未确认（layoutLocked=false）时，所有规则复选框一律禁用，不可勾选
function updateRuleAvailability() {
    const hasGender = currentStudents.some(s => s.gender && s.gender !== '未知');
    const hasVision = currentStudents.some(s => s.vision);
    const hasScore = currentStudents.some(s => s.score != null);
    const rulesLocked = !layoutLocked; // 布局未确认时规则不可用
    const toggle = (id, ok) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.disabled = rulesLocked || !ok;
        if (!ok) el.checked = false;
    };
    toggle('ruleGender', hasGender);
    toggle('ruleVision', hasVision);
    toggle('ruleScore', hasScore);
    // 身高规则始终可用（无数据则退化为随机），但布局未确认时一并禁用
    const h = document.getElementById('ruleHeight');
    if (h) h.disabled = rulesLocked;
    // 性别子选项（男女搭配/同性搭配/女左/男左）随规则锁定状态禁用/启用
    document.querySelectorAll('input[name="genderMode"], input[name="genderPosition"]').forEach(r => {
        r.disabled = rulesLocked;
    });
    updateGenderPositionVisibility();
}

// VIP 勾选切换：勾选时启用输入框并默认 1，取消时禁用
function onVipToggle() {
    const chk = document.getElementById('vipCheck');
    const inp = document.getElementById('vipCount');
    if (chk.checked) {
        inp.disabled = false;
        const n = parseInt(inp.value, 10);
        if (isNaN(n) || n < 1) inp.value = '1';
    } else {
        inp.disabled = true;
    }
    applyLayoutLive(false);
}

// 读取 VIP 座位数（0~4），未勾选返回 0
function getVipCount() {
    const chk = document.getElementById('vipCheck');
    if (!chk || !chk.checked) return 0;
    const inp = document.getElementById('vipCount');
    let n = parseInt(inp.value, 10);
    if (isNaN(n)) n = 1;
    return Math.min(4, Math.max(0, n));
}

// 取当前已手动拖入 VIP 座位的学生 id 列表（用于重新生成时将其排除在自动排座之外）
function getVipStudentIds() {
    return vipAssignments
        .filter(s => s && !s.isEmpty && s.student_id != null)
        .map(s => s.student_id);
}

// 根据分隔配置计算列分组宽度：columnConfigs[c].type==='separator' 表示第 c 列左侧（c-1 与 c 之间）为过道，
// 过道会把整行切成若干组。返回如 [3,2,2]，无分隔时返回 [columns]。
function getColumnGroupWidths() {
    const cols = currentLayout.columns;
    const widths = [];
    let cur = 1; // 第 0 列始终属于第一组
    for (let c = 1; c < cols; c++) {
        const sep = columnConfigs[c] && columnConfigs[c].type === 'separator';
        if (sep) {
            widths.push(cur);
            cur = 1; // 新组从第 c 列开始
        } else {
            cur++;
        }
    }
    widths.push(cur);
    return widths;
}

// 生成一张 VIP 座位卡片
function makeVipSeat() {
    const cell = document.createElement('div');
    cell.className = 'seat-cell vip-seat';
    cell.title = 'VIP 座位：不参与智能排座，仅可手动拖入学生';
    cell.innerHTML = '<span class="seat-name">VIP</span>';
    return cell;
}

// 重置所有设置到初始状态：重新上传名单 / 清空名单时调用
function resetAllSettings() {
    // 1. 行列数回到默认（输入框 + 内存状态）
    const colEl = document.getElementById('colCount');
    const rowEl = document.getElementById('rowCount');
    if (colEl) colEl.value = 7;
    if (rowEl) rowEl.value = 7;
    currentLayout.columns = 7;
    currentLayout.rows = 7;

    // 2. VIP 配置回到初始（不勾选，数量=1，禁用）
    const vipChk = document.getElementById('vipCheck');
    const vipNum = document.getElementById('vipCount');
    if (vipChk) vipChk.checked = false;
    if (vipNum) { vipNum.value = 1; vipNum.disabled = true; }

    // 3. 分隔/合并回到全部合并
    columnConfigs = [];
    for (let i = 0; i < currentLayout.columns; i++) columnConfigs.push({ type: 'merge' });

    // 4. 解除布局锁定（按钮回到「确定布局」，控件恢复可编辑）
    layoutLocked = false;
    updateLayoutButton();
    setLayoutControlsDisabled(false);

    // 5. 清空已生成座次与 VIP 分配
    lastSeating = null;
    vipAssignments = [];

    // 6. 规则复选框全部取消，性别子选项回到默认（男女搭配 / 女左）
    ['ruleHeight', 'ruleVision', 'ruleGender', 'ruleScore'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.checked = false;
    });
    const gm = document.querySelector('input[name="genderMode"][value="mixed"]');
    if (gm) gm.checked = true;
    const gp = document.querySelector('input[name="genderPosition"][value="female-left"]');
    if (gp) gp.checked = true;

    // 7. 重新渲染座位区并刷新各提示/可用性
    renderSeatingArea();
    updateRuleAvailability();       // 依据「未确定布局」禁用规则复选框
    updateLayoutButtonAvailability(); // 容量/可用性提示复位
    // 重置后座次失效 → 禁用导出按钮，直到再次生成
    const eb = document.getElementById('exportBtn');
    if (eb) eb.disabled = true;
}

// ==================== 文件操作 ====================
function triggerUpload() {
    document.getElementById('fileInput').click();
}

// 解析名单行数据（识别常见表头：姓名/学号/性别/身高/视力/成绩），返回学生数组
function parseRoster(rows) {
    if (!rows || rows.length === 0) return { students: [], count: 0 };
    const header = (rows[0] || []).map(h => String(h == null ? '' : h).trim());
    const idx = {
        name: header.findIndex(h => /姓名|名字|学生/.test(h)),
        id: header.findIndex(h => /学号|编号|考号|序号/.test(h)),
        gender: header.findIndex(h => /性别/.test(h)),
        height: header.findIndex(h => /身高/.test(h)),
        vision: header.findIndex(h => /视力/.test(h)),
        score: header.findIndex(h => /成绩|分数|总分|得分/.test(h))
    };
    const students = [];
    for (let i = 1; i < rows.length; i++) {
        const r = rows[i] || [];
        if (r.every(c => !String(c == null ? '' : c).trim())) continue;
        const name = idx.name >= 0 ? String(r[idx.name] || '').trim() : String(r[0] || '').trim();
        if (!name) continue;
        const num = (v) => {
            const m = String(v == null ? '' : v).replace(/,/g, '').match(/[-+]?\d+(\.\d+)?/);
            return m ? parseFloat(m[0]) : null;
        };
        students.push({
            name,
            student_id: idx.id >= 0 ? String(r[idx.id] || '').trim() || name : 'S' + (i),
            gender: idx.gender >= 0 ? String(r[idx.gender] || '').trim() : '未知',
            height: idx.height >= 0 ? num(r[idx.height]) : null,
            vision: idx.vision >= 0 ? String(r[idx.vision] || '').trim() : null,
            score: idx.score >= 0 ? num(r[idx.score]) : null
        });
    }
    return { students, count: students.length };
}

async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
        let rows = [];
        if (typeof XLSX !== 'undefined') {
            const data = await file.arrayBuffer();
            const wb = XLSX.read(data, { type: 'array' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });
        } else {
            // CDN 不可用时降级为 CSV 解析
            const text = await file.text();
            rows = String(text).split(/\r?\n/).filter(l => l.trim()).map(l =>
                l.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(c => c.replace(/^"|"$/g, ''))
            );
        }
        const { students, count } = parseRoster(rows);
        if (count === 0) {
            showToast('未识别到学生数据，请检查表头格式', 'error');
            return;
        }
        currentStudents = students;
        showStudentModal(students);
        resetAllSettings();   // 重新上传 → 所有设置复位到初始状态（行列/VIP/分隔合并/规则/座次）
        showToast(`成功导入 ${count} 名学生`);
    } catch (error) {
        console.error('上传失败:', error);
        showToast('上传失败: ' + error.message, 'error');
    }

    // 清空 input 以便重复选择同一文件
    event.target.value = '';
}

// 通用 Blob 下载
function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// 下载名单模板：优先生成 .xlsx（SheetJS），不可用时降级为 CSV
function downloadTemplate() {
    const rows = [
        ['姓名', '学号', '性别', '身高(cm)', '视力', '成绩'],
        ['张三', '001', '男', '165', '5.0', '92'],
        ['李四', '002', '女', '158', '4.8', '78'],
        ['王五', '003', '男', '172', '正常', '85']
    ];
    try {
        if (typeof XLSX !== 'undefined') {
            const ws = XLSX.utils.aoa_to_sheet(rows);
            ws['!cols'] = [{ wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 12 }, { wch: 10 }, { wch: 8 }];
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, '座位模板');
            XLSX.writeFile(wb, '座位编排-名单模板.xlsx');
        } else {
            const csv = '\ufeff' + rows.map(r => r.join(',')).join('\n');
            downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), '座位编排-名单模板.csv');
        }
        showToast('模板已下载，按表头填写名单后上传即可', 'success');
    } catch (e) {
        console.error('模板下载失败:', e);
        showToast('模板下载失败: ' + e.message, 'error');
    }
}

// ==================== 布局设置 ====================
function clampNum(v, min, max, fallback) {
    let n = parseInt(v, 10);
    if (isNaN(n)) n = fallback;
    return Math.min(max, Math.max(min, n));
}

// 应用布局：所见即所得（输入框变化时实时调用），showToastMsg=true 时弹提示（对应「确定布局」）
function applyLayoutLive(showToastMsg) {
    const cols = clampNum(document.getElementById('colCount').value, 1, 12, 7);
    const rows = clampNum(document.getElementById('rowCount').value, 1, 15, 7);

    const colChanged = cols !== currentLayout.columns;
    currentLayout.columns = cols;
    currentLayout.rows = rows;

    if (colChanged) {
        // 列数变化：重置为全部「合并」
        columnConfigs = [];
        for (let i = 0; i < cols; i++) columnConfigs.push({ type: 'merge' });
    } else if (columnConfigs.length !== cols) {
        // 首次加载或长度不匹配：补齐为全部「合并」，否则 columnConfigs[c] 为 undefined 导致按钮点击无效
        columnConfigs = [];
        for (let i = 0; i < cols; i++) columnConfigs.push({ type: 'merge' });
    }
    renderSeatingArea();
    lastSeating = null; // 行列变化，旧的座次不再适用
    updateLayoutButtonAvailability(); // 行列变化实时更新「确定布局」可用性/容量提示

    if (showToastMsg) showToast(`布局已更新：${cols}列 × ${rows}行`);
}

// 「确定布局 / 修改布局」按钮：切换布局锁定状态
function onLayoutButtonClick() {
    // 仅在「确定布局」(即将锁定)时校验：行×列座位需 ≥ 学生数，且需已上传名单；
    // 「修改布局」(解锁)不受此限，始终允许点击以便重新调整布局
    if (!layoutLocked) {
        if (currentStudents.length === 0) {
            showToast('请先上传学生名单，再确定布局', 'warning');
            return;
        }
        const capacity = currentLayout.rows * currentLayout.columns;
        // 已手动放入 VIP 座位的学生不再占用普通座位，故所需普通座位数 = 总数 - VIP 已占数
        const vipAssigned = vipAssignments.filter(s => s && !s.isEmpty).length;
        const needRegular = currentStudents.length - vipAssigned;
        if (capacity < needRegular) {
            showToast(`座位数量不足：需要 ${needRegular} 个普通座位（已扣除 VIP 占用的 ${vipAssigned} 个），当前仅 ${capacity} 个（行×列），请先增加行列数`, 'warning');
            return;
        }
    }
    layoutLocked = !layoutLocked;
    setLayoutControlsDisabled(layoutLocked);
    updateLayoutButton();
    if (layoutLocked) {
        applyLayoutLive(true); // 重新渲染并提示
        showToast('布局已锁定，点击「修改布局」可重新编辑', 'success');
    } else {
        renderSeatingArea();   // 重新渲染以解除分隔/合并按钮的禁用
        showToast('布局已解锁，可重新调整', 'success');
    }
    updateRuleAvailability(); // 依据最新锁定状态启用/禁用规则复选框
    updateLayoutButtonAvailability(); // 解锁后若未上传名单则重新禁用「确定布局」
}

// 锁定/解锁：禁用或启用左侧列数/行数/VIP 输入及右侧分隔/合并按钮
function setLayoutControlsDisabled(disabled) {
    ['colCount', 'rowCount', 'vipCheck', 'vipCount'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.disabled = disabled;
    });
    // 分隔/合并按钮（右侧网格内动态生成）也一并禁用/启用
    document.querySelectorAll('.col-config-btn').forEach(btn => {
        btn.disabled = disabled;
        btn.classList.toggle('locked', disabled);
    });
}

// 更新布局按钮文字与样式
function updateLayoutButton() {
    const btn = document.getElementById('layoutBtn');
    if (!btn) return;
    if (layoutLocked) {
        btn.textContent = '✎ 修改布局';
        btn.classList.add('btn-outline');
        btn.classList.remove('btn-purple');
    } else {
        btn.textContent = '✓ 确定布局';
        btn.classList.add('btn-purple');
        btn.classList.remove('btn-outline');
    }
}

// 「确定布局」按钮可用性：未上传学生名单前禁用（提示先上传）；
// 锁定后按钮转为「修改布局」，始终保持可点以便解锁（即使名单被清空）
// 行×列座位数量 < 学生数时给出琥珀色提示（按钮仍可用，点击确定布局时弹提示并禁止锁定）
function updateLayoutButtonAvailability() {
    const btn = document.getElementById('layoutBtn');
    const hint = document.getElementById('layoutHint');
    if (!btn) return;
    const noStudents = currentStudents.length === 0;
    const capacity = currentLayout.rows * currentLayout.columns;
    // 已手动放入 VIP 的学生不占用普通座位
    const vipAssigned = vipAssignments.filter(s => s && !s.isEmpty).length;
    const needRegular = currentStudents.length - vipAssigned;
    const insufficient = !noStudents && capacity < needRegular;
    btn.disabled = !layoutLocked && noStudents; // 容量不足不禁用，靠点击提示
    if (hint) {
        if (noStudents) {
            hint.textContent = '请先上传学生名单，再确定布局';
            hint.style.color = '#f59e0b';
        } else if (insufficient) {
            hint.textContent = `座位不足：需 ${needRegular} 个座位，当前仅 ${capacity} 个，请增加行列数。`;
            hint.style.color = '#f59e0b';
        } else {
            hint.textContent = `已上传 ${currentStudents.length} 名学生，座位 ${capacity} 个，可确定布局。`;
            hint.style.color = '';
        }
    }
}

// 「确定布局」按钮：显式确认并提示（保留别名，供历史调用）
function confirmLayout() {
    onLayoutButtonClick();
}

// ==================== 列配置（数据层） ====================
// 分离/合并逻辑：
//  - 合并（默认）：该列与左侧连续排列，列间仅留细分隔（MERGED_W）。
//  - 分离：该列作为新一组的起始，在其左侧插入更宽的过道（SEP_W）并高亮「合并」按钮，
//          把座位区块切成若干组（不使用虚线）。
// 分隔/合并切换按钮直接放在两列座位之间的过道里（见 renderSeatingArea）。

// ==================== 座位网格 ====================
const SEAT_W = 135;   // 座位固定宽
const SEAT_H = 85;    // 座位固定高
const PODIUM_H = SEAT_H;  // 讲台行高 = 座位卡片高度（85px），保证与座位卡片高度一致
const MERGED_GAP = 5; // 合并态：座位卡片左右间距（5px，无过道）
const SEP_GAP = 30;   // 分隔态：列间整列过道总宽 = 卡片左5px + 过道20px + 卡片右5px = 30px
const BTN_H = 30;     // 按钮行高度

// 渲染座位网格 + 讲台 + 底部列间分隔/合并按钮（显式 grid 定位，按钮位于底部两列之间）
function renderSeatingArea() {
    const grid = document.getElementById('seatingGrid');
    grid.innerHTML = '';

    const { columns, rows } = currentLayout;
    const showColBtns = !layoutLocked; // 锁定后隐藏底部列间分隔/合并按钮（仅保留其生效的间距/过道）

    // 网格列：每列座位后跟一个分隔轨道（首列无前导分隔）
    const tracks = [];
    const seatGridCols = [];     // 每列座位对应的网格列号
    const dividerGridCols = {};  // 每列(>0)左侧分隔轨道的网格列号
    let gc = 1;
    for (let c = 0; c < columns; c++) {
        if (c > 0) {
            const sep = columnConfigs[c] && columnConfigs[c].type === 'separator';
            dividerGridCols[c] = gc;
            tracks.push(`${sep ? SEP_GAP : MERGED_GAP}px`);
            gc++;
        }
        seatGridCols[c] = gc;
        tracks.push(`${SEAT_W}px`);
        gc++;
    }
    grid.style.gridTemplateColumns = tracks.join(' ');
    // 行：讲台 + 座位行；锁定后隐藏分隔/合并按钮，故不再保留底部按钮行（避免空条带）
    grid.style.gridTemplateRows = showColBtns
        ? `${PODIUM_H}px repeat(${rows}, ${SEAT_H}px) ${BTN_H}px`
        : `${PODIUM_H}px repeat(${rows}, ${SEAT_H}px)`;

    const totalGc = gc - 1;

    // 计算每列轨道的累计像素位置，用于讲台「几何居中」（无论列数奇偶、是否有分隔都居中）
    const trackWs = tracks.map(t => parseInt(t, 10));
    const cum = [0];
    for (let i = 0; i < trackWs.length; i++) cum.push(cum[i] + trackWs[i]);
    const totalWidth = cum[cum.length - 1];

    // 讲台宽度规则（精确居中且对齐中央座位）：
    //  - 奇数列（≥3）：覆盖中央 3 个座位 + 其间 2 个间距 → 宽 = 3*SEAT_W + 2*gap
    //  - 偶数列（≥2）：覆盖中央 2 个座位 + 其间 1 个间距 → 宽 = 2*SEAT_W + 1*gap
    //  - 单列：覆盖唯一 1 个座位
    let k;
    if (columns >= 3 && columns % 2 === 1) k = 3;
    else if (columns >= 2) k = 2;
    else k = 1;
    let bestS = 0, bestDiff = Infinity;
    for (let s = 0; s + k - 1 < columns; s++) {
        const podCenter = (cum[2 * s] + cum[2 * s + 2 * k - 1]) / 2;
        const diff = Math.abs(podCenter - totalWidth / 2);
        if (diff < bestDiff) { bestDiff = diff; bestS = s; }
    }
    // 讲台精确覆盖「最接近整组中心的中央座位组」（含组内实际卡片间距：合并5/分隔20），
    // 因中央组本身关于整组对称，故讲台始终精确居中且贴合座位。
    const groupLeft = cum[2 * bestS];
    const groupRight = cum[2 * bestS + 2 * k - 1];
    const podWidth = groupRight - groupLeft;
    const podiumLeft = groupLeft;
    const padL = parseFloat(getComputedStyle(grid).paddingLeft) || 0;
    const padT = parseFloat(getComputedStyle(grid).paddingTop) || 0;
    const podium = document.createElement('div');
    podium.className = 'podium';
    podium.textContent = '讲台';
    podium.style.position = 'absolute';
    podium.style.top = padT + 'px';
    podium.style.left = (podiumLeft + padL) + 'px';
    podium.style.width = podWidth + 'px';
    podium.style.height = PODIUM_H + 'px';
    grid.appendChild(podium);

    // 所有座位所在的网格列（奇数索引），用于将 VIP 卡片对齐到讲台左右两侧的学生座位列
    const seatCols = [];
    for (let c = 1; c <= totalGc; c += 2) seatCols.push(c);
    const podiumLeftSeatCol = 2 * bestS + 1;
    const podiumRightSeatCol = 2 * (bestS + k - 1) + 1;
    const L = seatCols.indexOf(podiumLeftSeatCol);
    const R = seatCols.indexOf(podiumRightSeatCol);

    // VIP 座位：勾选后在讲台左右两侧增加（最多 4 个，左右均衡分布：1→左1，2→左右各1，3→左2右1，4→左右各2）
    const vip = getVipCount();
    const vipLeft = Math.ceil(vip / 2);
    const vipRight = Math.floor(vip / 2);
    // 重置/裁剪 VIP 分配数组（布局变化后需重新分配；VIP 默认空，可拖入学生）
    while (vipAssignments.length < vip) vipAssignments.push(null);
    vipAssignments.length = vip;
    let vipIdx = 0;
    for (let i = 0; i < vipLeft; i++) {
        const idx = L - 1 - i;
        if (idx < 0) break;
        const cell = makeVipSeat();
        cell.style.gridColumn = seatCols[idx];
        cell.style.gridRow = '1';
        cell.dataset.key = 'V-' + vipIdx;
        cell.dataset.vip = vipIdx;
        attachSeatDrag(cell, 'V-' + vipIdx);
        grid.appendChild(cell);
        vipIdx++;
    }
    for (let i = 0; i < vipRight; i++) {
        const idx = R + 1 + i;
        if (idx >= seatCols.length) break;
        const cell = makeVipSeat();
        cell.style.gridColumn = seatCols[idx];
        cell.style.gridRow = '1';
        cell.dataset.key = 'V-' + vipIdx;
        cell.dataset.vip = vipIdx;
        attachSeatDrag(cell, 'V-' + vipIdx);
        grid.appendChild(cell);
        vipIdx++;
    }

    // 座位卡片（显式定位到对应网格行列，下移一行让出讲台）
    for (let c = 0; c < columns; c++) {
        for (let r = 0; r < rows; r++) {
            const cell = document.createElement('div');
            cell.className = 'seat-cell';
            cell.dataset.row = r + 1;
            cell.dataset.col = c + 1;
            cell.dataset.key = 'R-' + r + '-' + c; // 拖拽定位键（0 基）
            cell.style.gridColumn = seatGridCols[c];
            cell.style.gridRow = r + 2;
            cell.innerHTML = '<span class="seat-name">座位</span>';
            attachSeatDrag(cell, 'R-' + r + '-' + c);
            grid.appendChild(cell);
        }
    }

    // 分隔态：在对应列间轨道渲染可见走道（绿色高亮 + 「过道」文字，贯穿座位行）
    for (let c = 1; c < columns; c++) {
        const sep = columnConfigs[c] && columnConfigs[c].type === 'separator';
        if (!sep) continue;
        const lane = document.createElement('div');
        lane.className = 'col-divider-lane';
        lane.style.gridColumn = dividerGridCols[c];
        lane.style.gridRow = `2 / span ${rows}`;
        lane.textContent = '过道';
        grid.appendChild(lane);
    }

    // 底部列间分隔/合并按钮（水平按钮，位于最底行，在两列座位之间，溢出居中）
    // 布局锁定后（showColBtns=false）不渲染这些按钮，实现「隐藏」效果；已生效的间距/过道仍保留
    if (showColBtns) {
        for (let c = 1; c < columns; c++) {
            const sep = columnConfigs[c] && columnConfigs[c].type === 'separator';
            const btnWrap = document.createElement('div');
            btnWrap.className = 'col-btn-wrap' + (sep ? ' separated' : '');
            btnWrap.style.gridColumn = dividerGridCols[c];
            btnWrap.style.gridRow = rows + 2;

            const btn = document.createElement('button');
            // 按钮文字 = 点击后将执行的动作（符合用户定义语义）：
            //  当前为「分隔」(sep) → 按钮显示「合并」，点击后间距变 5px
            //  当前为「合并」(!sep) → 按钮显示「分隔」，点击后间距变 20px
            //  颜色区分当前状态：合并态=紫色，分隔态=绿色
            btn.className = 'col-config-btn ' + (sep ? 'state-separator' : 'state-merge');
            btn.textContent = sep ? '合并' : '分隔';
            btn.title = sep ? '点击合并（间距 5px）' : '点击分隔（间距 20px）';
            btn.onclick = () => toggleColumnConfig(c);

            btnWrap.appendChild(btn);
            grid.appendChild(btnWrap);
        }
    }
}

function toggleColumnConfig(index) {
    if (layoutLocked) return; // 布局锁定后禁止分隔/合并
    if (!columnConfigs[index]) return;
    const config = columnConfigs[index];
    config.type = config.type === 'separator' ? 'merge' : 'separator';

    // 切换后实时重排座位网格（并恢复已生成的座次）
    renderSeatingArea();
    if (lastSeating) renderSeatingChart(lastSeating);
}

// ==================== 前端智能排座算法 ====================
// 视力转数字（正常→5.0，无数据→Infinity 排最后）
function visionToNum(v) {
    if (v == null || String(v).trim() === '') return Infinity;
    const s = String(v).trim();
    if (s === '正常' || s === '正常视力' || s === '好') return 5.0;
    const m = s.match(/(\d+(?:\.\d+)?)/);
    return m ? parseFloat(m[1]) : Infinity;
}

// 纯前端排座：返回 rows×columns 二维数组（seat 对象，空位 isEmpty:true）
// 规则：
//  - 身高排序（矮→前）；视力排序（差→前）；两者叠加时身高为主、视力为次
//  - 性别配对 mixed：每行内同性别相邻成块（女左/男左），避免 男女男/女男女 交替
//  - 性别配对 same：每行统一一种性别，行间交替
//  - 成绩互勉：行内按成绩两端交替排列，让相邻座位成绩互补
function computeSeating(students, layout, rules) {
    const columns = layout.columns;
    const rows = layout.rows;
    const capacity = columns * rows;

    // 1. 基础排序（稳定排序，保持名单原有相对顺序）
    const arr = students.map((s, i) => ({ s, i }));
    const sortKeys = [];
    if (rules.sort_by_height) sortKeys.push(x => (x.s.height != null ? x.s.height : Infinity));
    if (rules.sort_by_vision) sortKeys.push(x => visionToNum(x.s.vision));
    if (sortKeys.length) {
        arr.sort((a, b) => {
            for (const key of sortKeys) {
                const av = key(a), bv = key(b);
                if (av !== bv) return av - bv;
            }
            return a.i - b.i;
        });
    }
    const ordered = arr.map(x => x.s);
    const girls = ordered.filter(s => s.gender === '女');
    const boys = ordered.filter(s => s.gender === '男');
    const others = ordered.filter(s => s.gender !== '女' && s.gender !== '男');

    // 2. 生成填充队列（行优先：第一排为前排）
    let queue = [];
    if (rules.gender_pairing && rules.gender_mode === 'mixed') {
        // 每行内性别成块：主性别在前（女左→女生优先），其次另一性别，最后未知
        const lead = rules.gender_position === 'male-left'
            ? [boys, girls, others]
            : [girls, boys, others];
        const groups = lead.map(g => g.slice());
        for (let r = 0; r < rows; r++) {
            let need = columns;
            while (need > 0) {
                let filled = false;
                for (const g of groups) {
                    if (g.length) {
                        queue.push(g.shift());
                        need--;
                        filled = true;
                        break;
                    }
                }
                if (!filled) break;
            }
        }
    } else if (rules.gender_pairing && rules.gender_mode === 'same') {
        // 每行统一性别，行间交替（从人数较多的性别开始）
        const g1 = girls.slice(), g2 = boys.slice(), g3 = others.slice();
        const pools = { girls: g1, boys: g2 };
        let rowGender = g1.length >= g2.length ? 'girls' : 'boys';
        for (let r = 0; r < rows; r++) {
            // 当前性别不足该行所需，则切换用另一性别（仅从未使用的学生中取，避免重复）
            if (pools[rowGender].length < columns && pools[rowGender === 'girls' ? 'boys' : 'girls'].length) {
                rowGender = rowGender === 'girls' ? 'boys' : 'girls';
            }
            const pool = pools[rowGender];
            for (let c = 0; c < columns; c++) {
                let s = pool.shift();
                if (!s) s = g3.shift() || null; // 补充「未知性别」学生
                if (s) queue.push(s);
            }
            rowGender = rowGender === 'girls' ? 'boys' : 'girls';
        }
    } else {
        queue = ordered.slice();
    }

    // 3. 按行填充矩阵（行优先）
    const seating = [];
    for (let r = 0; r < rows; r++) {
        const row = [];
        for (let c = 0; c < columns; c++) {
            const s = queue.shift();
            if (s) {
                row.push({ row: r + 1, col: c + 1, student_id: s.student_id, name: s.name, gender: s.gender || '', height: s.height, vision: s.vision, score: s.score, isEmpty: false });
            } else {
                row.push({ row: r + 1, col: c + 1, student_id: null, name: '', gender: '', isEmpty: true });
            }
        }
        seating.push(row);
    }

    // 4. 成绩互勉（好差生互坐）：行内按成绩两端交替，使相邻座位成绩互补
    if (rules.score_pairing) {
        for (let r = 0; r < rows; r++) {
            const row = seating[r];
            const filled = row.filter(x => !x.isEmpty);
            if (filled.length < 2) continue;
            const rest = row.filter(x => x.isEmpty);
            filled.sort((a, b) => (a.score != null ? a.score : -1) - (b.score != null ? b.score : -1));
            const reordered = [];
            let lo = 0, hi = filled.length - 1;
            while (lo <= hi) {
                if (lo === hi) { reordered.push(filled[lo]); break; }
                reordered.push(filled[lo]); reordered.push(filled[hi]);
                lo++; hi--;
            }
            // 保持空位位置，只替换有学生的座位
            let k = 0;
            for (let c = 0; c < row.length; c++) {
                if (!row[c].isEmpty) row[c] = reordered[k++];
            }
        }
    }
    return seating;
}

// ==================== 生成座次表 ====================
async function generateSeating() {
    if (!layoutLocked) {
        showToast('请先点击「确定布局」锁定布局，再生成座次表', 'warning');
        return;
    }
    if (currentStudents.length === 0) {
        showToast('请先上传学生名单！', 'warning');
        return;
    }

    const btn = document.querySelector('.btn-generate');
    btn.disabled = true;
    btn.innerHTML = '⏳ 正在生成...';

    try {
        const layoutData = {
            columns: currentLayout.columns,
            rows: currentLayout.rows,
            column_groups: getColumnGroupWidths()
        };

        const rulesData = {
            sort_by_height: document.getElementById('ruleHeight').checked,
            sort_by_vision: document.getElementById('ruleVision').checked,
            gender_pairing: document.getElementById('ruleGender').checked,
            score_pairing: document.getElementById('ruleScore').checked,
            gender_mode: (document.querySelector('input[name="genderMode"]:checked') || {}).value || 'mixed',
            gender_position: (document.querySelector('input[name="genderPosition"]:checked') || {}).value || 'female-left'
        };

        // 勾选了规则但名单缺少对应数据时，规则会被静默忽略；提前提示，避免误以为「规则没参与」
        const noData = [];
        if (rulesData.sort_by_height && !currentStudents.some(s => s.height != null)) noData.push('身高排序');
        if (rulesData.sort_by_vision && !currentStudents.some(s => s.vision)) noData.push('视力排序');
        if (rulesData.score_pairing && !currentStudents.some(s => s.score != null)) noData.push('成绩互勉');
        if (noData.length) {
            showToast(`以下规则名单缺少对应数据、未生效：${noData.join('、')}`, 'warning');
        }

        // 已手动拖入 VIP 座位的学生不参与本次智能排座（保留在 VIP，不进普通座位矩阵）
        const vipIds = getVipStudentIds();
        const pool = currentStudents.filter(s => !vipIds.includes(s.student_id));

        // 纯前端排座（替代后端 /api/generate-seating）
        lastSeating = computeSeating(pool, layoutData, rulesData);

        // 安全网：强制把「已手动拖入 VIP 的学生」从普通座位矩阵中清除，
        // 确保同一学生不会同时出现在普通座位与 VIP 中（避免重复落座）。
        // 关键：清掉后必须把队尾的普通学生补进这些空洞，否则原座位会变成前排空洞。
        const vipSet = new Set(vipIds);
        if (vipSet.size) {
            // 收集普通座位中的学生（非 VIP、非空），按矩阵顺序（行优先）
            const regular = []; // { seat, r, c }
            const holes = [];   // { r, c } 需被清空的 VIP 学生占位
            for (let r = 0; r < lastSeating.length; r++) {
                for (let c = 0; c < lastSeating[r].length; c++) {
                    const seat = lastSeating[r][c];
                    if (!seat || seat.isEmpty || seat.student_id == null) continue;
                    if (vipSet.has(seat.student_id)) holes.push({ r, c });
                    else regular.push({ seat, r, c });
                }
            }
            // 逐个空洞：用队尾的普通学生补位（把空洞平移到末尾，避免前排/中间空洞）
            for (const h of holes) {
                const src = regular.pop();
                if (src) {
                    lastSeating[h.r][h.c] = src.seat;
                    lastSeating[src.r][src.c] = {
                        row: src.r + 1, col: src.c + 1,
                        student_id: null, name: '', gender: '', isEmpty: true
                    };
                } else {
                    lastSeating[h.r][h.c] = {
                        row: h.r + 1, col: h.c + 1,
                        student_id: null, name: '', gender: '', isEmpty: true
                    };
                }
            }
        }
        // vipAssignments 在此处保持原样（不清空），VIP 座位继续显示手动拖入的学生。
        renderSeatingChart(lastSeating);
        const vip = getVipCount();
        const vipNote = vip > 0 ? `（VIP 座位 ${vip} 个不参与自动排座，可手动拖入）` : '';
        const grp = getColumnGroupWidths();
        let grpNote = '';
        if (grp.length > 1 && rulesData.gender_pairing) {
            grpNote = rulesData.gender_mode === 'same'
                ? `，同性搭配：每行统一一种性别（行间交替，不要求整组同性别）`
                : `，异性搭配：同性别相邻成块，避免 男女男/女男女 交替`;
        }
        showToast(`座次表生成完成！共安排 ${pool.length} 名学生${vipNote}${grpNote}`, 'success');
    } catch (error) {
        console.error('生成失败:', error);
        showToast('生成失败: ' + error.message, 'error');
    }

    btn.disabled = false;
    btn.innerHTML = '智能生成座次表 →';
}

// ==================== 导出座次表为 PDF（前端 html2canvas + jsPDF，直接下载文件） ====================
// 实现：把当前屏幕上的座位网格（含讲台/VIP/性别配色）用 html2canvas 截图，
// 再用 jsPDF 写入 A4 竖向 PDF 并触发浏览器下载，无需后端。
async function exportSeatingPDF() {
    if (!lastSeating) {
        showToast('请先生成座次表，再导出 PDF', 'warning');
        return;
    }
    const { columns, rows } = currentLayout;
    if (!columns || !rows) {
        showToast('导出失败：缺少布局信息', 'error');
        return;
    }
    if (typeof html2canvas === 'undefined' || typeof window.jspdf === 'undefined') {
        showToast('PDF 组件未加载，请检查网络后刷新重试', 'error');
        return;
    }

    // 先在新标签页打开推广链接，再触发 PDF 导出（必须在 await 之前、处于用户点击手势内，否则被浏览器拦截）
    window.open('https://mp.weixin.qq.com/s/i1MfaaoghaA0Nti3wn5TlA', '_blank', 'noopener');

    const btn = document.getElementById('exportBtn');
    const oldText = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = '⏳ 正在导出...'; }

    try {
        const grid = document.getElementById('seatingGrid');
        // 截图前确保网格在视口内且已渲染（滚动回顶部保证 html2canvas 正确截取）
        const canvas = await html2canvas(grid, {
            backgroundColor: '#ffffff',
            scale: 2,
            useCORS: true,
            logging: false
        });
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pageW = 210, pageH = 297;
        const margin = 12;
        // 标题
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.text('班级座次表', pageW / 2, 16, { align: 'center' });
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`${columns} 列 × ${rows} 行 · ${new Date().toLocaleDateString('zh-CN')}`, pageW / 2, 23, { align: 'center' });
        // 座位网格图片：按比例缩放到 A4 可用宽度
        const imgW = pageW - margin * 2;
        const imgH = canvas.height * imgW / canvas.width;
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', margin, 28, imgW, Math.min(imgH, pageH - 40));
        pdf.save('班级座次表.pdf');
        showToast('座次表 PDF 已导出', 'success');
    } catch (e) {
        console.error('导出失败:', e);
        showToast('导出失败: ' + e.message, 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = oldText; }
    }
}

function renderSeatingChart(seating) {
    const grid = document.getElementById('seatingGrid');
    const cells = grid.querySelectorAll('.seat-cell');

    // 仅负责「绘制」：根据每个座位的 data-key 从 lastSeating / vipAssignments 取值渲染。
    // 拖拽监听已在 renderSeatingArea 创建座位时绑定一次（避免重复绑定）。
    cells.forEach(el => {
        const key = el.dataset.key;
        if (!key) return;
        if (key.startsWith('V-')) {
            const i = parseInt(key.slice(2), 10);
            paintSeat(el, vipAssignments[i] || { isEmpty: true });
        } else {
            const [r, c] = key.slice(2).split('-').map(Number);
            const seat = (seating && seating[r] && seating[r][c]) ? seating[r][c] : { isEmpty: true };
            paintSeat(el, seat);
        }
    });
    // 已成功渲染座次表 → 允许导出 PDF
    const eb = document.getElementById('exportBtn');
    if (eb) eb.disabled = false;
}

// ==================== 拖拽交换座位 ====================
// 统一以「槽位键」定位：R-r-c = 普通座位(对应 lastSeating[r][c])；V-i = VIP 座位(对应 vipAssignments[i])
let dragSrcEl = null;     // 正在拖拽的座位 DOM
let dragSrcKey = null;    // 拖拽源槽位键

// 读取某槽位的学生对象（空槽返回 { isEmpty:true }）
function getSeatByKey(key) {
    if (key.startsWith('V-')) {
        const i = parseInt(key.slice(2), 10);
        return vipAssignments[i] || { isEmpty: true };
    }
    const [r, c] = key.slice(2).split('-').map(Number);
    return lastSeating[r][c];
}

// 写入某槽位（空则存 null，便于渲染识别）
function setSeatByKey(key, seat) {
    if (key.startsWith('V-')) {
        const i = parseInt(key.slice(2), 10);
        vipAssignments[i] = seat.isEmpty ? null : seat;
    } else {
        const [r, c] = key.slice(2).split('-').map(Number);
        lastSeating[r][c] = seat;
    }
}

// 格式化为纯数字展示（缺值显示「—」）
function fmtNum(val) {
    if (val == null || val === '') return '—';
    const n = Number(val);
    if (isNaN(n)) return String(val);
    return String(n);
}
// 视力转为数字：正常→5.0，4.5→4.5，缺值→—
function fmtVision(val) {
    if (val == null || val === '') return '—';
    const s = String(val).trim();
    if (s === '正常' || s === '正常视力' || s === '5.0') return '5.0';
    const m = s.match(/(\d+(?:\.\d+)?)/);
    return m ? m[1] : '—';
}

// 绘制单个座位：有学生→可拖拽(occupied)；空→不可拖拽(显示「座位」/「VIP」)
function paintSeat(el, seat) {
    const occupied = seat && !seat.isEmpty && seat.name;
    el.draggable = !!occupied; // 仅已分配学生的座位可拖出
    // 清除上一次的性别着色，避免复用残留
    el.classList.remove('gender-male', 'gender-female');
    if (occupied) {
        el.classList.add('occupied');
        el.classList.remove('seat-empty');
        // 性别着色：VIP 座位保持金色，不加性别色；其余按性别区分（男=蓝，女=粉）
        if (!el.classList.contains('vip-seat')) {
            if (seat.gender === '男') el.classList.add('gender-male');
            else if (seat.gender === '女') el.classList.add('gender-female');
        }
        const h = fmtNum(seat.height);
        const v = fmtVision(seat.vision);
        const s = fmtNum(seat.score);
        el.innerHTML = `
            <span class="seat-name">${seat.name}</span>
            <span class="seat-meta">
                <span class="meta-val">${h}</span><span class="meta-sep">--</span><span class="meta-val">${v}</span><span class="meta-sep">--</span><span class="meta-val">${s}</span>
            </span>
        `;
    } else {
        el.classList.remove('occupied');
        const label = el.classList.contains('vip-seat') ? 'VIP' : '座位';
        el.innerHTML = `<span class="seat-name">${label}</span>`;
    }
}

// 为座位元素绑定拖拽监听（创建时调用一次；所有座位均可作为放置目标，无论是否为空）
function attachSeatDrag(cell, key) {
    cell.addEventListener('dragstart', (e) => onSeatDragStart(e, key, cell));
    cell.addEventListener('dragover', (e) => e.preventDefault());
    cell.addEventListener('dragenter', (e) => {
        e.preventDefault();
        if (cell !== dragSrcEl) cell.classList.add('drop-zone');
    });
    cell.addEventListener('dragleave', () => cell.classList.remove('drop-zone'));
    cell.addEventListener('drop', (e) => onSeatDrop(e, key, cell));
    cell.addEventListener('dragend', cleanupDrag);
}

function onSeatDragStart(e, key, el) {
    if (!lastSeating) return; // 尚未生成座次，不可拖拽
    dragSrcEl = el;
    dragSrcKey = key;
    el.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', '');
}

function onSeatDrop(e, key, el) {
    e.preventDefault();
    el.classList.remove('drop-zone');
    if (!dragSrcKey || !lastSeating) { cleanupDrag(); return; }
    const srcKey = dragSrcKey;
    if (srcKey === key) { cleanupDrag(); return; } // 原地放下

    const a = getSeatByKey(srcKey); // 源（必有学生，因仅 occupied 可拖）
    const b = getSeatByKey(key);    // 目标（可能为空：空座位 / 空 VIP）
    if (!a || !a.name) { cleanupDrag(); return; }

    // 交换两槽位内容（目标为空时即「移动」）
    setSeatByKey(srcKey, b);
    setSeatByKey(key, a);

    const n1 = a.name;
    const n2 = (b && b.name) ? b.name : '空位';
    cleanupDrag();
    renderSeatingChart(lastSeating); // 重绘普通座位 + VIP 座位
    if (b && b.name) showToast(`${n1} 与 ${n2} 交换成功`);
    else showToast(`${n1} 已移动到该座位`);
}

function cleanupDrag() {
    if (dragSrcEl) dragSrcEl.classList.remove('dragging');
    dragSrcEl = null;
    dragSrcKey = null;
}

// ==================== 学生弹窗 ====================
function showStudentModal(students) {
    const modal = document.getElementById('studentModal');
    const listEl = document.getElementById('studentList');

    if (students.length === 0) {
        listEl.innerHTML = '<p style="text-align:center;color:#999;padding:20px;">暂无学生数据</p>';
    } else {
        listEl.innerHTML = students.map((s, i) => `
            <div class="student-item">
                <span class="student-index">${i + 1}</span>
                <div class="student-info">
                    <span class="student-name">${s.name}</span>
                <span class="student-detail">
                    ${s.gender || '-'}${s.height ? ` · ${s.height}cm` : ''}${s.vision ? ` · 视力:${fmtVision(s.vision)}` : ''}${s.score ? ` · 成绩:${s.score}` : ''}
                </span>
                </div>
            </div>
        `).join('');
    }

    modal.style.display = 'flex';
}

function closeModal(event) {
    if (event.target.id === 'studentModal') {
        closeModalDirect();
    }
}

function closeModalDirect() {
    document.getElementById('studentModal').style.display = 'none';
}

// ==================== 清空名单 ====================
function clearStudents() {
    currentStudents = [];
    closeModalDirect();
    resetAllSettings();   // 清空名单一并复位所有设置到初始状态
    showToast('已清空学生名单');
}

// ==================== Toast 提示 ====================
function showToast(message, type = 'success') {
    // 移除已有 toast
    const existing = document.querySelector('.toast-msg');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast-msg';
    toast.textContent = message;

    // 不同类型的颜色
    const colors = {
        success: '#00b36b',
        warning: '#f59e0b',
        error: '#ef4444'
    };

    Object.assign(toast.style, {
        position: 'fixed',
        top: '24px',
        right: '24px',
        padding: '12px 22px',
        background: colors[type] || colors.success,
        color: '#fff',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '500',
        boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
        zIndex: '2000',
        animation: 'toastIn 0.3s ease-out',
    });

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'toastOut 0.25s ease-in forwards';
        setTimeout(() => toast.remove(), 250);
    }, 2500);
}

// 注入 toast 动画样式
const toastStyle = document.createElement('style');
toastStyle.textContent = `
    @keyframes toastIn {
        from { opacity: 0; transform: translateX(30px); }
        to { opacity: 1; transform: translateX(0); }
    }
    @keyframes toastOut {
        from { opacity: 1; transform: translateX(0); }
        to { opacity: 0; transform: translateX(30px); }
    }
`;
document.head.appendChild(toastStyle);

// ==================== 键盘快捷键 ====================
document.addEventListener('keydown', (e) => {
    // Ctrl+Enter 快速生成
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        generateSeating();
    }
    // Escape 关闭弹窗
    if (e.key === 'Escape') {
        closeModalDirect();
    }
});
