/* 使用說明（?view=help，不需綁定） */
(function () {
  var el = SD.el;

  function phone(title, inner) {
    return el('div', { class: 'help-phone', 'aria-hidden': 'true' },
      el('div', { class: 'help-phone-chrome' },
        el('span', { class: 'help-phone-time', text: '9:41' }),
        el('span', { class: 'help-phone-notch' }),
        el('span', { class: 'help-phone-inds', text: '●●●' })
      ),
      el('div', { class: 'help-phone-title', text: title }),
      el('div', { class: 'help-phone-body' }, inner)
    );
  }

  function chip(text, on) {
    return el('span', { class: 'help-chip' + (on ? ' is-on' : ''), text: text });
  }

  function mockReport() {
    return phone('回報看車', [
      el('div', { class: 'help-lab', text: '客戶來源' }),
      el('div', { class: 'help-chips' },
        chip('官方LINE', true), chip('8891'), chip('IG Reels'), chip('過路客')
      ),
      el('div', { class: 'help-lab', text: '客戶熱度' }),
      el('div', { class: 'help-heat' },
        el('div', { class: 'help-heat-opt is-on' },
          el('b', { text: 'A（熱）' }),
          el('span', { text: '很想買，約兩週內有機會' })
        ),
        el('div', { class: 'help-heat-opt' },
          el('b', { text: 'B（溫）' }),
          el('span', { text: '還在比較車款或價格' })
        )
      ),
      el('div', { class: 'help-lab', text: '看車車款' }),
      el('div', { class: 'help-input', text: '範例：BMW 320i' }),
      el('div', { class: 'help-lab', text: '備鑰' }),
      el('div', { class: 'help-chips' }, chip('有', true), chip('無')),
      el('div', { class: 'help-lab', text: '結果（可複選）' }),
      el('div', { class: 'help-chips' },
        chip('☑ 下訂', true), chip('☑ 成交', true), chip('☐ 退訂')
      ),
      el('div', { class: 'help-lab', text: '追蹤狀態（沒成交的客人）' }),
      el('div', { class: 'help-chips' },
        chip('再約'), chip('考慮中'), chip('未成交')
      ),
      el('div', { class: 'help-cta', text: '送出回報' }),
      el('div', { class: 'help-chat' },
        el('div', { class: 'help-chat-label', text: '聊天室會留下紀錄卡' }),
        el('div', { class: 'help-flex' },
          el('div', { class: 'help-flex-bar' }),
          el('div', { class: 'help-flex-kicker', text: '回報看車已送出' }),
          el('div', { class: 'help-flex-name', text: '範例客戶' }),
          el('div', { class: 'help-flex-meta', text: 'BMW 320i' }),
          el('div', { class: 'help-flex-tags' },
            el('span', { text: '官方LINE' }),
            el('span', { class: 'is-on', text: '熱度 A' }),
            el('span', { text: '下訂' }),
            el('span', { text: '成交' })
          )
        )
      )
    ]);
  }

  function mockBuy() {
    return el('div', { class: 'kind-buy' }, phone('回報收車', [
      el('div', { class: 'help-lab', text: '賣方客人／車款' }),
      el('div', { class: 'help-input', text: '範例客戶　範例車款 2019　4.5 萬公里' }),
      el('div', { class: 'help-lab', text: '備鑰' }),
      el('div', { class: 'help-chips' }, chip('有', true), chip('無')),
      el('div', { class: 'help-lab', text: '客人開價／我們出價（萬）' }),
      el('div', { class: 'help-input', text: '120　／　105（只有自己和主管看得到）' }),
      el('div', { class: 'help-lab', text: '熱度' }),
      el('div', { class: 'help-chips' }, chip('A（熱）', true), chip('B（溫）'), chip('C（冷）')),
      el('div', { class: 'help-lab', text: '結果（可複選）' }),
      el('div', { class: 'help-chips' }, chip('☑ 下訂', true), chip('☐ 成交'), chip('☐ 退訂')),
      el('div', { class: 'help-cta', text: '送出收車回報' })
    ]));
  }

  function mockMenu() {
    return phone('官方帳號選單', [
      el('div', { class: 'help-chips' }, chip('賣車', true), chip('買車')),
      el('div', { class: 'help-lab', text: '賣車分頁' }),
      el('div', { class: 'help-chips' }, chip('回報看車'), chip('本月賣車成績'), chip('今日總結')),
      el('div', { class: 'kind-buy' },
        el('div', { class: 'help-lab', text: '買車分頁' }),
        el('div', { class: 'help-chips' }, chip('買車', true), chip('回報收車'), chip('本月收車成績'), chip('今日總結'))
      )
    ]);
  }

  function mockToday() {
    function stat(lab, n) {
      return el('div', { class: 'help-stat' },
        el('div', { class: 'help-stat-lab', text: lab }),
        el('div', { class: 'help-stat-n', text: n })
      );
    }
    return phone('今日回報總覽', [
      el('div', { class: 'help-stats' },
        stat('帶看', '3'), stat('下訂', '1'), stat('成交', '1')
      ),
      el('div', { class: 'help-lab', text: '待跟進 1 筆' }),
      el('div', { class: 'help-visit' },
        el('div', { class: 'help-visit-name', text: '範例客戶' }),
        el('div', { class: 'help-visit-meta', text: 'BMW 320i　下次聯絡：今天' }),
        el('div', { class: 'help-flex-tags' },
          el('span', { text: '官方LINE' }),
          el('span', { class: 'is-on', text: '熱度 A' })
        )
      ),
      el('div', { class: 'help-lab', text: '今日心得' }),
      el('div', { class: 'help-note', text: '今天下午有一組客人要再來看這台，已約好時間。' }),
      el('div', { class: 'help-cta', text: '送出今日心得' })
    ]);
  }

  function mockStock() {
    function car(title, price, specs) {
      return el('div', { class: 'help-car' },
        el('div', { class: 'help-car-top' },
          el('div', { class: 'help-car-title', text: title }),
          el('div', { class: 'help-car-price' }, price, el('small', { text: ' 萬' }))
        ),
        el('div', { class: 'help-car-specs' }, specs.map(function (s) {
          return el('div', { class: 'help-car-spec' },
            el('b', { text: s[0] }),
            el('span', { text: s[1] })
          );
        })),
        el('div', { class: 'help-cta help-cta-ghost', text: '分享給客戶' })
      );
    }
    return phone('查在庫車', [
      el('div', { class: 'help-lab', text: '搜尋' }),
      el('div', { class: 'help-input', text: '廠牌、價格、車型或車牌' }),
      el('div', { class: 'help-chips' },
        chip('BMW', true), chip('BENZ'), chip('TOYOTA'), chip('100–150萬', true)
      ),
      car('BMW 320i', '128', [['年份', '2020'], ['顏色', '黑色'], ['里程', '4.2 萬']]),
      car('BENZ C300', '148', [['年份', '2019'], ['顏色', '白色'], ['里程', '5.8 萬']])
    ]);
  }

  function section(n, emoji, title, keyword, lines, mock, extraClass) {
    return el('section', { class: 'help-sec' + (extraClass ? ' ' + extraClass : '') },
      el('div', { class: 'help-sec-head' },
        el('span', { class: 'help-num', text: String(n) }),
        el('h2', {}, el('span', { class: 'help-emoji', text: emoji + ' ' }), title)
      ),
      Array.isArray(keyword)
        ? el('p', { class: 'help-kw' }, keyword[0], el('b', { text: keyword[1] }), keyword[2])
        : el('p', { class: 'help-kw' },
          '在官方帳號輸入「',
          el('b', { text: keyword }),
          '」，點圖卡上的按鈕。'
        ),
      lines.map(function (t) { return el('p', { class: 'help-txt', text: t }); }),
      mock
    );
  }

  SD.renderHelp = function () {
    document.title = '使用說明｜SD上達_業務系統';
    document.documentElement.style.background = '#0a0a0b';
    SD.setApp([
      SD.topbar(null),
      el('div', { class: 'page-head help-head' },
        el('div', {},
          el('h1', { class: 'page-title', text: '使用說明' }),
          el('p', { class: 'page-sub', text: '賣車、收車、今日、庫存怎麼用，一次看懂' })
        )
      ),
      el('div', { class: 'wrap help-wrap' },
        section(1, '📱', '選單：賣車｜買車', ['點聊天室下方的選單，最上面有「', '賣車｜買車', '」兩個分頁，點一下就會換成那一組按鈕。'], [
          '賣車：回報看車、本月賣車成績、今日總結。',
          '買車：回報收車、本月收車成績、今日總結。'
        ], mockMenu()),
        section(2, '📝', '回報看車（賣車）', '回報', [
          '填好客戶來源、A 到 D 熱度、車款和備鑰（有或無）後送出。送出後，聊天室會留下一張紀錄卡。',
          '每一筆回報都算一次帶看。客人有下訂、成交或退訂就勾起來，可以同時勾，勾了也不會扣掉帶看數。例如這個月帶看 10 台，其中 1 台下訂、1 台成交，成績會顯示帶看 10、下訂 1、成交 1。',
          '還沒成交的客人，在「追蹤狀態」選再約、考慮中或未成交。選再約要填下次聯絡日。當天的紀錄可以按「編輯」改勾選。'
        ], mockReport()),
        section(3, '🔑', '回報收車（買車）', ['在選單點「', '買車', '」分頁，再點「回報收車」。'], [
          '填賣方客人、來源、車款、年份、里程、備鑰（有或無）、客人開價、我們出價和 A 到 C 熱度。每一筆都算一次估車，有下訂、成交或退訂再勾。',
          '「我們出價」只有你自己和主管看得到，不會出現在聊天室紀錄卡上。'
        ], mockBuy(), 'kind-buy'),
        section(4, '📅', '今日總結／本月成績', '今日', [
          '頁面上方可切換「賣車」和「收車」。可以看今天的帶看或估車、待跟進名單，也可以寫今日心得（在賣車分頁）。',
          '本月成績會顯示帶看（估車）、下訂、成交、退訂和目標進度。業務只看得到自己的，主管看得到全店。'
        ], mockToday()),
        section(5, '🚗', '查在庫車', '庫存', [
          '可依廠牌、價格、車型或車牌找車，並把車卡直接分享給客戶。'
        ], mockStock()),
        el('p', { class: 'help-foot', text: '首次使用請先選填姓名，待主管啟用後即可使用。有問題找主管。' })
      )
    ]);
    window.scrollTo(0, 0);
  };
})();
