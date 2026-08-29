/* 班主任工作台 - 主逻辑
 * 依赖顺序：
 *   1. class-workbench-config.js  提供 window.WB_CONFIG
 *   2. class-workbench.js         本文件（导航 + CRUD + 备份）
 *   3. class-workbench-views.js   特殊视图（仪表盘 / 成绩 / 待办）
 */
(function () {
  'use strict';

  // ============ 常量与工具 ============
  var STORE_KEY = 'wb_v1';
  var CURRENT_KEY = 'wb_current';

  function $(sel) { return document.querySelector(sel); }
  function el(id) { return document.getElementById(id); }

  function uid() {
    return 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function today() {
    var d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  function escapeHtml(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function showToast(msg, duration) {
    var t = el('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._timer);
    t._timer = setTimeout(function () { t.classList.remove('show'); }, duration || 1800);
  }

  // ============ 数据层 ============
  var state = loadState();

  function loadState() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { console.error(e); }
    return initEmpty();
  }

  function initEmpty() {
    // 为所有 tables 和 grades 建立空数据
    var tables = {};
    var grades = { exams: [], scores: {} };
    window.WB_CONFIG.modules.forEach(function (mod) {
      if (mod.subs) {
        mod.subs.forEach(function (sub) {
          if (sub.fields) tables[sub.id] = [];
        });
      }
    });
    return { tables: tables, grades: grades, todo: { items: [] } };
  }

  function saveState() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
    catch (e) { showToast('保存失败：存储已满或被禁用'); }
  }

  function getTable(tableId) {
    if (!state.tables[tableId]) state.tables[tableId] = [];
    return state.tables[tableId];
  }

  function findField(tableId, fieldName) {
    var tbl = findTableDef(tableId);
    if (!tbl) return null;
    return (tbl.fields || []).find(function (f) { return f.name === fieldName; }) || null;
  }

  function findTableDef(tableId) {
    var mod, sub;
    for (var i = 0; i < window.WB_CONFIG.modules.length; i++) {
      mod = window.WB_CONFIG.modules[i];
      if (mod.subs) {
        for (var j = 0; j < mod.subs.length; j++) {
          sub = mod.subs[j];
          if (sub.id === tableId) return { module: mod, table: sub };
        }
      }
    }
    return null;
  }

  function findModule(id) {
    return window.WB_CONFIG.modules.find(function (m) { return m.id === id; });
  }

  // ============ 路由与导航 ============
  var route = loadRoute() || { view: 'dashboard' };

  function loadRoute() {
    try {
      var r = sessionStorage.getItem(CURRENT_KEY);
      return r ? JSON.parse(r) : null;
    } catch (e) { return null; }
  }
  function saveRoute() {
    try { sessionStorage.setItem(CURRENT_KEY, JSON.stringify(route)); } catch (e) {}
  }

  function navigate(view, opts) {
    opts = opts || {};
    route = { view: view };
    if (opts.module) route.module = opts.module;
    if (opts.table) route.table = opts.table;
    if (opts.sub) route.sub = opts.sub;
    if (opts.param) route.param = opts.param;
    saveRoute();
    render();
  }

  function renderSidebar() {
    var html = '';
    html += '<div class="brand"><div class="logo">班</div><div><div class="title">班主任工作台</div><div class="sub">一站式班级管理</div></div></div>';
    html += '<nav class="nav" id="nav">';

    window.WB_CONFIG.modules.forEach(function (mod) {
      if (mod.type === 'group') {
        html += '<div class="nav-group">';
        html += renderNavItem(mod, mod.id, true);
        mod.subs.forEach(function (sub) {
          html += renderNavItem(sub, 'sub:' + sub.id, false);
        });
        html += '</div>';
      } else if (mod.type === 'dashboard') {
        html += renderNavItem(mod, 'dashboard');
      } else if (mod.type === 'grades') {
        html += renderNavItem(mod, 'grades');
      } else if (mod.type === 'todo') {
        html += renderNavItem(mod, 'todo');
      } else if (mod.type === 'exams' || mod.subs && mod.subs[0] && mod.subs[0].id === 'exams') {
        html += renderNavItem(mod, 'exams');
      }
    });

    html += '</nav>';
    html += '<div class="foot">数据存储于浏览器 localStorage<br>建议定期备份</div>';

    el('sidebar').innerHTML = html;

    // 绑定点击
    var nav = el('nav');
    nav.addEventListener('click', function (e) {
      var item = e.target.closest('.nav-item');
      if (!item) return;
      var target = item.dataset.target;
      itemClickHandler(target);
    });
  }

  function renderNavItem(item, target, isParent) {
    var count = '';
    if (!isParent && item.fields) {
      var arr = getTable(item.id);
      if (arr.length > 0) count = '<span class="count">' + arr.length + '</span>';
    }
    var active = false;
    if (target === 'dashboard' && route.view === 'dashboard') active = true;
    if (target === 'grades' && route.view === 'grades') active = true;
    if (target === 'todo' && route.view === 'todo') active = true;
    if (target === 'exams' && route.view === 'exams') active = true;
    if (target.indexOf('sub:') === 0 && route.view === 'table' && route.table === target.slice(4)) active = true;
    return '<button class="nav-item ' + (active ? 'active' : '') + '" data-target="' + target + '">' +
      '<span class="icon">' + (item.icon || '·') + '</span>' +
      '<span class="label">' + escapeHtml(item.label) + '</span>' + count +
      '</button>';
  }

  function itemClickHandler(target) {
    if (target === 'dashboard') { navigate('dashboard'); return; }
    if (target === 'grades') { navigate('grades'); return; }
    if (target === 'todo') { navigate('todo'); return; }
    if (target === 'exams') { navigate('exams'); return; }
    if (target.indexOf('sub:') === 0) {
      var tableId = target.slice(4);
      var def = findTableDef(tableId);
      if (def) {
        navigate('table', { module: def.module.id, table: tableId });
      }
      return;
    }
    // 一级 group 节点：定位到第一个子表
    var mod = findModule(target);
    if (mod && mod.subs && mod.subs.length > 0) {
      navigate('table', { module: mod.id, table: mod.subs[0].id });
    }
  }

  function updateCrumb() {
    var parts = [];
    if (route.view === 'dashboard') parts.push('首页仪表盘');
    else if (route.view === 'grades') {
      parts.push('智能成绩分析');
      if (route.param && route.param.indexOf('exam:') === 0) {
        parts.push('考试录入：' + route.param.slice(5));
      }
    }
    else if (route.view === 'todo') parts.push('待办备忘录');
    else if (route.view === 'table') {
      var def = findTableDef(route.table);
      if (def) {
        parts.push(def.module.label, def.table.label);
      }
    }
    el('crumb').innerHTML = parts.length > 1
      ? '<span class="path">' + escapeHtml(parts.slice(0, -1).join(' / ')) + '</span>' + escapeHtml(parts[parts.length - 1])
      : escapeHtml(parts.join(''));
  }

  // ============ 主渲染 ============
  function render() {
    updateCrumb();
    renderSidebarActive();
    var c = el('content');
    if (route.view === 'dashboard') {
      c.innerHTML = window.WB_VIEWS.renderDashboard();
      window.WB_VIEWS.bindDashboard();
    } else if (route.view === 'grades') {
      c.innerHTML = window.WB_VIEWS.renderGrades();
      window.WB_VIEWS.bindGrades();
    } else if (route.view === 'todo') {
      c.innerHTML = window.WB_VIEWS.renderTodo();
      window.WB_VIEWS.bindTodo();
    } else if (route.view === 'table') {
      c.innerHTML = renderTablePage(route.table);
      bindTablePage(route.table);
    } else {
      c.innerHTML = '<div class="card">未找到页面</div>';
    }
  }

  function renderSidebarActive() {
    document.querySelectorAll('.nav-item').forEach(function (n) {
      n.classList.remove('active');
    });
    // 重新生成一次以更新 count
    renderSidebar();
  }

  // ============ 表格页（通用 CRUD） ============
  // 行选中状态：{ tableId -> Set(idx) }
    var selectedRows = {};
    // 当前正在导入的表 ID（file-import 事件回调时使用）
    var currentImportTableId = null;

  function getSel(tableId) {
    if (!selectedRows[tableId]) selectedRows[tableId] = new Set();
    return selectedRows[tableId];
  }

  function renderTablePage(tableId) {
    var def = findTableDef(tableId);
    if (!def) return '<div class="card">未找到该表</div>';

    // 座位表专属：直接 iframe 内嵌 seat-map 工具，无需再写 CRUD 表格
    if (tableId === 'seating') {
      return renderSeatMapIframe();
    }

    var table = getTable(tableId);
    var fields = def.table.fields;
    var sel = getSel(tableId);

    // 筛选字段：优先 date / 第一个 select
    var filterField = null;
    var dateField = fields.find(function (f) { return f.type === 'date'; });
    var selectField = fields.find(function (f) { return f.type === 'select'; });
    if (dateField && dateField.name !== 'date') filterField = dateField;
    else if (selectField) filterField = selectField;
    else if (dateField) filterField = dateField;

    var html = '';
    html += '<div class="card">';
    html += '<div class="card-title">' + (def.table.icon || '') + ' ' + escapeHtml(def.table.label) +
      '<span class="extra">共 ' + table.length + ' 条</span></div>';

    // 工具栏：主操作区（左） + 搜索筛选区（中） + 次要操作区（右）
    html += '<div class="table-toolbar">';
    html += '<div class="toolbar-group">';
    html += '<button class="btn btn-primary" id="btn-new">＋ 新增</button>';
    html += '<button class="btn" id="btn-import" title="选择 .xlsx/.xls/.csv 文件，多列自动映射批量添加">📥 批量添加</button>';
    html += '<button class="btn" id="btn-template" title="下载空白模板用于填写后导入">⬇ 模板</button>';
    html += '</div>';
    if (filterField) {
      html += '<div class="toolbar-divider"></div>';
      html += '<select class="filter" id="filter-sel">';
      html += '<option value="">全部 ' + escapeHtml(filterField.label) + '</option>';
      (filterField.options || []).forEach(function (o) {
        html += '<option value="' + escapeHtml(o) + '">' + escapeHtml(o) + '</option>';
      });
      html += '</select>';
    }
    html += '<div class="search"><input id="search-input" placeholder="🔍 关键词检索（全字段模糊）"></div>';
    html += '<div class="spacer"></div>';
    html += '<button class="btn" id="btn-export">⬇ 导出</button>';
    html += '</div>';

    // 批量操作条（仅在选中时显示）
    html += '<div class="batch-bar" id="batch-bar" style="display:none">';
    html += '<span class="info">已选 <strong id="sel-count">0</strong> 条</span>';
    html += '<div class="spacer"></div>';
    html += '<button class="btn btn-sm" id="btn-sel-all">全选</button>';
    html += '<button class="btn btn-sm" id="btn-sel-none">取消</button>';
    html += '<button class="btn btn-sm btn-danger" id="btn-batch-del">🗑 批量删除</button>';
    html += '</div>';

    // 表格（含复选列）
    html += '<div class="table-wrap"><div class="table-scroll">';
    html += '<table class="data"><thead><tr>';
    html += '<th class="checkbox-cell"><input type="checkbox" id="check-all" title="全选/取消"></th>';
    fields.forEach(function (f) {
      html += '<th>' + escapeHtml(f.label) + '</th>';
    });
    html += '<th class="op">操作</th></tr></thead><tbody id="tbody">';

    if (table.length === 0) {
      html += '<tr><td colspan="' + (fields.length + 2) + '" class="empty">暂无数据，点击右上角「新增」或「批量添加」</td></tr>';
    } else {
      table.forEach(function (row, idx) {
        var checked = sel.has(idx) ? ' checked' : '';
        var cls = sel.has(idx) ? ' class="selected"' : '';
        html += '<tr' + cls + '>';
        html += '<td class="checkbox-cell"><input type="checkbox" data-sel="' + idx + '"' + checked + '></td>';
        fields.forEach(function (f) {
          var v = row[f.name];
          var tdCls = f.type === 'textarea' ? ' class="wrap"' : '';
          if (f.type === 'textarea' && v) v = escapeHtml(v).slice(0, 80) + (v.length > 80 ? '…' : '');
          else v = escapeHtml(v);
          html += '<td' + tdCls + '>' + (v || '<span style="color:var(--c-text-3)">—</span>') + '</td>';
        });
        html += '<td class="op"><button class="btn btn-sm" data-act="edit" data-idx="' + idx + '">编辑</button>' +
                '<button class="btn btn-sm btn-danger" data-act="del" data-idx="' + idx + '">删除</button></td>';
        html += '</tr>';
      });
    }
    html += '</tbody></table></div></div>';
    html += '</div>';
    return html;
  }

  function bindTablePage(tableId) {
    var def = findTableDef(tableId);
    if (!def) return;
    var fields = def.table.fields;
    var sel = getSel(tableId);

    // 座位表专属：整页为 iframe，不走 CRUD 绑定
    if (tableId === 'seating') {
      bindSeatMapIframe();
      return;
    }

    el('btn-new').addEventListener('click', function () {
      openForm(tableId, null);
    });
    el('btn-import').addEventListener('click', function () {
      openExcelImport(tableId, fields);
    });
    el('btn-template').addEventListener('click', function () {
      downloadTemplate(tableId);
    });

    // 全选 / 取消
    el('check-all').addEventListener('change', function (e) {
      var all = e.target.checked;
      var table = getTable(tableId);
      table.forEach(function (_, idx) {
        if (all) sel.add(idx); else sel.delete(idx);
      });
      updateBatchUI(tableId);
      applyFilter(tableId); // 刷新行样式
    });

    // 行复选框
    el('tbody').addEventListener('change', function (e) {
      var cb = e.target.closest('[data-sel]');
      if (!cb) return;
      var idx = parseInt(cb.dataset.sel, 10);
      if (cb.checked) sel.add(idx); else sel.delete(idx);
      updateBatchUI(tableId);
      // 只更新选中态，不重绘整表
      cb.closest('tr').classList.toggle('selected', cb.checked);
    });

    // 行操作（编辑/删除）
    el('tbody').addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-act]');
      if (!btn) return;
      var idx = parseInt(btn.dataset.idx, 10);
      var act = btn.dataset.act;
      if (act === 'edit') openForm(tableId, idx);
      else if (act === 'del') {
        var row = getTable(tableId)[idx];
        var label = fields[0].label;
        if (confirm('确认删除该条记录？\n' + label + '：' + (row[fields[0].name] || '(空)'))) {
          getTable(tableId).splice(idx, 1);
          // 清除所有选中（索引已失效）
          sel.clear();
          saveState();
          render();
          showToast('已删除');
        }
      }
    });

    // 搜索/筛选
    var search = el('search-input');
    if (search) {
      search.addEventListener('input', function () { applyFilter(tableId); });
    }
    var filter = el('filter-sel');
    if (filter) {
      filter.addEventListener('change', function () { applyFilter(tableId); });
    }

    el('btn-export').addEventListener('click', function () {
      exportTable(tableId, def);
    });

    // 批量操作条按钮
    el('btn-sel-all').addEventListener('click', function () {
      var table = getTable(tableId);
      table.forEach(function (_, idx) { sel.add(idx); });
      updateBatchUI(tableId);
      applyFilter(tableId);
    });
    el('btn-sel-none').addEventListener('click', function () {
      sel.clear();
      updateBatchUI(tableId);
      applyFilter(tableId);
    });
    el('btn-batch-del').addEventListener('click', function () {
      if (sel.size === 0) { showToast('请先选择要删除的记录'); return; }
      if (!confirm('确认删除选中的 ' + sel.size + ' 条记录？此操作不可恢复。')) return;
      var table = getTable(tableId);
      // 从大到小删除，避免索引漂移
      var idxs = Array.from(sel).sort(function (a, b) { return b - a; });
      idxs.forEach(function (i) { table.splice(i, 1); });
      sel.clear();
      saveState();
      render();
      showToast('已删除 ' + idxs.length + ' 条');
    });

    updateBatchUI(tableId);
  }

  function updateBatchUI(tableId) {
    var bar = el('batch-bar');
    if (!bar) return;
    var sel = getSel(tableId);
    var n = sel.size;
    bar.style.display = n > 0 ? 'flex' : 'none';
    var cnt = el('sel-count');
    if (cnt) cnt.textContent = n;
    // 同步全选框状态
    var table = getTable(tableId);
    var all = el('check-all');
    if (all) all.checked = table.length > 0 && n === table.length;
  }

  function applyFilter(tableId) {
    var def = findTableDef(tableId);
    var fields = def.table.fields;
    var search = (el('search-input') || {}).value || '';
    var filterVal = (el('filter-sel') || {}).value || '';
    var filterField = null;
    fields.forEach(function (f) {
      var sel = document.querySelector('.filter');
      if (sel && sel.value !== '' && sel.options[0].text.indexOf(f.label) >= 0) filterField = f;
    });

    var table = getTable(tableId);
    var filtered = table.filter(function (row) {
      // 筛选
      if (filterField && filterVal && String(row[filterField.name] || '') !== filterVal) return false;
      // 关键词
      if (search) {
        var kw = search.toLowerCase();
        var hit = false;
        fields.forEach(function (f) {
          var v = row[f.name];
          if (v && String(v).toLowerCase().indexOf(kw) >= 0) hit = true;
        });
        if (!hit) return false;
      }
      return true;
    });

    renderFiltered(tableId, filtered, fields);
  }

  function renderFiltered(tableId, rows, fields) {
    var tbody = el('tbody');
    var sel = getSel(tableId);
    if (rows.length === 0) {
      tbody.innerHTML = '<tr><td colspan="' + (fields.length + 2) + '" class="empty">无匹配数据</td></tr>';
      return;
    }
    var html = '';
    rows.forEach(function (row) {
      var idx = getTable(tableId).indexOf(row);
      var checked = sel.has(idx) ? ' checked' : '';
      var trCls = sel.has(idx) ? ' class="selected"' : '';
      html += '<tr' + trCls + '>';
      html += '<td class="checkbox-cell"><input type="checkbox" data-sel="' + idx + '"' + checked + '></td>';
      fields.forEach(function (f) {
        var v = row[f.name];
        var tdCls = f.type === 'textarea' ? ' class="wrap"' : '';
        if (f.type === 'textarea' && v) v = escapeHtml(v).slice(0, 80) + (v.length > 80 ? '…' : '');
        else v = escapeHtml(v);
        html += '<td' + tdCls + '>' + (v || '<span style="color:var(--c-text-3)">—</span>') + '</td>';
      });
      html += '<td class="op"><button class="btn btn-sm" data-act="edit" data-idx="' + idx + '">编辑</button>' +
              '<button class="btn btn-sm btn-danger" data-act="del" data-idx="' + idx + '">删除</button></td>';
      html += '</tr>';
    });
    tbody.innerHTML = html;
  }

  // ============ 表单 ============
  function openForm(tableId, editIdx) {
    var def = findTableDef(tableId);
    var table = getTable(tableId);
    var row = editIdx != null ? table[editIdx] : null;
    var fields = def.table.fields;

    var title = (editIdx != null ? '编辑' : '新增') + ' · ' + def.table.label;

    var body = '<div class="form-grid">';
    fields.forEach(function (f) {
      var cls = f.full ? ' full' : '';
      var val = row ? (row[f.name] || '') : (f.default || '');
      var required = f.required ? ' required' : '';
      var reqMark = f.required ? 'required' : '';
      body += '<label class="' + cls + '"><span class="lbl ' + reqMark + '">' + escapeHtml(f.label) + '</span>';
      if (f.type === 'textarea') {
        body += '<textarea name="' + f.name + '" data-field="' + f.name + '" ' + required + ' placeholder="' + escapeHtml(f.placeholder || '') + '">' + escapeHtml(val) + '</textarea>';
      } else if (f.type === 'select') {
        body += '<select name="' + f.name + '" data-field="' + f.name + '"' + required + '>';
        body += '<option value="">请选择</option>';
        (f.options || []).forEach(function (o) {
          body += '<option value="' + escapeHtml(o) + '"' + (o === val ? ' selected' : '') + '>' + escapeHtml(o) + '</option>';
        });
        body += '</select>';
      } else {
        body += '<input type="' + (f.type === 'date' ? 'date' : 'text') + '" name="' + f.name + '" data-field="' + f.name + '" value="' + escapeHtml(val) + '" placeholder="' + escapeHtml(f.placeholder || '') + '"' + required + '>';
      }
      body += '</label>';
    });
    body += '</div>';

    openModal(title, body, [
      { text: '取消', cls: 'btn', act: 'close' },
      { text: '保存', cls: 'btn btn-primary', act: 'save' }
    ], function (act, formHtml) {
      if (act !== 'save') return;
      var data = {};
      fields.forEach(function (f) {
        var input = formHtml.querySelector('[data-field="' + f.name + '"]');
        if (input) data[f.name] = input.value.trim();
      });
      // 必填校验
      var missing = null;
      fields.forEach(function (f) {
        if (f.required && !data[f.name]) missing = f.label;
      });
      if (missing) { showToast('请填写必填项：' + missing); return false; }

      if (editIdx != null) {
        Object.keys(state.tables[tableId][editIdx] || {}).forEach(function (k) { delete state.tables[tableId][editIdx][k]; });
        Object.assign(state.tables[tableId][editIdx], data);
      } else {
        data.__id = uid();
        data.__createdAt = new Date().toISOString();
        Object.assign(data, { __updatedAt: new Date().toISOString() });
        state.tables[tableId].unshift(data);
      }
      saveState();
      render();
      showToast('已保存');
    });
  }

  // ============ Excel 导入 ============
  // 通过选择 .xlsx/.xls/.csv 文件批量导入；支持多 Sheet 选择、列自动映射、数据预览
  function openExcelImport(tableId, fields) {
    var def = findTableDef(tableId);
    if (!def) return;
    // 检查 SheetJS 是否可用（CDN 或本地降级）
    if (typeof XLSX === 'undefined' || !XLSX.read) {
      WB.openModal('Excel 库未加载',
        '<div style="font-size:13px;line-height:1.8;color:var(--c-text-2)">' +
        '📥 导入 Excel 需要加载 SheetJS 库。<br>' +
        '当前检测不到 XLSX（可能是 CDN 被墙）；请检查网络或稍后重试。<br>' +
        '导出功能仍可用（会导出 CSV，Excel 可打开）。</div>',
        [{ text: '知道了', cls: 'btn btn-primary', act: 'close' }]);
      return;
    }
    currentImportTableId = tableId;
    el('file-import').click();
  }

  function handleImportFile(file) {
    if (!file) return;
    var tableId = currentImportTableId;
    var ext = (file.name.split('.').pop() || '').toLowerCase();
    var isCsv = ext === 'csv';
    var isXlsxLike = (ext === 'xlsx' || ext === 'xls');
    if (!isCsv && !isXlsxLike) {
      showToast('仅支持 .xlsx / .xls / .csv 文件');
      return;
    }
    var reader = new FileReader();
    reader.onload = function (e) {
      try {
        var workbook;
        if (isCsv) {
          // CSV 用 sheet_to_json 之外的方式：先转成 ws
          var csvText = e.target.result;
          workbook = XLSX.read(csvText, { type: 'string' });
        } else {
          workbook = XLSX.read(e.target.result, { type: 'array' });
        }
        var sheets = workbook.SheetNames.map(function (name) {
          var ws = workbook.Sheets[name];
          return { name: name, rows: XLSX.utils.sheet_to_json(ws, { defval: '' }) };
        });
        if (!sheets.some(function (s) { return s.rows.length > 0; })) {
          WB.openModal('解析失败',
            '<div style="font-size:13px;line-height:1.8;color:var(--c-text-2)">' +
            '未能从文件中解析到数据。<br>请确认：<br>' +
            '· 第一行是表头（字段名）<br>' +
            '· 至少有一行数据<br>' +
            '· 文件格式正确（可先下载模板填写后导入）</div>',
            [{ text: '知道了', cls: 'btn btn-primary', act: 'close' }]);
          return;
        }
        showImportMapping(file.name, sheets);
      } catch (err) {
        WB.openModal('解析失败',
          '<div style="font-size:13px;color:var(--c-danger)">发生错误：' + escapeHtml(err.message || err) + '</div>',
          [{ text: '知道了', cls: 'btn btn-primary', act: 'close' }]);
      }
    };
    reader.onerror = function () {
      WB.showToast('文件读取失败');
    };
    if (isCsv) reader.readAsText(file);
    else reader.readAsArrayBuffer(file);
  }

  function showImportMapping(fileName, sheets) {
    var tableId = route.table;
    var def = findTableDef(tableId);
    var fields = def.table.fields;

    var activeSheetIdx = 0;
    // 若只有一个 sheet 就直接用；多个由用户在 modal 内切换
    if (sheets.length === 1) activeSheetIdx = 0;

    var sheetSelectorHtml = '';
    if (sheets.length > 1) {
      sheetSelectorHtml = '<label style="margin-bottom:12px;display:block"><span class="lbl">选择工作表</span>' +
        '<select id="sheet-sel">' +
        sheets.map(function (s, i) {
          return '<option value="' + i + '"' + (i === 0 ? ' selected' : '') + '>' +
            escapeHtml(s.name) + '（' + s.rows.length + ' 行）</option>';
        }).join('') +
        '</select></label>';
    }

    var mapRowsHtml = fields.map(function (f) {
      // 表头候选
      var candidates = sheets[0] && sheets[0].rows.length > 0
        ? Object.keys(sheets[0].rows[0])
        : [];
      // 自动匹配：先按 label 完全相等，再按 label 模糊包含
      var auto = '';
      if (candidates.length > 0) {
        auto = candidates.find(function (c) { return c === f.label; }) || '';
        if (!auto) {
          var lower = f.label.toLowerCase();
          auto = candidates.find(function (c) { return c.toLowerCase() === lower; }) || '';
        }
        if (!auto) {
          auto = candidates.find(function (c) { return c.indexOf(f.label) !== -1 || f.label.indexOf(c) !== -1; }) || '';
        }
      }
      return '<tr><td style="font-size:13px">' + escapeHtml(f.label) + '</td><td>' +
        '<select class="map-sel" data-field="' + escapeHtml(f.name) + '" style="min-width:180px">' +
        '<option value="">— 忽略 —</option>' +
        candidates.map(function (c) {
          return '<option value="' + escapeHtml(c) + '"' + (c === auto ? ' selected' : '') + '>' + escapeHtml(c) + '</option>';
        }).join('') +
        '</select></td></tr>';
    }).join('');

    var body = '<div style="padding:10px 12px;background:var(--c-primary-bg);border-radius:6px;font-size:13px;color:var(--c-text-2);line-height:1.7;margin-bottom:12px">' +
      '📋 已解析：<strong>' + escapeHtml(fileName) + '</strong><br>' +
      '· 请核对列映射关系（已按表头名自动匹配）<br>' +
      '· 「— 忽略 —」表示该 Excel 列不导入到此字段<br>' +
      '· 支持 <code>.xlsx / .xls / .csv</code>' +
      '</div>';
    body += sheetSelectorHtml;
    body += '<div style="border:1px solid var(--c-border);border-radius:6px;padding:12px;margin-bottom:12px">';
    body += '<div class="form-title" style="margin-bottom:8px">列映射（左：目标字段　→　右：Excel 列）</div>';
    body += '<table style="width:100%;border-collapse:collapse"><tbody>' + mapRowsHtml + '</tbody></table>';
    body += '</div>';
    body += '<div class="form-title" style="margin-bottom:8px">数据预览（前 10 行）</div>';
    body += '<div style="max-height:260px;overflow:auto;border:1px solid var(--c-border);border-radius:6px" id="preview-wrap">';
    body += '<table class="data" id="preview-table" style="min-width:100%"><thead><tr></tr></thead><tbody></tbody></table>';
    body += '</div>';

    WB.openModal('导入 Excel · ' + def.table.label, body, [
      { text: '取消', cls: 'btn', act: 'close' },
      { text: '导入数据', cls: 'btn btn-primary', act: 'save' }
    ], function (act, formHtml) {
      if (act !== 'save') return;

      // 读取用户选择的 sheet
      var selSheet = formHtml.querySelector('#sheet-sel');
      var curIdx = selSheet ? parseInt(selSheet.value, 10) : 0;
      var activeRows = (sheets[curIdx] && sheets[curIdx].rows) || [];
      if (activeRows.length === 0) { WB.showToast('所选工作表无数据'); return false; }

      // 读取列映射
      var mapped = {};
      formHtml.querySelectorAll('.map-sel').forEach(function (s) {
        mapped[s.dataset.field] = s.value;
      });
      var hasAny = Object.keys(mapped).some(function (k) { return mapped[k]; });
      if (!hasAny) { WB.showToast('请至少映射一列'); return false; }

      // 逐行解析写入
      var table = WB.getTable(tableId);
      var added = 0;
      activeRows.forEach(function (row) {
        var newRow = {};
        fields.forEach(function (f) {
          var header = mapped[f.name];
          var val = header && row.hasOwnProperty(header) ? row[header] : '';
          // 处理 [RichText] 等对象
          if (val && typeof val === 'object' && val.rich) {
            val = val.rich.map(function (r) { return r.t; }).join('');
          } else if (val != null && typeof val !== 'string') {
            // 数字 / 布尔 → 字符串
            val = String(val);
          }
          val = (val || '').toString().trim();
          // 日期字段：若是数字，Excel 序列号 → 日期字符串
          if (f.type === 'date' && /^\d+(\.\d+)?$/.test(val)) {
            val = excelDateToStr(parseFloat(val));
          }
          newRow[f.name] = val;
        });
        newRow.__id = WB.uid();
        newRow.__createdAt = new Date().toISOString();
        table.unshift(newRow);
        added++;
      });
      WB.saveState();
      selectedRows[tableId] = new Set();
      WB.render();
      WB.showToast('已导入 ' + added + ' 条');
    }, function (formHtml) {
      // mount: 渲染预览 + 绑定 sheet 切换
      var initialMapped = {};
      formHtml.querySelectorAll('.map-sel').forEach(function (s) {
        initialMapped[s.dataset.field] = s.value;
      });
      renderPreview(formHtml, activeSheetIdx, sheets, initialMapped);
      var sel = formHtml.querySelector('#sheet-sel');
      if (sel) sel.onchange = function () {
        var m = {};
        formHtml.querySelectorAll('.map-sel').forEach(function (s) { m[s.dataset.field] = s.value; });
        renderPreview(formHtml, parseInt(sel.value, 10), sheets, m);
      };
      // 映射下拉变更时刷新预览
      formHtml.querySelectorAll('.map-sel').forEach(function (s) {
        s.onchange = function () {
          var m = {};
          formHtml.querySelectorAll('.map-sel').forEach(function (x) { m[x.dataset.field] = x.value; });
          var si = sel ? parseInt(sel.value, 10) : 0;
          renderPreview(formHtml, si, sheets, m);
        };
      });
    });
  }

  // 根据当前 sheet + 映射关系渲染预览表
  function renderPreview(formHtml, sheetIdx, sheets, mapped) {
    var formHtmlRef = formHtml;
    var active = (sheets[sheetIdx] && sheets[sheetIdx].rows) || [];
    var fieldOrder = formHtmlRef.querySelectorAll('.map-sel');
    var headersHtml = '<th>行</th>';
    for (var i = 0; i < fieldOrder.length; i++) {
      var name = fieldOrder[i].dataset.field;
      headersHtml += '<th>' + escapeHtml(name) + '</th>';
    }
    var thead = formHtmlRef.querySelector('#preview-table thead tr');
    thead.innerHTML = headersHtml;

    var tbody = formHtmlRef.querySelector('#preview-table tbody');
    if (active.length === 0) {
      tbody.innerHTML = '<tr><td colspan="' + (fieldOrder.length + 1) + '" class="empty" style="padding:16px">该 Sheet 无数据</td></tr>';
      return;
    }
    // 最多显示 10 行预览
    var preview = active.slice(0, 10);
    var html = '';
    preview.forEach(function (row, ri) {
      html += '<tr><td style="color:var(--c-text-3);font-size:12px">' + (ri + 1) + '</td>';
      for (var i = 0; i < fieldOrder.length; i++) {
        var name = fieldOrder[i].dataset.field;
        var header = mapped[name];
        var v = header ? (row[header] || '') : '';
        if (v && typeof v === 'object' && v.rich) v = v.rich.map(function (r) { return r.t; }).join('');
        html += '<td style="font-size:12px">' + escapeHtml(String(v)) + '</td>';
      }
      html += '</tr>';
    });
    tbody.innerHTML = html;
  }

  // Excel 日期序列号 → YYYY-MM-DD
  function excelDateToStr(n) {
    // Excel 1900 日期系统：1 = 1900-01-01（含闰年 bug，需 offset 修正）
    var d = new Date(Date.UTC(1899, 11, 30, 0, 0, 0));
    d.setUTCDate(d.getUTCDate() + Math.floor(n));
    return d.toISOString().slice(0, 10);
  }

  // ============ Excel 模板下载 ============
  // 导出空表头 xlsx（无 XLSX 时降级 CSV），供用户填写后导入
  function downloadTemplate(tableId) {
    var def = findTableDef(tableId);
    if (!def) return;
    var fields = def.table.fields;
    var label = def.table.label;

    if (typeof XLSX !== 'undefined' && XLSX.utils && XLSX.writeFile) {
      var ws = XLSX.utils.aoa_to_sheet([fields.map(function (f) { return f.label; })]);
      // 列宽根据 label 长度微调
      ws['!cols'] = fields.map(function (f) {
        return { wch: Math.max(f.label.length * 2 + 2, 14) };
      });
      var wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, label);
      XLSX.writeFile(wb, label + '_空白模板.xlsx');
      WB.showToast('模板已下载，请填好后「导入 Excel」');
      return;
    }
    var csv = '\uFEFF' + fields.map(function (f) { return csvEscape(f.label); }).join(',') + '\r\n';
    downloadBlob(csv, label + '_空白模板.csv', 'text/csv;charset=utf-8');
    WB.showToast('模板已下载（CSV）');
  }

  // ============ 座位表可视化排座器（iframe 直嵌） ============
  // 座位表页整体渲染为 seat-map 工具 iframe，无需再写 CRUD 表格。
  // 通过 localStorage 传递学生花名册（同源可访问），seat-map 启动时自动同步。
  // seat-map 生成座次后会 postMessage 回来，父页面写回 state.tables.seating。
  var SEATMAP_ROSTER_KEY = 'wb_seatmap_roster';
  var seatMapIframeRef = null;

  function renderSeatMapIframe() {
    // 读取全班花名册，写入 localStorage 供 iframe 内的 seat-map 读取
    try {
      var roster = getTable('roster').map(function (r) {
        return {
          name: r.name || '',
          studentNo: r.studentNo || '',
          gender: r.gender || '',
          remark: r.remark || ''
        };
      });
      localStorage.setItem(SEATMAP_ROSTER_KEY, JSON.stringify(roster));
    } catch (e) { /* ignore */ }

    var iframeId = 'seatmap-iframe';
    return '<div class="card" style="padding:0;overflow:hidden">' +
      '<div style="padding:10px 16px;border-bottom:1px solid var(--c-border);display:flex;align-items:center;justify-content:space-between">' +
        '<div style="font-weight:600;font-size:14px">🪑 座位表 <span style="color:var(--c-text-3);font-weight:400;font-size:12px;margin-left:8px">数据源：全班花名册（自动同步）· 排座结果会写回本表</span></div>' +
        '<div><button class="btn btn-sm" id="seatmap-resync" title="重新从花名册同步">↻ 刷新花名册</button>' +
        '<button class="btn btn-sm" id="seatmap-newtab" title="在新标签打开">↗ 新标签打开</button></div>' +
      '</div>' +
      '<iframe id="' + iframeId + '" src="seat-map/seat-map.html?wb=1" style="width:100%;height:calc(100vh - 160px);border:none;display:block"></iframe>' +
    '</div>';
  }

  function bindSeatMapIframe() {
    seatMapIframeRef = el('seatmap-iframe');
    if (!seatMapIframeRef) return;

    // 新标签打开
    var newTab = el('seatmap-newtab');
    if (newTab) newTab.onclick = function () {
      try {
        var roster = getTable('roster').map(function (r) {
          return { name: r.name || '', studentNo: r.studentNo || '', gender: r.gender || '', remark: r.remark || '' };
        });
        localStorage.setItem(SEATMAP_ROSTER_KEY, JSON.stringify(roster));
      } catch (e) {}
      window.open('seat-map/seat-map.html?wb=1', '_blank');
    };

    // 重新同步花名册到 iframe
    var resync = el('seatmap-resync');
    if (resync) resync.onclick = function () {
      try {
        var roster = getTable('roster').map(function (r) {
          return { name: r.name || '', studentNo: r.studentNo || '', gender: r.gender || '', remark: r.remark || '' };
        });
        localStorage.setItem(SEATMAP_ROSTER_KEY, JSON.stringify(roster));
      } catch (e) {}
      // 触发 iframe 重载，seat-map 启动时会重新读 localStorage
      seatMapIframeRef.src = 'seat-map/seat-map.html?wb=1&t=' + Date.now();
      showToast('已重新同步花名册');
    };

    // 监听 seat-map 返回的座次数据
    window.addEventListener('message', onSeatMapMessage);
  }

  // seat-map 生成座次后回传的数据结构：
  // { type:'wb-seatmap-result', seating:[ [ {student_id,name,gender,height,vision,score}, ...], ...] }
  function onSeatMapMessage(evt) {
    if (!evt.data || evt.data.type !== 'wb-seatmap-result') return;
    var seating = evt.data.seating;
    var colGroups = evt.data.columnGroups || [];
    if (!seating || !Array.isArray(seating)) return;

    // 将二维座位矩阵展开为 seating 表行；按座位坐标推算 zone / row / seatNo
    var rows = [];
    var studentMap = getTable('roster').reduce(function (acc, r) {
      acc[r.name] = r;
      return acc;
    }, {});

    seating.forEach(function (row, ri) {
      if (!Array.isArray(row)) return;
      row.forEach(function (seat, ci) {
        if (!seat || seat.isEmpty || !seat.name) return;
        // 通过 student_id (对应学号/姓名) 查花名册补全信息
        var key = seat.student_id || seat.name;
        var rosterRow = studentMap[seat.name] || studentMap[seat.student_id] || {};
        // 分组：优先用 seat-map 传的分组信息，否则默认「第一组」
        var zone = '第' + (colGroups[ci] || (ci + 1)) + '组';
        rows.push({
          studentNo: rosterRow.studentNo || key || '',
          name: seat.name || '',
          zone: zone,
          row: String(ri + 1),
          seatNo: String(ci + 1),
          note: (rosterRow.remark || '')
        });
      });
    });

    state.tables.seating = rows;
    saveState();
    showToast('座位表已保存（' + rows.length + ' 人）');
  }


  // ============ 模态框 ============
  // options: onAction(act, body), mount(body)
  function openModal(title, bodyHtml, buttons, onAction, mount) {
    var mask = el('modal-mask');
    var btnsHtml = '';
    buttons.forEach(function (b) {
      btnsHtml += '<button class="' + (b.cls || 'btn') + '" data-act="' + b.act + '">' + escapeHtml(b.text) + '</button>';
    });
    mask.innerHTML = '<div class="modal">' +
      '<div class="modal-head"><div class="title">' + escapeHtml(title) + '</div><button class="close" data-act="close">×</button></div>' +
      '<div class="modal-body">' + bodyHtml + '</div>' +
      '<div class="modal-foot">' + btnsHtml + '</div></div>';
    mask.classList.add('show');
    // 挂载回调：body 已注入 DOM 后执行
    if (typeof mount === 'function') {
      var bodyRef = mask.querySelector('.modal-body');
      try { mount(bodyRef); } catch (err) { /* 忽略挂载错误 */ }
    }

    function close() {
      mask.classList.remove('show');
      mask.innerHTML = '';
    }
    mask.onclick = function (e) {
      if (e.target === mask) { close(); return; }
      var btn = e.target.closest('[data-act]');
      if (!btn) return;
      var act = btn.dataset.act;
      if (act === 'close') { close(); return; }
      // 调用 onAction
      if (onAction) {
        var body = mask.querySelector('.modal-body');
        var r = onAction(act, body);
        if (r === false) return;
      }
      close();
    };
  }

  // ============ 导出 ============
  function exportTable(tableId, def) {
    var fields = def.table.fields;
    var table = getTable(tableId);
    if (table.length === 0) { showToast('暂无数据可导出'); return; }
    // 优先尝试 XLSX
    if (typeof XLSX !== 'undefined' && XLSX.utils) {
      var rows = table.map(function (r) {
        var obj = {};
        fields.forEach(function (f) { obj[f.label] = r[f.name] || ''; });
        return obj;
      });
      var ws = XLSX.utils.json_to_sheet(rows);
      var wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, def.table.label);
      XLSX.writeFile(wb, def.table.label + '_' + today() + '.xlsx');
      showToast('已导出 Excel');
      return;
    }
    // 降级 CSV（带 UTF-8 BOM，Excel 可识别）
    var header = fields.map(function (f) { return csvEscape(f.label); }).join(',');
    var lines = table.map(function (r) {
      return fields.map(function (f) { return csvEscape(r[f.name] || ''); }).join(',');
    });
    var csv = '\uFEFF' + [header].concat(lines).join('\r\n');
    downloadBlob(csv, def.table.label + '_' + today() + '.csv', 'text/csv;charset=utf-8');
    showToast('已导出 CSV（Excel 可打开）');
  }

  function csvEscape(v) {
    var s = String(v == null ? '' : v);
    if (/[",\r\n]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  function downloadBlob(content, filename, mime) {
    var blob = new Blob([content], { type: mime || 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  // ============ 备份/恢复 ============
  function backupAll() {
    var data = {
      version: window.WB_CONFIG.version,
      backupTime: new Date().toISOString(),
      tables: state.tables,
      grades: state.grades,
      todo: state.todo
    };
    var json = JSON.stringify(data, null, 2);
    downloadBlob(json, '班主任工作台备份_' + today() + '.json', 'application/json;charset=utf-8');
    showToast('备份已下载');
  }

  function restoreAll() {
    el('file-restore').click();
  }

  function handleRestoreFile(file) {
    var reader = new FileReader();
    reader.onload = function (e) {
      try {
        var data = JSON.parse(e.target.result);
        if (!data.tables) throw new Error('备份文件格式不正确');
        if (!confirm('将用备份数据覆盖当前全部数据，是否继续？')) return;
        state.tables = data.tables || {};
        state.grades = data.grades || { exams: [], scores: {} };
        state.todo = data.todo || { items: [] };
        saveState();
        render();
        showToast('恢复成功');
      } catch (err) {
        showToast('恢复失败：' + err.message);
      }
    };
    reader.readAsText(file);
  }

  // ============ 移动端侧边栏 ============
  function setupMobileSidebar() {
    var sidebar = el('sidebar');
    // 添加遮罩（如果不存在）
    if (!document.querySelector('.sidebar-mask')) {
      var mask = document.createElement('div');
      mask.className = 'sidebar-mask';
      mask.id = 'sidebar-mask';
      mask.addEventListener('click', function () {
        sidebar.classList.remove('open');
        mask.classList.remove('show');
      });
      document.body.appendChild(mask);
    }
    el('btn-menu').addEventListener('click', function () {
      sidebar.classList.toggle('open');
      el('sidebar-mask').classList.toggle('show');
    });
    // 路由变化时关闭
    var origNavigate = navigate;
  }

  // ============ 事件绑定 ============
  function bindGlobal() {
    el('btn-backup').addEventListener('click', backupAll);
    el('btn-restore').addEventListener('click', restoreAll);
    el('file-restore').addEventListener('change', function (e) {
      var file = e.target.files[0];
      if (file) handleRestoreFile(file);
      e.target.value = '';
    });
    // Excel 导入文件选择
    el('file-import').addEventListener('change', function (e) {
      var file = e.target.files[0];
      if (file) handleImportFile(file);
      e.target.value = '';
    });
    setupMobileSidebar();
  }

  // ============ 启动 ============
  function init() {
    bindGlobal();
    render();
  }

  // 暴露给外部（views 文件）
  window.WB = {
    state: state,
    saveState: saveState,
    getTable: getTable,
    navigate: navigate,
    showToast: showToast,
    openModal: openModal,
    openForm: openForm,
    today: today,
    uid: uid,
    escapeHtml: escapeHtml,
    downloadBlob: downloadBlob,
    csvEscape: csvEscape,
    render: render,
    init: init
  };

  // DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
