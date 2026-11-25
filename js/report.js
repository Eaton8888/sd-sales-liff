/* 回報看車 */
(function () {
  var el = SD.el;

  function badge(kind, value) {
    return el('span', { class: 'badge badge-' + kind + '-' + value, text: (kind === 'heat' ? '熱度 ' : '') + value });
  }

  function visitCard(v, onEdit) {
    var tags = el('div', { class: 'visit-tags' },
      v.customerSource ? el('span', { class: 'badge', text: SD.sourceDisplay(v) }) : null,
      v.heat ? badge('heat', v.heat) : null,
      v.result ? badge('result', v.result) : null
    );
    var edit = onEdit ? el('button', {
      class: 'edit-btn', type: 'button', text: '編輯',
      onclick: function (e) { e.preventDefault(); e.stopPropagation(); onEdit(v); }
    }) : null;
    return el('article', { class: 'visit' },
      el('div', { class: 'visit-top' },
        el('div', {},
          el('div', { class: 'visit-id', text: v.visitId + (v.createdAt ? '　' + String(v.createdAt).slice(11, 16) : '') }),
          el('div', { class: 'visit-name', text: v.customerName || '（未填稱呼）' })
        ),
        edit
      ),
      el('div', { class: 'visit-meta', text: [v.carModel, v.carPlate, v.carPrice !== '' && v.carPrice != null ? v.carPrice + '萬' : '', v.stockId, v.budgetRange].filter(Boolean).join(' ｜ ') }),
      v.staffName && onEdit === false ? el('div', { class: 'visit-meta', text: v.staffName + '　' + v.staffId }) : null,
      v.nextContactDate ? el('div', { class: 'visit-meta', text: '下次聯絡：' + v.nextContactDate }) : null,
      tags
    );
  }

  function chips(name, values, current, onChange, boxClass) {
    var box = el('div', { class: boxClass || 'chips', role: 'group' });
    values.forEach(function (v) {
      var b = el('button', { class: 'chip' + (v === current ? ' is-on' : ''), type: 'button', text: v });
      b.addEventListener('click', function () { onChange(v === current ? '' : v); });
      box.appendChild(b);
    });
    return box;
  }

  function seg(values, current, onChange) {
    var box = el('div', { class: 'seg', role: 'group' });
    values.forEach(function (v) {
      var b = el('button', { class: 'seg-item' + (v === current ? ' is-on' : ''), type: 'button', text: v });
      b.addEventListener('click', function () { onChange(v); });
      box.appendChild(b);
    });
    return box;
  }

  /** 客戶熱度：2x2 選項卡，標題＋灰色小字說明 */
  function heatPicker(values, current, onChange) {
    var info = SD.HEAT_INFO || {};
    var box = el('div', { class: 'heat-grid', role: 'radiogroup', 'aria-label': '客戶熱度' });
    values.forEach(function (v) {
      var meta = info[v] || { label: v, desc: '' };
      var on = v === current;
      var b = el('button', { class: 'heat-opt h-' + v + (on ? ' is-on' : ''), type: 'button', role: 'radio', 'aria-checked': on ? 'true' : 'false' },
        el('span', { class: 'hl', text: meta.label }),
        meta.desc ? el('span', { class: 'hd', text: meta.desc }) : null
      );
      b.addEventListener('click', function () { onChange(v); });
      box.appendChild(b);
    });
    return box;
  }

  function emptyForm(today) {
    return {
      visitDate: today, customerName: '', customerPhone: '', customerSource: '', sourceText: '',
      carModel: '', carPlate: '', carPrice: '', stockId: '', budgetRange: '', heat: '', result: '',
      nextContactDate: '', note: ''
    };
  }

  SD.start({
    page: 'report',
    liffId: (window.SD_CONFIG || {}).liffIds.report,
    onReady: async function (ctx) {
      var me = ctx.me;
      var isMgr = me.role === '主管';
      var options = { '客戶來源': [], '客戶熱度': [], '結果': [] };
      var form = emptyForm(ctx.today());
      var editing = null;
      var tab = 'mine';
      var filterId = '';
      var myVisits = [];
      var allVisits = [];
      var staffNames = [];
      var unreported = [];
      var successId = new URLSearchParams(location.search).get('success') || '';
      // 從「查在庫車」連結開啟：liff.line.me/{id}?view=stock
      // LIFF 第一次載入時參數包在 liff.state 裡（例如 ?liff.state=%3Fview%3Dstock），兩種都要認得
      function wantStock() {
        var qs = new URLSearchParams(location.search);
        if (qs.get('view') === 'stock') return true;
        var stt = qs.get('liff.state') || '';
        return /(^|[?&])view=stock(&|$)/.test(stt);
      }
      var view = wantStock() ? 'stock' : 'report';
      var manualCar = false;
      var renderQueued = false;
      function queueRender() {
        if (renderQueued) return;
        renderQueued = true;
        setTimeout(function () { renderQueued = false; render(); }, 0);
      }
      var stock = SD.Stock.create(ctx, {
        onChange: queueRender,
        onUseCar: function (car) {
          pickCar(car);
          view = 'report';
          tab = 'mine';
          render();
          var f = document.getElementById('visit-form');
          if (f) f.scrollIntoView({ block: 'start' });
        }
      });
      function pickCar(car) {
        form.carModel = stock.carModelText(car);
        form.carPlate = car.plate || '';
        form.carPrice = car.price == null ? '' : car.price;
        manualCar = false;
      }

      var FALLBACK_OPTIONS = {
        '客戶來源': ['抖音', 'IG Reels', 'FB粉專', '8891', '官方LINE', '過路客', '老客回流', '親友介紹', '其他'],
        '客戶熱度': ['A', 'B', 'C', 'D'],
        '結果': ['成交', '下訂', '再約', '考慮中', '未成交']
      };
      // 選項：先用上次存的（或預設），表單立刻出現；背景再向伺服器拿最新
      options = ctx.cacheGet('options') || FALLBACK_OPTIONS;
      var listsLoading = true;
      var listKey = function () { return 'report_lists_' + ctx.today() + '_' + (filterId || ''); };

      function applyLists(d) {
        myVisits = d.myVisits || [];
        allVisits = d.allVisits || [];
        unreported = d.unreported || [];
        var seen = {};
        staffNames = [];
        allVisits.forEach(function (v) {
          if (!seen[v.staffId]) {
            seen[v.staffId] = true;
            staffNames.push({ staffId: v.staffId, name: v.staffName });
          }
        });
      }

      var listSeq = 0;
      async function reloadLists() {
        var seq = ++listSeq;
        var key = listKey();
        var d;
        if (!isMgr) {
          var mine = await ctx.api('listToday', { date: ctx.today() });
          d = { myVisits: mine.visits || [] };
        } else if (!filterId) {
          // 主管看全店：一次查詢就同時有「我的」和「全店」
          var all = await ctx.api('listToday', { date: ctx.today() });
          d = { myVisits: all.visits || [], allVisits: all.visits || [], unreported: all.unreported || [] };
        } else {
          var r = await Promise.all([
            ctx.api('listToday', { date: ctx.today() }),
            ctx.api('listToday', { date: ctx.today(), staffId: filterId })
          ]);
          d = { myVisits: r[0].visits || [], allVisits: r[1].visits || [], unreported: r[1].unreported || [] };
        }
        ctx.cacheSet(key, d);
        if (seq !== listSeq) return; // 已有較新的查詢，舊結果不要蓋掉
        applyLists(d);
        haveLists = true;
        listsFresh = true;
        listsLoading = false;
      }

      var haveLists = false;
      var listsFresh = false; // 這次開頁後已從伺服器拿到今日清單
      var cachedLists = ctx.cacheGet(listKey());
      if (cachedLists) { applyLists(cachedLists); haveLists = true; }

      function validate() {
        if (!form.visitDate) return '請填寫看車日期。';
        if (!form.customerName.trim()) return '請填寫客戶稱呼。';
        if (!form.customerSource) return '請選擇客戶來源。';
        if (form.customerSource === '其他' && !String(form.sourceText || '').trim()) return '客戶來源選「其他」時，請填寫來源。';
        if (!form.carModel.trim()) return '請選擇或填寫看車車款。';
        if (!form.heat) return '請選擇客戶熱度。';
        if (!form.result) return '請選擇結果。';
        if (form.result === '再約' && !form.nextContactDate) return '結果為「再約」時，請填寫下次聯絡日。';
        if (form.nextContactDate && form.visitDate && form.nextContactDate < form.visitDate) return '下次聯絡日不可早於看車日期。';
        return '';
      }

      async function submit(ev) {
        ev.preventDefault();
        var msg = validate();
        var banner = document.getElementById('form-err');
        if (msg) {
          banner.textContent = msg;
          banner.classList.remove('is-hidden');
          banner.scrollIntoView({ block: 'nearest' });
          return;
        }
        banner.classList.add('is-hidden');
        var btn = document.getElementById('submit-btn');
        btn.disabled = true;
        btn.textContent = editing ? '儲存中…' : '送出中…';
        var payload = {
          visitDate: form.visitDate,
          customerName: form.customerName.trim(),
          customerPhone: form.customerPhone.trim(),
          customerSource: form.customerSource,
          carModel: form.carModel.trim(),
          carPlate: form.carPlate || '',
          carPrice: form.carPrice === '' || form.carPrice == null ? '' : form.carPrice,
          stockId: form.stockId.trim(),
          budgetRange: form.budgetRange.trim(),
          heat: form.heat,
          result: form.result,
          nextContactDate: form.nextContactDate,
          note: SD.joinSourceNote(form.customerSource === '其他' ? form.sourceText : '', form.note)
        };
        try {
          var rec;
          var wasEdit = !!editing;
          if (editing) rec = await ctx.api('updateVisit', Object.assign({ visitId: editing }, payload));
          else rec = await ctx.api('createVisit', payload);
          successId = rec.visitId;
          editing = null;
          form = emptyForm(ctx.today());
          // 先把這筆放進清單立刻顯示，不必等重新查詢
          if (rec && rec.visitId) {
            var isToday = rec.visitDate === ctx.today();
            var upsert = function (list) {
              var out = list.filter(function (v) { return v.visitId !== rec.visitId; });
              if (isToday) out.unshift(rec);
              return out;
            };
            myVisits = upsert(myVisits);
            if (isMgr && (!filterId || filterId === rec.staffId)) allVisits = upsert(allVisits);
            else if (isMgr) allVisits = allVisits.filter(function (v) { return v.visitId !== rec.visitId; });
          }
          render();
          window.scrollTo(0, 0);
          // 今日回報總覽：清單已是伺服器最新資料（＋剛送出這筆）就直接用；否則先重新查一次，確保正確
          var reloaded = false;
          if (!listsFresh) {
            try { await reloadLists(); reloaded = true; render(); } catch (e) { console.warn(e); }
          }
          var overview = listsFresh ? {
            me: me,
            date: ctx.today(),
            visits: myVisits.filter(function (v) { return v.staffId === me.staffId && v.visitDate === ctx.today(); })
          } : null;
          try { await SD.postVisitToChat(rec, wasEdit, overview); } catch (chatErr) { console.warn(chatErr); }
          if (!reloaded) reloadLists().then(render).catch(function (e) { console.warn(e); });
        } catch (err) {
          banner.textContent = err.message || '送出失敗';
          banner.classList.remove('is-hidden');
          btn.disabled = false;
          btn.textContent = editing ? '儲存修改' : '送出回報';
        }
      }

      function startEdit(v) {
        editing = v.visitId;
        form = {
          visitDate: v.visitDate || ctx.today(),
          customerName: v.customerName || '',
          customerPhone: v.customerPhone || '',
          customerSource: SD.mapLegacySource(v.customerSource),
          sourceText: SD.splitSourceNote(v.note).sourceText || (function () { var raw = String(v.customerSource || '').trim(); return (SD.mapLegacySource(raw) === '其他' && raw && raw !== '其他') ? raw : ''; })(),
          carModel: v.carModel || '',
          carPlate: v.carPlate || '',
          carPrice: v.carPrice === '' || v.carPrice == null ? '' : v.carPrice,
          stockId: v.stockId || '',
          budgetRange: v.budgetRange || '',
          heat: v.heat || '',
          result: v.result || '',
          nextContactDate: v.nextContactDate || '',
          note: SD.splitSourceNote(v.note).note
        };
        successId = '';
        tab = 'mine';
        view = 'report';
        manualCar = !form.carPlate && !!form.carModel;
        render();
        document.getElementById('visit-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
      }

      function renderForm() {
        var nextWrap = el('div', { class: 'field' + (form.result === '再約' ? '' : ' is-hidden'), id: 'next-wrap' },
          el('label', { class: 'label', for: 'nextContactDate', text: '下次聯絡日' }, el('span', { class: 'req', text: ' *' })),
          el('input', { class: 'input', type: 'date', id: 'nextContactDate', value: form.nextContactDate, oninput: function (e) { form.nextContactDate = e.target.value; } })
        );
        return el('form', { id: 'visit-form', class: 'card' },
          editing ? el('div', { class: 'ok-banner banner', text: '正在編輯 ' + editing }) : null,
          el('div', { class: 'field' },
            el('label', { class: 'label', for: 'visitDate', text: '看車日期' }, el('span', { class: 'req', text: ' *' })),
            el('input', { class: 'input', type: 'date', id: 'visitDate', value: form.visitDate, max: ctx.today(), oninput: function (e) { form.visitDate = e.target.value; } })
          ),
          el('div', { class: 'field' },
            el('label', { class: 'label', for: 'customerName', text: '客戶稱呼' }, el('span', { class: 'req', text: ' *' })),
            el('input', { class: 'input', id: 'customerName', maxlength: '50', placeholder: '例如 王先生', value: form.customerName, oninput: function (e) { form.customerName = e.target.value; } })
          ),
          el('div', { class: 'field' },
            el('label', { class: 'label', for: 'customerPhone', text: '客戶電話' }),
            el('input', { class: 'input', id: 'customerPhone', inputmode: 'tel', placeholder: '09xx-xxx-xxx', value: form.customerPhone, oninput: function (e) { form.customerPhone = e.target.value; } })
          ),
          el('div', { class: 'field' },
            el('div', { class: 'label', text: '客戶來源' }, el('span', { class: 'req', text: ' *' })),
            chips('source', options['客戶來源'] || [], form.customerSource, function (v) {
              form.customerSource = v;
              render();
              if (v === '其他' && !String(form.sourceText || '').trim()) { var n = document.getElementById('sourceText'); if (n) n.focus({ preventScroll: true }); }
            }, 'chips chips-source'),
            form.customerSource === '其他' ? el('input', {
              class: 'input', id: 'sourceText', maxlength: '30', style: { marginTop: '10px' },
              placeholder: '請填寫來源', 'aria-label': '請填寫來源', value: form.sourceText || '',
              oninput: function (e) { form.sourceText = e.target.value; }
            }) : null
          ),
          renderCarField(),
          el('div', { class: 'field' },
            el('label', { class: 'label', for: 'stockId', text: '庫存編號' }),
            el('input', { class: 'input', id: 'stockId', placeholder: '選填', value: form.stockId, oninput: function (e) { form.stockId = e.target.value; } })
          ),
          el('div', { class: 'field' },
            el('label', { class: 'label', for: 'budgetRange', text: '預算區間' }),
            el('input', { class: 'input', id: 'budgetRange', placeholder: '例如 150–200萬', value: form.budgetRange, oninput: function (e) { form.budgetRange = e.target.value; } })
          ),
          el('div', { class: 'field' },
            el('div', { class: 'label', text: '客戶熱度' }, el('span', { class: 'req', text: ' *' })),
            heatPicker(options['客戶熱度'] || ['A', 'B', 'C', 'D'], form.heat, function (v) { form.heat = v; render(); })
          ),
          el('div', { class: 'field' },
            el('div', { class: 'label', text: '結果' }, el('span', { class: 'req', text: ' *' })),
            chips('result', options['結果'] || [], form.result, function (v) {
              form.result = v;
              if (v !== '再約') form.nextContactDate = form.nextContactDate;
              render();
            })
          ),
          nextWrap,
          el('div', { class: 'field' },
            el('label', { class: 'label', for: 'note', text: '備註' }),
            el('textarea', { class: 'textarea', id: 'note', maxlength: '2000', placeholder: '選填，例如下次聯絡重點', oninput: function (e) { form.note = e.target.value; } }, form.note)
          ),
          el('div', { class: 'banner is-hidden', id: 'form-err' }),
          el('button', { class: 'btn btn-primary btn-block', type: 'submit', id: 'submit-btn', text: editing ? '儲存修改' : '送出回報' }),
          editing ? el('button', { class: 'btn btn-ghost btn-block', type: 'button', style: { marginTop: '8px' }, text: '取消編輯', onclick: function () { editing = null; form = emptyForm(ctx.today()); render(); } }) : null
        );
      }

      function renderCarField() {
        var st = stock.state;
        var noInventory = !!st.error && !(st.cars && st.cars.length);
        var showInput = !form.carPlate && (manualCar || noInventory);
        return el('div', { class: 'field' },
          el('div', { class: 'label', text: '看車車款' }, el('span', { class: 'req', text: ' *' }),
            el('span', { class: 'hint', style: { marginLeft: '8px', fontWeight: '400' }, text: form.carPlate || noInventory ? '' : '先點廠牌，再點車' })),
          stock.pickerNodes(form, {
            manual: manualCar,
            onPick: function (car) { pickCar(car); render(); },
            onClear: function () { form.carModel = ''; form.carPlate = ''; form.carPrice = ''; manualCar = false; render(); },
            onManual: function (on) { manualCar = on; if (on) { form.carPlate = ''; form.carPrice = ''; } render(); if (on) { var n = document.getElementById('carModel'); if (n) n.focus(); } }
          }),
          showInput ? el('input', { class: 'input', id: 'carModel', maxlength: '80', style: { marginTop: '10px' }, placeholder: '例如 Porsche Macan 2020 白', value: form.carModel, oninput: function (e) { form.carModel = e.target.value; } }) : null
        );
      }

      function viewTabs() {
        return el('div', { class: 'tabs view-tabs' },
          el('button', { class: 'tab' + (view === 'report' ? ' is-on' : ''), type: 'button', text: '回報看車', onclick: function () { if (view !== 'report') { view = 'report'; render(); window.scrollTo(0, 0); } } }),
          el('button', { class: 'tab' + (view === 'stock' ? ' is-on' : ''), type: 'button', text: '🚗 查在庫車', onclick: function () { if (view !== 'stock') { view = 'stock'; stock.load(); render(); window.scrollTo(0, 0); } } })
        );
      }

      function renderSuccess() {
        if (!successId) return null;
        return el('div', { class: 'overlay', role: 'dialog', 'aria-label': '回報成功' },
          el('div', { class: 'success-card' },
            SD.svg(SD.ICO.check, 'check ico'),
            el('h2', { text: '回報已送出' }),
            el('p', { class: 'success-id', text: '紀錄編號　' + successId }),
            el('div', { class: 'btn-row' },
              el('button', { class: 'btn btn-primary', type: 'button', text: '再回報一筆', onclick: function () { successId = ''; render(); window.scrollTo(0, 0); } }),
              el('button', { class: 'btn btn-ghost', type: 'button', text: '關閉', onclick: function () { ctx.close(); } })
            )
          )
        );
      }

      function listBlock(title, items, withEdit, extra) {
        return el('section', {},
          el('div', { class: 'section-title' },
            el('span', { text: title }),
            el('span', { class: 'count', text: items.length + ' 筆' })
          ),
          extra || null,
          items.length ? items.map(function (v) {
            return visitCard(v, withEdit ? startEdit : false);
          }) : el('div', { class: 'empty', text: '今天還沒有看車紀錄。' })
        );
      }

      function render() {
        // 背景資料回來重畫時，保留正在輸入的欄位和游標位置
        var ae = document.activeElement;
        var focusId = ae && ae.id && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName) ? ae.id : '';
        var selS = null, selE = null;
        try { if (focusId && ae.selectionStart != null) { selS = ae.selectionStart; selE = ae.selectionEnd; } } catch (e) {}
        renderInner();
        if (focusId) {
          var n = document.getElementById(focusId);
          if (n) {
            try { n.focus({ preventScroll: true }); } catch (e) { n.focus(); }
            try { if (selS != null) n.setSelectionRange(selS, selE); } catch (e) {}
          }
        }
      }

      function listOrLoading(title, items, withEdit, extra) {
        if (listsLoading && !haveLists) {
          return el('section', {},
            el('div', { class: 'section-title' }, el('span', { text: title })),
            extra || null,
            SD.loadingNote('讀取中…'),
            SD.skeleton(2)
          );
        }
        var block = listBlock(title, items, withEdit, extra);
        if (listsLoading) block.insertBefore(SD.loadingNote('更新中…'), block.children[1] || null);
        return block;
      }

      function renderInner() {
        if (view === 'stock') {
          SD.setApp([
            SD.topbar(me),
            SD.pageHead('查在庫車', 'In stock', SD.ICO.car),
            el('div', { class: 'wrap' }, [viewTabs()].concat(stock.viewNodes()))
          ]);
          return;
        }
        var bodyKids = [viewTabs()];
        if (isMgr) {
          bodyKids.push(el('div', { class: 'tabs' },
            el('button', { class: 'tab' + (tab === 'mine' ? ' is-on' : ''), type: 'button', text: '我的回報', onclick: function () { tab = 'mine'; render(); } }),
            el('button', { class: 'tab' + (tab === 'all' ? ' is-on' : ''), type: 'button', text: '全店今日', onclick: function () { tab = 'all'; render(); } })
          ));
        }
        if (tab === 'mine') {
          bodyKids.push(renderForm());
          var mineToday = myVisits.filter(function (v) { return v.staffId === me.staffId; });
          bodyKids.push(listOrLoading('今日已回報', isMgr ? mineToday : myVisits, true));
        } else {
          var sel = el('select', { class: 'select', onchange: async function (e) {
            filterId = e.target.value;
            var c = ctx.cacheGet(listKey());
            haveLists = !!c;
            if (c) applyLists(c);
            listsLoading = true;
            render();
            try { await reloadLists(); } catch (err) { ctx.toast(err.message || '載入失敗'); }
            listsLoading = false;
            render();
          } });
          sel.appendChild(el('option', { value: '', text: '全部業務' }));
          storeStaffOptions(sel);
          if (filterId) sel.value = filterId;
          bodyKids.push(listOrLoading('全店今日看車', allVisits, false, el('div', { class: 'field' },
            el('label', { class: 'label', text: '篩選業務' }), sel
          )));
          if (unreported.length) {
            bodyKids.push(el('div', { class: 'section-title', text: '尚未回報' }));
            bodyKids.push(el('div', { class: 'unreported' }, unreported.map(function (s) {
              return el('span', { class: 'pill', text: s.name + '（' + s.staffId + '）' });
            })));
          }
        }
        SD.setApp([
          SD.topbar(me),
          SD.pageHead('回報看車', 'Report a visit', SD.ICO.clip),
          el('div', { class: 'wrap' }, bodyKids),
          renderSuccess()
        ]);
        var formEl = document.getElementById('visit-form');
        if (formEl) formEl.addEventListener('submit', submit);
      }

      function storeStaffOptions(sel) {
        var map = {};
        allVisits.forEach(function (v) { map[v.staffId] = v.staffName; });
        unreported.forEach(function (s) { map[s.staffId] = s.name; });
        Object.keys(map).sort().forEach(function (id) {
          sel.appendChild(el('option', { value: id, text: map[id] + '（' + id + '）' }));
        });
      }

      // 表單立刻出現；選項、今日清單、庫存在背景更新
      render();
      // 一次連線拿「選項＋今日清單＋庫存」（主管有篩選時清單另外查）
      var bootP = ctx.batch([
        { action: 'options' },
        { action: 'listToday', date: ctx.today() },
        { action: 'inventory' }
      ]);
      function part(i) { return bootP.then(function (r) { if (r[i] instanceof Error) throw r[i]; return r[i]; }); }
      stock.load(true, function () { return part(2); });
      var optP = part(0).then(function (fresh) {
        if (JSON.stringify(fresh) !== JSON.stringify(options)) {
          options = fresh;
          ctx.cacheSet('options', fresh);
          return true;
        }
        ctx.cacheSet('options', fresh);
        return false;
      }).catch(function (err) { console.warn(err); return false; });
      var firstList = filterId ? reloadLists() : (function () {
        var seq = ++listSeq;
        var key = listKey();
        return part(1).then(function (r) {
          var d = isMgr
            ? { myVisits: r.visits || [], allVisits: r.visits || [], unreported: r.unreported || [] }
            : { myVisits: r.visits || [] };
          ctx.cacheSet(key, d);
          if (seq !== listSeq) return;
          applyLists(d);
          haveLists = true;
          listsFresh = true;
          listsLoading = false;
        });
      })();
      var listP = firstList.then(function () { return true; }).catch(function (err) {
        console.warn(err);
        listsLoading = false;
        ctx.toast('今日清單載入失敗：' + (err.message || '請稍後再試'));
        return true;
      });
      optP.then(function (changed) { if (changed) render(); });
      listP.then(function () { render(); });
    }
  });
})();
