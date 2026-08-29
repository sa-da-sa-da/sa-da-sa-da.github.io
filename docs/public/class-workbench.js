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
  function renderTablePage(tableId) {
    var def = findTableDef(tableId);
    if (!def) return '<div class="card">未找到该表</div>';
    var table = getTable(tableId);
    var fields = def.table.fields;

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

    // 工具栏
    html += '<div class="table-toolbar">';
    html += '<button class="btn btn-primary" id="btn-new">＋ 新增</button>';
    if (filterField) {
      html += '<select class="filter" id="filter-sel">';
      html += '<option value="">全部 ' + escapeHtml(filterField.label) + '</option>';
      (filterField.options || []).forEach(function (o) {
        html += '<option value="' + escapeHtml(o) + '">' + escapeHtml(o) + '</option>';
      });
      html += '</select>';
    }
    html += '<div class="search"><input id="search-input" placeholder="关键词检索（全字段模糊）"></div>';
    html += '<div class="spacer"></div>';
    html += '<button class="btn" id="btn-export">⬇ 导出</button>';
    html += '</div>';

    // 表格
    html += '<div class="table-wrap"><div class="table-scroll">';
    html += '<table class="data"><thead><tr>';
    fields.forEach(function (f) {
      html += '<th>' + escapeHtml(f.label) + '</th>';
    });
    html += '<th class="op">操作</th></tr></thead><tbody id="tbody">';

    if (table.length === 0) {
      html += '<tr><td colspan="' + (fields.length + 1) + '" class="empty">暂无数据，点击右上角「新增」添加</td></tr>';
    } else {
      table.forEach(function (row, idx) {
        html += '<tr>';
        fields.forEach(function (f) {
          var v = row[f.name];
          var cls = f.type === 'textarea' ? ' class="wrap"' : '';
          if (f.type === 'textarea' && v) v = escapeHtml(v).slice(0, 80) + (v.length > 80 ? '…' : '');
          else v = escapeHtml(v);
          html += '<td' + cls + '>' + (v || '<span style="color:var(--c-text-3)">—</span>') + '</td>';
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

    el('btn-new').addEventListener('click', function () {
      openForm(tableId, null);
    });

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
          saveState();
          render();
          showToast('已删除');
        }
      }
    });

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
    if (rows.length === 0) {
      tbody.innerHTML = '<tr><td colspan="' + (fields.length + 1) + '" class="empty">无匹配数据</td></tr>';
      return;
    }
    var html = '';
    rows.forEach(function (row) {
      html += '<tr>';
      fields.forEach(function (f) {
        var v = row[f.name];
        var cls = f.type === 'textarea' ? ' class="wrap"' : '';
        if (f.type === 'textarea' && v) v = escapeHtml(v).slice(0, 80) + (v.length > 80 ? '…' : '');
        else v = escapeHtml(v);
        html += '<td' + cls + '>' + (v || '<span style="color:var(--c-text-3)">—</span>') + '</td>';
      });
      // 找到原索引以正确定位删除/编辑
      var idx = getTable(tableId).indexOf(row);
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

  // ============ 模态框 ============
  function openModal(title, bodyHtml, buttons, onAction) {
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
