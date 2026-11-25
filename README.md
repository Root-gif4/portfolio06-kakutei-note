# 確定申告ノート（Portfolio 06）

個人事業・副業の帳簿づけから請求書・決算までを 1 つにまとめた、Google スプレッドシート＋Apps Script の Web アプリです。
スマホでレシートを撮って経費を入れ、PC で請求書を作り、年末には損益計算書・貸借対照表の数字まで出せます。データは自分の Google ドライブの中だけに置き、お金はかかりません。

- 使い方・設置のしかた：[使い方.md](使い方.md)
- 作品としての説明：[ポートフォリオ.md](ポートフォリオ.md)
- セキュリティチェック：[docs/セキュリティチェック.md](docs/セキュリティチェック.md)

| 項目 | 内容 |
| --- | --- |
| 画面 | HTML・CSS・JavaScript 1 ファイル（`src/index.html`、ライブラリなし）。ライト／ダーク、スマホ・PC 両対応 |
| サーバー | Google Apps Script（`src/Code.gs`）。スプレッドシートへの読み書き、ドライブへのレシート・PDF の保存だけを受け持つ |
| データ | Google スプレッドシート（シート：取引・固定資産・請求書・取引先・作業記録・書類・期首残高・設定） |
| 公開範囲 | ウェブアプリは「自分として実行・自分だけがアクセス」 |

## 構成

```
src/
  Code.gs        Apps Script（シートの準備・読み書き・レシートのアップロード・PDF 作成・書き出し）
  index.html     画面と計算（仕訳・按分・減価償却・源泉徴収・消費税・決算書）
demo/
  mock.js        google.script.run の代わりに架空のデータを返す見本用のしかけ
  build.js       src/index.html に mock.js を差し込んで demo/index.html を作る
```

## 見本データで動かす（Google なし）

```powershell
node demo/build.js
```

```powershell
py -m http.server 8813 --bind 127.0.0.1 --directory demo
```

ブラウザで http://localhost:8813 を開きます。取引先・金額・名前はすべて架空で、何も保存されません（PDF 作成・シートへの書き出しは動きません）。
