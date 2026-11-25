// src/index.html に見本用の mock.js を差し込んで demo/index.html を作る
//   node demo/build.js
const fs = require('fs')
const path = require('path')
const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'index.html'), 'utf8')
const i = src.indexOf('<script>')
if (i < 0) throw new Error('script が見つかりません')
const banner = '<div style="position:sticky;top:0;z-index:99;background:#fdf3d8;color:#6b4e00;font:13px/1.5 sans-serif;padding:6px 12px;text-align:center">見本データで動く確認用の画面です（Google には保存されません）</div>\n'
const out = src.slice(0, i) + '<script src="mock.js"></script>\n' + src.slice(i)
fs.writeFileSync(path.join(__dirname, 'index.html'), out.replace('<body>', '<body>\n' + banner))
console.log('demo/index.html を作りました')
