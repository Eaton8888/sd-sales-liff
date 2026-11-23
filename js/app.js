/* SD上達_業務系統｜共用：LIFF 登入、API、模擬模式、介面元件 */
(function (global) {
  var TZ = 'Asia/Taipei';
  var cfg = global.SD_CONFIG || {};
  var params = new URLSearchParams(location.search);
  var MOCK = params.get('mock') === '1';
  var PAGE = '';

  /* ---------- 日期（台北） ---------- */
  function taipeiParts(d) {
    var fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
    });
    var o = {};
    fmt.formatToParts(d || new Date()).forEach(function (p) { o[p.type] = p.value; });
    if (o.hour === '24') o.hour = '00';
    return o;
  }
  function todayStr() {
    var p = taipeiParts();
    return p.year + '-' + p.month + '-' + p.day;
  }
  function monthStr(d) {
    var p = taipeiParts(d);
    return p.year + '-' + p.month;
  }
  function nowStr() {
    var p = taipeiParts();
    return p.year + '-' + p.month + '-' + p.day + ' ' + p.hour + ':' + p.minute + ':' + p.second;
  }
  function ymLabel(ym) {
    var a = String(ym || '').split('-');
    return a[0] + '年' + Number(a[1]) + '月';
  }
  function shiftMonth(ym, delta) {
    var a = String(ym).split('-');
    var dt = new Date(Number(a[0]), Number(a[1]) - 1 + delta, 1);
    var m = dt.getMonth() + 1;
    return dt.getFullYear() + '-' + (m < 10 ? '0' : '') + m;
  }
  function pct(n) {
    if (n == null || isNaN(n)) return '—';
    return (Math.round(n * 1000) / 10).toFixed(1).replace(/\.0$/, '') + '%';
  }

  /* ---------- DOM ---------- */
  function el(tag, attrs) {
    var node = document.createElement(tag);
    var a = attrs || {};
    Object.keys(a).forEach(function (k) {
      if (k === 'class') node.className = a[k];
      else if (k === 'text') node.textContent = a[k];
      else if (k === 'html') node.innerHTML = a[k];
      else if (k === 'style' && typeof a[k] === 'object') Object.assign(node.style, a[k]);
      else if (k.slice(0, 2) === 'on' && typeof a[k] === 'function') node.addEventListener(k.slice(2), a[k]);
      else if (a[k] === false || a[k] == null) return;
      else if (a[k] === true) node.setAttribute(k, '');
      else node.setAttribute(k, a[k]);
    });
    function appendAll(items) {
      items.forEach(function (c) {
        if (c == null || c === false || c === true) return;
        if (Array.isArray(c)) { appendAll(c); return; }
        if (typeof c === 'string' || typeof c === 'number') {
          node.appendChild(document.createTextNode(String(c)));
          return;
        }
        if (c.nodeType) node.appendChild(c);
      });
    }
    appendAll(Array.prototype.slice.call(arguments, 2));
    return node;
  }
  function svg(html, cls) {
    var n = el('span', { class: cls || 'ico', html: html });
    return n;
  }

  var ICO = {
    sd: '<svg viewBox="0 0 36 36" width="36" height="36" aria-hidden="true"><rect width="36" height="36" rx="4" fill="#d7192a"/><text x="18" y="24.5" text-anchor="middle" fill="#fff" font-size="15" font-weight="800" font-family="Arial,sans-serif" letter-spacing="-0.5">SD</text></svg>',
    clip: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="14" y="10" width="20" height="28" rx="2"/><path d="M18 10V8h12v2"/><path d="M18 24l5 5 9-11"/></svg>',
    cal: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="10" y="12" width="28" height="26" rx="2"/><path d="M10 20h28M18 8v8M30 8v8"/><circle cx="18" cy="28" r="1.4" fill="currentColor" stroke="none"/><circle cx="24" cy="28" r="1.4" fill="currentColor" stroke="none"/><circle cx="30" cy="28" r="1.4" fill="currentColor" stroke="none"/><circle cx="18" cy="33" r="1.4" fill="currentColor" stroke="none"/><circle cx="24" cy="33" r="1.4" fill="currentColor" stroke="none"/></svg>',
    chart: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 36V22h8v14M20 36V14h8v22M28 36V26h8v10"/></svg>',
    alert: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="24" cy="24" r="16"/><path d="M24 16v12M24 32.5v.5"/></svg>',
    check: '<svg viewBox="0 0 56 56" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="28" cy="28" r="20"/><path d="M18 29l7 7 14-16"/></svg>',
    chevL: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 5l-7 7 7 7"/></svg>',
    chevR: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 5l7 7-7 7"/></svg>'
  };

  /* ---------- Toast / header ---------- */
  function toast(msg) {
    var t = document.querySelector('.toast');
    if (!t) {
      t = el('div', { class: 'toast', role: 'status' });
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toast._id);
    toast._id = setTimeout(function () { t.classList.remove('show'); }, 2400);
  }

  function logoSrc() {
    var sc = document.querySelector('script[src*="js/app.js"]');
    return sc ? sc.src.replace(/js\/app\.js.*$/, 'img/logo.png') : 'img/logo.png';
  }

  function brandBlock() {
    return el('div', { class: 'brand' },
      el('img', { class: 'brand-logo', src: logoSrc(), alt: '上達汽車' }),
      el('div', { class: 'brand-text' },
        el('div', { class: 'brand-en', text: 'Shang Da Motors' })
      )
    );
  }

  function topbar(me) {
    var bar = el('header', { class: 'topbar' },
      el('div', { class: 'topbar-inner' },
        brandBlock(),
        me ? el('div', { class: 'who' },
          el('div', { class: 'who-name', text: me.name || '' }),
          el('div', { class: 'who-role', text: me.role || '' })
        ) : null
      ),
      el('div', { class: 'rule' })
    );
    return bar;
  }

  function pageHead(title, sub, icon) {
    return el('div', { class: 'page-head' },
      icon ? svg(icon, 'ico') : null,
      el('div', {},
        el('h1', { class: 'page-title', text: title }),
        el('p', { class: 'page-sub', text: sub })
      )
    );
  }

  function setApp(nodes) {
    var app = document.getElementById('app');
    app.textContent = '';
    (Array.isArray(nodes) ? nodes : [nodes]).forEach(function (n) { if (n) app.appendChild(n); });
    window.scrollTo(0, 0);
  }

  function bootScreen(text) {
    return el('div', { class: 'screen' },
      brandBlock(),
      el('div', { class: 'spinner', 'aria-hidden': 'true' }),
      el('p', { text: text || '載入中…' })
    );
  }

  function errorScreen(title, msg, onRetry) {
    return el('div', { class: 'screen' },
      brandBlock(),
      svg(ICO.alert, 'screen-ico ico'),
      el('h1', { text: title || '無法繼續' }),
      el('p', { text: msg || '請稍後再試。' }),
      el('button', { class: 'btn btn-primary btn-block', type: 'button', onclick: onRetry || function () { location.reload(); }, text: '重試' })
    );
  }

  /* ---------- API ---------- */
  function apiError(message, code) {
    var e = new Error(message);
    e.code = code || 'SERVER';
    return e;
  }

  async function realApi(action, payload, idToken) {
    var body = Object.assign({ action: action, idToken: idToken }, payload || {});
    var res;
    try {
      res = await fetch(cfg.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(body),
        redirect: 'follow'
      });
    } catch (err) {
      throw apiError('網路連線失敗，請檢查後再試。', 'NETWORK');
    }
    var text = await res.text();
    var json;
    try { json = JSON.parse(text); } catch (err) {
      throw apiError('系統回應異常，請稍後再試。', 'SERVER');
    }
    if (!json.ok) throw apiError(json.error || '操作失敗', json.code || 'SERVER');
    return json.data;
  }

  /* ---------- 模擬資料與 API ---------- */
  function mockRole() {
    return params.get('role') === 'manager' ? '主管' : '業務';
  }

  function seedMock() {
    var today = todayStr();
    var month = monthStr();
    var prev = shiftMonth(month, -1);
    var staff = [
      { staffId: 'SD000', name: '林主管', role: '主管', status: '啟用', boundAt: '2026-11-01 09:00:00' },
      { staffId: 'SD001', name: '王小明', role: '業務', status: '啟用', boundAt: '2026-11-02 10:12:00' },
      { staffId: 'SD002', name: '陳美玲', role: '業務', status: '啟用', boundAt: '2026-11-02 11:00:00' },
      { staffId: 'SD003', name: '黃志偉', role: '業務', status: '啟用', boundAt: '2026-11-03 09:30:00' },
      { staffId: 'SD004', name: '張大同', role: '業務', status: '啟用', boundAt: '2026-11-03 14:00:00' }
    ];
    var options = {
      '角色': ['業務', '主管'],
      '狀態': ['啟用', '停用'],
      '客戶來源': ['FB廣告', 'IG廣告', 'LINE', '來電', '現場', '介紹', '其他'],
      '客戶熱度': ['A', 'B', 'C'],
      '結果': ['成交', '下訂', '再約', '考慮中', '未成交']
    };
    function V(id, staffId, name, date, created, customer, phone, source, car, stock, budget, heat, result, next, note) {
      return {
        visitId: id, createdAt: created, visitDate: date, staffId: staffId, staffName: name,
        customerName: customer, customerPhone: phone, customerSource: source, carModel: car,
        stockId: stock, budgetRange: budget, heat: heat, result: result,
        nextContactDate: next || '', note: note || '', updatedAt: created
      };
    }
    var visits = [
      V('V' + today.replace(/-/g, '') + '-0001', 'SD001', '王小明', today, today + ' 10:18:00', '王先生', '0912-345-678', 'FB廣告', 'Porsche Macan', 'A208', '150–200萬', 'A', '再約', today, '週末再來試乘，已留白色車款。'),
      V('V' + today.replace(/-/g, '') + '-0002', 'SD001', '王小明', today, today + ' 13:42:00', '林小姐', '0988-112-233', '現場', 'BMW 530i', 'B031', '200–250萬', 'B', '考慮中', '', '比較 520i 與 530i，明天再回電。'),
      V('V' + today.replace(/-/g, '') + '-0003', 'SD002', '陳美玲', today, today + ' 11:05:00', '陳先生', '0920-555-666', 'IG廣告', 'Mercedes-Benz GLB', 'C117', '180–220萬', 'A', '下訂', '', '已收訂金，待調色。'),
      V('V' + today.replace(/-/g, '') + '-0004', 'SD003', '黃志偉', today, today + ' 15:20:00', '劉太太', '0933-000-111', 'LINE', 'Tesla Model 3', 'T044', '120–150萬', 'C', '未成交', '', '預算不足，先加入追蹤。'),
      V('V20261102-0008', 'SD001', '王小明', today <= '2026-11-02' ? today : '2026-11-02', '2026-11-02 16:00:00', '周先生', '0911-222-333', '介紹', 'Porsche Taycan', 'P009', '250萬以上', 'A', '成交', '', '已交車。')
    ];
    /* 補一些本月與上月紀錄，讓月報有數字 */
    function fillMonth(ym, startN, staffId, name, resultCycle) {
      var y = ym.split('-')[0], m = ym.split('-')[1];
      var lastDay = new Date(Number(y), Number(m), 0).getDate();
      for (var i = 0; i < 6; i++) {
        var day = Math.min(lastDay, 3 + i * 3);
        var ds = ym + '-' + (day < 10 ? '0' : '') + day;
        if (ds >= today) continue;
        var res = resultCycle[i % resultCycle.length];
        visits.push(V(
          'V' + ds.replace(/-/g, '') + '-' + String(startN + i).padStart(4, '0'),
          staffId, name, ds, ds + ' 14:00:00',
          '客戶' + (startN + i), '09' + String(10000000 + startN + i),
          options['客戶來源'][i % 7], ['Porsche Macan', 'BMW 530i', 'Mercedes-Benz GLB', 'Tesla Model 3'][i % 4],
          '', '150–200萬', ['A', 'B', 'C'][i % 3], res, res === '再約' ? ds : '', ''
        ));
      }
    }
    fillMonth(month, 20, 'SD001', '王小明', ['成交', '再約', '考慮中', '下訂', '未成交', '再約']);
    fillMonth(month, 30, 'SD002', '陳美玲', ['下訂', '成交', '再約', '考慮中', '成交', '再約']);
    fillMonth(month, 40, 'SD003', '黃志偉', ['考慮中', '未成交', '再約', '考慮中', '下訂', '未成交']);
    fillMonth(prev, 10, 'SD001', '王小明', ['再約', '考慮中', '成交', '未成交', '下訂', '再約']);
    fillMonth(prev, 16, 'SD002', '陳美玲', ['成交', '下訂', '再約', '考慮中', '未成交', '成交']);
    fillMonth(prev, 50, 'SD003', '黃志偉', ['未成交', '考慮中', '再約', '未成交', '考慮中', '下訂']);

    var notes = [
      { date: today, staffId: 'SD001', staffName: '王小明', note: '下午現場客人偏多，Macan 詢問度高。已跟進王先生週末試乘。', createdAt: today + ' 17:10:00' },
      { date: today, staffId: 'SD002', staffName: '陳美玲', note: 'GLB 下訂一筆，需注意交車時程。', createdAt: today + ' 16:40:00' }
    ];
    var goals = [
      { month: month, staffId: 'SD001', staffName: '王小明', visitGoal: 20, orderGoal: 4, dealGoal: 2 },
      { month: month, staffId: 'SD002', staffName: '陳美玲', visitGoal: 18, orderGoal: 4, dealGoal: 2 },
      { month: month, staffId: 'SD003', staffName: '黃志偉', visitGoal: 16, orderGoal: 3, dealGoal: 1 },
      { month: prev, staffId: 'SD001', staffName: '王小明', visitGoal: 18, orderGoal: 3, dealGoal: 2 }
    ];
    return { staff: staff, options: options, visits: visits, notes: notes, goals: goals, seq: 4 };
  }

  var mockStore = null;
  function store() {
    if (!mockStore) mockStore = seedMock();
    return mockStore;
  }
  function currentMockStaff() {
    var role = mockRole();
    var list = store().staff;
    if (role === '主管') return list[0];
    return list[1];
  }

  function visitInMonth(v, ym) { return v.visitDate && v.visitDate.slice(0, 7) === ym; }
  function ratio(n, d) { return d ? Math.round((n / d) * 10000) / 10000 : 0; }
  function countBy(list, key, known) {
    var out = {};
    (known || []).forEach(function (k) { out[k] = 0; });
    list.forEach(function (it) {
      var k = it[key] || '（未填）';
      out[k] = (out[k] || 0) + 1;
    });
    return out;
  }
  function summarize(visits, options) {
    var visitCount = visits.length, orderCount = 0, dealCount = 0;
    visits.forEach(function (v) {
      if (v.result === '下訂') orderCount++;
      if (v.result === '成交') dealCount++;
    });
    return {
      visitCount: visitCount, orderCount: orderCount, dealCount: dealCount,
      orderRate: ratio(orderCount, visitCount), dealRate: ratio(dealCount, visitCount),
      resultCounts: countBy(visits, 'result', options['結果']),
      sourceCounts: countBy(visits, 'customerSource', options['客戶來源'])
    };
  }
  function goalView(goal, counts) {
    if (!goal) {
      return { set: false, visitGoal: null, orderGoal: null, dealGoal: null, visitProgress: null, orderProgress: null, dealProgress: null };
    }
    return {
      set: true, visitGoal: goal.visitGoal, orderGoal: goal.orderGoal, dealGoal: goal.dealGoal,
      visitProgress: ratio(counts.visitCount, goal.visitGoal),
      orderProgress: ratio(counts.orderCount, goal.orderGoal),
      dealProgress: ratio(counts.dealCount, goal.dealGoal)
    };
  }

  function mockApi(action, payload, idToken) {
    if (params.get('token') === 'bad' || idToken === 'bad') {
      throw apiError('登入已過期或無效，請關閉頁面後重新開啟。', 'INVALID_TOKEN');
    }
    if (params.get('disabled') === '1') {
      throw apiError('此帳號已停用，請聯絡主管。', 'DISABLED');
    }
    var db = store();
    var me0 = currentMockStaff();
    var me = Object.assign({}, me0, { status: '啟用' });

    if (action === 'me') {
      if (params.get('unbound') === '1' && !me._bound) throw apiError('尚未綁定業務帳號，請先完成綁定。', 'UNBOUND');
      return me;
    }
    if (action === 'bind') {
      if (!payload.staffId || !payload.bindCode) throw apiError('請輸入業務編號和綁定驗證碼。', 'VALIDATION');
      if (payload.bindCode !== '1234' && payload.bindCode !== me.staffId) {
        throw apiError('業務編號或綁定驗證碼不正確。', 'VALIDATION');
      }
      var hit = db.staff.filter(function (s) { return s.staffId === payload.staffId; })[0];
      if (!hit) throw apiError('業務編號或綁定驗證碼不正確。', 'VALIDATION');
      me0._bound = true;
      hit.boundAt = nowStr();
      return Object.assign({}, hit, { status: '啟用' });
    }
    if (action === 'options') return db.options;

    function canSee(v, filterId, forManagerAll) {
      if (me.role === '主管') {
        if (filterId) return v.staffId === filterId;
        return true;
      }
      return v.staffId === me.staffId;
    }

    if (action === 'createVisit') {
      db.seq += 1;
      var date = payload.visitDate || todayStr();
      var id = 'V' + date.replace(/-/g, '') + '-' + String(db.seq).padStart(4, '0');
      var rec = {
        visitId: id, createdAt: nowStr(), visitDate: date, staffId: me.staffId, staffName: me.name,
        customerName: payload.customerName, customerPhone: payload.customerPhone || '',
        customerSource: payload.customerSource, carModel: payload.carModel,
        stockId: payload.stockId || '', budgetRange: payload.budgetRange || '',
        heat: payload.heat, result: payload.result,
        nextContactDate: payload.nextContactDate || '', note: payload.note || '',
        updatedAt: nowStr()
      };
      db.visits.unshift(rec);
      return rec;
    }
    if (action === 'updateVisit') {
      var found = db.visits.filter(function (v) { return v.visitId === payload.visitId; })[0];
      if (!found) throw apiError('找不到這筆看車紀錄。', 'NOT_FOUND');
      if (me.role !== '主管' && found.staffId !== me.staffId) throw apiError('只能修改自己的紀錄。', 'FORBIDDEN');
      if (me.role !== '主管' && found.visitDate !== todayStr()) throw apiError('已超過可修改時間，僅能修改當日紀錄，請洽主管協助。', 'FORBIDDEN');
      ['visitDate', 'customerName', 'customerPhone', 'customerSource', 'carModel', 'stockId', 'budgetRange', 'heat', 'result', 'nextContactDate', 'note'].forEach(function (k) {
        if (Object.prototype.hasOwnProperty.call(payload, k) && payload[k] !== undefined) found[k] = payload[k];
      });
      found.updatedAt = nowStr();
      return found;
    }
    if (action === 'listToday') {
      var date = payload.date || todayStr();
      var filterId = payload.staffId || '';
      var visits = db.visits.filter(function (v) { return v.visitDate === date && canSee(v, filterId); });
      visits.sort(function (a, b) { return a.createdAt < b.createdAt ? 1 : -1; });
      var data = { date: date, visits: visits };
      if (me.role === '主管') {
        var reported = {};
        db.visits.forEach(function (v) { if (v.visitDate === date) reported[v.staffId] = true; });
        data.unreported = db.staff.filter(function (s) {
          return s.status === '啟用' && s.role === '業務' && !reported[s.staffId] && (!filterId || s.staffId === filterId);
        }).map(function (s) { return { staffId: s.staffId, name: s.name }; });
      }
      return data;
    }
    if (action === 'saveDailyNote') {
      var d = payload.date || todayStr();
      var existing = db.notes.filter(function (n) { return n.date === d && n.staffId === me.staffId; })[0];
      if (existing) {
        existing.note = payload.note;
        return { date: d, staffId: me.staffId, staffName: me.name, note: payload.note, createdAt: existing.createdAt, updated: true };
      }
      var row = { date: d, staffId: me.staffId, staffName: me.name, note: payload.note, createdAt: nowStr() };
      db.notes.push(row);
      return Object.assign({ updated: false }, row);
    }
    if (action === 'todaySummary') {
      var d2 = payload.date || todayStr();
      var fid = payload.staffId || '';
      var todays = db.visits.filter(function (v) { return v.visitDate === d2 && canSee(v, fid); });
      var followUps = db.visits.filter(function (v) { return v.nextContactDate === d2 && canSee(v, fid); });
      var out = {
        date: d2, visitCount: todays.length,
        resultCounts: countBy(todays, 'result', db.options['結果']),
        sourceCounts: countBy(todays, 'customerSource', db.options['客戶來源']),
        followUps: followUps
      };
      if (me.role === '主管' && !fid) {
        out.dailyNotes = db.notes.filter(function (n) { return n.date === d2; });
        var reported2 = {};
        db.visits.forEach(function (v) { if (v.visitDate === d2) reported2[v.staffId] = true; });
        out.unreported = db.staff.filter(function (s) {
          return s.status === '啟用' && s.role === '業務' && !reported2[s.staffId];
        }).map(function (s) { return { staffId: s.staffId, name: s.name }; });
      } else {
        var sid = fid || me.staffId;
        var note = db.notes.filter(function (n) { return n.date === d2 && n.staffId === sid; })[0];
        out.dailyNote = note ? note.note : '';
      }
      return out;
    }
    if (action === 'monthStats') {
      var month = payload.month || monthStr();
      var prev = shiftMonth(month, -1);
      var fid2 = payload.staffId || '';
      var isMgr = me.role === '主管';
      function goalOf(ym, sid) {
        return db.goals.filter(function (g) { return g.month === ym && g.staffId === sid; })[0] || null;
      }
      function sumGoals(ym) {
        var rows = db.goals.filter(function (g) { return g.month === ym; });
        if (!rows.length) return null;
        return rows.reduce(function (a, g) {
          a.visitGoal += g.visitGoal || 0; a.orderGoal += g.orderGoal || 0; a.dealGoal += g.dealGoal || 0;
          return a;
        }, { visitGoal: 0, orderGoal: 0, dealGoal: 0 });
      }
      if (isMgr && !fid2) {
        var mv = db.visits.filter(function (v) { return visitInMonth(v, month); });
        var pv = db.visits.filter(function (v) { return visitInMonth(v, prev); });
        var st = summarize(mv, db.options);
        var pst = summarize(pv, db.options);
        st.vsPrevious = { visitCount: st.visitCount - pst.visitCount, orderCount: st.orderCount - pst.orderCount, dealCount: st.dealCount - pst.dealCount };
        st.goal = goalView(sumGoals(month), st);
        var staffTable = db.staff.filter(function (s) { return s.status === '啟用'; }).map(function (s) {
          var sm = db.visits.filter(function (v) { return v.staffId === s.staffId && visitInMonth(v, month); });
          var sp = db.visits.filter(function (v) { return v.staffId === s.staffId && visitInMonth(v, prev); });
          var ss = summarize(sm, db.options);
          var ssp = summarize(sp, db.options);
          ss.vsPrevious = { visitCount: ss.visitCount - ssp.visitCount, orderCount: ss.orderCount - ssp.orderCount, dealCount: ss.dealCount - ssp.dealCount };
          ss.goal = goalView(goalOf(month, s.staffId), ss);
          return { staffId: s.staffId, name: s.name, role: s.role, status: s.status, stats: ss, previous: ssp, goal: ss.goal, sourceCounts: ss.sourceCounts };
        });
        return {
          month: month, previousMonth: prev, scope: 'store',
          stats: st, previous: pst, sourceCounts: st.sourceCounts, goal: st.goal,
          staffTable: staffTable,
          storeTotals: { visitCount: st.visitCount, orderCount: st.orderCount, dealCount: st.dealCount, orderRate: st.orderRate, dealRate: st.dealRate, vsPrevious: st.vsPrevious, resultCounts: st.resultCounts, previous: pst, goal: st.goal, sourceCounts: st.sourceCounts }
        };
      }
      var sid2 = isMgr ? fid2 : me.staffId;
      var mine = db.visits.filter(function (v) { return v.staffId === sid2 && visitInMonth(v, month); });
      var mineP = db.visits.filter(function (v) { return v.staffId === sid2 && visitInMonth(v, prev); });
      var st2 = summarize(mine, db.options);
      var pst2 = summarize(mineP, db.options);
      st2.vsPrevious = { visitCount: st2.visitCount - pst2.visitCount, orderCount: st2.orderCount - pst2.orderCount, dealCount: st2.dealCount - pst2.dealCount };
      var g = goalOf(month, sid2);
      st2.goal = goalView(g, st2);
      var name = (db.staff.filter(function (s) { return s.staffId === sid2; })[0] || {}).name || me.name;
      return { month: month, previousMonth: prev, scope: 'self', staffId: sid2, staffName: name, stats: st2, previous: pst2, sourceCounts: st2.sourceCounts, goal: st2.goal };
    }
    throw apiError('未知的操作。', 'UNKNOWN_ACTION');
  }

  var idToken = '';
  var meCache = null;

  async function api(action, payload) {
    if (MOCK) {
      await new Promise(function (r) { setTimeout(r, 180); });
      return mockApi(action, payload || {}, idToken);
    }
    return realApi(action, payload, idToken);
  }

  async function initLiff(liffId) {
    if (MOCK) {
      idToken = 'mock-token';
      global.liff = {
        closeWindow: function () { toast('已關閉（模擬）'); },
        isInClient: function () { return false; },
        isLoggedIn: function () { return true; }
      };
      return;
    }
    if (!global.liff) throw apiError('無法載入 LINE 元件，請從官方帳號重新開啟。', 'INVALID_TOKEN');
    await global.liff.init({ liffId: liffId });
    if (!global.liff.isLoggedIn()) {
      global.liff.login({ redirectUri: location.href.split('#')[0] });
      return { redirected: true };
    }
    idToken = global.liff.getIDToken() || '';
    if (!idToken) throw apiError('請在 LINE 內重新開啟本頁，無法確認身分。', 'INVALID_TOKEN');
    return {};
  }

  function bindForm(onBound) {
    var errBox = el('div', { class: 'banner is-hidden' });
    var staffIn = el('input', { class: 'input', id: 'bind-id', autocomplete: 'off', placeholder: '例如 SD001' });
    var codeIn = el('input', { class: 'input', id: 'bind-code', autocomplete: 'off', placeholder: '請輸入主管提供的驗證碼' });
    var btn = el('button', { class: 'btn btn-primary btn-block', type: 'submit', text: '綁定' });
    var form = el('form', {},
      el('div', { class: 'field' },
        el('label', { class: 'label', for: 'bind-id', text: '業務編號' }, el('span', { class: 'req', text: ' *' })),
        staffIn
      ),
      el('div', { class: 'field' },
        el('label', { class: 'label', for: 'bind-code', text: '綁定驗證碼' }, el('span', { class: 'req', text: ' *' })),
        codeIn
      ),
      errBox,
      btn
    );
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      errBox.classList.add('is-hidden');
      btn.disabled = true;
      btn.textContent = '綁定中…';
      try {
        var data = await api('bind', { staffId: staffIn.value.trim(), bindCode: codeIn.value.trim() });
        onBound(data);
      } catch (err) {
        errBox.textContent = err.message || '綁定失敗';
        errBox.classList.remove('is-hidden');
        btn.disabled = false;
        btn.textContent = '綁定';
      }
    });
    return el('div', {},
      topbar(null),
      pageHead('綁定帳號', 'LINK ACCOUNT', ICO.clip),
      el('div', { class: 'wrap' },
        el('p', { class: 'hint', style: { marginBottom: '16px' }, text: '第一次使用，請輸入主管提供的業務編號和綁定驗證碼。' }),
        form
      )
    );
  }

  async function start(opts) {
    PAGE = opts.page;
    var app = document.getElementById('app');
    setApp(bootScreen('載入中…'));
    try {
      var init = await initLiff(opts.liffId);
      if (init && init.redirected) return;
      var profile;
      try {
        profile = await api('me');
      } catch (err) {
        if (err.code === 'UNBOUND') {
          setApp(bindForm(function (data) {
            meCache = data;
            opts.onReady({ me: data, api: api, mock: MOCK, close: closeWindow, today: todayStr, month: monthStr, toast: toast });
          }));
          return;
        }
        if (err.code === 'DISABLED') {
          setApp(errorScreen('帳號已停用', err.message));
          return;
        }
        if (err.code === 'INVALID_TOKEN') {
          setApp(errorScreen('請重新登入', err.message));
          return;
        }
        throw err;
      }
      meCache = profile;
      opts.onReady({ me: profile, api: api, mock: MOCK, close: closeWindow, today: todayStr, month: monthStr, toast: toast });
    } catch (err) {
      console.error(err);
      setApp(errorScreen('無法開啟頁面', err.message || '請稍後再試。'));
    }
  }

  function closeWindow() {
    if (global.liff && typeof global.liff.closeWindow === 'function') {
      try { global.liff.closeWindow(); return; } catch (err) {}
    }
    toast('請關閉此頁面返回聊天室');
  }

  function vsText(n, unit) {
    if (n == null || n === 0) return { text: '與上月相同', cls: '' };
    if (n > 0) return { text: '較上月 +' + n + (unit || ''), cls: 'up' };
    return { text: '較上月 ' + n + (unit || ''), cls: 'down' };
  }

  global.SD = {
    start: start,
    el: el,
    svg: svg,
    ICO: ICO,
    topbar: topbar,
    pageHead: pageHead,
    setApp: setApp,
    bootScreen: bootScreen,
    errorScreen: errorScreen,
    toast: toast,
    todayStr: todayStr,
    monthStr: monthStr,
    ymLabel: ymLabel,
    shiftMonth: shiftMonth,
    pct: pct,
    vsText: vsText,
    isMock: function () { return MOCK; },
    closeWindow: closeWindow
  };
})(window);
