/* 查在庫車：庫存瀏覽、回報表單選車、分享給客戶、久未售出（主管） */
(function (global) {
  var SD = global.SD;
  var el = SD.el;

  /* ---------- 模擬資料（只在 ?mock=1 且有 stock-mock.js 時使用；正式站不需要上傳該檔） ---------- */
  var MOCK_HEADER = ['車輛狀態','廠牌','車型','排氣量 (cc)','車色','內裝','出廠年月','里程 (萬km)','售價 (萬)','底價 (萬)','備鑰','廠證','認證','原鈑','入庫日期','在庫天數','發照日期','車牌號碼','驗車備註','驗車提醒'];
  function num(v) { var m = String(v == null ? '' : v).replace(/,/g, '').match(/-?\d+(\.\d+)?/); return m ? Number(m[0]) : null; }
  function bool(v) { return /^(true|是|v|✓|✔|y|yes|有)$/i.test(String(v).trim()); }
  function normYm(s) {
    var m = String(s || '').match(/^(\d{4})[.\/-](\d{1,2})/);
    if (!m) return String(s || '');
    var mm = m[2].length === 1 ? (m[2] === '1' && /^\d{4}\.1$/.test(String(s).trim()) ? '10' : '0' + m[2]) : m[2];
    return m[1] + '.' + mm;
  }
  global.SD_MOCK_INVENTORY = function () {
    var c = {};
    MOCK_HEADER.forEach(function (h, i) { c[h] = i; });
    return (global.SD_MOCK_ROWS || []).map(function (r, i) {
      function g(h) { return String(r[c[h]] == null ? '' : r[c[h]]).trim(); }
      var plate = g('車牌號碼').toUpperCase();
      return {
        id: plate || 'R' + (i + 7), status: g('車輛狀態'), brand: g('廠牌').replace(/\s+/g, ' '), model: g('車型').replace(/\s+/g, ' '),
        cc: num(g('排氣量 (cc)')), color: g('車色'), interior: g('內裝'), year: normYm(g('出廠年月')),
        mileage: num(g('里程 (萬km)')), price: num(g('售價 (萬)')), priceText: g('售價 (萬)'), plate: plate,
        factoryCert: bool(g('廠證')), cert: bool(g('認證')), original: bool(g('原鈑')),
        floor: num(g('底價 (萬)')), floorText: g('底價 (萬)').replace(/\s*\n\s*/g, ' '), keys: bool(g('備鑰')),
        inDate: g('入庫日期'), days: num(g('在庫天數')), licenseDate: g('發照日期'),
        inspectNote: g('驗車備註'), inspectRemind: g('驗車提醒')
      };
    });
  };

  /* ---------- 樣式（直接注入，不必改 app.css） ---------- */
  (function css() {
    if (document.getElementById('sd-stock-css')) return;
    var st = document.createElement('style');
    st.id = 'sd-stock-css';
    st.textContent = [
      '.view-tabs{display:flex;gap:8px;margin:0 0 16px}',
      '.view-tabs .tab{flex:1}',
      '.car{position:relative}',
      '.car-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}',
      '.car-title{font-size:17px;font-weight:700;line-height:1.3}',
      '.car-brand{font-size:12px;letter-spacing:.06em;color:var(--muted);font-weight:600}',
      '.car-price{font-size:20px;font-weight:800;color:#fff;white-space:nowrap;text-align:right}',
      '.car-price small{font-size:12px;font-weight:600;color:var(--muted);margin-left:2px}',
      '.car-specs{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:10px 0 8px}',
      '.car-spec{background:rgba(255,255,255,.04);border:1px solid var(--border-soft);border-radius:8px;padding:6px 8px}',
      '.car-spec b{display:block;font-size:14px}',
      '.car-spec span{font-size:11px;color:var(--dim)}',
      '.car-mgr{margin-top:8px;padding:8px 10px;border-radius:8px;border:1px dashed rgba(215,25,42,.6);font-size:13px;color:#ffb3ba}',
      '.car-mgr b{color:#fff}',
      '.car-actions{display:flex;gap:8px;margin-top:10px}',
      '.car-actions .btn{flex:1;min-height:38px;font-size:14px;padding:0 10px}',
      '.days-hot{color:#ff6b6b;font-weight:800}',
      '.pick-list{display:flex;flex-direction:column;gap:8px;margin-top:10px;max-height:340px;overflow:auto;-webkit-overflow-scrolling:touch}',
      '.pick-car{display:flex;justify-content:space-between;align-items:center;gap:10px;text-align:left;width:100%;padding:10px 12px;border-radius:10px;border:1px solid var(--border);background:rgba(255,255,255,.03);color:#fff;font:inherit}',
      '.pick-car.is-on{border-color:var(--accent);background:rgba(215,25,42,.14)}',
      '.pick-car .pm{font-weight:700}',
      '.pick-car .ps{font-size:12px;color:var(--muted);margin-top:2px}',
      '.pick-car .pp{font-weight:800;white-space:nowrap}',
      '.picked{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;border:1px solid var(--accent);background:rgba(215,25,42,.12)}',
      '.picked .pm{font-weight:700}',
      '.picked .ps{font-size:12px;color:var(--muted)}',
      '.picked button{flex:none}',
      '.chip-n{opacity:.6;margin-left:4px;font-size:12px}',
      '.chips-scroll{flex-wrap:nowrap;overflow-x:auto;-webkit-overflow-scrolling:touch;padding-bottom:4px;scrollbar-width:none}',
      '.chips-scroll::-webkit-scrollbar{display:none}',
      '.chips-scroll .chip{flex:none}',
      '.stock-count{font-size:13px;color:var(--muted);margin:4px 0 10px}'
    ].join('');
    document.head.appendChild(st);
  })();

  SD.ICO.car = '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 30l3-9a4 4 0 0 1 4-3h18a4 4 0 0 1 4 3l3 9"/><rect x="6" y="30" width="36" height="8" rx="2"/><circle cx="14" cy="38" r="3"/><circle cx="34" cy="38" r="3"/></svg>';

  var PRICE_BANDS = [
    { k: '', label: '全部' },
    { k: '0-50', label: '50萬內', min: 0, max: 50 },
    { k: '50-100', label: '50–100', min: 50, max: 100 },
    { k: '100-200', label: '100–200', min: 100, max: 200 },
    { k: '200-400', label: '200–400', min: 200, max: 400 },
    { k: '400-', label: '400萬+', min: 400, max: Infinity }
  ];

  function fmtPrice(n) {
    if (n == null || isNaN(n)) return '—';
    var s = Number(n).toFixed(1).replace(/\.0$/, '');
    return s;
  }
  function floorLabel(car) {
    var t = String(car.floorText || '').trim();
    var m = t.match(/^(\d+(?:\.\d+)?)\s*(.*)$/);
    return m ? m[1] + ' 萬' + (m[2] ? ' ' + m[2] : '') : t;
  }
  function yearOf(car) { return String(car.year || '').slice(0, 4); }
  function carName(car) { return [car.brand, car.model].filter(Boolean).join(' '); }
  /** 寫進「看車車款」的文字，例如 BENZ E300 2024 黑 */
  function carModelText(car) { return [car.brand, car.model, yearOf(car), car.color].filter(Boolean).join(' '); }
  function mileageText(car) { return car.mileage == null ? '—' : fmtPrice(car.mileage) + ' 萬km'; }
  function ccText(car) { return car.cc == null ? '—' : Number(car.cc).toLocaleString('en-US') + ' cc'; }
  function sortBrands(cars) {
    var cnt = {};
    cars.forEach(function (c) { cnt[c.brand] = (cnt[c.brand] || 0) + 1; });
    return Object.keys(cnt).sort(function (a, b) { return cnt[b] - cnt[a] || a.localeCompare(b); })
      .map(function (b) { return { brand: b, n: cnt[b] }; });
  }

  /* ---------- 給客戶的卡片（絕不放底價、備鑰、驗車、入庫日期、在庫天數、車牌） ---------- */
  function customerFlex(car) {
    var specs = [
      ['年份', car.year || '—'],
      ['里程', mileageText(car)],
      ['排氣量', ccText(car)],
      ['外觀 / 內裝', [car.color, car.interior].filter(Boolean).join(' / ') || '—']
    ];
    var tags = [];
    if (car.original) tags.push('原鈑件');
    if (car.cert) tags.push('認證車');
    if (car.factoryCert) tags.push('廠證');
    var body = specs.map(function (r) {
      return {
        type: 'box', layout: 'horizontal', spacing: 'md',
        contents: [
          { type: 'text', text: r[0], size: 'sm', color: '#999999', flex: 3 },
          { type: 'text', text: String(r[1]), size: 'sm', color: '#FFFFFF', flex: 5, align: 'end', weight: 'bold', wrap: true }
        ]
      };
    });
    if (tags.length) {
      body.push({ type: 'separator', color: '#333333', margin: 'md' });
      body.push({ type: 'text', text: '✔ ' + tags.join('　✔ '), size: 'xs', color: '#E56B75', margin: 'md', wrap: true, weight: 'bold' });
    }
    var oa = (global.SD_CONFIG || {}).oaId || '@838qqiic';
    return {
      type: 'flex',
      altText: ('上達汽車｜' + carName(car) + ' ' + yearOf(car) + ' 售價 ' + fmtPrice(car.price) + ' 萬').slice(0, 400),
      contents: {
        type: 'bubble', size: 'kilo',
        styles: { header: { backgroundColor: '#0A0A0A' }, body: { backgroundColor: '#0A0A0A' }, footer: { backgroundColor: '#0A0A0A' } },
        header: {
          type: 'box', layout: 'vertical', backgroundColor: '#0A0A0A', paddingAll: '16px', paddingBottom: '8px',
          contents: [
            { type: 'text', text: '上達汽車 SHANG DA MOTORS', size: 'xxs', color: '#AAAAAA', weight: 'bold' },
            { type: 'text', text: car.brand || '', size: 'xs', color: '#BBBBBB', margin: 'md' },
            { type: 'text', text: car.model || carName(car), size: 'xl', weight: 'bold', color: '#FFFFFF', wrap: true },
            {
              type: 'box', layout: 'baseline', margin: 'md',
              contents: [
                { type: 'text', text: fmtPrice(car.price), size: 'xxl', weight: 'bold', color: '#E02032', flex: 0 },
                { type: 'text', text: ' 萬', size: 'sm', color: '#BBBBBB', flex: 0 }
              ]
            },
            { type: 'box', layout: 'vertical', contents: [{ type: 'filler' }], height: '3px', backgroundColor: '#D40000', margin: 'md' }
          ]
        },
        body: { type: 'box', layout: 'vertical', backgroundColor: '#0A0A0A', paddingAll: '16px', paddingTop: '8px', spacing: 'sm', contents: body },
        footer: {
          type: 'box', layout: 'vertical', backgroundColor: '#0A0A0A', paddingAll: '12px', paddingTop: '0px', spacing: 'sm',
          contents: [
            { type: 'button', style: 'primary', color: '#D7192A', height: 'sm', action: { type: 'uri', label: '預約賞車／詢問', uri: 'https://line.me/R/ti/p/' + encodeURIComponent(oa) } },
            { type: 'text', text: '實際車況與價格以現場為準', size: 'xxs', color: '#777777', align: 'center', margin: 'sm' }
          ]
        }
      }
    };
  }

  /* ---------- 控制器 ---------- */
  function create(ctx, opts) {
    var me = ctx.me;
    var isMgr = SD.isManagerRole(me.role);
    var canSeeFloor = SD.canSeeFloor(me.role);
    var st = {
      cars: null, error: '', loading: false, updatedAt: '',
      brand: '', band: '', q: '', mode: 'browse', agingDays: 90,
      pickBrand: ''
    };
    var changed = opts && opts.onChange ? opts.onChange : function () {};
    var loadP = null;

    /** fetcher：可傳入已送出的請求（例如合併請求的一部分） */
    function load(force, fetcher) {
      if (loadP && !force) return loadP;
      st.loading = true;
      var h = ctx.swr('inventory', fetcher || 'inventory', {}, function (data) {
        st.cars = (data && data.cars) || [];
        st.updatedAt = (data && data.updatedAt) || '';
        st.error = '';
        changed();
      });
      if (h.cached) changed();
      loadP = h.promise.then(function () {
        st.loading = false; changed();
      }).catch(function (err) {
        st.loading = false;
        st.error = err.code === 'UNKNOWN_ACTION' ? '後端尚未更新（請重新部署 Apps Script）' : (err.message || '庫存載入失敗');
        changed();
      });
      return loadP;
    }

    function filtered() {
      var cars = st.cars || [];
      var band = PRICE_BANDS.filter(function (b) { return b.k === st.band; })[0];
      var q = st.q.trim().toLowerCase();
      return cars.filter(function (c) {
        if (st.brand && c.brand !== st.brand) return false;
        if (band && band.k) {
          if (c.price == null || c.price < band.min || c.price >= band.max) return false;
        }
        if (q) {
          var hay = [c.brand, c.model, c.color, c.interior, c.plate, c.year].join(' ').toLowerCase();
          var parts = q.split(/\s+/);
          for (var i = 0; i < parts.length; i++) if (hay.indexOf(parts[i]) < 0 && hay.replace(/-/g, '').indexOf(parts[i].replace(/-/g, '')) < 0) return false;
        }
        return true;
      }).sort(function (a, b) { return (a.brand || '').localeCompare(b.brand || '') || (b.price || 0) - (a.price || 0); });
    }

    function statusNodes() {
      var out = [];
      if (st.error) out.push(el('div', { class: 'banner', text: st.error }));
      if (st.loading) out.push(SD.loadingNote(st.cars ? '更新中…' : '讀取庫存中…'));
      return out;
    }

    function carCard(car, actions) {
      var mgr = null;
      var showFloor = canSeeFloor && !!car.floorText;
      var showMgrMeta = isMgr && (car.days != null || car.inDate || car.inspectRemind || car.inspectNote);
      if (showFloor || showMgrMeta) {
        mgr = el('div', { class: 'car-mgr' },
          showFloor ? el('div', {}, '底價 ', el('b', { text: floorLabel(car) }), '（內部可見，勿轉傳客戶）') : null,
          showMgrMeta ? el('div', {}, '在庫 ', el('b', { class: car.days >= 90 ? 'days-hot' : '', text: (car.days == null ? '—' : car.days) + ' 天' }),
            car.inDate ? '　入庫 ' + car.inDate : '') : null,
          (isMgr && (car.inspectRemind || car.inspectNote)) ? el('div', { text: '驗車：' + [car.inspectRemind, car.inspectNote].filter(Boolean).join('｜') }) : null
        );
      }
      var tags = [];
      if (car.original) tags.push('原鈑');
      if (car.cert) tags.push('認證');
      if (car.factoryCert) tags.push('廠證');
      if (isMgr && car.keys === true) tags.push('備鑰');
      return el('article', { class: 'visit car' },
        el('div', { class: 'car-head' },
          el('div', {},
            el('div', { class: 'car-brand', text: car.brand }),
            el('div', { class: 'car-title', text: car.model }),
            el('div', { class: 'visit-meta', text: [car.year, car.color + (car.interior ? ' / ' + car.interior + '內裝' : ''), car.plate].filter(Boolean).join(' ｜ ') })
          ),
          el('div', { class: 'car-price' }, fmtPrice(car.price), el('small', { text: '萬' }))
        ),
        el('div', { class: 'car-specs' },
          el('div', { class: 'car-spec' }, el('b', { text: car.mileage == null ? '—' : fmtPrice(car.mileage) }), el('span', { text: '里程(萬km)' })),
          el('div', { class: 'car-spec' }, el('b', { text: car.cc == null ? '—' : Number(car.cc).toLocaleString('en-US') }), el('span', { text: '排氣量 cc' })),
          el('div', { class: 'car-spec' }, el('b', { text: yearOf(car) || '—' }), el('span', { text: '出廠年' }))
        ),
        tags.length ? el('div', { class: 'visit-tags' }, tags.map(function (t) { return el('span', { class: 'badge', text: t }); })) : null,
        mgr,
        actions
      );
    }

    function actionsFor(car) {
      return el('div', { class: 'car-actions' },
        el('button', { class: 'btn btn-ghost', type: 'button', text: '分享給客戶', onclick: function () { SD.shareFlex(customerFlex(car)); } }),
        opts && opts.onUseCar ? el('button', { class: 'btn btn-primary', type: 'button', text: '用這台回報', onclick: function () { opts.onUseCar(car); } }) : null
      );
    }

    function browseNodes() {
      var cars = st.cars || [];
      var list = filtered();
      var brandBox = el('div', { class: 'chips chips-scroll', role: 'group' },
        [el('button', { class: 'chip' + (!st.brand ? ' is-on' : ''), type: 'button', onclick: function () { st.brand = ''; changed(); } }, '全部', el('span', { class: 'chip-n', text: String(cars.length) }))]
          .concat(sortBrands(cars).map(function (b) {
            return el('button', { class: 'chip' + (st.brand === b.brand ? ' is-on' : ''), type: 'button', onclick: function () { st.brand = st.brand === b.brand ? '' : b.brand; changed(); } },
              b.brand, el('span', { class: 'chip-n', text: String(b.n) }));
          }))
      );
      var bandBox = el('div', { class: 'chips chips-scroll', role: 'group' }, PRICE_BANDS.map(function (b) {
        return el('button', { class: 'chip' + (st.band === b.k ? ' is-on' : ''), type: 'button', text: b.label, onclick: function () { st.band = b.k; changed(); } });
      }));
      // 橫向捲動的位置在重畫後保留
      [['brandScroll', brandBox], ['bandScroll', bandBox]].forEach(function (p) {
        p[1].addEventListener('scroll', function () { st[p[0]] = p[1].scrollLeft; }, { passive: true });
        if (st[p[0]]) setTimeout(function () { p[1].scrollLeft = st[p[0]]; }, 0);
      });
      var q = el('input', { class: 'input', id: 'stock-q', type: 'search', placeholder: '搜尋車型、顏色、車牌，例如 Macan 黑', value: st.q,
        oninput: function (e) { st.q = e.target.value; clearTimeout(q._t); q._t = setTimeout(changed, 180); } });
      var kids = [
        el('div', { class: 'field' }, q),
        el('div', { class: 'field' }, el('div', { class: 'label', text: '廠牌' }), brandBox),
        el('div', { class: 'field' }, el('div', { class: 'label', text: '售價（萬）' }), bandBox)
      ].concat(statusNodes());
      if (!st.cars) {
        kids.push(SD.skeleton(4));
        return kids;
      }
      kids.push(el('div', { class: 'stock-count', text: '符合 ' + list.length + ' 台（在庫共 ' + cars.length + ' 台）' }));
      if (!list.length) kids.push(el('div', { class: 'empty', text: '沒有符合條件的在庫車。' }));
      list.forEach(function (car) { kids.push(carCard(car, actionsFor(car))); });
      return kids;
    }

    function agingNodes() {
      var cars = (st.cars || []).filter(function (c) { return c.days != null && c.days > st.agingDays; })
        .sort(function (a, b) { return b.days - a.days; });
      var kids = [
        el('div', { class: 'field' },
          el('div', { class: 'label', text: '在庫超過' }),
          el('div', { class: 'seg', role: 'group' }, [60, 90, 180].map(function (d) {
            return el('button', { class: 'seg-item' + (st.agingDays === d ? ' is-on' : ''), type: 'button', text: d + ' 天', onclick: function () { st.agingDays = d; changed(); } });
          }))
        )
      ].concat(statusNodes());
      if (!st.cars) { kids.push(SD.skeleton(3)); return kids; }
      var total = cars.reduce(function (s, c) { return s + (c.price || 0); }, 0);
      kids.push(el('div', { class: 'stock-count', text: '共 ' + cars.length + ' 台，售價合計約 ' + fmtPrice(total) + ' 萬（依在庫天數排序）' }));
      if (!cars.length) kids.push(el('div', { class: 'empty', text: '沒有在庫超過 ' + st.agingDays + ' 天的車。' }));
      cars.forEach(function (car) { kids.push(carCard(car, actionsFor(car))); });
      return kids;
    }

    /** 查在庫車畫面 */
    function viewNodes() {
      var kids = [];
      if (isMgr) {
        kids.push(el('div', { class: 'tabs' },
          el('button', { class: 'tab' + (st.mode === 'browse' ? ' is-on' : ''), type: 'button', text: '全部在庫', onclick: function () { st.mode = 'browse'; changed(); } }),
          el('button', { class: 'tab' + (st.mode === 'aging' ? ' is-on' : ''), type: 'button', text: '久未售出', onclick: function () { st.mode = 'aging'; changed(); } })
        ));
      }
      return kids.concat(st.mode === 'aging' && isMgr ? agingNodes() : browseNodes());
    }

    /** 回報表單的「看車車款」：先點廠牌、再點車；也可手動輸入 */
    function pickerNodes(form, handlers) {
      var cars = st.cars || [];
      if (form.carPlate) {
        var pickedCar = cars.filter(function (c) { return c.plate === form.carPlate; })[0];
        return el('div', { class: 'picked' },
          el('div', {},
            el('div', { class: 'pm', text: form.carModel }),
            el('div', { class: 'ps', text: [form.carPlate, form.carPrice !== '' && form.carPrice != null ? fmtPrice(form.carPrice) + ' 萬' : '', pickedCar ? mileageText(pickedCar) : ''].filter(Boolean).join(' ｜ ') })
          ),
          el('button', { class: 'btn btn-ghost', type: 'button', text: '更換', onclick: handlers.onClear })
        );
      }
      var brands = sortBrands(cars);
      var kids = [];
      if (st.error && !cars.length) kids.push(el('div', { class: 'hint', text: '庫存暫時讀不到，請手動輸入。' }));
      else if (!st.cars) kids.push(SD.loadingNote('讀取庫存中…'));
      kids.push(el('div', { class: 'chips', role: 'group' },
        brands.map(function (b) {
          return el('button', { class: 'chip' + (st.pickBrand === b.brand && !handlers.manual ? ' is-on' : ''), type: 'button',
            onclick: function () { st.pickBrand = st.pickBrand === b.brand ? '' : b.brand; handlers.onManual(false); } },
            b.brand, el('span', { class: 'chip-n', text: String(b.n) }));
        }).concat([
          el('button', { class: 'chip' + (handlers.manual ? ' is-on' : ''), type: 'button', text: '其他 / 手動輸入', onclick: function () { st.pickBrand = ''; handlers.onManual(true); } })
        ])
      ));
      if (st.pickBrand && !handlers.manual) {
        var list = cars.filter(function (c) { return c.brand === st.pickBrand; })
          .sort(function (a, b) { return (a.model || '').localeCompare(b.model || '') || (b.price || 0) - (a.price || 0); });
        kids.push(el('div', { class: 'pick-list' }, list.map(function (car) {
          return el('button', { class: 'pick-car', type: 'button', onclick: function () { st.pickBrand = ''; handlers.onPick(car); } },
            el('div', {},
              el('div', { class: 'pm', text: car.model + ' ' + yearOf(car) + ' ' + (car.color || '') }),
              el('div', { class: 'ps', text: [car.plate, mileageText(car)].filter(Boolean).join(' ｜ ') })
            ),
            el('div', { class: 'pp', text: fmtPrice(car.price) + ' 萬' })
          );
        })));
      }
      return el('div', {}, kids);
    }

    return { state: st, load: load, viewNodes: viewNodes, pickerNodes: pickerNodes, carModelText: carModelText };
  }

  SD.Stock = { create: create, customerFlex: customerFlex, carModelText: carModelText };
})(window);
