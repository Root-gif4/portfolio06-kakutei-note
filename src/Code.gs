// 確定申告ノート：スプレッドシートとGoogleドライブへの読み書き
// 計算はすべて画面側（index.html）で行い、ここはデータの保存だけを受け持つ

var SHEETS = {
  '取引': {
    head: ['ID', '日付', '種類', '科目', '金額', '按分率(%)', '支払・入金方法', '源泉徴収税額', '借方科目', '貸方科目', '取引先', '摘要', '証憑', '更新日時', '請求書ID'],
    keys: ['id', 'date', 'kind', 'account', 'amount', 'ratio', 'method', 'withholding', 'debit', 'credit', 'partner', 'memo', 'receipt', 'updated', 'invoice'],
    text: [1, 2, 15]
  },
  '固定資産': {
    head: ['ID', '名称', '取得日', '取得価額', '耐用年数', '償却方法', '事業割合(%)', '支払方法', 'メモ', '更新日時'],
    keys: ['id', 'name', 'date', 'cost', 'life', 'method', 'ratio', 'payMethod', 'memo', 'updated'],
    text: [1, 3]
  },
  '請求書': {
    head: ['ID', '請求書番号', '状態', '請求日', 'お支払期限', '入金日', '入金先', '取引先ID', '会社名', '部署', '担当者', '敬称', '住所', '件名',
      '明細', '源泉徴収', '備考', '小計', '消費税', '源泉徴収税額', 'ご請求金額', '売上の取引ID', '入金の取引ID', 'PDF', '作成日時', '更新日時', '帳簿に記録しない', '税の表示'],
    keys: ['id', 'number', 'status', 'issueDate', 'dueDate', 'paidDate', 'payTo', 'clientId', 'clientName', 'clientDepartment', 'clientPerson',
      'clientHonorific', 'clientAddress', 'subject', 'items', 'withholding', 'note', 'subtotal', 'tax', 'whAmount', 'total', 'saleTxnId',
      'payTxnId', 'pdf', 'createdAt', 'updated', 'noBook', 'taxMode'],
    text: [1, 2, 4, 5, 6, 15]
  },
  '取引先': {
    head: ['ID', '会社名', '部署', '担当者', '敬称', '郵便番号', '住所', '電話', 'メール', '支払条件', 'メモ', '更新日時'],
    keys: ['id', 'name', 'department', 'person', 'honorific', 'postalCode', 'address', 'tel', 'email', 'paymentTerm', 'memo', 'updated'],
    text: [1, 6, 8]
  },
  '作業記録': {
    head: ['ID', '日付', '取引先ID', '種類', '時間', 'メモ', '請求書ID', '更新日時'],
    keys: ['id', 'date', 'clientId', 'type', 'time', 'memo', 'invoice', 'updated'],
    text: [1, 2, 3, 5, 7]
  },
  '書類': {
    head: ['ID', '種類', '番号', '状態', '発行日', '取引先ID', '会社名', '部署', '担当者', '敬称', '住所', '件名', '明細', '税の表示', '内容', '備考',
      '小計', '消費税', '合計', '元の書類ID', 'PDF', '作成日時', '更新日時'],
    keys: ['id', 'kind', 'number', 'status', 'issueDate', 'clientId', 'clientName', 'clientDepartment', 'clientPerson', 'clientHonorific', 'clientAddress',
      'subject', 'items', 'taxMode', 'body', 'note', 'subtotal', 'tax', 'total', 'sourceId', 'pdf', 'createdAt', 'updated'],
    text: [1, 3, 5, 6, 13, 15, 20]
  },
  '期首残高': { head: ['年', '科目', '金額'], keys: ['year', 'account', 'amount'], text: [] },
  '設定': { head: ['項目', '値'], keys: ['key', 'value'], text: [1, 2] }
};
var NUMBER_KEYS = ['amount', 'ratio', 'withholding', 'cost', 'life', 'year', 'subtotal', 'tax', 'whAmount', 'total'];
var RECEIPT_FOLDER = '確定申告ノート_証憑';
var INVOICE_FOLDER = '確定申告ノート_請求書';

// ブラウザのタブに出すアイコン（ホーム画面用の入口ページに置いた画像）。
// Cloudflare Pages のプロジェクト名を kakutei-note 以外にしたときは、ここのアドレスも合わせて直す
var ICON_URL = 'https://kakutei-note.pages.dev/favicon.png';

function doGet() {
  setup_();
  var out = HtmlService.createHtmlOutputFromFile('index')
    .setTitle('確定申告ノート')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover');
  try { out.setFaviconUrl(ICON_URL); } catch (e) { /* アイコンが使えなくてもアプリは開く */ }
  return out;
}

// 最初に一度、エディタから実行する（権限の許可とシートの準備）
function setup() {
  setup_();
  Logger.log('準備ができました。次は「デプロイ」→「新しいデプロイ」でウェブアプリとして公開してください。');
}

function onOpen() {
  SpreadsheetApp.getUi().createMenu('確定申告ノート')
    .addItem('アプリのURLを表示', 'showUrl_')
    .addToUi();
}

function showUrl_() {
  var url = ScriptApp.getService().getUrl();
  SpreadsheetApp.getUi().alert(url ? 'アプリのURL：\n' + url : 'まだウェブアプリとして公開されていません。');
}

function ss_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('SSID');
  if (id) return SpreadsheetApp.openById(id);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('スプレッドシートが見つかりません。スプレッドシートの「拡張機能 → Apps Script」から作ってください。');
  props.setProperty('SSID', ss.getId());
  return ss;
}

function setup_() {
  var ss = ss_();
  // 2026.11.06：シート「請求先」を「取引先」に名前を変える（中身はそのまま）
  var oldClients = ss.getSheetByName('請求先');
  if (oldClients && !ss.getSheetByName('取引先')) oldClients.setName('取引先');
  Object.keys(SHEETS).forEach(function (name) {
    var def = SHEETS[name];
    var sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    // 見出しは毎回そろえる（列を足したときも、前の版のシートがそのまま使える）
    var cur = sh.getLastRow() > 0 ? sh.getRange(1, 1, 1, def.head.length).getValues()[0] : [];
    if (cur.join('\t') !== def.head.join('\t')) {
      sh.getRange(1, 1, 1, def.head.length).setValues([def.head]).setFontWeight('bold');
      sh.setFrozenRows(1);
    }
    // 日付やIDが勝手に変換されないよう、文字列の列にする
    def.text.forEach(function (col) { sh.getRange(1, col, sh.getMaxRows(), 1).setNumberFormat('@'); });
  });
  var first = ss.getSheetByName('シート1') || ss.getSheetByName('Sheet1');
  if (first && first.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(first);
}

function read_(name) {
  var def = SHEETS[name];
  var sh = ss_().getSheetByName(name);
  if (!sh || sh.getLastRow() < 2) return [];
  var tz = ss_().getSpreadsheetTimeZone();
  var vals = sh.getRange(2, 1, sh.getLastRow() - 1, def.keys.length).getValues();
  return vals.filter(function (r) { return r[0] !== ''; }).map(function (r) {
    var o = {};
    def.keys.forEach(function (k, i) {
      var v = r[i];
      if (v instanceof Date) v = Utilities.formatDate(v, tz, 'yyyy-MM-dd');
      o[k] = v === null || v === undefined ? '' : v;
    });
    return o;
  });
}

function clean_(v) {
  if (typeof v === 'number' || typeof v === 'boolean') return v;
  var s = String(v == null ? '' : v).slice(0, 45000);
  // 数式として解釈されないようにする
  if (/^[=+\-@]/.test(s) && !/^-?\d+$/.test(s)) s = "'" + s;
  return s;
}

function rowOf_(name, obj) {
  return SHEETS[name].keys.map(function (k) {
    var v = obj[k];
    if (NUMBER_KEYS.indexOf(k) >= 0 && v !== '' && v != null) {
      var n = Number(String(v).replace(/,/g, ''));
      return isFinite(n) ? n : '';
    }
    if (v !== null && typeof v === 'object') v = JSON.stringify(v);
    return clean_(v);
  });
}

function withLock_(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try { return fn(); } finally { lock.releaseLock(); }
}

var PREFIX = { '取引': 'T', '固定資産': 'A', '請求書': 'I', '取引先': 'C', '作業記録': 'W', '書類': 'D' };
function newId_(name) { return (PREFIX[name] || 'X') + Utilities.getUuid().replace(/-/g, '').slice(0, 10); }
function now_() { return Utilities.formatDate(new Date(), ss_().getSpreadsheetTimeZone(), 'yyyy-MM-dd HH:mm:ss'); }

function upsertNoLock_(name, obj) {
  var sh = ss_().getSheetByName(name);
  if (!obj.id) obj.id = newId_(name);
  obj.updated = now_();
  var row = rowOf_(name, obj);
  var idx = findRow_(sh, obj.id);
  if (idx > 0) sh.getRange(idx, 1, 1, row.length).setValues([row]);
  else {
    var next = sh.getLastRow() + 1;
    if (next > sh.getMaxRows()) {
      sh.insertRowsAfter(sh.getMaxRows(), 500);
      SHEETS[name].text.forEach(function (col) { sh.getRange(1, col, sh.getMaxRows(), 1).setNumberFormat('@'); });
    }
    sh.getRange(next, 1, 1, row.length).setValues([row]);
  }
  return obj;
}
function upsert_(name, obj) { return withLock_(function () { return upsertNoLock_(name, obj); }); }

function findRow_(sh, id) {
  if (!id || sh.getLastRow() < 2) return -1;
  var ids = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) if (String(ids[i][0]) === String(id)) return i + 2;
  return -1;
}

function removeNoLock_(name, id) {
  var sh = ss_().getSheetByName(name);
  var idx = findRow_(sh, id);
  if (idx > 0) sh.deleteRow(idx);
  return idx > 0;
}
function remove_(name, id) { return withLock_(function () { return removeNoLock_(name, id); }); }

// ---- 画面から呼ぶもの ----

function apiLoad() {
  setup_();
  var settings = {};
  read_('設定').forEach(function (r) { settings[r.key] = r.value; });
  return {
    txns: read_('取引'),
    assets: read_('固定資産'),
    openings: read_('期首残高'),
    invoices: read_('請求書'),
    clients: read_('取引先'),
    works: read_('作業記録'),
    docs: read_('書類'),
    settings: settings,
    sheetUrl: ss_().getUrl()
  };
}

function checkTxn_(t) {
  if (['支出', '収入', '振替'].indexOf(t.kind) < 0) throw new Error('種類が正しくありません');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t.date)) throw new Error('日付が正しくありません');
}
function apiSaveTxn(t) { checkTxn_(t); return upsert_('取引', t); }
function apiDeleteTxn(id) { return remove_('取引', id); }

function apiSaveAsset(a) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(a.date)) throw new Error('取得日が正しくありません');
  return upsert_('固定資産', a);
}
function apiDeleteAsset(id) { return remove_('固定資産', id); }

function apiSaveClient(c) {
  if (!String(c.name || '').trim()) throw new Error('会社名を入れてください');
  return upsert_('取引先', c);
}
function apiDeleteClient(id) { return remove_('取引先', id); }

function apiSaveWork(w) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(w.date)) throw new Error('日付が正しくありません');
  if (!String(w.type || '').trim()) throw new Error('種類を選んでください');
  return upsert_('作業記録', w);
}
function apiDeleteWork(id) { return remove_('作業記録', id); }

// 請求書と、それに結びつく帳簿の取引をまとめて保存する
// ops.saveTxns: 作る・直す取引（key は 'sale' / 'pay'）、ops.deleteTxns: 消す取引のID
function apiSaveInvoice(inv, ops) {
  ops = ops || {};
  if (!/^\d{4}-\d{2}-\d{2}$/.test(inv.issueDate)) throw new Error('請求日が正しくありません');
  return withLock_(function () {
    var saved = {};
    (ops.deleteTxns || []).forEach(function (id) { removeNoLock_('取引', id); });
    Object.keys(ops.saveTxns || {}).forEach(function (key) {
      var t = ops.saveTxns[key];
      checkTxn_(t);
      saved[key] = upsertNoLock_('取引', t);
    });
    if (saved.sale) inv.saleTxnId = saved.sale.id;
    if (saved.pay) inv.payTxnId = saved.pay.id;
    if (!inv.createdAt) inv.createdAt = now_();
    if (ops.nextNumber) saveSettingsNoLock_({ '請求書:次の番号': ops.nextNumber });
    var savedInv = upsertNoLock_('請求書', inv);
    // 作業記録から作った請求書：使った記録に請求書IDを入れる
    var works = [];
    if (ops.works && ops.works.length) {
      read_('作業記録').forEach(function (w) {
        if (ops.works.indexOf(w.id) < 0) return;
        w.invoice = savedInv.id;
        works.push(upsertNoLock_('作業記録', w));
      });
    }
    return { invoice: savedInv, txns: saved, works: works };
  });
}

// 見積書・納品書・提案書（帳簿には記録しない）
// ops.nextKey / ops.nextNumber: 次に使う番号を設定に残す
function apiSaveDoc(doc, ops) {
  ops = ops || {};
  if (['estimate', 'delivery', 'proposal'].indexOf(doc.kind) < 0) throw new Error('書類の種類が正しくありません');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(doc.issueDate)) throw new Error('日付が正しくありません');
  return withLock_(function () {
    if (!doc.createdAt) doc.createdAt = now_();
    if (ops.nextNumber && /^(見積書|納品書|提案書):次の番号$/.test(ops.nextKey)) {
      var o = {}; o[ops.nextKey] = ops.nextNumber; saveSettingsNoLock_(o);
    }
    return upsertNoLock_('書類', doc);
  });
}
function apiDeleteDoc(id) { return remove_('書類', id); }

function apiDeleteInvoice(id, txnIds) {
  return withLock_(function () {
    (txnIds || []).forEach(function (t) { removeNoLock_('取引', t); });
    return removeNoLock_('請求書', id);
  });
}

function saveSettingsNoLock_(obj) {
  var sh = ss_().getSheetByName('設定');
  var cur = {};
  read_('設定').forEach(function (r) { cur[r.key] = r.value; });
  Object.keys(obj).forEach(function (k) { cur[k] = obj[k]; });
  if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, 2).clearContent();
  var rows = Object.keys(cur).map(function (k) { return [clean_(k), clean_(cur[k])]; });
  if (rows.length) sh.getRange(2, 1, rows.length, 2).setValues(rows);
  return cur;
}
function apiSaveSettings(obj) { return withLock_(function () { return saveSettingsNoLock_(obj); }); }

function apiSaveOpenings(year, map) {
  year = Number(year);
  return withLock_(function () {
    var sh = ss_().getSheetByName('期首残高');
    var keep = read_('期首残高').filter(function (r) { return Number(r.year) !== year; });
    Object.keys(map).forEach(function (k) {
      var n = Number(map[k]);
      if (isFinite(n) && n !== 0) keep.push({ year: year, account: k, amount: n });
    });
    if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, 3).clearContent();
    var rows = keep.map(function (r) { return rowOf_('期首残高', r); });
    if (rows.length) sh.getRange(2, 1, rows.length, 3).setValues(rows);
    return keep;
  });
}

// 請求書ノート（ブラウザ版）のバックアップを取り込む。同じIDのものは上書きしない
function apiImportInvoiceNote(data) {
  return withLock_(function () {
    var count = { clients: 0, invoices: 0 };
    var haveC = {}, haveI = {};
    read_('取引先').forEach(function (c) { haveC[c.id] = 1; });
    read_('請求書').forEach(function (i) { haveI[i.id] = 1; });
    (data.clients || []).forEach(function (c) {
      if (!c.id || haveC[c.id]) return;
      upsertNoLock_('取引先', c); count.clients++;
    });
    (data.invoices || []).forEach(function (i) {
      if (!i.id || haveI[i.id]) return;
      upsertNoLock_('請求書', i); count.invoices++;
    });
    if (data.settings) saveSettingsNoLock_(data.settings);
    return count;
  });
}

// レシート・請求書の保存先：ドライブの「確定申告ノート_証憑/年」
function apiUpload(f) {
  var allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'];
  if (allowed.indexOf(f.mime) < 0) throw new Error('画像かPDFを選んでください');
  var blob = Utilities.newBlob(Utilities.base64Decode(f.data), f.mime, safeName_(f.name || 'receipt'));
  var file = folder_('RECEIPT_FOLDER', RECEIPT_FOLDER, String(f.year || new Date().getFullYear())).createFile(blob);
  return { url: file.getUrl(), name: file.getName() };
}

// 請求書・見積書・納品書・提案書のPDFを作ってドライブに置く（前に作ったPDFはゴミ箱へ）
function apiInvoicePdf(p) {
  var html = HtmlService.createHtmlOutput(String(p.html)).getContent();
  var pdf = Utilities.newBlob(html, 'text/html', 'invoice.html').getAs('application/pdf').setName(safeName_(p.name) + '.pdf');
  var file = folder_('INVOICE_FOLDER', INVOICE_FOLDER, String(p.year || new Date().getFullYear())).createFile(pdf);
  var m = String(p.oldUrl || '').match(/\/d\/([\w-]+)/);
  if (m) { try { DriveApp.getFileById(m[1]).setTrashed(true); } catch (e) { /* 見つからなければそのまま */ } }
  return { url: file.getUrl(), name: file.getName() };
}

function safeName_(s) { return String(s).replace(/[\\\/:*?"<>|\n\r]/g, '_').slice(0, 120); }

function folder_(prop, rootName, year) {
  var props = PropertiesService.getScriptProperties();
  var root = null, id = props.getProperty(prop);
  if (id) { try { root = DriveApp.getFolderById(id); if (root.isTrashed()) root = null; } catch (e) { root = null; } }
  if (!root) {
    root = DriveApp.createFolder(rootName);
    props.setProperty(prop, root.getId());
  }
  // アプリの名前を変えたとき、旧名（青色申告ノート_…）のままのフォルダーだけ名前を合わせる（自分で付けた名前は変えない）
  if (root.getName() === rootName.replace('確定申告ノート', '青色申告ノート')) root.setName(rootName);
  var it = root.getFoldersByName(year);
  return it.hasNext() ? it.next() : root.createFolder(year);
}

// 保存先のフォルダー（レシート・請求書PDF）。移動しても ID で見つかるので、変えるのは別のフォルダーにしたいときだけ
var FOLDER_PROPS = { receipt: 'RECEIPT_FOLDER', invoice: 'INVOICE_FOLDER' };
function folderInfo_(prop) {
  var id = PropertiesService.getScriptProperties().getProperty(prop);
  if (!id) return null;
  try {
    var f = DriveApp.getFolderById(id);
    if (f.isTrashed()) return null;
    var parents = f.getParents();
    return { name: f.getName(), url: f.getUrl(), parent: parents.hasNext() ? parents.next().getName() : '' };
  } catch (e) { return null; }
}
function apiFolders() {
  return { receipt: folderInfo_(FOLDER_PROPS.receipt), invoice: folderInfo_(FOLDER_PROPS.invoice), sheet: { name: ss_().getName(), url: ss_().getUrl() } };
}
function apiSetFolder(kind, urlOrId) {
  var prop = FOLDER_PROPS[kind];
  if (!prop) throw new Error('種類が正しくありません');
  var m = String(urlOrId || '').match(/folders\/([\w-]{10,})/) || String(urlOrId || '').trim().match(/^([\w-]{10,})$/);
  if (!m) throw new Error('フォルダーのアドレス（https://drive.google.com/drive/folders/…）を貼り付けてください');
  var f;
  try { f = DriveApp.getFolderById(m[1]); } catch (e) { throw new Error('そのフォルダーが見つかりません。自分のドライブのフォルダーか確かめてください'); }
  if (f.isTrashed()) throw new Error('そのフォルダーはゴミ箱に入っています');
  PropertiesService.getScriptProperties().setProperty(prop, f.getId());
  return folderInfo_(prop);
}

// 仕訳帳・総勘定元帳・決算書をシートに書き出す（中身は画面で計算したもの）
function apiExport(tables) {
  var ss = ss_();
  tables.forEach(function (t) {
    if (!/^(仕訳帳|総勘定元帳|決算書)_\d{4}$/.test(t.name)) throw new Error('シート名が正しくありません');
    var sh = ss.getSheetByName(t.name) || ss.insertSheet(t.name);
    sh.clear();
    var width = t.rows.reduce(function (m, r) { return Math.max(m, r.length); }, 1);
    var rows = t.rows.map(function (r) {
      var x = r.map(clean_);
      while (x.length < width) x.push('');
      return x;
    });
    if (rows.length) sh.getRange(1, 1, rows.length, width).setValues(rows);
    sh.getRange(1, 1, 1, width).setFontWeight('bold');
    sh.setFrozenRows(1);
  });
  return ss.getUrl();
}
