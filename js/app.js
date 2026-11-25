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
    chevR: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 5l7 7-7 7"/></svg>',
    key: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="17" cy="24" r="7"/><path d="M24 24h16M34 24v6M40 24v5"/></svg>'
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
    // 保留目前捲動位置，點選項重畫畫面時不會跳回最上方
    var y = window.pageYOffset || document.documentElement.scrollTop || 0;
    app.style.minHeight = app.offsetHeight + 'px';
    app.textContent = '';
    (Array.isArray(nodes) ? nodes : [nodes]).forEach(function (n) { if (n) app.appendChild(n); });
    app.style.minHeight = '';
    window.scrollTo(0, y);
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

  function isManagerRole(role) {
    return role === '管理員' || role === '主管' || role === '老闆';
  }
  function canSeeFloor(role) {
    return isManagerRole(role) || role === '超級業務';
  }

  /* ---------- 模擬資料與 API ---------- */
  function mockRole() {
    var r = params.get('role');
    if (r === 'manager' || r === 'admin') return '管理員';
    if (r === 'boss') return '老闆';
    if (r === 'super') return '超級業務';
    return '業務';
  }

  function seedMock() {
    var today = todayStr();
    var month = monthStr();
    var prev = shiftMonth(month, -1);
    var staff = [
      { staffId: 'SD000', name: '林主管', role: '管理員', status: '啟用', boundAt: '2026-11-01 09:00:00' },
      { staffId: 'SD001', name: '王小明', role: '超級業務', status: '啟用', boundAt: '2026-11-02 10:12:00' },
      { staffId: 'SD002', name: '陳美玲', role: '業務', status: '啟用', boundAt: '2026-11-02 11:00:00' },
      { staffId: 'SD003', name: '黃志偉', role: '超級業務', status: '啟用', boundAt: '2026-11-03 09:30:00' },
      { staffId: 'SD004', name: '張大同', role: '業務', status: '啟用', boundAt: '2026-11-03 14:00:00' },
      { staffId: 'SD005', name: '模擬業務A', role: '超級業務', status: '啟用', boundAt: '' },
      { staffId: 'SD006', name: '模擬業務B', role: '超級業務', status: '啟用', boundAt: '' },
      { staffId: 'SD007', name: '模擬老闆C', role: '老闆', status: '啟用', boundAt: '' }
    ];
    var options = {
      '角色': ['業務', '超級業務', '老闆', '管理員'],
      '狀態': ['啟用', '待審核', '停用'],
      '客戶來源': ['抖音', 'IG Reels', 'FB粉專', '8891', '官方LINE', '過路客', '老客回流', '親友介紹', '網路搜尋／AI', '其他'],
      '客戶熱度': ['A', 'B', 'C', 'D'],
      '追蹤狀態': ['再約', '考慮中', '未成交'],
      '收車熱度': ['A', 'B', 'C']
    };
    function V(id, staffId, name, date, created, customer, phone, source, car, stock, budget, heat, result, next, note) {
      return {
        visitId: id, createdAt: created, visitDate: date, staffId: staffId, staffName: name,
        customerName: customer, customerPhone: phone, customerSource: source, carModel: car,
        stockId: stock, budgetRange: budget, heat: heat,
        ordered: result === '下訂' || result === '下訂成交', dealt: result === '成交' || result === '下訂成交', cancelled: result === '退訂',
        followStatus: /^(再約|考慮中|未成交)$/.test(result) ? result : '',
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
          options['客戶來源'][i % options['客戶來源'].length], ['Porsche Macan', 'BMW 530i', 'Mercedes-Benz GLB', 'Tesla Model 3'][i % 4],
          '', '150–200萬', ['A', 'B', 'C'][i % 3], res, res === '再約' ? ds : '', ''
        ));
      }
    }
    fillMonth(month, 20, 'SD001', '王小明', ['下訂成交', '再約', '考慮中', '下訂', '退訂', '再約']);
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
    function B(id, staffId, name, date, created, seller, src, car, year, km, ask, offer, heat, flags, follow, next) {
      return {
        kind: 'buy', buyId: id, createdAt: created, buyDate: date, staffId: staffId, staffName: name,
        sellerName: seller, sellerPhone: '', customerSource: src, carModel: car, carYear: year, mileage: km,
        askPrice: ask, offerPrice: offer, heat: heat,
        ordered: flags.indexOf('o') > -1, dealt: flags.indexOf('d') > -1, cancelled: flags.indexOf('x') > -1,
        followStatus: follow || '', nextContactDate: next || '', note: '', updatedAt: created
      };
    }
    var tid = today.replace(/-/g, '');
    var buys = [
      B('P' + tid + '-0001', 'SD001', '王小明', today, today + ' 11:20:00', '範例賣方甲', '8891', 'Lexus NX200', '2019', 4.5, 120, 105, 'A', 'o', '', ''),
      B('P' + tid + '-0002', 'SD002', '陳美玲', today, today + ' 14:05:00', '範例賣方乙', '官方LINE', 'Toyota RAV4', '2020', 3.2, 85, 78, 'B', '', '考慮中', today),
      B('P' + tid + '-0003', 'SD002', '陳美玲', today, today + ' 15:40:00', '範例賣方丙', '過路客', 'BMW 320i', '2018', 6.1, 95, 88, 'A', 'od', '', '')
    ];
    goals.forEach(function (g) { g.buyVisitGoal = 8; g.buyOrderGoal = 3; g.buyDealGoal = 2; });
    return { staff: staff, options: options, visits: visits, buys: buys, notes: notes, goals: goals, seq: 4 };
  }

  var mockStore = null;
  function store() {
    if (!mockStore) mockStore = seedMock();
    return mockStore;
  }
  function currentMockStaff() {
    var role = mockRole();
    var list = store().staff;
    if (role === '管理員') return list[0];
    if (role === '老闆') return { staffId: 'SD099', name: '模擬老闆', role: '老闆', status: '啟用', boundAt: '2026-11-01 09:00:00' };
    if (role === '超級業務') return list[1];
    return list[2];
  }

  function visitInMonth(v, ym) { return v.visitDate && v.visitDate.slice(0, 7) === ym; }
  function ratio(n, d) { return d ? Math.round((n / d) * 10000) / 10000 : 0; }
  function countBy(list, key, known) {
    var out = {};
    (known || []).forEach(function (k) { out[k] = 0; });
    list.forEach(function (it) {
      var raw = it[key] || '（未填）';
      var k = key === 'customerSource' ? mapLegacySource(raw) : raw;
      if (!k) k = '（未填）';
      out[k] = (out[k] || 0) + 1;
    });
    return out;
  }
  function summarize(visits, options) {
    var visitCount = visits.length, orderCount = 0, dealCount = 0, cancelCount = 0, follow = {};
    (options['追蹤狀態'] || []).forEach(function (k) { follow[k] = 0; });
    visits.forEach(function (v) {
      var f = flagsOf(v);
      if (f.ordered) orderCount++;
      if (f.dealt) dealCount++;
      if (f.cancelled) cancelCount++;
      if (f.followStatus) follow[f.followStatus] = (follow[f.followStatus] || 0) + 1;
    });
    return {
      visitCount: visitCount, orderCount: orderCount, dealCount: dealCount, cancelCount: cancelCount,
      orderRate: ratio(orderCount, visitCount), dealRate: ratio(dealCount, visitCount),
      resultCounts: { '下訂': orderCount, '成交': dealCount, '退訂': cancelCount },
      followCounts: follow,
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
    if (params.get('oldapi') === '1' && (action === 'batch' || action === 'inventory' || /Buy$|^buy/.test(action))) {
      throw apiError('未知的操作。', 'UNKNOWN_ACTION'); // 模擬尚未重新部署的舊後端
    }
    var db = store();
    var me0 = currentMockStaff();
    var me = Object.assign({}, me0, { status: '啟用' });

    if (action === 'me') {
      if (params.get('pending') === '1' || me0._pending) throw apiError('已送出申請（' + (me0._pendingName || me.name) + '），等待主管啟用。', 'PENDING');
      if (params.get('unbound') === '1' && !me._bound) throw apiError('尚未綁定業務帳號，請先完成綁定。', 'UNBOUND');
      return params.get('oldapi') === '1' ? me : Object.assign({ apiVersion: 3 }, me);
    }
    if (action === 'listUnboundNames') {
      if (params.get('oldapi') === '1') throw apiError('未知的操作。', 'UNKNOWN_ACTION');
      if (params.get('pending') === '1' || me0._pending) throw apiError('已送出申請（' + (me0._pendingName || me.name) + '），等待主管啟用。', 'PENDING');
      if (params.get('unbound') === '1' && !me._bound) {
        return {
          bound: false,
          names: db.staff.filter(function (s) { return !s.boundAt && s.role !== '管理員' && s.role !== '主管'; }).map(function (s) {
            return { staffId: s.staffId, name: s.name };
          })
        };
      }
      return { bound: true, staff: me, names: [] };
    }
    if (action === 'bind') {
      if (!payload.staffId) throw apiError('請選擇你的姓名。', 'VALIDATION');
      if (payload.bindCode !== undefined) {
        if (!payload.bindCode) throw apiError('請輸入業務編號和綁定驗證碼。', 'VALIDATION');
        if (payload.bindCode !== '1234' && payload.bindCode !== me.staffId) {
          throw apiError('業務編號或綁定驗證碼不正確。', 'VALIDATION');
        }
        var hitOld = db.staff.filter(function (s) { return s.staffId === payload.staffId; })[0];
        if (!hitOld) throw apiError('業務編號或綁定驗證碼不正確。', 'VALIDATION');
        me0._bound = true;
        hitOld.boundAt = nowStr();
        return Object.assign({}, hitOld, { status: '啟用' });
      }
      var hit = db.staff.filter(function (s) { return s.staffId === payload.staffId; })[0];
      if (!hit) throw apiError('找不到對應的業務資料，請重新整理後再試。', 'VALIDATION');
      me0._bound = true;
      me0._pending = true;
      me0._pendingName = hit.name;
      hit.boundAt = nowStr();
      hit.status = '待審核';
      return Object.assign({}, hit);
    }
    if (action === 'options') return db.options;
    if (action === 'inventory') {
      // 模擬伺服器：只回在庫車；底價給管理員／老闆／超級業務；其餘內部欄位只給管理員／老闆
      var inv = typeof global.SD_MOCK_INVENTORY === 'function' ? global.SD_MOCK_INVENTORY() : [];
      var PUB = ['id', 'status', 'brand', 'model', 'cc', 'color', 'interior', 'year', 'mileage', 'price', 'priceText', 'plate', 'factoryCert', 'cert', 'original'];
      var mgr = isManagerRole(me.role);
      var seeFloor = canSeeFloor(me.role);
      return {
        manager: mgr,
        canSeeFloor: seeFloor,
        updatedAt: nowStr(),
        cars: inv.filter(function (c) { return c.status === '在庫'; }).map(function (c) {
          if (mgr) return Object.assign({}, c);
          var o = {};
          PUB.forEach(function (k) { if (k in c) o[k] = c[k]; });
          if (seeFloor) {
            if ('floor' in c) o.floor = c.floor;
            if ('floorText' in c) o.floorText = c.floorText;
          }
          return o;
        })
      };
    }
    if (action === 'batch') {
      return (payload.calls || []).map(function (c) {
        try { return { ok: true, data: mockApi(c.action, c, idToken) }; }
        catch (e) { return { ok: false, error: e.message, code: e.code }; }
      });
    }

    function canSee(v, filterId, forManagerAll) {
      if (isManagerRole(me.role)) {
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
        heat: payload.heat,
        ordered: !!payload.ordered, dealt: !!payload.dealt, cancelled: !!payload.cancelled, followStatus: payload.followStatus || '',
        nextContactDate: payload.nextContactDate || '', note: payload.note || '',
        updatedAt: nowStr(),
        carPlate: String(payload.carPlate || '').toUpperCase(),
        carPrice: payload.carPrice === '' || payload.carPrice == null ? '' : Number(payload.carPrice)
      };
      db.visits.unshift(rec);
      return rec;
    }
    if (action === 'updateVisit') {
      var found = db.visits.filter(function (v) { return v.visitId === payload.visitId; })[0];
      if (!found) throw apiError('找不到這筆看車紀錄。', 'NOT_FOUND');
      if (!isManagerRole(me.role) && found.staffId !== me.staffId) throw apiError('只能修改自己的紀錄。', 'FORBIDDEN');
      if (!isManagerRole(me.role) && found.visitDate !== todayStr()) throw apiError('已超過可修改時間，僅能修改當日紀錄，請洽主管協助。', 'FORBIDDEN');
      ['visitDate', 'customerName', 'customerPhone', 'customerSource', 'carModel', 'budgetRange', 'heat', 'ordered', 'dealt', 'cancelled', 'followStatus', 'nextContactDate', 'note', 'carPlate', 'carPrice'].forEach(function (k) {
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
      if (isManagerRole(me.role)) {
        var reported = {};
        db.visits.forEach(function (v) { if (v.visitDate === date) reported[v.staffId] = true; });
        data.unreported = db.staff.filter(function (s) {
          return s.status === '啟用' && (s.role === '業務' || s.role === '超級業務') && !reported[s.staffId] && (!filterId || s.staffId === filterId);
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
      var sm0 = summarize(todays, db.options);
      var out = {
        date: d2, visitCount: todays.length, orderCount: sm0.orderCount, dealCount: sm0.dealCount, cancelCount: sm0.cancelCount,
        resultCounts: sm0.resultCounts, followCounts: sm0.followCounts,
        sourceCounts: sm0.sourceCounts,
        followUps: followUps
      };
      if (isManagerRole(me.role) && !fid) {
        out.dailyNotes = db.notes.filter(function (n) { return n.date === d2; });
        var reported2 = {};
        db.visits.forEach(function (v) { if (v.visitDate === d2) reported2[v.staffId] = true; });
        out.unreported = db.staff.filter(function (s) {
          return s.status === '啟用' && (s.role === '業務' || s.role === '超級業務') && !reported2[s.staffId];
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
      var isMgr = isManagerRole(me.role);
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
        st.vsPrevious = { visitCount: st.visitCount - pst.visitCount, orderCount: st.orderCount - pst.orderCount, dealCount: st.dealCount - pst.dealCount, cancelCount: st.cancelCount - pst.cancelCount };
        st.goal = goalView(sumGoals(month), st);
        var staffTable = db.staff.filter(function (s) { return s.status === '啟用'; }).map(function (s) {
          var sm = db.visits.filter(function (v) { return v.staffId === s.staffId && visitInMonth(v, month); });
          var sp = db.visits.filter(function (v) { return v.staffId === s.staffId && visitInMonth(v, prev); });
          var ss = summarize(sm, db.options);
          var ssp = summarize(sp, db.options);
          ss.vsPrevious = { visitCount: ss.visitCount - ssp.visitCount, orderCount: ss.orderCount - ssp.orderCount, dealCount: ss.dealCount - ssp.dealCount, cancelCount: ss.cancelCount - ssp.cancelCount };
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
      st2.vsPrevious = { visitCount: st2.visitCount - pst2.visitCount, orderCount: st2.orderCount - pst2.orderCount, dealCount: st2.dealCount - pst2.dealCount, cancelCount: st2.cancelCount - pst2.cancelCount };
      var g = goalOf(month, sid2);
      st2.goal = goalView(g, st2);
      var name = (db.staff.filter(function (s) { return s.staffId === sid2; })[0] || {}).name || me.name;
      return { month: month, previousMonth: prev, scope: 'self', staffId: sid2, staffName: name, stats: st2, previous: pst2, sourceCounts: st2.sourceCounts, goal: st2.goal };
    }
    /* ---- 收車（模擬） ---- */
    if (action === 'createBuy' || action === 'updateBuy') {
      if (!payload.sellerName) throw apiError('請填寫賣方客人姓名。', 'VALIDATION');
      var bRec;
      if (action === 'createBuy') {
        db.seq += 1;
        var bd = payload.buyDate || todayStr();
        bRec = { kind: 'buy', buyId: 'P' + bd.replace(/-/g, '') + '-' + String(db.seq).padStart(4, '0'), createdAt: nowStr(), staffId: me.staffId, staffName: me.name };
        db.buys.unshift(bRec);
      } else {
        bRec = db.buys.filter(function (b) { return b.buyId === payload.buyId; })[0];
        if (!bRec) throw apiError('找不到這筆收車紀錄。', 'NOT_FOUND');
        if (!isManagerRole(me.role) && bRec.staffId !== me.staffId) throw apiError('只能修改自己的紀錄。', 'FORBIDDEN');
      }
      ['buyDate', 'sellerName', 'sellerPhone', 'customerSource', 'carModel', 'carYear', 'heat', 'followStatus', 'nextContactDate', 'note'].forEach(function (k) {
        if (k in payload) bRec[k] = payload[k] == null ? '' : payload[k];
      });
      ['mileage', 'askPrice', 'offerPrice'].forEach(function (k) {
        if (k in payload) bRec[k] = payload[k] === '' || payload[k] == null ? '' : Number(payload[k]);
      });
      ['ordered', 'dealt', 'cancelled'].forEach(function (k) { if (k in payload) bRec[k] = !!payload[k]; });
      if (!bRec.buyDate) bRec.buyDate = todayStr();
      bRec.updatedAt = nowStr();
      return Object.assign({}, bRec);
    }
    if (action === 'buyToday') {
      var bd2 = payload.date || todayStr();
      var bf = payload.staffId || '';
      var recs = db.buys.filter(function (b) { return b.buyDate === bd2 && canSee(b, bf); });
      recs.sort(function (a, b) { return a.createdAt < b.createdAt ? 1 : -1; });
      var bsum = summarize(recs, db.options);
      return {
        date: bd2, kind: 'buy', appraisalCount: recs.length, orderCount: bsum.orderCount, dealCount: bsum.dealCount, cancelCount: bsum.cancelCount,
        resultCounts: bsum.resultCounts, followCounts: bsum.followCounts, sourceCounts: bsum.sourceCounts,
        records: recs,
        followUps: db.buys.filter(function (b) { return b.nextContactDate === bd2 && canSee(b, bf); })
      };
    }
    if (action === 'buyMonth') {
      var bm = payload.month || monthStr();
      var bprev = shiftMonth(bm, -1);
      var bfid = payload.staffId || '';
      var inM = function (b, ym) { return b.buyDate && b.buyDate.slice(0, 7) === ym; };
      var bgoal = function (sid) {
        var gs = db.goals.filter(function (g) { return g.month === bm && (!sid || g.staffId === sid); });
        if (!gs.length) return null;
        return gs.reduce(function (a, g) { a.visitGoal += g.buyVisitGoal || 0; a.orderGoal += g.buyOrderGoal || 0; a.dealGoal += g.buyDealGoal || 0; return a; }, { visitGoal: 0, orderGoal: 0, dealGoal: 0 });
      };
      var bstat = function (list, plist, goal) {
        var a = summarize(list, db.options), b = summarize(plist, db.options);
        a.vsPrevious = { visitCount: a.visitCount - b.visitCount, orderCount: a.orderCount - b.orderCount, dealCount: a.dealCount - b.dealCount, cancelCount: a.cancelCount - b.cancelCount };
        a.goal = goalView(goal, a);
        return { st: a, prev: b };
      };
      if (isManagerRole(me.role) && !bfid) {
        var sAll = bstat(db.buys.filter(function (b) { return inM(b, bm); }), db.buys.filter(function (b) { return inM(b, bprev); }), bgoal(''));
        return {
          month: bm, previousMonth: bprev, kind: 'buy', scope: 'store', stats: sAll.st, previous: sAll.prev, sourceCounts: sAll.st.sourceCounts, goal: sAll.st.goal,
          staffTable: db.staff.filter(function (s) { return s.status === '啟用'; }).map(function (s) {
            var x = bstat(db.buys.filter(function (b) { return b.staffId === s.staffId && inM(b, bm); }), db.buys.filter(function (b) { return b.staffId === s.staffId && inM(b, bprev); }), bgoal(s.staffId));
            return { staffId: s.staffId, name: s.name, role: s.role, status: s.status, stats: x.st, previous: x.prev, goal: x.st.goal, sourceCounts: x.st.sourceCounts };
          })
        };
      }
      var bsid = isManagerRole(me.role) ? bfid : me.staffId;
      var sOne = bstat(db.buys.filter(function (b) { return b.staffId === bsid && inM(b, bm); }), db.buys.filter(function (b) { return b.staffId === bsid && inM(b, bprev); }), bgoal(bsid));
      var bname = (db.staff.filter(function (s) { return s.staffId === bsid; })[0] || {}).name || me.name;
      return { month: bm, previousMonth: bprev, kind: 'buy', scope: 'self', staffId: bsid, staffName: bname, stats: sOne.st, previous: sOne.prev, sourceCounts: sOne.st.sourceCounts, goal: sOne.st.goal };
    }
    throw apiError('未知的操作。', 'UNKNOWN_ACTION');
  }

  var idToken = '';
  var meCache = null;
  var CACHE_SUB = '';
  // LIFF 初始化完成（拿到 idToken）前，API 先排隊等待；畫面可先用快取顯示
  var liffReadyResolve, liffReadyReject;
  var liffReady = new Promise(function (res, rej) { liffReadyResolve = res; liffReadyReject = rej; });
  liffReady.catch(function () {});

  async function api(action, payload) {
    if (MOCK) {
      await new Promise(function (r) { setTimeout(r, MOCK_DELAY); });
      return mockApi(action, payload || {}, idToken);
    }
    await liffReady;
    return realApi(action, payload, idToken);
  }
  var MOCK_DELAY = Number(params.get('delay') || 180);

  /** 合併請求：一次連線拿多種資料。回傳陣列，每項是資料或 Error。
   *  伺服器還沒更新（不認得 batch）時，自動改成分開送。 */
  async function apiBatch(calls) {
    try {
      var res = await api('batch', { calls: calls });
      if (!Array.isArray(res)) throw apiError('bad batch', 'SERVER');
      return res.map(function (r) { return r && r.ok ? r.data : apiError((r && r.error) || '操作失敗', (r && r.code) || 'SERVER'); });
    } catch (err) {
      if (err.code !== 'UNKNOWN_ACTION' && err.code !== 'SERVER') throw err;
      return Promise.all(calls.map(function (c) {
        var p = Object.assign({}, c); delete p.action;
        return api(c.action, p).catch(function (e) { return e; });
      }));
    }
  }

  /* ---------- 本機快取（先顯示上次資料，背景再更新） ---------- */
  var CACHE_PREFIX = 'sd_c_';
  function cacheKey(name) { return CACHE_PREFIX + (CACHE_SUB || 'anon') + '_' + name; }
  function cacheGet(name, maxAgeMs) {
    try {
      var o = JSON.parse(localStorage.getItem(cacheKey(name)) || 'null');
      if (!o || !('data' in o)) return null;
      if (maxAgeMs && Date.now() - o.ts > maxAgeMs) return null;
      return o.data;
    } catch (e) { return null; }
  }
  function cacheSet(name, data) {
    try { localStorage.setItem(cacheKey(name), JSON.stringify({ ts: Date.now(), data: data })); } catch (e) {}
  }
  function cachePrune() {
    try {
      var limit = Date.now() - 3 * 86400 * 1000;
      for (var i = localStorage.length - 1; i >= 0; i--) {
        var k = localStorage.key(i);
        if (!k || k.indexOf(CACHE_PREFIX) !== 0) continue;
        var o = JSON.parse(localStorage.getItem(k) || 'null');
        if (!o || o.ts < limit) localStorage.removeItem(k);
      }
    } catch (e) {}
  }
  /** 先回傳快取（若有）給 onData，同時向伺服器拿最新資料，拿到後再呼叫 onData。 */
  function swr(name, action, payload, onData) {
    var cached = cacheGet(name, 3 * 86400 * 1000);
    var hadCache = cached != null;
    if (hadCache) { try { onData(cached, true); } catch (e) { console.error(e); } }
    var p = (typeof action === 'function' ? action() : api(action, payload)).then(function (fresh) {
      cacheSet(name, fresh);
      if (!hadCache || JSON.stringify(fresh) !== JSON.stringify(cached)) onData(fresh, false);
      return fresh;
    });
    return { cached: hadCache, promise: p };
  }

  function waitForSdk(ms) {
    return new Promise(function (resolve) {
      if (global.liff) { resolve(true); return; }
      var t0 = Date.now();
      (function tick() {
        if (global.liff) { resolve(true); return; }
        if (Date.now() - t0 > ms) { resolve(false); return; }
        setTimeout(tick, 25);
      })();
    });
  }

  async function initLiff(liffId) {
    if (MOCK) {
      idToken = 'mock-token';
      global.liff = {
        closeWindow: function () { toast('已關閉（模擬）'); },
        isInClient: function () { return false; },
        isLoggedIn: function () { return true; }
      };
      liffReadyResolve();
      return {};
    }
    await waitForSdk(15000);
    if (!global.liff) throw apiError('無法載入 LINE 元件，請從官方帳號重新開啟。', 'INVALID_TOKEN');
    await global.liff.init({ liffId: liffId });
    if (!global.liff.isLoggedIn()) {
      global.liff.login({ redirectUri: location.href.split('#')[0] });
      return { redirected: true };
    }
    idToken = global.liff.getIDToken() || '';
    if (!idToken) throw apiError('請在 LINE 內重新開啟本頁，無法確認身分。', 'INVALID_TOKEN');
    liffReadyResolve();
    return {};
  }

  function pendingScreen(msg) {
    return el('div', { class: 'screen' },
      brandBlock(),
      svg(ICO.alert, 'screen-ico ico'),
      el('h1', { text: '等待主管啟用' }),
      el('p', { text: msg || '申請已送出，等待主管在名單將狀態改為「啟用」後即可開始使用。' }),
      el('button', { class: 'btn btn-primary btn-block', type: 'button', onclick: function () { location.reload(); }, text: '重新檢查狀態' })
    );
  }

  function legacyBindForm(onBound) {
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

  function nameBindForm(names, onBound, onRefreshNames) {
    var errBox = el('div', { class: 'banner is-hidden' });
    var sel = el('select', { class: 'select', id: 'bind-name' },
      el('option', { value: '', text: '請選擇你的姓名' })
    );
    names.forEach(function (n) {
      sel.appendChild(el('option', { value: n.staffId, text: n.name }));
    });
    var btn = el('button', { class: 'btn btn-primary btn-block', type: 'submit', text: '送出申請' });
    var form = el('form', {},
      el('div', { class: 'field' },
        el('label', { class: 'label', for: 'bind-name', text: '姓名' }, el('span', { class: 'req', text: ' *' })),
        sel
      ),
      errBox,
      btn
    );
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      var sid = sel.value;
      if (!sid) {
        errBox.textContent = '請選擇你的姓名。';
        errBox.classList.remove('is-hidden');
        return;
      }
      errBox.classList.add('is-hidden');
      btn.disabled = true;
      btn.textContent = '送出中…';
      try {
        var data = await api('bind', { staffId: sid });
        onBound(data);
      } catch (err) {
        if (err.code === 'PENDING') {
          setApp(pendingScreen(err.message));
          return;
        }
        errBox.textContent = err.message || '送出失敗';
        errBox.classList.remove('is-hidden');
        btn.disabled = false;
        btn.textContent = '送出申請';
        if (err.code === 'CONFLICT' && onRefreshNames) {
          onRefreshNames(err.message);
        }
      }
    });
    return el('div', {},
      topbar(null),
      pageHead('身分綁定', 'LINK ACCOUNT', ICO.clip),
      el('div', { class: 'wrap' },
        el('p', { class: 'hint', style: { marginBottom: '16px' }, text: '第一次使用，請選擇你的姓名送出申請，待主管啟用後即可開始使用。' }),
        form
      )
    );
  }

  async function loadBindScreen(opts, bannerMsg) {
    setApp(bootScreen('讀取名單中…'));
    function acceptBound(data) {
      if (data && data.status === '待審核') {
        setApp(pendingScreen('已送出申請（' + (data.name || '') + '），等待主管啟用。'));
        return;
      }
      if (data && data.status && data.status !== '啟用') {
        setApp(errorScreen('帳號已停用', '此帳號已停用，請聯絡主管。'));
        return;
      }
      meCache = data;
      saveMe(data);
      opts.onReady(ctxFor(data));
    }
    try {
      var res = await api('listUnboundNames');
      if (res && res.bound && res.staff) {
        acceptBound(res.staff);
        return;
      }
      var names = (res && res.names) || [];
      if (!names.length) {
        setApp(errorScreen('目前沒有可選填的名單', '所有名單都已綁定完成，若找不到你的姓名請聯絡主管。'));
        return;
      }
      var screen = nameBindForm(names, acceptBound, function (msg) {
        loadBindScreen(opts, msg);
      });
      if (bannerMsg) {
        var b = screen.querySelector('.banner');
        if (b) { b.textContent = bannerMsg; b.classList.remove('is-hidden'); }
      }
      setApp(screen);
    } catch (err) {
      if (err.code === 'PENDING') { setApp(pendingScreen(err.message)); return; }
      if (err.code === 'DISABLED') { setApp(errorScreen('帳號已停用', err.message)); return; }
      if (err.code === 'UNKNOWN_ACTION') {
        // 後端尚未更新為選填名單時，退回舊版驗證碼綁定畫面
        setApp(legacyBindForm(acceptBound));
        return;
      }
      setApp(errorScreen('無法載入名單', err.message || '請稍後再試。'));
    }
  }

  var ME_LAST = 'sd_me_last';
  function ctxFor(me) {
    return {
      me: me, api: api, mock: MOCK, close: closeWindow, today: todayStr, month: monthStr, toast: toast,
      swr: swr, cacheGet: cacheGet, cacheSet: cacheSet, batch: apiBatch
    };
  }
  function handleMeError(err, opts) {
    try { localStorage.removeItem(ME_LAST); } catch (e) {}
    if (err.code === 'UNBOUND') {
      loadBindScreen(opts);
      return true;
    }
    if (err.code === 'PENDING') { setApp(pendingScreen(err.message)); return true; }
    if (err.code === 'DISABLED') { setApp(errorScreen('帳號已停用', err.message)); return true; }
    if (err.code === 'INVALID_TOKEN') { setApp(errorScreen('請重新登入', err.message)); return true; }
    return false;
  }
  function currentSub() {
    try {
      var tok = (!MOCK && global.liff && global.liff.getDecodedIDToken) ? global.liff.getDecodedIDToken() : null;
      if (tok && tok.sub) return tok.sub;
    } catch (e) {}
    return MOCK ? 'mock-' + mockRole() : '';
  }
  function saveMe(data) {
    var sub = currentSub();
    if (!sub) return;
    try { localStorage.setItem(ME_LAST, JSON.stringify({ sub: sub, ts: Date.now(), data: data })); } catch (e) {}
  }

  function injectSkeletonCss() {
    if (document.getElementById('sd-sk-css')) return;
    var st = document.createElement('style');
    st.id = 'sd-sk-css';
    st.textContent = '.sk{padding:4px 0}.sk-block{height:64px;border-radius:10px;margin:0 0 12px;' +
      'background:linear-gradient(90deg,rgba(127,127,127,.12) 25%,rgba(127,127,127,.22) 37%,rgba(127,127,127,.12) 63%);' +
      'background-size:400% 100%;animation:sdsk 1.2s ease infinite}.sk-tall{height:110px}' +
      '@keyframes sdsk{0%{background-position:100% 50%}100%{background-position:0 50%}}' +
      '.sk-note{display:flex;align-items:center;gap:6px;font-size:12px;opacity:.65;margin:0 0 10px}' +
      '.sk-dot{width:6px;height:6px;border-radius:50%;background:var(--accent);animation:sdpulse 1s ease infinite}' +
      '@keyframes sdpulse{50%{opacity:.25}}' +
      '.badge-heat-D{color:var(--dim);border-style:dashed;opacity:.85}' +
      '.heat-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}' +
      '.heat-opt{display:flex;flex-direction:column;align-items:flex-start;gap:4px;text-align:left;padding:10px 12px;min-height:84px;' +
      'border-radius:10px;border:1px solid var(--border);background:rgba(255,255,255,.03);color:#fff;font:inherit;cursor:pointer}' +
      '.heat-opt .hl{font-weight:700;font-size:15px}' +
      '.heat-opt .hd{font-size:12px;line-height:1.45;color:var(--dim)}' +
      '.heat-opt.is-on{border-color:var(--accent);background:rgba(var(--accent-rgb),.16);box-shadow:inset 0 0 0 1px var(--accent)}' +
      '.heat-opt.is-on .hd{color:var(--muted)}' +
      '.heat-opt.h-D .hl{color:var(--muted)}' +
      '.heat-opt.h-D.is-on{border-color:#8a8a90;background:rgba(255,255,255,.08);box-shadow:inset 0 0 0 1px #8a8a90}';
    document.head.appendChild(st);
  }

  function wantsView(name) {
    if (params.get('view') === name) return true;
    var stt = params.get('liff.state') || '';
    if (!stt) return false;
    try { stt = decodeURIComponent(stt); } catch (e) {}
    return new RegExp('(^|[?&])view=' + name + '(&|$)').test(stt);
  }

  async function start(opts) {
    PAGE = opts.page;
    injectSkeletonCss();
    cachePrune();
    // 使用說明：不需綁定或登入，避免被帶去綁定頁。在 LINE 內只安靜初始化，不呼叫 login()。
    if (wantsView('help')) {
      if (typeof SD.renderHelp === 'function') {
        try { SD.renderHelp(); } catch (e) {
          console.error(e);
          setApp(errorScreen('無法開啟使用說明', e.message || '請重新整理頁面。'));
        }
      } else {
        setApp(errorScreen('無法開啟使用說明', '請重新整理頁面。'));
      }
      try {
        if (!MOCK) {
          await waitForSdk(8000);
          if (global.liff) {
            await global.liff.init({ liffId: opts.liffId });
            liffReadyResolve();
          }
        }
      } catch (err) { console.error(err); }
      return;
    }
    // 1) 這支手機開過：直接用上次的業務資料畫出頁面，LINE 登入和 API 在背景進行
    var last = null;
    try { last = JSON.parse(localStorage.getItem(ME_LAST) || 'null'); } catch (e) {}
    if (!last && !MOCK) {
      // 舊版存的 sd_me_<sub> 也拿來用，更新後第一次開就能秒開
      try {
        for (var i = 0; i < localStorage.length; i++) {
          var k = localStorage.key(i);
          if (k && k.indexOf('sd_me_') === 0 && k !== ME_LAST) {
            var o = JSON.parse(localStorage.getItem(k) || 'null');
            if (o && o.data) { last = { sub: k.slice(6), ts: o.ts, data: o.data }; break; }
          }
        }
      } catch (e) {}
    }
    if (MOCK && last && last.sub !== 'mock-' + mockRole()) last = null;
    if (params.get('nocache') === '1') last = null;
    if (last && last.data && last.sub && (Date.now() - last.ts) < 14 * 86400 * 1000) {
      CACHE_SUB = last.sub;
      meCache = last.data;
      var initP = initLiff(opts.liffId);
      try { opts.onReady(ctxFor(last.data)); } catch (e) { console.error(e); }
      try {
        var r = await initP;
        if (r && r.redirected) return;
        var sub = currentSub();
        if (sub && sub !== last.sub) {
          // 換了 LINE 帳號：清掉記住的資料重新開啟
          try { localStorage.removeItem(ME_LAST); } catch (e) {}
          location.reload();
          return;
        }
        var fresh = await api('me');
        saveMe(fresh);
        meCache = fresh;
        if (fresh.role !== last.data.role || fresh.staffId !== last.data.staffId || fresh.status !== last.data.status) {
          location.reload();
        }
      } catch (err) {
        console.error(err);
        liffReadyReject(err);
        if (!handleMeError(err, opts)) toast(err.message || '連線失敗，請稍後再試');
      }
      return;
    }
    // 2) 第一次開：照原流程（登入 → 讀業務資料）
    setApp(bootScreen('載入中…'));
    try {
      var init = await initLiff(opts.liffId);
      if (init && init.redirected) return;
      CACHE_SUB = currentSub() || 'anon';
      var profile;
      try {
        profile = await api('me');
        saveMe(profile);
      } catch (err) {
        if (handleMeError(err, opts)) return;
        throw err;
      }
      meCache = profile;
      opts.onReady(ctxFor(profile));
    } catch (err) {
      console.error(err);
      liffReadyReject(err);
      setApp(errorScreen('無法開啟頁面', err.message || '請稍後再試。'));
    }
  }

  /** 資料還沒到時的骨架畫面（灰色方塊），比空白轉圈圈更快看到版面 */
  function skeleton(rows) {
    var kids = [];
    for (var i = 0; i < (rows || 4); i++) kids.push(el('div', { class: 'sk-block' + (i === 0 ? ' sk-tall' : '') }));
    return el('div', { class: 'sk', 'aria-busy': 'true', 'aria-label': '載入中' }, kids);
  }
  function loadingNote(text) {
    return el('div', { class: 'sk-note' }, el('span', { class: 'sk-dot' }), text || '更新中…');
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


  /* ---------- 聊天室紀錄（liff.sendMessages） ---------- */
  var CHAT_CTX_OK = { utou: 1, group: 1, room: 1, square_chat: 1 };
  /* ---------- 客戶來源 ----------
   * 選「其他」時，填的來源文字存在「備註」第一行：【來源】文字
   * （客戶來源欄仍存「其他」，伺服器驗證不用改、不必重新部署） */
  var SOURCE_TAG = '【來源】';
  var SOURCE_LEGACY = {
    'TikTok': '抖音',
    'IG': 'IG Reels', 'IG廣告': 'IG Reels',
    'FB': 'FB粉專', 'FB廣告': 'FB粉專',
    'LINE': '官方LINE',
    '現場': '過路客',
    'Threads': '其他',
    '介紹': '親友介紹',
    '來電': '其他'
  };
  function splitSourceNote(note) {
    var s = String(note == null ? '' : note);
    if (s.indexOf(SOURCE_TAG) !== 0) return { sourceText: '', note: s };
    var nl = s.indexOf('\n');
    var line = nl < 0 ? s : s.slice(0, nl);
    return { sourceText: line.slice(SOURCE_TAG.length).trim(), note: nl < 0 ? '' : s.slice(nl + 1) };
  }
  function joinSourceNote(sourceText, note) {
    var t = String(sourceText || '').replace(/\s+/g, ' ').trim();
    var n = String(note || '').trim();
    if (!t) return n;
    return SOURCE_TAG + t + (n ? '\n' + n : '');
  }
  /** 顯示用：舊來源對到新名稱；其他（文字） */
  function sourceDisplay(rec) {
    rec = rec || {};
    var raw = String(rec.customerSource || '').trim();
    var src = mapLegacySource(raw);
    if (src === '其他') {
      var t = splitSourceNote(rec.note).sourceText;
      if (!t && raw && raw !== '其他') t = raw;
      return t ? '其他（' + t + '）' : '其他';
    }
    return src;
  }
  /** 舊選項對應到新選項（編輯舊紀錄、統計合併用） */
  function mapLegacySource(src) {
    src = String(src || '').trim();
    return SOURCE_LEGACY[src] || src;
  }
  function mergeSourceCounts(map) {
    var out = {};
    Object.keys(map || {}).forEach(function (k) {
      var nk = mapLegacySource(k);
      out[nk] = (out[nk] || 0) + (map[k] || 0);
    });
    return out;
  }

  /* ---------- v3：下訂／成交／退訂（可同時勾）＋追蹤狀態 ----------
   * 新後端回傳 ordered／dealt／cancelled／followStatus；舊後端只有 result，這裡換算，畫面兩種都能用。 */
  var FOLLOW_STATES = ['再約', '考慮中', '未成交'];
  function flagsOf(v) {
    v = v || {};
    if ('ordered' in v || 'dealt' in v || 'cancelled' in v || 'followStatus' in v) {
      return { ordered: !!v.ordered, dealt: !!v.dealt, cancelled: !!v.cancelled, followStatus: v.followStatus || '' };
    }
    var r = String(v.result || '').trim();
    return {
      ordered: r === '下訂', dealt: r === '成交', cancelled: r === '退訂',
      followStatus: FOLLOW_STATES.indexOf(r) > -1 ? r : ''
    };
  }
  /** 勾選的項目，例如 ['下訂', '成交'] */
  function flagList(v) {
    var f = flagsOf(v), out = [];
    if (f.ordered) out.push('下訂');
    if (f.dealt) out.push('成交');
    if (f.cancelled) out.push('退訂');
    return out;
  }
  /** 一行文字：「下訂、成交」或追蹤狀態 */
  function resultText(v) {
    var a = flagList(v);
    var f = flagsOf(v);
    if (a.length) return a.join('、') + (f.followStatus ? '（' + f.followStatus + '）' : '');
    return f.followStatus || '';
  }
  /** 舊後端（還沒重新部署）只認得單一「結果」：送出時一起附上，讓舊後端也能存 */
  function legacyResult(f) {
    if (f.dealt) return '成交';
    if (f.ordered) return '下訂';
    return f.followStatus || '考慮中';
  }

  /** 讀網址參數：LIFF 第一次開啟時參數包在 liff.state 裡，兩種都要認得 */
  function qp(name) {
    var v = params.get(name);
    if (v != null && v !== '') return v;
    var stt = params.get('liff.state') || '';
    if (!stt) return '';
    try { stt = decodeURIComponent(stt); } catch (e) {}
    var m = stt.match(new RegExp('(?:^|[?&#])' + name + '=([^&#]*)'));
    return m ? decodeURIComponent(m[1]) : '';
  }
  /** 賣車／收車：?mode=buy 或 ?view=buy 開啟收車 */
  function initialKind() {
    return (qp('mode') === 'buy' || qp('view') === 'buy') ? 'buy' : 'sell';
  }
  /** 收車畫面改用金色點綴；賣車維持紅色。加在 html 與 body 上。 */
  function setKindTheme(kind) {
    var on = kind === 'buy';
    document.documentElement.classList.toggle('kind-buy', on);
    if (document.body) document.body.classList.toggle('kind-buy', on);
  }
  setKindTheme(initialKind());
  /** 後端還沒重新部署、不認得收車功能 */
  function isUpdatingError(err) {
    return !!err && (err.code === 'UNKNOWN_ACTION' || /未知的操作|不能合併/.test(String(err.message || '')));
  }
  function updatingCard() {
    return el('div', { class: 'card updating' },
      svg(ICO.alert, 'screen-ico ico'),
      el('h2', { text: '系統更新中，請稍後' }),
      el('p', { text: '收車功能正在更新，更新完成後就能使用。賣車的功能不受影響。' })
    );
  }
  function kindSwitch(kind, onChange) {
    setKindTheme(kind);
    function b(k, label) {
      return el('button', { class: 'tab tab-' + k + (kind === k ? ' is-on' : ''), type: 'button', text: label, onclick: function () { if (kind !== k) onChange(k); } });
    }
    return el('div', { class: 'tabs kind-switch', role: 'tablist' }, b('sell', '賣車'), b('buy', '收車'));
  }

  var HEAT_LABEL = { A: 'A（熱）', B: 'B（溫）', C: 'C（冷）', D: 'D（無效）' };
  // 回報表單選熱度時顯示的說明（試算表存的仍是 A/B/C/D）
  var HEAT_INFO = {
    A: { label: 'A（熱）', desc: '很想買，有談價、問貸款或約再來看，約 2 週內有機會成交' },
    B: { label: 'B（溫）', desc: '有興趣，還在比較車款或價格，約 1 個月內考慮' },
    C: { label: 'C（冷）', desc: '先看看，預算或購車時間不確定' },
    D: { label: 'D（無效）', desc: '沒有購買意願，如陪朋友、路過、預算差太多、聯絡不到' }
  };

  function clipText(s, n) {
    s = String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
    if (s.length <= n) return s;
    return s.slice(0, Math.max(0, n - 1)) + '…';
  }

  function clipRaw(s, n) {
    s = String(s == null ? '' : s);
    if (s.length <= n) return s;
    return s.slice(0, Math.max(0, n - 1)) + '…';
  }

  function heatLabel(v) {
    var s = String(v || '').trim();
    return HEAT_LABEL[s] || s;
  }

  function flexAccentBar(color) {
    return {
      type: 'box',
      layout: 'vertical',
      contents: [{ type: 'filler' }],
      height: '3px',
      backgroundColor: color || '#D40000',
      margin: 'md'
    };
  }

  function flexRow(label, value) {
    var v = String(value == null ? '' : value).trim();
    if (!v) return null;
    return {
      type: 'box',
      layout: 'horizontal',
      spacing: 'md',
      contents: [
        { type: 'text', text: label, size: 'sm', color: '#999999', flex: 3, wrap: true },
        { type: 'text', text: v, size: 'sm', color: '#FFFFFF', flex: 5, wrap: true, align: 'end', weight: 'bold' }
      ]
    };
  }

  function flexHeader(title, accent) {
    return {
      type: 'box',
      layout: 'vertical',
      backgroundColor: '#0A0A0A',
      paddingAll: '16px',
      paddingBottom: '8px',
      contents: [
        { type: 'text', text: '上達汽車', size: 'xxs', color: '#AAAAAA', weight: 'bold' },
        { type: 'text', text: title, size: 'lg', weight: 'bold', color: '#FFFFFF', margin: 'sm', wrap: true },
        flexAccentBar(accent)
      ]
    };
  }

  function flexBubble(title, bodyContents, accent) {
    return {
      type: 'bubble',
      size: 'kilo',
      styles: {
        header: { backgroundColor: '#0A0A0A' },
        body: { backgroundColor: '#0A0A0A' }
      },
      header: flexHeader(title, accent),
      body: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#0A0A0A',
        paddingAll: '16px',
        paddingTop: '8px',
        spacing: 'sm',
        contents: bodyContents
      }
    };
  }

  function visitTitle(isUpdate) {
    return isUpdate ? '✅ 已更新看車' : '✅ 已回報看車';
  }

  function visitAltText(rec, isUpdate) {
    var title = isUpdate ? '已更新看車' : '已回報看車';
    var bits = [rec && rec.customerName, rec && rec.carModel].filter(function (x) {
      return x && String(x).trim();
    });
    return clipText(bits.length ? (title + '：' + bits.join(' ')) : title, 400);
  }

  function visitPlainText(rec, isUpdate) {
    rec = rec || {};
    var lines = [visitTitle(isUpdate)];
    var rows = [
      ['客戶稱呼', rec.customerName],
      ['看車車款', rec.carModel],
      ['車牌', rec.carPlate],
      ['客戶來源', sourceDisplay(rec)],
      ['客戶熱度', rec.heat ? heatLabel(rec.heat) : ''],
      ['結果', flagList(rec).join('、')],
      ['追蹤狀態', flagsOf(rec).followStatus],
      ['下次聯絡日', rec.nextContactDate]
    ];
    rows.forEach(function (r) {
      if (r[1] && String(r[1]).trim()) lines.push(r[0] + '：' + String(r[1]).trim());
    });
    if (rec.visitId) lines.push('紀錄編號：' + rec.visitId);
    return clipRaw(lines.join('\n'), 5000);
  }

  function visitFlexMessage(rec, isUpdate) {
    rec = rec || {};
    var rows = [
      flexRow('客戶稱呼', rec.customerName),
      flexRow('看車車款', rec.carModel),
      flexRow('車牌', rec.carPlate),
      flexRow('售價', rec.carPrice !== '' && rec.carPrice != null ? rec.carPrice + ' 萬' : ''),
      flexRow('客戶來源', sourceDisplay(rec)),
      flexRow('客戶熱度', rec.heat ? heatLabel(rec.heat) : ''),
      flexRow('結果', flagList(rec).join('、')),
      flexRow('追蹤狀態', flagsOf(rec).followStatus),
      flexRow('下次聯絡日', rec.nextContactDate)
    ].filter(Boolean);
    if (!rows.length) {
      rows.push({
        type: 'text',
        text: '回報已送出',
        size: 'sm',
        color: '#FFFFFF',
        wrap: true
      });
    }
    if (rec.visitId) {
      rows.push({ type: 'separator', color: '#333333', margin: 'md' });
      rows.push({
        type: 'text',
        text: '紀錄編號　' + rec.visitId,
        size: 'xxs',
        color: '#888888',
        margin: 'md',
        wrap: true
      });
    }
    var bubble = flexBubble(visitTitle(isUpdate), rows);
    var stockUrl = stockLiffUrl();
    if (stockUrl) {
      bubble.styles.footer = { backgroundColor: '#0A0A0A' };
      bubble.footer = {
        type: 'box', layout: 'vertical', backgroundColor: '#0A0A0A', paddingAll: '12px', paddingTop: '0px',
        contents: [{
          type: 'button', style: 'secondary', height: 'sm', color: '#2A2A2A',
          action: { type: 'uri', label: '🚗 查在庫車', uri: stockUrl }
        }]
      };
    }
    return {
      type: 'flex',
      altText: visitAltText(rec, isUpdate),
      contents: bubble
    };
  }

  function noteAltText(rec) {
    rec = rec || {};
    var preview = clipText(rec.note || '', 40);
    var date = rec.date || todayStr();
    var base = '今日總結已送出：' + date;
    return clipText(preview ? (base + ' ' + preview) : base, 400);
  }

  function notePlainText(rec) {
    rec = rec || {};
    var lines = ['📝 今日總結已送出', '日期：' + (rec.date || todayStr())];
    if (rec.note && String(rec.note).trim()) lines.push(clipText(rec.note, 400));
    return clipRaw(lines.join('\n'), 5000);
  }

  function noteFlexMessage(rec) {
    rec = rec || {};
    var body = [flexRow('日期', rec.date || todayStr())].filter(Boolean);
    var preview = clipText(rec.note || '', 120);
    if (preview) {
      body.push({
        type: 'text',
        text: preview,
        size: 'sm',
        color: '#FFFFFF',
        wrap: true,
        margin: 'md',
        maxLines: 5
      });
    }
    return {
      type: 'flex',
      altText: noteAltText(rec),
      contents: flexBubble('📝 今日總結已送出', body)
    };
  }

  function stockLiffUrl() {
    var id = (cfg.liffIds || {}).report;
    return id ? 'https://liff.line.me/' + id + '?view=stock' : '';
  }

  /** 把一張卡片分享給客戶：優先用「分享對象選擇器」，不能用時改送到目前聊天室。 */
  async function shareFlex(flexMsg) {
    if (MOCK) {
      console.info('[SD] mock：shareTargetPicker 原本會分享：');
      console.info(JSON.stringify(flexMsg));
      toast('已分享（模擬）');
      return { shared: 'mock' };
    }
    try { await liffReady; } catch (e) {}
    var liffObj = global.liff;
    if (!liffObj) { toast('請在 LINE 內開啟'); return { skipped: 'no_liff' }; }
    var canPick = false;
    try { canPick = typeof liffObj.isApiAvailable === 'function' && liffObj.isApiAvailable('shareTargetPicker'); } catch (e) {}
    if (canPick) {
      try {
        var res = await liffObj.shareTargetPicker([flexMsg], { isMultiple: true });
        if (res) { toast('已分享'); return { shared: 'picker' }; }
        return { skipped: 'cancel' };
      } catch (err) {
        console.warn('[SD] shareTargetPicker 失敗', err);
        toast('分享失敗（' + String((err && (err.code || err.message)) || '').slice(0, 40) + '）');
        return { skipped: 'picker_error' };
      }
    }
    // 備案：送到目前開啟的聊天室
    var ctx = typeof liffObj.getContext === 'function' ? (liffObj.getContext() || {}) : {};
    if (liffObj.isInClient && liffObj.isInClient() && CHAT_CTX_OK[ctx.type || ''] && typeof liffObj.sendMessages === 'function') {
      try {
        await liffObj.sendMessages([flexMsg]);
        toast('已傳到目前聊天室（分享選擇器未開啟）');
        return { shared: 'chat' };
      } catch (err) {
        console.warn('[SD] sendMessages 失敗', err);
      }
    }
    toast('無法分享：請在 LINE Developers 開啟 Share target picker');
    return { skipped: 'unavailable' };
  }

  function packMessages(flexMsg, plain) {
    return { flex: flexMsg, text: plain };
  }

  async function hasChatWritePermission() {
    var liffObj = global.liff;
    if (!liffObj || !liffObj.permission || typeof liffObj.permission.query !== 'function') {
      return true;
    }
    try {
      var st = await liffObj.permission.query('chat_message.write');
      var state = st && st.state;
      if (state === 'granted') return true;
      if (state === 'prompt' && typeof liffObj.permission.requestAll === 'function') {
        await liffObj.permission.requestAll();
        var again = await liffObj.permission.query('chat_message.write');
        return !!(again && again.state === 'granted');
      }
      return false;
    } catch (err) {
      console.warn('[SD] 權限查詢失敗，改嘗試直接送出', err);
      return true;
    }
  }

  async function postChatRecord(pack) {
    try {
      if (MOCK) {
        console.info('[SD] mock：略過 sendMessages，原本會送出：');
        var mockMsgs = pack && pack.flex ? [pack.flex].concat((pack.extra || []).filter(Boolean)).slice(0, 5) : [pack];
        console.info(JSON.stringify(mockMsgs.length > 1 ? mockMsgs : mockMsgs[0], null, 2));
        global.__sdLastSent = mockMsgs; // 測試用
        return { skipped: 'mock', count: mockMsgs.length };
      }
      try { await liffReady; } catch (e) {}
      var liffObj = global.liff;
      if (!liffObj || typeof liffObj.isInClient !== 'function' || !liffObj.isInClient()) {
        console.info('[SD] 非 LINE 內建瀏覽器，略過 sendMessages');
        return { skipped: 'not_in_client' };
      }
      var ctx = typeof liffObj.getContext === 'function' ? (liffObj.getContext() || {}) : {};
      var typ = ctx.type || '';
      if (!CHAT_CTX_OK[typ]) {
        console.info('[SD] 非聊天室開啟（context=' + typ + '），略過 sendMessages');
        toast('聊天室紀錄未送出（請從聊天室選單開啟）');
        return { skipped: 'bad_context' };
      }
      var granted = await hasChatWritePermission();
      if (!granted) {
        console.warn('[SD] 未授權 chat_message.write，略過 sendMessages');
        toast('聊天室紀錄未送出（未授權傳訊息）');
        return { skipped: 'no_permission' };
      }
      var msgs = [pack.flex].concat((pack.extra || []).filter(Boolean)).slice(0, 5); // LINE 一次最多 5 則
      if (typeof liffObj.sendMessages !== 'function') {
        console.warn('[SD] 此環境不支援 sendMessages');
        return { skipped: 'unsupported' };
      }
      try {
        await liffObj.sendMessages(msgs);
        return { sent: 'flex', count: msgs.length };
      } catch (firstErr) {
        console.warn('[SD] 第一次送出失敗', firstErr);
        // 多則一起送失敗且不是權限問題（例如卡片內容被拒）：只送紀錄卡再試一次
        if (msgs.length > 1 && !/403|permission|forbidden|scope|auth/i.test(String((firstErr && (firstErr.code || firstErr.status)) || '') + ' ' + String((firstErr && firstErr.message) || ''))) {
          try {
            await liffObj.sendMessages([pack.flex]);
            return { sent: 'flex', count: 1, droppedExtra: true };
          } catch (singleErr) {
            console.warn('[SD] 只送紀錄卡也失敗', singleErr);
          }
        }
        // 舊授權沒有 chat_message.write：要求重新授權後再試一次
        try {
          if (liffObj.permission && typeof liffObj.permission.requestAll === 'function') {
            await liffObj.permission.requestAll();
          }
          await liffObj.sendMessages(msgs);
          return { sent: 'flex', count: msgs.length };
        } catch (retryErr) {
          console.warn('[SD] 重新授權後仍失敗', retryErr);
          var code = String((retryErr && (retryErr.code || retryErr.status)) || '');
          var msg = String((retryErr && retryErr.message) || retryErr || '');
          if (/403|permission|forbidden|scope|auth/i.test(code + ' ' + msg)) {
            try { sessionStorage.setItem('sd_relogin', '1'); } catch (e) {}
            if (!global.__sdRelogged && typeof liffObj.logout === 'function') {
              global.__sdRelogged = true;
              toast('需要重新授權，請按「許可」。這筆已存檔，不用重填');
              setTimeout(function () { try { liffObj.logout(); liffObj.login({ redirectUri: location.href }); } catch (e) {} }, 1500);
              return { skipped: 'relogin' };
            }
          }
          toast('聊天室紀錄未送出（' + (code || '') + ' ' + msg.slice(0, 60) + '）');
          return { skipped: 'send_failed', code: code, msg: msg };
        }
      }
    } catch (err) {
      console.warn('[SD] sendMessages 發生錯誤', err);
      try { toast('聊天室紀錄未送出'); } catch (ignore) {}
      return { skipped: 'error' };
    }
  }

  /** overview：{ visits, me, date } → 一起送「今日回報總覽」卡 */
  async function postVisitToChat(rec, isUpdate, overview) {
    var pack = packMessages(visitFlexMessage(rec, isUpdate), visitPlainText(rec, isUpdate));
    if (overview && overview.visits) {
      try { pack.extra = [todayOverviewFlex(overview.visits, overview.me, overview.date, rec && rec.visitId)]; }
      catch (e) { console.warn('[SD] 今日總覽卡建立失敗', e); }
    }
    return postChatRecord(pack);
  }

  /* ---------- 今日回報總覽（只放自己的紀錄；不含任何主管專用欄位） ---------- */
  var OVERVIEW_MAX_ROWS = 15;
  var HEAT_COLOR = { A: '#FF5A66', B: '#F5C15A', C: '#9AA0A6', D: '#6B6B70' };

  function overviewStat(label, value, color) {
    return {
      type: 'box', layout: 'vertical', flex: 1, paddingAll: '8px', cornerRadius: '6px', backgroundColor: '#1A1A1C',
      contents: [
        { type: 'text', text: String(value), size: 'xl', weight: 'bold', color: color || '#FFFFFF', align: 'center' },
        { type: 'text', text: label, size: 'xxs', color: '#999999', align: 'center' }
      ]
    };
  }

  function overviewRow(v, isNew) {
    var heat = String(v.heat || '').trim();
    var time = String(v.createdAt || '').slice(11, 16) || '—';
    return {
      type: 'box', layout: 'horizontal', spacing: 'sm', margin: 'md',
      contents: [
        { type: 'text', text: time, size: 'xs', color: isNew ? '#FF5A66' : '#888888', flex: 2, gravity: 'top' },
        {
          type: 'box', layout: 'vertical', flex: 6,
          contents: [
            { type: 'text', text: clipText(v.customerName || '（未填稱呼）', 14) + (isNew ? '　NEW' : ''), size: 'sm', color: '#FFFFFF', weight: 'bold', wrap: false },
            { type: 'text', text: clipText(v.carModel || '—', 22), size: 'xxs', color: '#AAAAAA', wrap: false }
          ]
        },
        {
          type: 'box', layout: 'vertical', flex: 3,
          contents: [
            { type: 'text', text: heat ? heatLabel(heat) : '—', size: 'xs', weight: 'bold', color: HEAT_COLOR[heat] || '#CCCCCC', align: 'end' },
            { type: 'text', text: clipText(resultText(v) || '—', 10), size: 'xxs', color: '#DDDDDD', align: 'end' }
          ]
        }
      ]
    };
  }

  function todayOverviewFlex(visits, me, date, newId) {
    date = date || todayStr();
    var list = (visits || []).filter(function (v) {
      return v && v.visitDate === date && (!me || !me.staffId || v.staffId === me.staffId);
    }).slice().sort(function (a, b) { return String(b.createdAt || '').localeCompare(String(a.createdAt || '')); });
    var heatN = { A: 0, B: 0, C: 0, D: 0 };
    var orders = 0, deals = 0;
    list.forEach(function (v) {
      var h = String(v.heat || '').trim();
      if (h in heatN) heatN[h] += 1;
      var f = flagsOf(v);
      if (f.ordered) orders += 1;
      if (f.dealt) deals += 1;
    });
    var rows = list.slice(0, OVERVIEW_MAX_ROWS).map(function (v) { return overviewRow(v, v.visitId === newId); });
    if (list.length > OVERVIEW_MAX_ROWS) {
      rows.push({ type: 'text', text: '…還有 ' + (list.length - OVERVIEW_MAX_ROWS) + ' 筆', size: 'xs', color: '#999999', margin: 'md', align: 'center' });
    }
    if (!rows.length) rows.push({ type: 'text', text: '今天還沒有看車紀錄。', size: 'sm', color: '#999999', margin: 'md' });
    var body = [
      {
        type: 'box', layout: 'horizontal', spacing: 'sm',
        contents: [overviewStat('今日帶看', list.length), overviewStat('下訂', orders, '#FF5A66'), overviewStat('成交', deals, '#FF5A66')]
      },
      {
        type: 'box', layout: 'horizontal', spacing: 'sm', margin: 'sm',
        contents: ['A', 'B', 'C', 'D'].map(function (k) {
          return {
            type: 'box', layout: 'vertical', flex: 1, paddingAll: '6px', cornerRadius: '6px', backgroundColor: '#141416',
            contents: [
              { type: 'text', text: String(heatN[k]), size: 'md', weight: 'bold', color: HEAT_COLOR[k], align: 'center' },
              { type: 'text', text: heatLabel(k), size: 'xxs', color: '#999999', align: 'center' }
            ]
          };
        })
      },
      { type: 'separator', color: '#333333', margin: 'lg' }
    ].concat(rows);
    var bubble = flexBubble('📋 今日回報總覽', body);
    bubble.size = 'mega';
    bubble.header.contents.splice(2, 0, {
      type: 'text', text: date + (me && me.name ? '　' + me.name : ''), size: 'xs', color: '#AAAAAA', margin: 'sm'
    });
    var todayId = (cfg.liffIds || {}).today;
    if (todayId) {
      bubble.styles.footer = { backgroundColor: '#0A0A0A' };
      bubble.footer = {
        type: 'box', layout: 'vertical', backgroundColor: '#0A0A0A', paddingAll: '12px', paddingTop: '0px',
        contents: [{
          type: 'button', style: 'primary', color: '#D7192A', height: 'sm',
          action: { type: 'uri', label: '開啟今日總結', uri: 'https://liff.line.me/' + todayId }
        }]
      };
    }
    return {
      type: 'flex',
      altText: clipText('今日回報總覽：' + list.length + ' 筆（下訂 ' + orders + '）', 400),
      contents: bubble
    };
  }

  /* ---------- 收車紀錄卡（不放「我們出價」，出價只留在系統裡） ---------- */
  function buyTitle(isUpdate) { return isUpdate ? '✅ 已更新收車' : '✅ 已回報收車'; }
  function buyRows(rec) {
    return [
      ['賣方客人', rec.sellerName],
      ['車款', rec.carModel],
      ['年份', rec.carYear],
      ['里程', rec.mileage !== '' && rec.mileage != null ? rec.mileage + ' 萬公里' : ''],
      ['客人開價', rec.askPrice !== '' && rec.askPrice != null ? rec.askPrice + ' 萬' : ''],
      ['客戶來源', sourceDisplay(rec)],
      ['熱度', rec.heat ? heatLabel(rec.heat) : ''],
      ['結果', ['估車'].concat(flagList(rec)).join('、')],
      ['追蹤狀態', flagsOf(rec).followStatus],
      ['下次聯絡日', rec.nextContactDate]
    ];
  }
  function buyPlainText(rec, isUpdate) {
    rec = rec || {};
    var lines = [buyTitle(isUpdate)];
    buyRows(rec).forEach(function (r) { if (r[1] && String(r[1]).trim()) lines.push(r[0] + '：' + String(r[1]).trim()); });
    if (rec.buyId) lines.push('紀錄編號：' + rec.buyId);
    return clipRaw(lines.join('\n'), 5000);
  }
  function buyFlexMessage(rec, isUpdate) {
    rec = rec || {};
    var rows = buyRows(rec).map(function (r) { return flexRow(r[0], r[1]); }).filter(Boolean);
    if (rec.buyId) {
      rows.push({ type: 'separator', color: '#333333', margin: 'md' });
      rows.push({ type: 'text', text: '紀錄編號　' + rec.buyId, size: 'xxs', color: '#888888', margin: 'md', wrap: true });
    }
    var bits = [rec.sellerName, rec.carModel].filter(function (x) { return x && String(x).trim(); });
    return {
      type: 'flex',
      altText: clipText((isUpdate ? '已更新收車' : '已回報收車') + (bits.length ? '：' + bits.join(' ') : ''), 400),
      contents: flexBubble(buyTitle(isUpdate), rows, '#D4A64A')
    };
  }
  async function postBuyToChat(rec, isUpdate) {
    return postChatRecord(packMessages(buyFlexMessage(rec, isUpdate), buyPlainText(rec, isUpdate)));
  }

  async function postDailyNoteToChat(rec) {
    var pack = packMessages(noteFlexMessage(rec), notePlainText(rec));
    return postChatRecord(pack);
  }

  global.SD = {
    start: start,
    isManagerRole: isManagerRole,
    canSeeFloor: canSeeFloor,
    el: el,
    svg: svg,
    ICO: ICO,
    topbar: topbar,
    pageHead: pageHead,
    setApp: setApp,
    bootScreen: bootScreen,
    skeleton: skeleton,
    loadingNote: loadingNote,
    swr: swr,
    errorScreen: errorScreen,
    toast: toast,
    todayStr: todayStr,
    monthStr: monthStr,
    ymLabel: ymLabel,
    shiftMonth: shiftMonth,
    pct: pct,
    vsText: vsText,
    isMock: function () { return MOCK; },
    closeWindow: closeWindow,
    postVisitToChat: postVisitToChat,
    postDailyNoteToChat: postDailyNoteToChat,
    todayOverviewFlex: todayOverviewFlex,
    shareFlex: shareFlex,
    stockLiffUrl: stockLiffUrl,
    HEAT_INFO: HEAT_INFO,
    splitSourceNote: splitSourceNote,
    joinSourceNote: joinSourceNote,
    sourceDisplay: sourceDisplay,
    mapLegacySource: mapLegacySource,
    mergeSourceCounts: mergeSourceCounts,
    heatLabel: heatLabel,
    visitFlexMessage: visitFlexMessage,
    noteFlexMessage: noteFlexMessage,
    buyFlexMessage: buyFlexMessage,
    postBuyToChat: postBuyToChat,
    flagsOf: flagsOf,
    flagList: flagList,
    resultText: resultText,
    legacyResult: legacyResult,
    FOLLOW_STATES: FOLLOW_STATES,
    qp: qp,
    initialKind: initialKind,
    isUpdatingError: isUpdatingError,
    updatingCard: updatingCard,
    kindSwitch: kindSwitch,
    setKindTheme: setKindTheme
  };
})(window);
