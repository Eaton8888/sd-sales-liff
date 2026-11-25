/* 回報收車（買車）：每一筆＝1 次估車，另可勾 下訂／成交／退訂 */
(function () {
  var el = SD.el;

  var BUY_HEAT = {
    A: { label: 'A（熱）', desc: '急著賣、價格接近，近期有機會收' },
    B: { label: 'B（溫）', desc: '有意願，還在比價或考慮' },
    C: { label: 'C（冷）', desc: '先問行情，時間或價格差很多' }
  };

  function emptyBuy(today) {
    return {
      buyDate: today, sellerName: '', sellerPhone: '', customerSource: '', sourceText: '',
      carModel: '', carYear: '', mileage: '', spareKey: '', askPrice: '', offerPrice: '', heat: '',
      ordered: false, dealt: false, cancelled: false, followStatus: '', nextContactDate: '', note: ''
    };
  }

  function money(v) { return v === '' || v == null ? '' : v + ' 萬'; }

  function heatPicker(values, current, onChange) {
    var box = el('div', { class: 'heat-grid', role: 'radiogroup', 'aria-label': '熱度' });
    values.forEach(function (v) {
      var meta = BUY_HEAT[v] || { label: v, desc: '' };
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

  function badge(kind, value) {
    return el('span', { class: 'badge badge-' + kind + '-' + value, text: (kind === 'heat' ? '熱度 ' : '') + value });
  }

  function buyCard(b, onEdit, showStaff) {
    var f = SD.flagsOf(b);
    var edit = onEdit ? el('button', {
      class: 'edit-btn', type: 'button', text: '編輯',
      onclick: function (e) { e.preventDefault(); e.stopPropagation(); onEdit(b); }
    }) : null;
    var prices = [b.askPrice !== '' && b.askPrice != null ? '開價 ' + money(b.askPrice) : '', b.offerPrice !== '' && b.offerPrice != null ? '出價 ' + money(b.offerPrice) : ''].filter(Boolean).join('　');
    return el('article', { class: 'visit' },
      el('div', { class: 'visit-top' },
        el('div', {},
          el('div', { class: 'visit-id', text: b.buyId + (b.createdAt ? '　' + String(b.createdAt).slice(11, 16) : '') }),
          el('div', { class: 'visit-name', text: b.sellerName || '（未填姓名）' })
        ),
        edit
      ),
      el('div', { class: 'visit-meta', text: [showStaff ? b.staffName : '', b.carModel, b.carYear, b.mileage !== '' && b.mileage != null ? b.mileage + ' 萬公里' : '', SD.spareKeyText(b)].filter(Boolean).join(' ｜ ') }),
      prices ? el('div', { class: 'visit-meta', text: prices }) : null,
      b.nextContactDate ? el('div', { class: 'visit-meta', text: '下次聯絡：' + b.nextContactDate }) : null,
      el('div', { class: 'visit-tags' },
        b.customerSource ? el('span', { class: 'badge', text: SD.sourceDisplay(b) }) : null,
        b.heat ? badge('heat', b.heat) : null,
        SD.flagList(b).map(function (r) { return badge('result', r); }),
        f.followStatus ? badge('result', f.followStatus) : null
      )
    );
  }
  SD.buyCard = buyCard;

  SD.BuyReport = {
    create: function (ctx, hooks) {
      var me = ctx.me;
      var isMgr = SD.isManagerRole(me.role);
      var form = emptyBuy(ctx.today());
      var editing = null;
      var records = [];
      var loaded = false;
      var loading = false;
      var updating = false;
      var successId = '';
      var tab = 'mine';
      var seq = 0;
      var cacheName = function () { return 'buy_today_' + ctx.today(); };
      var cached = ctx.cacheGet(cacheName());
      if (cached && cached.records) { records = cached.records; loaded = true; }

      function opts() { return hooks.options(); }

      async function load() {
        var my = ++seq;
        loading = true;
        try {
          var d = await ctx.api('buyToday', { date: ctx.today() });
          if (my !== seq) return;
          records = d.records || [];
          ctx.cacheSet(cacheName(), { records: records });
          loaded = true;
          updating = false;
        } catch (err) {
          if (my !== seq) return;
          if (SD.isUpdatingError(err)) updating = true;
          else ctx.toast('今日收車清單載入失敗：' + (err.message || '請稍後再試'));
        } finally {
          if (my === seq) { loading = false; hooks.render(); }
        }
      }

      function validate() {
        if (!form.buyDate) return '請填寫估車日期。';
        if (!form.sellerName.trim()) return '請填寫賣方客人姓名。';
        if (!form.customerSource) return '請選擇客戶來源。';
        if (form.customerSource === '其他' && !String(form.sourceText || '').trim()) return '客戶來源選「其他」時，請填寫來源。';
        if (!form.carModel.trim()) return '請填寫車款。';
        if (!/^(19|20)\d{2}$/.test(String(form.carYear).trim())) return '年份請填西元年，例如 2019。';
        if (String(form.mileage).trim() === '' || isNaN(Number(form.mileage))) return '請填寫里程（萬公里），例如 4.5。';
        if (String(form.askPrice).trim() !== '' && isNaN(Number(form.askPrice))) return '客人開價請填數字（萬）。';
        if (String(form.offerPrice).trim() !== '' && isNaN(Number(form.offerPrice))) return '我們出價請填數字（萬）。';
        if (form.spareKey !== '有' && form.spareKey !== '無') return '請選擇備鑰：有或無。';
        if (!form.heat) return '請選擇熱度。';
        if (form.followStatus === '再約' && !form.nextContactDate) return '追蹤狀態為「再約」時，請填寫下次聯絡日。';
        if (form.nextContactDate && form.nextContactDate < form.buyDate) return '下次聯絡日不可早於估車日期。';
        return '';
      }

      async function submit(ev) {
        ev.preventDefault();
        var banner = document.getElementById('buy-err');
        var msg = validate();
        if (msg) {
          banner.textContent = msg;
          banner.classList.remove('is-hidden');
          banner.scrollIntoView({ block: 'nearest' });
          return;
        }
        banner.classList.add('is-hidden');
        var btn = document.getElementById('buy-submit');
        btn.disabled = true;
        btn.textContent = editing ? '儲存中…' : '送出中…';
        var payload = {
          buyDate: form.buyDate,
          sellerName: form.sellerName.trim(),
          sellerPhone: form.sellerPhone.trim(),
          customerSource: form.customerSource,
          carModel: form.carModel.trim(),
          carYear: String(form.carYear).trim(),
          mileage: String(form.mileage).trim(),
          spareKey: form.spareKey || '',
          askPrice: String(form.askPrice).trim(),
          offerPrice: String(form.offerPrice).trim(),
          heat: form.heat,
          ordered: !!form.ordered,
          dealt: !!form.dealt,
          cancelled: !!form.cancelled,
          followStatus: form.followStatus || '',
          nextContactDate: form.nextContactDate,
          note: SD.joinSourceNote(form.customerSource === '其他' ? form.sourceText : '', form.note)
        };
        try {
          var wasEdit = !!editing;
          var rec = editing
            ? await ctx.api('updateBuy', Object.assign({ buyId: editing }, payload))
            : await ctx.api('createBuy', payload);
          successId = rec.buyId;
          editing = null;
          form = emptyBuy(ctx.today());
          records = records.filter(function (r) { return r.buyId !== rec.buyId; });
          if (rec.buyDate === ctx.today()) records.unshift(rec);
          hooks.render();
          window.scrollTo(0, 0);
          try { await SD.postBuyToChat(rec, wasEdit); } catch (chatErr) { console.warn(chatErr); }
          load();
        } catch (err) {
          if (SD.isUpdatingError(err)) { updating = true; hooks.render(); return; }
          banner.textContent = err.message || '送出失敗';
          banner.classList.remove('is-hidden');
          btn.disabled = false;
          btn.textContent = editing ? '儲存修改' : '送出收車回報';
        }
      }

      function startEdit(b) {
        var f = SD.flagsOf(b);
        var src = SD.splitSourceNote(b.note);
        editing = b.buyId;
        form = {
          buyDate: b.buyDate || ctx.today(), sellerName: b.sellerName || '', sellerPhone: b.sellerPhone || '',
          customerSource: SD.mapLegacySource(b.customerSource), sourceText: src.sourceText,
          carModel: b.carModel || '', carYear: b.carYear || '',
          mileage: b.mileage === '' || b.mileage == null ? '' : String(b.mileage),
          spareKey: b.spareKey || '',
          askPrice: b.askPrice === '' || b.askPrice == null ? '' : String(b.askPrice),
          offerPrice: b.offerPrice === '' || b.offerPrice == null ? '' : String(b.offerPrice),
          heat: b.heat || '', ordered: f.ordered, dealt: f.dealt, cancelled: f.cancelled, followStatus: f.followStatus,
          nextContactDate: b.nextContactDate || '', note: src.note
        };
        successId = '';
        tab = 'mine';
        hooks.render();
        var n = document.getElementById('buy-form');
        if (n) n.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }

      function input(id, key, attrs) {
        return el('input', Object.assign({ class: 'input', id: id, value: form[key], oninput: function (e) { form[key] = e.target.value; } }, attrs || {}));
      }
      function req() { return el('span', { class: 'req', text: ' *' }); }
      function optHint(t) { return el('span', { class: 'hint', style: { marginLeft: '8px', fontWeight: '400' }, text: t }); }

      function renderForm() {
        var o = opts();
        return el('form', { id: 'buy-form', class: 'card' },
          editing ? el('div', { class: 'ok-banner banner', text: '正在編輯 ' + editing }) : null,
          el('div', { class: 'field' },
            el('label', { class: 'label', for: 'b-date', text: '估車日期' }, req()),
            input('b-date', 'buyDate', { type: 'date', max: ctx.today() })
          ),
          el('div', { class: 'field' },
            el('label', { class: 'label', for: 'b-seller', text: '賣方客人姓名' }, req()),
            input('b-seller', 'sellerName', { maxlength: '50', placeholder: '例如 王先生' })
          ),
          el('div', { class: 'field' },
            el('label', { class: 'label', for: 'b-phone', text: '電話' }, optHint('選填')),
            input('b-phone', 'sellerPhone', { inputmode: 'tel', placeholder: '09xx-xxx-xxx' })
          ),
          el('div', { class: 'field' },
            el('div', { class: 'label', text: '客戶來源' }, req()),
            SD.chips('b-source', o['客戶來源'] || [], form.customerSource, function (v) {
              form.customerSource = v;
              hooks.render();
              if (v === '其他' && !String(form.sourceText || '').trim()) { var n = document.getElementById('b-sourceText'); if (n) n.focus({ preventScroll: true }); }
            }, 'chips chips-source'),
            form.customerSource === '其他' ? input('b-sourceText', 'sourceText', { maxlength: '30', style: { marginTop: '10px' }, placeholder: '請填寫來源', 'aria-label': '請填寫來源' }) : null
          ),
          el('div', { class: 'field' },
            el('label', { class: 'label', for: 'b-car', text: '車款' }, req()),
            input('b-car', 'carModel', { maxlength: '80', placeholder: '例如 Lexus NX200 白' })
          ),
          el('div', { class: 'price-pair', style: { marginBottom: '16px' } },
            el('div', { class: 'field' },
              el('label', { class: 'label', for: 'b-year', text: '年份' }, req()),
              input('b-year', 'carYear', { inputmode: 'numeric', maxlength: '4', placeholder: '例如 2019' })
            ),
            el('div', { class: 'field' },
              el('label', { class: 'label', for: 'b-km', text: '里程（萬公里）' }, req()),
              input('b-km', 'mileage', { inputmode: 'decimal', placeholder: '例如 4.5' })
            )
          ),
          el('div', { class: 'field' },
            el('div', { class: 'label', text: '備鑰' }, req()),
            el('div', { class: 'seg', role: 'group', 'aria-label': '備鑰' },
              ['有', '無'].map(function (v) {
                return el('button', {
                  class: 'seg-item' + (v === form.spareKey ? ' is-on' : ''), type: 'button', text: v,
                  onclick: function () { form.spareKey = v; hooks.render(); }
                });
              })
            )
          ),
          el('div', { class: 'price-pair', style: { marginBottom: '6px' } },
            el('div', { class: 'field' },
              el('label', { class: 'label', for: 'b-ask', text: '客人開價（萬）' }),
              input('b-ask', 'askPrice', { inputmode: 'decimal', placeholder: '選填' })
            ),
            el('div', { class: 'field' },
              el('label', { class: 'label', for: 'b-offer', text: '我們出價（萬）' }, el('span', { class: 'internal-tag', text: '內部' })),
              input('b-offer', 'offerPrice', { inputmode: 'decimal', placeholder: '選填' })
            )
          ),
          el('p', { class: 'hint', style: { margin: '0 0 16px' }, text: '「我們出價」只有你自己和主管看得到，不會出現在聊天室紀錄卡。' }),
          el('div', { class: 'field' },
            el('div', { class: 'label', text: '熱度' }, req()),
            heatPicker(o['收車熱度'] || ['A', 'B', 'C'], form.heat, function (v) { form.heat = v; hooks.render(); })
          ),
          el('div', { class: 'field' },
            el('div', { class: 'label', text: '結果' }, optHint('可複選，沒有就不用勾')),
            SD.flagChecks(form, function (k, on) { form[k] = on; hooks.render(); }),
            el('p', { class: 'check-hint', text: '每一筆都算一次估車，勾了下訂、成交或退訂也不會扣掉估車數。' })
          ),
          el('div', { class: 'field' },
            el('div', { class: 'label', text: '追蹤狀態' }, optHint('還沒收到車的選這裡')),
            SD.chips('b-follow', o['追蹤狀態'] || SD.FOLLOW_STATES, form.followStatus, function (v) { form.followStatus = v; hooks.render(); })
          ),
          el('div', { class: 'field' },
            el('label', { class: 'label', for: 'b-next', text: '下次聯絡日' }, form.followStatus === '再約' ? req() : optHint('選填')),
            input('b-next', 'nextContactDate', { type: 'date' })
          ),
          el('div', { class: 'field' },
            el('label', { class: 'label', for: 'b-note', text: '備註' }),
            el('textarea', { class: 'textarea', id: 'b-note', maxlength: '2000', placeholder: '選填，例如車況、客人想賣的原因', oninput: function (e) { form.note = e.target.value; } }, form.note)
          ),
          el('div', { class: 'banner is-hidden', id: 'buy-err' }),
          el('button', { class: 'btn btn-primary btn-block', type: 'submit', id: 'buy-submit', text: editing ? '儲存修改' : '送出收車回報' }),
          editing ? el('button', { class: 'btn btn-ghost btn-block', type: 'button', style: { marginTop: '8px' }, text: '取消編輯', onclick: function () { editing = null; form = emptyBuy(ctx.today()); hooks.render(); } }) : null
        );
      }

      function list(title, items, withEdit, showStaff) {
        var kids = [el('div', { class: 'section-title' }, el('span', { text: title }), el('span', { class: 'count', text: items.length + ' 筆' }))];
        if (!loaded) return el('section', {}, kids[0], SD.loadingNote('讀取中…'), SD.skeleton(2));
        if (loading) kids.push(SD.loadingNote('更新中…'));
        kids.push(items.length ? items.map(function (b) { return buyCard(b, withEdit ? startEdit : null, showStaff); }) : el('div', { class: 'empty', text: '今天還沒有收車紀錄。' }));
        return el('section', {}, kids);
      }

      function nodes() {
        if (updating) return [SD.updatingCard()];
        var out = [];
        if (isMgr) {
          out.push(el('div', { class: 'tabs' },
            el('button', { class: 'tab' + (tab === 'mine' ? ' is-on' : ''), type: 'button', text: '我的收車', onclick: function () { tab = 'mine'; hooks.render(); } }),
            el('button', { class: 'tab' + (tab === 'all' ? ' is-on' : ''), type: 'button', text: '全店今日', onclick: function () { tab = 'all'; hooks.render(); } })
          ));
        }
        var mine = records.filter(function (b) { return b.staffId === me.staffId; });
        if (tab === 'mine' || !isMgr) {
          out.push(renderForm());
          out.push(list('今日已回報收車', mine, true, false));
        } else {
          out.push(list('全店今日收車', records, false, true));
        }
        return out;
      }

      function overlay() {
        if (!successId) return [];
        return [el('div', { class: 'overlay', role: 'dialog', 'aria-label': '回報成功' },
          el('div', { class: 'success-card' },
            SD.svg(SD.ICO.check, 'check ico'),
            el('h2', { text: '收車回報已送出' }),
            el('p', { class: 'success-id', text: '紀錄編號　' + successId }),
            el('div', { class: 'btn-row' },
              el('button', { class: 'btn btn-primary', type: 'button', text: '再回報一筆', onclick: function () { successId = ''; hooks.render(); window.scrollTo(0, 0); } }),
              el('button', { class: 'btn btn-ghost', type: 'button', text: '關閉', onclick: function () { ctx.close(); } })
            )
          )
        )];
      }

      function afterRender() {
        var f = document.getElementById('buy-form');
        if (f) f.addEventListener('submit', submit);
      }

      return { load: load, nodes: nodes, overlay: overlay, afterRender: afterRender };
    }
  };
})();
