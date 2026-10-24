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

  // ============ 隐私遮罩（一键隐藏，截图防泄露） ============
  function privacyOn() {
    try { return localStorage.getItem('wb_privacy') === '1'; } catch (e) { return false; }
  }
  function maskText(v) { return privacyOn() ? '***' : v; }
  // 判断字段是否为隐私字段（姓名 / 学号 / 电话 / 住址 / 家长 / 紧急联系人 / 室友 / 健康等）
  function isPrivateField(f) {
    if (!f) return false;
    var n = String(f.name || '').toLowerCase();
    if (['name','studentno','phone','address','wechat','parentname','guardianphone','emergencyphone','roommate','building','roomno','bedno','host','handler','allergy','chronic','medication'].indexOf(n) >= 0) return true;
    var lbl = f.label || '';
    if (/姓名|学号|联系电话|家庭住址|微信号|家长(姓名|电话)|紧急联系人|室友|床位号|房间号|楼栋|主讲人|处理人|过敏源|慢性病|常用药物/.test(lbl)) return true;
    return false;
  }
  // 通用表格单元格渲染（自动对隐私字段打码）
  function cellHtml(tableId, f, row) {
    if (f.type === 'tags') {
      var rtags = Array.isArray(row[f.name]) ? row[f.name] : [];
      return '<td><div class="cell-tags">' + (rtags.map(tagChipHtml).join('') || '<span style="color:var(--c-text-3)">—</span>') + '</div></td>';
    }
    if (f.name === 'name') {
      return '<td>' + renderNameCell(tableId, row, row[f.name]) + '</td>';
    }
    var v = row[f.name];
    if (isPrivateField(f)) v = maskText(v);
    var tdCls = f.type === 'textarea' ? ' class="wrap"' : '';
    var disp = v;
    if (f.type === 'textarea' && disp) disp = escapeHtml(disp).slice(0, 80) + (String(disp).length > 80 ? '…' : '');
    else disp = escapeHtml(disp);
    return '<td' + tdCls + '>' + (disp || '<span style="color:var(--c-text-3)">—</span>') + '</td>';
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

  // ============ 多班级 ============
  // 旧版本（单班级）数据迁移：把顶层业务数据收进「默认班级」桶
  function migrateClasses() {
    if (state.classes && state.classes.list && state.classes.list.length) {
      // 已有班级体系，但可能缺少桶结构兜底
      if (!state.classData) state.classData = {};
      return;
    }
    var defId = 'c_' + Date.now().toString(36);
    state.classes = { list: [{ id: defId, name: '默认班级' }], cur: defId };
    state.classData = {};
    state.classData[defId] = {
      tables: state.tables || {},
      grades: state.grades || { exams: [], scores: {} },
      schedule: state.schedule || null,
      todo: state.todo || { items: [] },
      versions: state.versions || [],
      collapsedGroups: state.collapsedGroups || {}
    };
    persist();
  }
  migrateClasses();

  function getCurClassName() {
    var cls = state.classes || { list: [] };
    for (var i = 0; i < cls.list.length; i++) {
      if (cls.list[i].id === cls.cur) return cls.list[i].name;
    }
    return '默认班级';
  }

  // 把当前顶层数据写回当前班级桶（切换 / 恢复备份前调用）
  function saveCurClass() {
    if (!state.classes || !state.classData) return;
    state.classData[state.classes.cur] = {
      tables: state.tables || {},
      grades: state.grades || { exams: [], scores: {} },
      schedule: state.schedule || null,
      todo: state.todo || { items: [] },
      versions: state.versions || [],
      collapsedGroups: state.collapsedGroups || {}
    };
  }

  // 切换班级：先保存当前班级，再从目标班级桶恢复
  function loadClass(id) {
    if (!state.classData) state.classData = {};
    if (!state.classes) state.classes = { list: [], cur: id };
    if (!state.classData[id]) {
      // 目标班级还没有任何数据（异常情况），建立空桶
      state.classData[id] = { tables: {}, grades: { exams: [], scores: {} }, schedule: null, todo: { items: [] }, versions: [], collapsedGroups: {} };
    }
    saveCurClass();
    state.classes.cur = id;
    var d = state.classData[id];
    state.tables = d.tables || {};
    state.grades = d.grades || { exams: [], scores: {} };
    state.schedule = d.schedule || null;
    state.todo = d.todo || { items: [] };
    state.versions = d.versions || [];
    state.collapsedGroups = d.collapsedGroups || {};
    // 兜底：为配置中新增、但班级桶里不存在的表建立空数组
    window.WB_CONFIG.modules.forEach(function (mod) {
      if (mod.subs) {
        mod.subs.forEach(function (sub) {
          if (sub.fields && !state.tables[sub.id]) state.tables[sub.id] = [];
        });
      }
    });
    persist();
    route = { view: 'dashboard' };
    saveRoute();
    render();
    closeModal();
    showToast('已切换到班级：' + getCurClassName());
  }

  // 新建班级并切换到新班级
  function addClass(name) {
    if (!state.classes) state.classes = { list: [], cur: null };
    if (!state.classData) state.classData = {};
    name = String(name || '').trim();
    if (!name) { showToast('请输入班级名称'); return; }
    for (var i = 0; i < state.classes.list.length; i++) {
      if (state.classes.list[i].name === name) { showToast('班级已存在：' + name); return; }
    }
    var id = 'c_' + Date.now().toString(36) + Math.floor(Math.random() * 99);
    state.classes.list.push({ id: id, name: name });
    state.classData[id] = { tables: {}, grades: { exams: [], scores: {} }, schedule: null, todo: { items: [] }, versions: [], collapsedGroups: {} };
    saveCurClass();
    state.classes.cur = id;
    state.tables = state.classData[id].tables;
    state.grades = state.classData[id].grades;
    state.schedule = null;
    state.todo = state.classData[id].todo;
    state.versions = [];
    state.collapsedGroups = {};
    // 为所有表建立空数组
    window.WB_CONFIG.modules.forEach(function (mod) {
      if (mod.subs) {
        mod.subs.forEach(function (sub) {
          if (sub.fields && !state.tables[sub.id]) state.tables[sub.id] = [];
        });
      }
    });
    persist();
    route = { view: 'dashboard' };
    saveRoute();
    render();
    closeModal();
    showToast('已创建并切换到班级：' + name);
  }

  // 重命名班级
  function renameClass(id, name) {
    name = String(name || '').trim();
    if (!name) { showToast('班级名称不能为空'); return; }
    var cls = state.classes || { list: [] };
    for (var i = 0; i < cls.list.length; i++) {
      if (cls.list[i].id !== id && cls.list[i].name === name) { showToast('班级已存在：' + name); return; }
    }
    for (var j = 0; j < cls.list.length; j++) {
      if (cls.list[j].id === id) cls.list[j].name = name;
    }
    persist();
    renderSidebar();
    closeModal();
    showToast('班级已重命名：' + name);
  }

  // 删除班级（保留最后一个班级，删除前确认）
  function removeClass(id) {
    var cls = state.classes || { list: [] };
    if (cls.list.length <= 1) { showToast('至少保留一个班级'); return; }
    var name = '';
    for (var i = 0; i < cls.list.length; i++) if (cls.list[i].id === id) name = cls.list[i].name;
    if (!confirm('删除班级「' + name + '」将永久清除该班全部数据（花名册 / 成绩 / 课程表 / 待办 / 快照），且不可恢复！确定删除？')) return;
    cls.list = cls.list.filter(function (c) { return c.id !== id; });
    delete state.classData[id];
    if (state.classes.cur === id) {
      // 删除的是当前班级：切到列表第一个班级
      state.classes.cur = cls.list[0].id;
      var d = state.classData[cls.list[0].id] || {};
      state.tables = d.tables || {};
      state.grades = d.grades || { exams: [], scores: {} };
      state.schedule = d.schedule || null;
      state.todo = d.todo || { items: [] };
      state.versions = d.versions || [];
      state.collapsedGroups = d.collapsedGroups || {};
    }
    persist();
    route = { view: 'dashboard' };
    saveRoute();
    render();
    closeModal();
    showToast('班级「' + name + '」已删除');
  }

  // 班级管理弹窗：新建 / 切换 / 重命名 / 删除
  function openClassManager() {
    var cls = state.classes || { list: [] };
    var html = '<div style="font-size:12px;color:var(--c-text-2);margin-bottom:10px;line-height:1.7">' +
      '每个班级拥有完全独立的数据（花名册 / 成绩 / 课程表 / 待办 / 快照），互不影响。' +
      '点击班级名可快速切换当前班级。</div>';
    html += '<div class="cls-list">';
    cls.list.forEach(function (c) {
      var cur = c.id === cls.cur;
      html += '<div class="cls-row' + (cur ? ' cur' : '') + '" data-cls-id="' + escapeHtml(c.id) + '">';
      html += '<span class="cls-name' + (cur ? '' : ' switchable') + '" data-cls-switch="' + escapeHtml(c.id) + '">' + escapeHtml(c.name) + '</span>';
      if (cur) html += '<span class="cls-cur">当前</span>';
      html += '<span class="cls-ops">';
      html += '<button class="btn btn-sm" data-cls-edit="' + escapeHtml(c.id) + '" title="重命名">✏️</button>';
      if (cls.list.length > 1) html += '<button class="btn btn-sm btn-danger" data-cls-del="' + escapeHtml(c.id) + '" title="删除该班全部数据">🗑</button>';
      html += '</span></div>';
    });
    html += '</div>';
    html += '<div class="cls-new">';
    html += '<input id="cls-new-name" placeholder="新班级名称，如 初二(1)班" style="flex:1;min-width:0">';
    html += '<button class="btn btn-primary" id="cls-new-btn">＋ 新建</button>';
    html += '</div>';
    WB.openModal('🏫 班级管理', html, [{ text: '关闭', cls: 'btn btn-primary', act: 'close' }], null, function (bodyRef) {
      // 新建班级
      var newBtn = bodyRef.querySelector('#cls-new-btn');
      var newInput = bodyRef.querySelector('#cls-new-name');
      function doAdd() {
        var n = newInput.value;
        if (!String(n || '').trim()) { showToast('请输入班级名称'); return; }
        addClass(n);
      }
      newBtn.addEventListener('click', doAdd);
      newInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') doAdd(); });
      // 切换 / 重命名 / 删除
      bodyRef.querySelectorAll('[data-cls-switch]').forEach(function (sp) {
        sp.addEventListener('click', function () { loadClass(sp.dataset.clsSwitch); });
      });
      bodyRef.querySelectorAll('[data-cls-edit]').forEach(function (bt) {
        bt.addEventListener('click', function () {
          var id = bt.dataset.clsEdit;
          var curName = '';
          for (var i = 0; i < state.classes.list.length; i++) {
            if (state.classes.list[i].id === id) curName = state.classes.list[i].name;
          }
          var n = prompt('输入新的班级名称：', curName);
          if (n && n.trim()) renameClass(id, n.trim());
        });
      });
      bodyRef.querySelectorAll('[data-cls-del]').forEach(function (bt) {
        bt.addEventListener('click', function () { removeClass(bt.dataset.clsDel); });
      });
    });
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
    var defId = 'c_' + Date.now().toString(36);
    return {
      tables: tables, grades: grades, todo: { items: [] }, schedule: null, versions: [],
      collapsedGroups: {},
      quickWords: ['班级管理经验', '教学设计', '班主任工作总结'],
      classes: { list: [{ id: defId, name: '默认班级' }], cur: defId },
      classData: {}
    };
  }

  // ============ 统一标签系统 ============
  // 返回标签所属分组的颜色；未匹配任何分组则用「自定义」色
  function tagColorOf(tag) {
    var groups = window.WB_CONFIG.tagGroups || [];
    for (var i = 0; i < groups.length; i++) {
      if (groups[i].tags.indexOf(tag) >= 0) return groups[i].color;
    }
    // 自定义标签：查历史记录中的颜色，否则用 custom 组色
    for (var j = 0; j < groups.length; j++) {
      if (groups[j].id === 'custom') return groups[j].color;
    }
    return '#64748b';
  }

  // 渲染彩色标签胶囊
  function tagChipHtml(tag) {
    var c = tagColorOf(tag);
    return '<span class="ftag on" style="--tc:' + c + '" data-tag="' + escapeHtml(tag) + '">' + escapeHtml(tag) + '</span>';
  }

  // 家长通讯录姓名列：显示「学号 · 姓名」，并对重名学生给出角标，避免混淆
  function renderNameCell(tableId, row, nameVal) {
    if (tableId !== 'contacts') return escapeHtml(maskText(nameVal));
    var no = maskText(row.studentNo || '');
    var dup = 0;
    (getTable('contacts') || []).forEach(function (r) { if (r.name && r.name === nameVal) dup++; });
    var h = (no ? '<span class="sn-no">' + escapeHtml(no) + '</span><span class="sn-sep"> · </span>' : '') +
            (escapeHtml(maskText(nameVal)) || '<span style="color:var(--c-text-3)">—</span>');
    if (dup > 1) h += ' <span class="dup-badge" title="存在重名学生，请核对学号">×' + dup + '</span>';
    return h;
  }

  // 旧数据迁移：把花名册遗留的 position/talent 字段合并进 tags 标签数组（一次性）
  function migrateRosterTags() {
    var roster = state.tables.roster || [];
    var changed = false;
    roster.forEach(function (r) {
      if (r.__tagsMigrated) return;
      var t = Array.isArray(r.tags) ? r.tags.slice() : [];
      if (r.position && t.indexOf(r.position) < 0) t.unshift(r.position);
      if (r.talent) {
        String(r.talent).split(/[\/、,，;；\s]+/).forEach(function (x) {
          x = x.trim();
          if (x && t.indexOf(x) < 0) t.push(x);
        });
      }
      r.tags = t;
      delete r.position;
      delete r.talent;
      r.__tagsMigrated = true;
      changed = true;
    });
    if (changed) persist();
  }

  // ============ 持久化 + 版本快照 ============
  function persist() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
    catch (e) { showToast('保存失败：存储已满或被禁用'); }
  }

  function saveState() {
    persist();
    autoSnapshot();
  }

  // 创建版本快照（手动或自动）。内部只持久化，不触发 saveState，避免递归。
  function createVersion(name, auto) {
    if (!state.versions) state.versions = [];
    var snap = {
      tables: JSON.parse(JSON.stringify(state.tables || {})),
      grades: JSON.parse(JSON.stringify(state.grades || { exams: [], scores: {} })),
      todo: JSON.parse(JSON.stringify(state.todo || { items: [] })),
      schedule: state.schedule ? JSON.parse(JSON.stringify(state.schedule)) : null
    };
    state.versions.push({ id: uid(), name: name, time: new Date().toISOString(), auto: !!auto, snap: snap });
    if (state.versions.length > 60) state.versions = state.versions.slice(-60);
    persist();
  }

  // 自动快照：距离上一个自动快照超过 10 分钟才生成，避免频繁写入
  function autoSnapshot() {
    if (!state.versions) state.versions = [];
    var now = Date.now();
    var lastAuto = null;
    for (var i = state.versions.length - 1; i >= 0; i--) {
      if (state.versions[i].auto) { lastAuto = state.versions[i]; break; }
    }
    if (lastAuto && (now - new Date(lastAuto.time).getTime()) < 10 * 60 * 1000) return;
    var d = new Date();
    createVersion('自动快照 ' + (d.getMonth() + 1) + '/' + d.getDate() + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()), true);
  }

  function openVersions() {
    if (!state.versions) state.versions = [];
    var html = '<div style="display:flex;gap:8px;margin-bottom:12px;align-items:center">' +
      '<input id="ver-name" placeholder="版本名称，如：开学初 / 月考后" style="flex:1">' +
      '<button class="btn btn-primary" id="ver-create" style="flex-shrink:0">💾 保存当前</button></div>' +
      '<div style="font-size:12px;color:var(--c-text-2);margin-bottom:8px">' +
      '自动快照每 10 分钟生成一次；手动版本可用于关键节点（开学、月考、调座后）。最多保留 60 个。<br>' +
      '<span style="color:var(--c-text-3)">注：版本快照只包含本工作台表格数据，<b>座位表需通过顶部「💾 备份」导出</b>（备份文件已含座位表全部班级）。</span></div>' +
      '<div id="ver-list">' + renderVerList() + '</div>';
    WB.openModal('📦 版本管理', html, [{ text: '关闭', cls: 'btn btn-primary', act: 'close' }], null, function (body) {
      var create = body.querySelector('#ver-create');
      if (create) create.onclick = function () {
        var nameInput = body.querySelector('#ver-name');
        var name = (nameInput.value || '').trim() || ('版本 ' + (state.versions.length + 1));
        createVersion(name, false);
        body.querySelector('#ver-list').innerHTML = renderVerList();
        nameInput.value = '';
        showToast('已创建版本「' + name + '」');
      };
      body.addEventListener('click', function (e) {
        var res = e.target.closest('[data-ver-restore]');
        var del = e.target.closest('[data-ver-del]');
        if (res) restoreVersion(res.dataset.verRestore);
        else if (del) {
          state.versions = state.versions.filter(function (x) { return x.id !== del.dataset.verDel; });
          persist();
          body.querySelector('#ver-list').innerHTML = renderVerList();
          showToast('版本已删除');
        }
      });
    });
  }

  function renderVerList() {
    if (!state.versions || state.versions.length === 0) return '<div class="empty">暂无版本快照</div>';
    return state.versions.slice().reverse().map(function (v) {
      var d = new Date(v.time);
      var timeStr = d.toLocaleString('zh-CN');
      return '<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;border:1px solid var(--c-border);border-radius:6px;margin-bottom:6px;background:#fff">' +
        '<div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:600">📦 ' + escapeHtml(v.name) + '</div>' +
        '<div style="font-size:11px;color:var(--c-text-3)">' + timeStr + (v.auto ? ' · 自动' : '') + '</div></div>' +
        '<button class="btn btn-sm" data-ver-restore="' + escapeHtml(v.id) + '">恢复</button>' +
        '<button class="btn btn-sm btn-danger" data-ver-del="' + escapeHtml(v.id) + '">删除</button></div>';
    }).join('');
  }

  function restoreVersion(id) {
    var v = (state.versions || []).find(function (x) { return x.id === id; });
    if (!v) return;
    if (!confirm('恢复将覆盖当前班级全部数据（含课程表与快照列表），是否继续？')) return;
    state.tables = JSON.parse(JSON.stringify(v.snap.tables || {}));
    state.grades = JSON.parse(JSON.stringify(v.snap.grades || { exams: [], scores: {} }));
    state.todo = JSON.parse(JSON.stringify(v.snap.todo || { items: [] }));
    state.schedule = v.snap.schedule ? JSON.parse(JSON.stringify(v.snap.schedule)) : null;
    saveCurClass(); // 同步回当前班级桶
    persist();
    render();
    showToast('已恢复到「' + v.name + '」');
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
    // 班级切换条
    html += '<div class="cls-bar">';
    html += '<span class="cls-bar-icon">🏫</span>';
    html += '<select id="cls-sel" title="切换班级，各班数据完全独立">';
    (state.classes ? state.classes.list : []).forEach(function (c) {
      html += '<option value="' + escapeHtml(c.id) + '"' + (c.id === state.classes.cur ? ' selected' : '') + '>' + escapeHtml(c.name) + '</option>';
    });
    html += '</select>';
    html += '<button class="cls-bar-btn" id="cls-manage" title="新建 / 重命名 / 删除班级">⚙</button>';
    html += '</div>';
    html += '<nav class="nav" id="nav">';

    var collapsed = state.collapsedGroups || {};
    window.WB_CONFIG.modules.forEach(function (mod) {
      if (mod.type === 'group') {
        var isCollapsed = !!collapsed[mod.id];
        // 若当前 group 下有子项被选中，强制展开
        if (mod.subs.some(function (sub) { return route.view === 'table' && route.table === sub.id; })) {
          isCollapsed = false;
        }
        html += '<div class="nav-group">';
        html += renderNavItem(mod, mod.id, true, isCollapsed);
        if (!isCollapsed) {
          mod.subs.forEach(function (sub) {
            html += renderNavItem(sub, 'sub:' + sub.id, false);
          });
        }
        html += '</div>';
      } else if (mod.type === 'dashboard') {
        html += renderNavItem(mod, 'dashboard');
      } else if (mod.type === 'schedule') {
        html += renderNavItem(mod, 'schedule');
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

    // 班级切换
    var clsSel = el('cls-sel');
    if (clsSel) {
      clsSel.addEventListener('change', function () { loadClass(clsSel.value); });
    }
    var clsMgr = el('cls-manage');
    if (clsMgr) clsMgr.addEventListener('click', openClassManager);

    // 绑定点击
    var nav = el('nav');
    nav.addEventListener('click', function (e) {
      var item = e.target.closest('.nav-item');
      if (!item) return;
      var target = item.dataset.target;
      itemClickHandler(target);
    });
  }

  function renderNavItem(item, target, isParent, isCollapsed) {
    var count = '';
    if (!isParent && item.fields) {
      var arr = getTable(item.id);
      if (arr.length > 0) count = '<span class="count">' + arr.length + '</span>';
    }
    var active = false;
    if (target === 'dashboard' && route.view === 'dashboard') active = true;
    if (target === 'schedule' && route.view === 'schedule') active = true;
    if (target === 'dailySchedule' && route.view === 'dailySchedule') active = true;
    if (target === 'grades' && route.view === 'grades') active = true;
    if (target === 'todo' && route.view === 'todo') active = true;
    if (target === 'exams' && route.view === 'exams') active = true;
    if (target.indexOf('sub:') === 0 && route.view === 'table' && route.table === target.slice(4)) active = true;
    var arrow = isParent ? '<span class="nav-arrow">' + (isCollapsed ? '▶' : '▼') + '</span>' : '';
    return '<button class="nav-item ' + (active ? 'active' : '') + (isParent ? ' nav-parent' : '') + '" data-target="' + target + '">' +
      '<span class="icon">' + (item.icon || '·') + '</span>' +
      '<span class="label">' + escapeHtml(item.label) + '</span>' + count + arrow +
      '</button>';
  }

  function itemClickHandler(target) {
    if (target === 'dashboard') { navigate('dashboard'); return; }
    if (target === 'schedule') { navigate('schedule'); return; }
    if (target === 'dailySchedule') { navigate('dailySchedule'); return; }
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
    // 一级 group 节点：切换折叠/展开
    var mod = findModule(target);
    if (mod && mod.type === 'group') {
      state.collapsedGroups = state.collapsedGroups || {};
      state.collapsedGroups[mod.id] = !state.collapsedGroups[mod.id];
      persist();
      renderSidebar();
      return;
    }
  }

  function updateCrumb() {
    var parts = [];
    parts.push('🏫 ' + getCurClassName());
    if (route.view === 'dashboard') parts.push('首页仪表盘');
    else if (route.view === 'schedule') parts.push('课程表');
    else if (route.view === 'dailySchedule') parts.push('作息时间表');
    else if (route.view === 'grades') {
      parts.push('智能成绩分析');
      if (route.param && route.param.indexOf('exam:') === 0) {
        parts.push('考试录入：' + route.param.slice(5));
      }
    }
    else if (route.view === 'points') parts.push('积分管理');
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
    } else if (route.view === 'schedule') {
      c.innerHTML = window.WB_VIEWS.renderSchedule();
      var sc = state.schedule;
      if (sc && sc.mode === 'teacher') window.WB_VIEWS.bindTeacherTable();
      else window.WB_VIEWS.bindSchedule();
    } else if (route.view === 'dailySchedule') {
      c.innerHTML = window.WB_VIEWS.renderDailySchedule();
      window.WB_VIEWS.bindDailySchedule();
    } else if (route.view === 'grades') {
      c.innerHTML = window.WB_VIEWS.renderGrades();
      window.WB_VIEWS.bindGrades();
    } else if (route.view === 'points') {
      c.innerHTML = window.WB_VIEWS.renderPoints();
      window.WB_VIEWS.bindPoints();
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
    // 统一筛选器状态：{ tableId -> { kw, cat, from, to, tags: [] } }，模块内记忆
    var filterState = {};

  function getFilterState(tableId) {
    if (!filterState[tableId]) filterState[tableId] = { kw: '', cat: '', from: '', to: '', tags: [] };
    return filterState[tableId];
  }

  // 分类下拉字段：第一个 select 字段；日期范围字段：第一个 date 字段
  function resolveFilterFields(fields) {
    var selectField = null, dateField = null;
    fields.forEach(function (f) {
      if (!selectField && f.type === 'select') selectField = f;
      if (!dateField && f.type === 'date') dateField = f;
    });
    return { selectField: selectField, dateField: dateField };
  }

  // 收集表中出现过的全部标签（预置组在前，数据中出现但不预置的在后）
  function collectAllTags(tableId) {
    var groups = window.WB_CONFIG.tagGroups || [];
    var seen = {}, arr = [];
    groups.forEach(function (g) {
      g.tags.forEach(function (t) {
        if (!seen[t]) { seen[t] = 1; arr.push(t); }
      });
    });
    (getTable(tableId) || []).forEach(function (r) {
      (Array.isArray(r.tags) ? r.tags : []).forEach(function (t) {
        if (!seen[t]) { seen[t] = 1; arr.push(t); }
      });
    });
    return arr;
  }

  // 统一筛选栏：搜索 + 分类下拉 + 日期范围 + 标签云（点选） + 结果计数 + 清空
  function renderFilterBar(tableId, def, fields) {
    var fs = getFilterState(tableId);
    var rf = resolveFilterFields(fields);
    var hasTags = fields.some(function (f) { return f.type === 'tags'; });

    var html = '<div class="filter-bar">';
    html += '<div class="fb-row">';
    html += '<div class="search"><input id="search-input" placeholder="🔍 关键词检索（全字段模糊）" value="' + escapeHtml(fs.kw) + '"></div>';
    if (rf.selectField) {
      html += '<select class="filter" id="filter-sel">';
      html += '<option value="">全部' + escapeHtml(rf.selectField.label) + '</option>';
      (rf.selectField.options || []).forEach(function (o) {
        html += '<option value="' + escapeHtml(o) + '"' + (fs.cat === o ? ' selected' : '') + '>' + escapeHtml(o) + '</option>';
      });
      html += '</select>';
    }
    if (rf.dateField) {
      html += '<input type="date" class="filter-date" id="filter-date-from" title="日期从" value="' + escapeHtml(fs.from) + '">';
      html += '<span class="fb-sep">~</span>';
      html += '<input type="date" class="filter-date" id="filter-date-to" title="日期到" value="' + escapeHtml(fs.to) + '">';
    }
    if (hasTags) {
      html += '<button class="btn btn-sm" id="filter-tags-btn">🏷 标签' + (fs.tags.length ? '(' + fs.tags.length + ')' : '') + '</button>';
    }
    html += '<span class="fb-count" id="filter-count">共 ' + (getTable(tableId) || []).length + ' 条</span>';
    html += '<button class="btn btn-sm btn-ghost" id="filter-clear">✕ 清空</button>';
    html += '</div>';
    if (hasTags) {
      html += '<div class="fb-tags-panel" id="filter-tags-panel" style="display:' + (fs.tags.length ? 'flex' : 'none') + '">';
      collectAllTags(tableId).forEach(function (t) {
        html += '<span class="ftag' + (fs.tags.indexOf(t) >= 0 ? ' on' : '') + '" style="--tc:' + tagColorOf(t) + '" data-ftag="' + escapeHtml(t) + '">' + escapeHtml(t) + '</span>';
      });
      html += '</div>';
    }
    html += '</div>';
    return html;
  }

  function updateFilterCount(tableId, n, total) {
    var c = el('filter-count');
    if (c) c.textContent = (n < total ? '筛出 ' + n + ' / 共 ' + total + ' 条' : '共 ' + total + ' 条');
  }

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

    // 值日排班专属：周视图可视化（替代标准表格）
    if (tableId === 'duty') {
      return window.WB_VIEWS.renderDutyWeekView();
    }

    // 住宿信息专属：床位画布（默认视图，可切回表格模式批量导入/编辑）
    if (tableId === 'dorm' && !state.dormTableMode) {
      return window.WB_VIEWS.renderDormCanvas();
    }

    var table = getTable(tableId);
    var fields = def.table.fields;
    var sel = getSel(tableId);

    var html = '';
    html += '<div class="card">';
    html += '<div class="card-title">' + (def.table.icon || '') + ' ' + escapeHtml(def.table.label) +
      '<span class="extra">共 ' + table.length + ' 条</span></div>';

    // 工具栏：主操作区
    html += '<div class="table-toolbar">';
    html += '<div class="toolbar-group">';
    html += '<button class="btn btn-primary" id="btn-new">＋ 新增</button>';
    html += '<button class="btn" id="btn-import" title="选择 .xlsx/.xls/.csv 文件，多列自动映射批量添加">📥 批量添加</button>';
    html += '<button class="btn" id="btn-template" title="下载空白模板用于填写后导入">⬇ 模板</button>';
    html += '</div>';
    html += '<div class="spacer"></div>';
    html += '<button class="btn" id="btn-export">⬇ 导出</button>';
    html += '</div>';

    // 统一筛选栏：搜索 + 分类 + 日期范围 + 标签云 + 计数 + 清空
    html += renderFilterBar(tableId, def, fields);

    // 批量操作条（仅在选中时显示）
    html += '<div class="batch-bar" id="batch-bar" style="display:none">';
    html += '<span class="info">已选 <strong id="sel-count">0</strong> 条</span>';
    html += '<div class="spacer"></div>';
    html += '<button class="btn btn-sm" id="btn-sel-all">全选</button>';
    html += '<button class="btn btn-sm" id="btn-sel-none">取消</button>';
    html += '<button class="btn btn-sm btn-danger" id="btn-batch-del">🗑 批量删除</button>';
    html += '</div>';

    // 表格（含复选列）；list:false 的字段不单独成列（如通讯录学号，与姓名同格显示）
    var visibleFields = fields.filter(function (f) { return f.list !== false; });
    html += '<div class="table-wrap"><div class="table-scroll">';
    html += '<table class="data"><thead><tr>';
    html += '<th class="checkbox-cell"><input type="checkbox" id="check-all" title="全选/取消"></th>';
    visibleFields.forEach(function (f) {
      html += '<th>' + escapeHtml(f.label) + '</th>';
    });
    html += '<th class="op">操作</th></tr></thead><tbody id="tbody">';

    if (table.length === 0) {
      html += '<tr><td colspan="' + (visibleFields.length + 2) + '" class="empty">暂无数据，点击右上角「新增」或「批量添加」</td></tr>';
    } else {
      table.forEach(function (row, idx) {
        var checked = sel.has(idx) ? ' checked' : '';
        var cls = sel.has(idx) ? ' class="selected"' : '';
        html += '<tr' + cls + '>';
        html += '<td class="checkbox-cell"><input type="checkbox" data-sel="' + idx + '"' + checked + '></td>';
        visibleFields.forEach(function (f) { html += cellHtml(tableId, f, row); });
        html += '<td class="op"><button class="btn btn-sm" data-act="edit" data-idx="' + idx + '">编辑</button>' +
                '<button class="btn btn-sm btn-danger" data-act="del" data-idx="' + idx + '">删除</button></td>';
        html += '</tr>';
      });
    }
    html += '</tbody></table></div></div>';
    html += '</div>';
    // 住宿信息表格模式：顶部提供切回画布入口
    if (tableId === 'dorm') {
      html = '<div class="card"><div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">' +
        '<button class="btn btn-primary" id="dm-to-canvas">🛏 切换床位画布</button>' +
        '<span style="font-size:12px;color:var(--c-text-2)">表格模式：适合批量导入与编辑完整字段，画布模式用于可视化分配床位</span>' +
        '</div></div>' + html;
    }
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
    // 值日排班专属：周视图绑定
    if (tableId === 'duty') {
      window.WB_VIEWS.bindDutyWeekView();
      return;
    }
    // 住宿信息专属：床位画布绑定（表格模式走通用 CRUD 绑定）
    if (tableId === 'dorm' && !state.dormTableMode) {
      window.WB_VIEWS.bindDormCanvas();
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

    // 统一筛选器绑定
    var search = el('search-input');
    if (search) {
      search.addEventListener('input', function () { applyFilter(tableId); });
    }
    var filter = el('filter-sel');
    if (filter) {
      filter.addEventListener('change', function () { applyFilter(tableId); });
    }
    ['filter-date-from', 'filter-date-to'].forEach(function (id) {
      var inp = el(id);
      if (inp) inp.addEventListener('change', function () { applyFilter(tableId); });
    });
    var tagsBtn = el('filter-tags-btn');
    var tagsPanel = el('filter-tags-panel');
    if (tagsBtn && tagsPanel) {
      tagsBtn.addEventListener('click', function () {
        tagsPanel.style.display = tagsPanel.style.display === 'none' ? 'flex' : 'none';
      });
      tagsPanel.addEventListener('click', function (e) {
        var t = e.target.closest('[data-ftag]');
        if (!t) return;
        var fs = getFilterState(tableId);
        var tag = t.dataset.ftag;
        var i = fs.tags.indexOf(tag);
        if (i >= 0) { fs.tags.splice(i, 1); t.classList.remove('on'); }
        else { fs.tags.push(tag); t.classList.add('on'); }
        tagsBtn.textContent = '🏷 标签' + (fs.tags.length ? '(' + fs.tags.length + ')' : '');
        applyFilter(tableId);
      });
    }
    var clearBtn = el('filter-clear');
    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        filterState[tableId] = { kw: '', cat: '', from: '', to: '', tags: [] };
        render();
      });
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
    // 初始更新筛选计数（无筛选时显示"共 N 条"）
    applyFilter(tableId);
    // 住宿信息表格模式：切回画布
    el('dm-to-canvas') && el('dm-to-canvas').addEventListener('click', function () {
      state.dormTableMode = false;
      saveState();
      render();
    });
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
    var fs = getFilterState(tableId);
    var rf = resolveFilterFields(fields);

    // DOM → 状态（模块内记忆；标签状态直接维护在 fs.tags）
    fs.kw = (el('search-input') || {}).value || '';
    var selEl = el('filter-sel');
    fs.cat = selEl ? selEl.value : '';
    var fromEl = el('filter-date-from'), toEl = el('filter-date-to');
    fs.from = fromEl ? fromEl.value : '';
    fs.to = toEl ? toEl.value : '';

    var table = getTable(tableId);
    var filtered = table.filter(function (row) {
      // 分类下拉
      if (rf.selectField && fs.cat && String(row[rf.selectField.name] || '') !== fs.cat) return false;
      // 日期范围
      if (rf.dateField && (fs.from || fs.to)) {
        var dv = String(row[rf.dateField.name] || '');
        if (fs.from && (!dv || dv < fs.from)) return false;
        if (fs.to && (!dv || dv > fs.to)) return false;
      }
      // 标签叠加筛选（需同时拥有全部所选标签）
      if (fs.tags && fs.tags.length) {
        var rt = Array.isArray(row.tags) ? row.tags : [];
        for (var i = 0; i < fs.tags.length; i++) {
          if (rt.indexOf(fs.tags[i]) < 0) return false;
        }
      }
      // 关键词（全字段 + 标签）
      if (fs.kw) {
        var kw = fs.kw.toLowerCase();
        var hit = false;
        fields.forEach(function (f) {
          var v = row[f.name];
          if (Array.isArray(v)) v = v.join(' ');
          if (v && String(v).toLowerCase().indexOf(kw) >= 0) hit = true;
        });
        if (!hit) return false;
      }
      return true;
    });

    renderFiltered(tableId, filtered, fields);
    updateFilterCount(tableId, filtered.length, table.length);
  }

  function renderFiltered(tableId, rows, fields) {
    var tbody = el('tbody');
    var sel = getSel(tableId);
    var visibleFields = fields.filter(function (f) { return f.list !== false; });
    if (rows.length === 0) {
      tbody.innerHTML = '<tr><td colspan="' + (visibleFields.length + 2) + '" class="empty">无匹配数据</td></tr>';
      return;
    }
    var html = '';
    rows.forEach(function (row) {
      var idx = getTable(tableId).indexOf(row);
      var checked = sel.has(idx) ? ' checked' : '';
      var trCls = sel.has(idx) ? ' class="selected"' : '';
      html += '<tr' + trCls + '>';
      html += '<td class="checkbox-cell"><input type="checkbox" data-sel="' + idx + '"' + checked + '></td>';
      visibleFields.forEach(function (f) { html += cellHtml(tableId, f, row); });
      html += '<td class="op"><button class="btn btn-sm" data-act="edit" data-idx="' + idx + '">编辑</button>' +
              '<button class="btn btn-sm btn-danger" data-act="del" data-idx="' + idx + '">删除</button></td>';
      html += '</tr>';
    });
    tbody.innerHTML = html;
  }

  // ============ 统一学生选择器 ============
  // 判断某字段是否应使用学生选择器：
  // 1) 显式声明 picker:'student' 的表单字段优先
  // 2) 否则字段名 name 且标签含"学生/姓名"自动识别（花名册自身除外，它是数据源）
  function isStudentPickerField(tableId, f) {
    if (f.picker === 'student') return true;
    if (f.picker === 'none') return false;
    if (tableId === 'roster') return false;
    return f.name === 'name' && /学生|姓名/.test(f.label || '');
  }

  // 学生选择器弹窗：数据源唯一来自花名册，禁止手工输入
  // onPick(stu) 回调返回选中的花名册学生对象
  function openStudentPicker(onPick, opts) {
    opts = opts || {};
    var roster = getTable('roster') || [];
    var closeFn = null;
    var body = '';
    body += '<div class="picker-search"><input id="sp-kw" placeholder="🔍 搜索姓名或学号…" autocomplete="off"></div>';
    body += '<div class="picker-list" id="sp-list"></div>';
    body += '<div class="picker-tip">数据源：全班花名册。如需新增，请点击下方「＋ 新建学生」，将同步添加到花名册。</div>';

    closeFn = openModal(opts.title || '选择学生（来自花名册）', body, [
      { text: '取消', cls: 'btn', act: 'close' },
      { text: '＋ 新建学生', cls: 'btn', act: 'new' }
    ], function (act) {
      if (act === 'new') {
        // 打开花名册新增表单（会覆盖当前弹窗），保存后回选新建的学生
        openForm('roster', null, function (newStu) {
          if (newStu && onPick) onPick(newStu);
        });
        return false; // 阻止 close，保留新打开的新增表单
      }
    }, function (formHtml) {
      var listEl = formHtml.querySelector('#sp-list');
      var kwEl = formHtml.querySelector('#sp-kw');
      function renderList() {
        var kw = (kwEl.value || '').trim().toLowerCase();
        var arr = roster.filter(function (s) {
          if (!kw) return true;
          return (s.name || '').toLowerCase().indexOf(kw) >= 0 ||
                 (s.studentNo || '').toLowerCase().indexOf(kw) >= 0;
        });
        if (arr.length === 0) {
          listEl.innerHTML = '<div class="empty">' +
            (roster.length === 0 ? '花名册为空，请点击「＋ 新建学生」添加' : '未找到匹配的学生') + '</div>';
          return;
        }
        var h = '';
        arr.forEach(function (s) {
          var sid = s.__id || s.studentNo || s.name;
          var pos = s.position || (Array.isArray(s.tags) ? s.tags.slice(0, 2).join('·') : '');
          h += '<div class="picker-item" data-sid="' + escapeHtml(sid) + '">' +
            '<span class="pi-no">' + escapeHtml(s.studentNo || '—') + '</span>' +
            '<span class="pi-name">' + escapeHtml(s.name || '') + '</span>' +
            '<span class="pi-gender ' + (s.gender === '女' ? 'f' : 'm') + '">' + (s.gender === '女' ? '女' : '男') + '</span>' +
            '<span class="pi-pos">' + escapeHtml(pos) + '</span>' +
            '</div>';
        });
        listEl.innerHTML = h;
        listEl.querySelectorAll('.picker-item').forEach(function (it) {
          it.addEventListener('click', function () {
            var stu = roster.find(function (s) {
              return (s.__id || s.studentNo || s.name) === it.dataset.sid;
            });
            if (stu && onPick) onPick(stu);
            if (closeFn) closeFn();
          });
        });
      }
      kwEl.addEventListener('input', renderList);
      renderList();
      setTimeout(function () { kwEl.focus(); }, 50);
    }, 2);
  }

  // ============ 表单 ============
  // onSaved(data)：保存成功后的可选回调（用于新建学生后回填等场景）
  function openForm(tableId, editIdx, onSaved) {
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
      if (f.type === 'tags') {
        // 标签编辑器：按分组点选 + 自定义输入
        var sel = Array.isArray(row && row.tags) ? row.tags : [];
        var groups = window.WB_CONFIG.tagGroups || [];
        body += '<div class="tag-editor">';
        if (f.hint) body += '<div class="tag-hint">' + escapeHtml(f.hint) + '</div>';
        groups.forEach(function (g) {
          var chips = '';
          g.tags.forEach(function (t) {
            chips += '<span class="ftag' + (sel.indexOf(t) >= 0 ? ' on' : '') + '" style="--tc:' + g.color + '" data-tag="' + escapeHtml(t) + '">' + escapeHtml(t) + '</span>';
          });
          // 自定义组：渲染数据中存在但不属于任何预置组的标签
          if (g.id === 'custom') {
            sel.forEach(function (t) {
              var isPreset = groups.some(function (gg) { return gg.id !== 'custom' && gg.tags.indexOf(t) >= 0; });
              if (!isPreset) {
                chips += '<span class="ftag on" style="--tc:' + g.color + '" data-tag="' + escapeHtml(t) + '">' + escapeHtml(t) + '</span>';
              }
            });
          }
          if (chips) body += '<div class="tg-row"><span class="tg-label" style="color:' + g.color + '">' + escapeHtml(g.label) + '</span><div class="tg-tags"' + (g.id === 'custom' ? ' data-custom-tags' : '') + '>' + chips + '</div></div>';
        });
        body += '<div class="tag-add-row">' +
          '<input class="tag-add-input" placeholder="输入自定义标签，回车添加">' +
          '<button type="button" class="btn btn-sm tag-add-btn">＋ 添加</button>' +
          '</div></div>';
      } else if (f.type === 'textarea') {
        body += '<textarea name="' + f.name + '" data-field="' + f.name + '" ' + required + ' placeholder="' + escapeHtml(f.placeholder || '') + '">' + escapeHtml(val) + '</textarea>';
      } else if (f.type === 'select') {
        body += '<select name="' + f.name + '" data-field="' + f.name + '"' + required + '>';
        body += '<option value="">请选择</option>';
        (f.options || []).forEach(function (o) {
          body += '<option value="' + escapeHtml(o) + '"' + (o === val ? ' selected' : '') + '>' + escapeHtml(o) + '</option>';
        });
        body += '</select>';
      } else if (isStudentPickerField(tableId, f)) {
        // 学生选择器：只读输入框 + 选择按钮，禁止自由输入学生姓名
        body += '<div class="picker-wrap">' +
          '<input type="text" class="picker-input" data-field="' + f.name + '" value="' + escapeHtml(val) + '" readonly ' +
            'placeholder="点击右侧按钮从花名册选择"' + required + '>' +
          '<button type="button" class="btn btn-sm" data-pick-student="' + f.name + '">👤 选择</button>' +
          '</div>';
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
        // 标签字段：收集所有点亮的胶囊
        if (f.type === 'tags') {
          var onTags = [];
          formHtml.querySelectorAll('.tag-editor .ftag.on').forEach(function (x) { onTags.push(x.dataset.tag); });
          data[f.name] = onTags;
          return;
        }
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
      if (typeof onSaved === 'function') onSaved(data);
    }, function (formHtml) {
      // 绑定学生选择器按钮（第二层弹窗，选中后回填姓名与学号）
      // 标签编辑器：胶囊点选 + 自定义添加
      var tagEd = formHtml.querySelector('.tag-editor');
      if (tagEd) {
        tagEd.addEventListener('click', function (e) {
          var t = e.target.closest('.ftag');
          if (t) t.classList.toggle('on');
        });
        function addCustomTag() {
          var inp = tagEd.querySelector('.tag-add-input');
          var v = (inp.value || '').trim();
          if (!v) return;
          // 与已有标签同名则直接点亮，避免重复
          var existing = null;
          tagEd.querySelectorAll('.ftag').forEach(function (x) { if (x.dataset.tag === v) existing = x; });
          if (existing) {
            existing.classList.add('on');
          } else {
            var custRow = tagEd.querySelector('[data-custom-tags]');
            if (!custRow) {
              custRow = document.createElement('div');
              custRow.className = 'tg-tags';
              custRow.setAttribute('data-custom-tags', '');
              tagEd.insertBefore(custRow, tagEd.querySelector('.tag-add-row'));
            }
            var c = document.createElement('span');
            c.className = 'ftag on';
            c.style.setProperty('--tc', '#64748b');
            c.dataset.tag = v;
            c.textContent = v;
            custRow.appendChild(c);
          }
          inp.value = '';
        }
        tagEd.querySelector('.tag-add-btn').addEventListener('click', addCustomTag);
        tagEd.querySelector('.tag-add-input').addEventListener('keydown', function (e) {
          if (e.key === 'Enter') { e.preventDefault(); addCustomTag(); }
        });
      }
      formHtml.querySelectorAll('[data-pick-student]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var fname = btn.dataset.pickStudent;
          openStudentPicker(function (stu) {
            var input = formHtml.querySelector('[data-field="' + fname + '"]');
            if (input) input.value = stu.name || '';
            // 自动回填学号到同表单的 studentNo 字段（若存在且为空）
            var noInput = formHtml.querySelector('[data-field="studentNo"]');
            if (noInput && stu.studentNo && !noInput.value) noInput.value = stu.studentNo;
          });
        });
      });
    });
  }

  // ============ Excel 导入 ============
  // 通过选择 .xlsx/.xls/.csv 文件批量导入；支持多 Sheet 选择、列自动映射、数据预览
  function openExcelImport(tableId, fields) {
    var def = findTableDef(tableId);
    if (!def) return;
    // 三态判断：loading（仍在后台加载）/ ready / failed
    if (window.WB_XLSX_STATE === 'loading' && (typeof XLSX === 'undefined' || !XLSX.read)) {
      showToast('Excel 库仍在加载中，请稍候再试');
      return;
    }
    // 检查 SheetJS 是否可用（CDN 或本地降级）
    if (typeof XLSX === 'undefined' || !XLSX.read) {
      WB.openModal('Excel 库未加载',
        '<div style="font-size:13px;line-height:1.8;color:var(--c-text-2)">' +
        '📥 导入 Excel 需要加载 SheetJS 库。<br>' +
        '当前检测不到 XLSX（CDN 与本地文件均不可用）。<br>' +
        '可先改用 <b>CSV 文件</b> 导入，或下载模板填写后另存为 CSV。<br>' +
        '导出功能仍可用（会自动降级为 CSV，Excel 可打开）。</div>',
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
      '<iframe id="' + iframeId + '" src="seat-map/seat-map.html?wb=1' + (privacyOn() ? '&privacy=1' : '') + '" style="width:100%;height:calc(100vh - 160px);border:none;display:block"></iframe>' +
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
      window.open('seat-map/seat-map.html?wb=1' + (privacyOn() ? '&privacy=1' : ''), '_blank');
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
      seatMapIframeRef.src = 'seat-map/seat-map.html?wb=1' + (privacyOn() ? '&privacy=1' : '') + '&t=' + Date.now();
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
      // 最后一行且带 vip 标记 → VIP 座位行
      var isVipRow = ri === seating.length - 1 && row.length > 0 && row.some(function (s) { return s && s.vip; });
      row.forEach(function (seat, ci) {
        if (!seat || seat.isEmpty || !seat.name) return;
        var key = seat.student_id || seat.name;
        var rosterRow = studentMap[seat.name] || studentMap[seat.student_id] || {};
        if (isVipRow) {
          rows.push({
            studentNo: rosterRow.studentNo || key || '',
            name: seat.name || '',
            zone: 'VIP',
            row: '讲台',
            seatNo: 'VIP-' + (ci + 1),
            note: (rosterRow.remark || '')
          });
        } else {
          var zone = '第' + (colGroups[ci] || (ci + 1)) + '组';
          rows.push({
            studentNo: rosterRow.studentNo || key || '',
            name: seat.name || '',
            zone: zone,
            row: String(ri + 1),
            seatNo: String(ci + 1),
            note: (rosterRow.remark || '')
          });
        }
      });
    });

    state.tables.seating = rows;
    saveState();
    showToast('座位表已保存（' + rows.length + ' 人）');
  }


  // ============ 模态框 ============
  // options: onAction(act, body), mount(body)
  // 当前弹窗的关闭函数引用，供外部（如学生选择器选中后）主动关闭
  var modalCloseFn = null;
  var modal2CloseFn = null;
  function closeModal() {
    if (modal2CloseFn) { modal2CloseFn(); return; }
    if (modalCloseFn) modalCloseFn();
  }

  // layer: 1（默认主弹窗）/ 2（第二层，用于学生选择器等嵌套场景，不覆盖下层表单）
  function openModal(title, bodyHtml, buttons, onAction, mount, layer) {
    var mask = el(layer === 2 ? 'modal-mask-2' : 'modal-mask');
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
      if (layer === 2) modal2CloseFn = null; else modalCloseFn = null;
    }
    if (layer === 2) modal2CloseFn = close; else modalCloseFn = close;
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
    return close;
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

  // ============ 座位表（seat-map）独立存储读写 ============
  // seat-map 是独立工具，数据存在自己的 localStorage（索引 seat_v3_classes +
  // 每班 seat_v3_c_{id}，旧版 seat_v2_data），不在工作台 state 内。
  // 工作台备份时必须单独收集/写回，否则备份会丢座位表与排座结果。
  var SEATMAP_IDX_KEY = 'seat_v3_classes';
  var SEATMAP_PREFIX = 'seat_v3_c_';
  var SEATMAP_OLD_KEY = 'seat_v2_data';

  function collectSeatMap() {
    var out = { index: null, classes: {}, legacy: null };
    try {
      out.index = localStorage.getItem(SEATMAP_IDX_KEY);
      out.legacy = localStorage.getItem(SEATMAP_OLD_KEY);
      var idx = out.index ? JSON.parse(out.index) : null;
      if (idx && Array.isArray(idx.list)) {
        idx.list.forEach(function (c) {
          if (c && c.id) out.classes[c.id] = localStorage.getItem(SEATMAP_PREFIX + c.id);
        });
      }
      // 兜底扫描：防止索引缺失/损坏导致漏备
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (!k || k.indexOf(SEATMAP_PREFIX) !== 0) continue;
        var id = k.slice(SEATMAP_PREFIX.length);
        // 跳过历史脏 key（旧版前缀长度算错，导致 id 多带一个下划线），避免备份体积翻倍
        if (!id || id.charAt(0) === '_') continue;
        if (out.classes[id] == null) out.classes[id] = localStorage.getItem(k);
      }
    } catch (e) { /* 读取失败不影响主备份 */ }
    return out;
  }

  // 写回座位表数据。逻辑与 seat-map.html 的 restoreSeatMap 保持一致：
  // 清旧 key → 只按索引 id 回写（丢弃脏 key）→ 修正 cur 指向有数据的班级。
  // 缺第 3 步时，若索引 cur 指向无数据的班级，seat-map 打开后整页空白。
  function applySeatMap(data) {
    if (!data) return 0;
    var ok = 0; // 成功恢复的班级数
    try {
      var idx = null;
      if (data.index) { try { idx = JSON.parse(data.index); } catch (e) { idx = null; } }
      if (!idx || !Array.isArray(idx.list) || !idx.list.length) {
        // 无有效索引：仅回写 legacy，交由 seat-map 启动时自行迁移
        if (data.legacy) localStorage.setItem(SEATMAP_OLD_KEY, data.legacy);
        return ok;
      }
      // ① 清空旧的班级数据：避免残留 key 与新数据混合、脏 key 累积
      var del = [];
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf(SEATMAP_PREFIX) === 0) del.push(k);
      }
      del.forEach(function (k) { localStorage.removeItem(k); });
      // ② 只按索引里的 id 回写，丢弃备份文件中的脏 key（旧版 slice 长度错误产生的 _xxx）
      var validIds = [];
      idx.list.forEach(function (c) {
        if (!c || !c.id) return;
        var v = data.classes ? data.classes[c.id] : null;
        if (v != null) { localStorage.setItem(SEATMAP_PREFIX + c.id, v); validIds.push(c.id); ok++; }
      });
      // ③ 写索引并修正 cur：必须指向有数据的班级，否则 seat-map 打开后是空白
      var newIdx = { list: idx.list.slice(), cur: idx.cur };
      if (validIds.length && validIds.indexOf(newIdx.cur) < 0) newIdx.cur = validIds[0];
      localStorage.setItem(SEATMAP_IDX_KEY, JSON.stringify(newIdx));
      // ④ legacy：有则写，无则清，避免旧数据干扰 seat-map 的 ensureClasses
      if (data.legacy) localStorage.setItem(SEATMAP_OLD_KEY, data.legacy);
      else localStorage.removeItem(SEATMAP_OLD_KEY);
    } catch (e) {
      console.error('[seatMap] 恢复失败', e);
      showToast('座位表数据写入失败：' + (e.message || e));
    }
    return ok;
  }

  // ============ 备份/恢复 ============
  function backupAll() {
    // 整体导出 state：后续新增顶层业务字段（床位、标签配置、成绩配置等）
    // 会自动纳入备份，无需逐个补字段，避免"新增数据漏备份导致恢复丢数据"
    var seatMap = collectSeatMap();
    var seatCount = Object.keys(seatMap.classes || {}).filter(function (id) {
      return seatMap.classes[id] != null;
    }).length;
    var data = {
      version: window.WB_CONFIG.version,
      backupTime: new Date().toISOString(),
      state: state,
      // 座位表工具独立存储，单独纳入备份（含全部班级与排座结果）
      seatMap: seatMap
    };
    var json = JSON.stringify(data, null, 2);
    downloadBlob(json, '班主任工作台备份_' + today() + '.json', 'application/json;charset=utf-8');
    showToast(seatCount > 0
      ? '备份已下载（含座位表 ' + seatCount + ' 个班级）'
      : '备份已下载（座位表暂无数据）');
  }

  function restoreAll() {
    el('file-restore').click();
  }

  function handleRestoreFile(file) {
    var reader = new FileReader();
    reader.onload = function (e) {
      try {
        var data = JSON.parse(e.target.result);
        // 座位表独立备份（seat-map 导出）：只还原座位表，不动工作台数据
        if (data.source === 'seat-map' && data.index) {
          if (!confirm('检测到「座位表」独立备份，将覆盖座位表数据（工作台其他数据不受影响）。是否继续？')) return;
          var n = applySeatMap(data);
          showToast(n > 0
            ? '座位表已恢复（' + n + ' 个班级，请刷新座位表页面）'
            : '座位表恢复失败：备份中没有班级数据');
          return;
        }
        // 兼容两种备份格式：新版 { state: {...} } 与旧版顶层平铺 { tables, grades, ... }
        var src = data.state || data;
        if (!src.tables && !data.state) throw new Error('备份文件格式不正确');
        if (!confirm('将用备份数据覆盖当前全部数据，是否继续？')) return;

        state.tables = src.tables || {};
        state.grades = src.grades || { exams: [], scores: {} };
        state.todo = src.todo || { items: [] };
        state.schedule = src.schedule || null;
        state.versions = src.versions || [];
        state.collapsedGroups = src.collapsedGroups || {};
        // 其余顶层字段（未来新增的业务数据）一并还原
        Object.keys(src).forEach(function (k) {
          if (['tables', 'grades', 'todo', 'schedule', 'versions', 'collapsedGroups'].indexOf(k) >= 0) return;
          state[k] = src[k];
        });
        // 兜底：为配置中新增、但旧备份里不存在的表建立空数组，避免渲染报错
        window.WB_CONFIG.modules.forEach(function (mod) {
          if (mod.subs) {
            mod.subs.forEach(function (sub) {
              if (sub.fields && !state.tables[sub.id]) state.tables[sub.id] = [];
            });
          }
        });
        // 班级体系：旧格式备份（无 classes）导入当前班级；新格式备份整体恢复班级体系
        if (src.classes && src.classes.list && src.classes.list.length && src.classData) {
          state.classes = src.classes;
          state.classData = src.classData;
        } else if (!state.classes || !state.classes.list || !state.classes.list.length) {
          migrateClasses();
        }
        // 座位表工具独立存储一并还原（写回 localStorage，seat-map 启动/刷新后自动读取）
        var seatN = applySeatMap(data.seatMap);
        saveCurClass(); // 顶层数据同步到当前班级桶
        persist();
        render();
        showToast(seatN > 0
          ? '恢复成功（含座位表 ' + seatN + ' 个班级，请刷新座位表页面）'
          : '恢复成功（备份中无座位表数据）');
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
  }

  // ============ 事件绑定 ============
  // 一键隐藏隐私信息（截图防泄露）：状态存 localStorage，刷新保持
  function togglePrivacy() {
    var on = privacyOn();
    try { localStorage.setItem('wb_privacy', on ? '0' : '1'); } catch (e) {}
    updatePrivacyBtn();
    render();
    showToast(on ? '已显示真实信息' : '已隐藏隐私信息（可安全截图）');
  }
  function updatePrivacyBtn() {
    var b = el('btn-privacy');
    if (!b) return;
    if (privacyOn()) { b.textContent = '👁 已隐'; b.classList.add('on'); }
    else { b.textContent = '🙈 隐私'; b.classList.remove('on'); }
  }

  function bindGlobal() {
    el('btn-version').addEventListener('click', openVersions);
    el('btn-backup').addEventListener('click', backupAll);
    el('btn-restore').addEventListener('click', restoreAll);
    el('btn-privacy').addEventListener('click', togglePrivacy);
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
    // 旧数据兼容：补齐后加模块字段，防止 undefined 导致渲染中断
    state.grades = state.grades || { exams: [], scores: {} };
    state.grades.exams = state.grades.exams || [];
    state.grades.scores = state.grades.scores || {};
    state.todo = state.todo || { items: [] };
    state.tables = state.tables || {};
    migrateRosterTags();
    bindGlobal();
    updatePrivacyBtn();
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
    init: init,
    // 统一学生选择器：所有需要选学生的场景复用，数据源唯一来自花名册
    openStudentPicker: openStudentPicker,
    isStudentPickerField: isStudentPickerField,
    closeModal: closeModal,
    privacyOn: privacyOn,
    maskText: maskText
  };

  // DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
