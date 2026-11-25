// 見本用：Google Apps Script（google.script.run）の代わりに、架空のデータを返す。
// 画面（src/index.html）をブラウザだけで動かして確かめるためのもの。何も保存しない（開き直すと元に戻る）。
(function () {
  var Y = 2026;
  var n = 0;
  var id = function () { return 'demo-' + (++n); };
  var d = function (m, day) { return Y + '-' + String(m).padStart(2, '0') + '-' + String(day).padStart(2, '0'); };

  var clients = [
    { id: 'c1', name: '株式会社みほん商事', department: '総務部', person: '見本 一郎', honorific: '様', postalCode: '100-0000', address: '東京都見本区中町1-2-3', tel: '000-0000-0001', email: 'info@example.com', paymentTerm: 'next-end', memo: '' },
    { id: 'c2', name: 'サンプル企画合同会社', department: '', person: '例 花子', honorific: '様', postalCode: '', address: '大阪府見本市本町2-1', tel: '', email: '', paymentTerm: 'end', memo: '' }
  ];

  var txns = [];
  var add = function (t) { t.id = id(); t.ratio = t.ratio == null ? '' : t.ratio; t.withholding = t.withholding || ''; t.receipt = ''; t.invoice = t.invoice || ''; t.debit = t.debit || ''; t.credit = t.credit || ''; txns.push(t); };
  for (var m = 1; m <= 11; m++) {
    add({ kind: '支出', date: d(m, 5), account: '通信費', amount: 7700, ratio: 50, method: '個人のお金', partner: '見本モバイル', memo: 'スマホ・ネット回線（事業分50%）' });
    add({ kind: '支出', date: d(m, 27), account: '地代家賃', amount: 80000, ratio: 20, method: '個人のお金', partner: '見本不動産', memo: '自宅家賃（仕事部屋の分20%）' });
    if (m % 2 === 1) add({ kind: '支出', date: d(m, 12), account: '新聞図書費', amount: 3300, method: 'クレジットカード', partner: '見本書店', memo: '技術書' });
    if (m % 3 === 0) add({ kind: '支出', date: d(m, 18), account: '旅費交通費', amount: 2860, method: '個人のお金', partner: '', memo: '打ち合わせの電車代' });
  }
  add({ kind: '支出', date: d(3, 9), account: '消耗品費', amount: 12800, method: 'クレジットカード', partner: '見本電機', memo: 'キーボード・マウス' });
  add({ kind: '支出', date: d(6, 21), account: '研修費', amount: 9800, method: 'クレジットカード', partner: '見本スクール', memo: 'オンライン講座' });
  add({ kind: '支出', date: d(9, 2), account: '支払手数料', amount: 4400, method: 'クレジットカード', partner: '見本サーバー', memo: 'ドメイン・サーバー代（年額）' });

  var invoices = [];
  var inv = function (no, m, client, subject, items, status, paidM) {
    var x = { id: id(), number: 'INV-' + String(no).padStart(4, '0'), status: status, issueDate: d(m, 28 > 27 ? 28 : 28), dueDate: d(m + 1 > 12 ? 12 : m + 1, 28),
      paidDate: paidM ? d(paidM, 25) : '', payTo: paidM ? '個人の口座' : '', clientId: client.id, clientName: client.name, clientDepartment: client.department,
      clientPerson: client.person, clientHonorific: client.honorific, clientAddress: client.address, subject: subject, items: items, withholding: true,
      note: 'お振込手数料はご負担をお願いいたします。', pdf: '', createdAt: d(m, 28) + 'T09:00:00', noBook: '', taxMode: 'out' };
    invoices.push(x);
    return x;
  };
  var it = function (name, q, unit, price, detail) { return { name: name, quantity: q, unit: unit, unitPrice: price, taxRate: 10, detail: detail || '' }; };
  var list = [];
  for (var mm = 1; mm <= 10; mm++) {
    list.push([0, mm, clients[0], mm + '月分 Webサイト更新作業', [it('Webサイト更新作業', 1, '式', 120000, mm + '月のお知らせ・採用ページの更新')], mm === 10 ? 'sent' : 'paid', mm === 10 ? 0 : mm + 1]);
  }
  list.push([0, 5, clients[1], 'データ集計ツール作成', [it('データ集計ツールの作成', 1, '式', 180000), it('操作説明書', 1, '式', 20000)], 'paid', 6]);
  list.push([0, 9, clients[1], '業務の自動化（スプレッドシート）', [it('スプレッドシートの自動化', 12, '時間', 4000, '9月2日〜9月26日')], 'paid', 10]);
  list.push([0, 11, clients[1], '在庫表の改修', [it('在庫表の改修', 8, '時間', 4000)], 'draft', 0]);
  list.sort(function (a, b) { return a[1] - b[1]; }).forEach(function (a, i) { a[0] = i + 1; });
  list.forEach(function (a) {
    var x = inv(a[0], a[1], a[2], a[3], a[4], a[5], a[6]);
    if (a[5] === 'draft') return;
    var sub = x.items.reduce(function (s, i) { return s + i.quantity * i.unitPrice; }, 0);
    var gross = sub + Math.trunc(sub * 0.1), wh = Math.trunc(sub * 0.1021);
    var sale = { kind: '収入', date: x.issueDate, account: '売上高', amount: gross, method: '未入金（売掛金）', withholding: wh, partner: x.clientName, memo: '請求書 ' + x.number + ' ' + x.subject, invoice: x.id };
    add(sale); x.saleTxnId = sale.id;
    if (x.paidDate) {
      var pay = { kind: '振替', date: x.paidDate, debit: '事業主貸', credit: '売掛金', amount: gross - wh, partner: x.clientName, memo: '入金 請求書 ' + x.number, invoice: x.id, account: '', method: '' };
      add(pay); x.payTxnId = pay.id;
    }
  });

  var assets = [{ id: 'a1', name: 'ノートパソコン（見本）', date: d(2, 14), cost: 198000, life: 4, method: '定額法', ratio: 80, payMethod: '個人のお金', memo: '' }];
  var docs = [
    { id: id(), kind: 'estimate', number: 'EST-0003', status: 'sent', issueDate: d(11, 10), clientId: 'c1', clientName: clients[0].name, clientDepartment: '総務部', clientPerson: '見本 一郎', clientHonorific: '様', clientAddress: clients[0].address,
      subject: '予約受付ページの作成', items: [it('予約受付ページの作成', 1, '式', 250000), it('保守（月額）', 3, 'か月', 10000)], taxMode: 'out', body: {}, note: '', createdAt: d(11, 10) + 'T10:00:00' }
  ];
  var settings = { '年度': Y, '青色申告特別控除': '65万円', '請求書:名前': '見本 太郎', '請求書:次の番号': 14, '請求書:番号の頭': 'INV-',
    '作業:種類': JSON.stringify([{ name: 'Webサイト更新', price: 120000 }]) };

  var db = { txns: txns, assets: assets, openings: [], invoices: invoices, clients: clients, works: [], docs: docs, settings: settings, sheetUrl: 'https://example.com/sheet' };
  var copy = function (v) { return JSON.parse(JSON.stringify(v)); };
  var upsert = function (arr, x) { x = copy(x); if (!x.id) x.id = id(); var i = arr.findIndex(function (y) { return y.id === x.id; }); if (i >= 0) arr[i] = x; else arr.push(x); return copy(x); };
  var remove = function (arr, key) { var i = arr.findIndex(function (y) { return y.id === key; }); if (i >= 0) arr.splice(i, 1); return i >= 0; };

  var api = {
    apiLoad: function () { return copy(db); },
    apiSaveTxn: function (t) { return upsert(db.txns, t); },
    apiDeleteTxn: function (k) { return remove(db.txns, k); },
    apiSaveAsset: function (a) { return upsert(db.assets, a); },
    apiDeleteAsset: function (k) { return remove(db.assets, k); },
    apiSaveClient: function (c) { return upsert(db.clients, c); },
    apiDeleteClient: function (k) { return remove(db.clients, k); },
    apiSaveWork: function (w) { return upsert(db.works, w); },
    apiDeleteWork: function (k) { return remove(db.works, k); },
    apiSaveInvoice: function (x, ops) {
      ops = ops || {}; var saved = {};
      (ops.deleteTxns || []).forEach(function (k) { remove(db.txns, k); });
      Object.keys(ops.saveTxns || {}).forEach(function (k) { saved[k] = upsert(db.txns, ops.saveTxns[k]); });
      if (saved.sale) x.saleTxnId = saved.sale.id;
      if (saved.pay) x.payTxnId = saved.pay.id;
      return { invoice: upsert(db.invoices, x), txns: saved, works: [] };
    },
    apiSaveDoc: function (x) { return upsert(db.docs, x); },
    apiDeleteDoc: function (k) { return remove(db.docs, k); },
    apiDeleteInvoice: function (k) { return remove(db.invoices, k); },
    apiSaveSettings: function (o) { Object.keys(o).forEach(function (k) { db.settings[k] = o[k]; }); return copy(db.settings); },
    apiSaveOpenings: function () { return []; },
    apiImportInvoiceNote: function () { return 0; },
    apiUpload: function () { return { url: '' }; },
    apiInvoicePdf: function () { throw new Error('見本ではPDFを作れません'); },
    apiFolders: function () { var f = { name: '（見本）', url: 'https://example.com/folder' }; return { receipt: f, invoice: f, sheet: { name: '確定申告ノート（見本）', url: 'https://example.com/sheet' } }; },
    apiSetFolder: function () { throw new Error('見本ではフォルダーを変えられません'); },
    apiExport: function () { throw new Error('見本ではシートに書き出せません'); }
  };

  function runner(ok, ng) {
    var r = {
      withSuccessHandler: function (f) { return runner(f, ng); },
      withFailureHandler: function (f) { return runner(ok, f); }
    };
    Object.keys(api).forEach(function (name) {
      r[name] = function () {
        var args = arguments;
        setTimeout(function () {
          try { var v = api[name].apply(null, args); if (ok) ok(v); } catch (e) { if (ng) ng(e); }
        }, 120);
      };
    });
    return r;
  }
  window.google = { script: { run: runner(null, null) } };
})();
