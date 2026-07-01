# タイトル & description コピー（Chrome 拡張機能）

ページや**リンク先**の「タイトル」と「description（メタディスクリプション）」を、右クリックメニューやツールバーのポップアップから素早く取得してクリップボードにコピーする Chrome 拡張機能です。

## 機能

### 1. リンクを右クリック（リンク先の情報を取得）

リンクの上で右クリックすると、次の 2 項目が表示されます。

- **L:タイトルを取得** … リンク先ページのタイトルをコピー
- **L:descriptionを取得** … リンク先ページの description をコピー

先頭の `L:`（Link）は「今マウスを乗せている**リンク先**を取得する」ことを表します。裏側でリンク先の HTML を取得し、`<title>` とメタ description を抜き出してコピーします。

### 2. ページ上で右クリック（今見ているページの情報を取得）

リンク以外の場所（本文・テキスト選択部分など）で右クリックすると、`L:` の付かない次の 2 項目が表示されます。

- **タイトルを取得** … 表示中のページのタイトルをコピー
- **descriptionを取得** … 表示中のページの description をコピー

### 3. ツールバーのアイコンをクリック（ポップアップ表示）

拡張機能のアイコンをクリックすると、今表示しているページの **タイトル** と **description** を一覧表示します。それぞれに **コピー** ボタンが付いており、押すと該当テキストをクリップボードへコピーします。

コピー成功時はメニュー操作なら通知、ポップアップならボタン表示（「コピー済み」）でフィードバックします。

## インストール（デベロッパーモードで読み込み）

1. Chrome で `chrome://extensions` を開きます。
2. 右上の **デベロッパーモード** をオンにします。
3. **パッケージ化されていない拡張機能を読み込む** をクリックし、このフォルダ（`manifest.json` がある階層）を選択します。
4. ツールバーに拡張機能アイコンが表示されれば完了です。

> 対応バージョン: Chrome 116 以降（`chrome.offscreen` API を使用）。

## 権限について

| 権限 | 用途 |
| --- | --- |
| `contextMenus` | 右クリックメニューに項目を追加するため |
| `scripting` + `activeTab` | 表示中ページのタイトル / description を読み取るため |
| `host_permissions: <all_urls>` | リンク先ページの HTML を取得（fetch）してタイトル / description を解析するため |
| `offscreen` + `clipboardWrite` | Service Worker から安全にクリップボードへコピーするため |
| `notifications` | コピー完了・失敗を通知するため |

取得したデータは外部に送信しません。クリップボードへのコピーとポップアップ表示にのみ使用します。

## ファイル構成

```
manifest.json      … 拡張機能の定義（MV3）
background.js      … Service Worker：右クリックメニュー、リンク先 fetch、コピー処理
extract-page.js    … ページ内で title / description を読み取る共有関数
offscreen.html/js  … クリップボード書き込み用のオフスクリーンドキュメント
popup.html/css/js  … ツールバーアイコンのポップアップ UI
icons/             … アイコン（16 / 48 / 128px）
```

## 実装メモ

- リンク先の解析は Service Worker で `fetch` → HTML をテキスト走査（`<title>` とメタタグ）で行います。Service Worker に `DOMParser` がないため、正規表現ベースで抽出し、HTML エンティティもデコードします。description は `description` → `og:description` → `twitter:description` の順にフォールバックします。
- 表示中ページの解析は `chrome.scripting.executeScript` で `extract-page.js` の関数を注入して DOM から取得します。`chrome://` などスクリプトを注入できないページでは、タイトルはタブ情報でフォールバックし、description は取得できない旨を表示します。
- 一部サイトは `fetch` を拒否したり（CORS ではなくサーバー側のブロック）、JavaScript でタイトルを後から設定するため、リンク先取得が空になる場合があります。その際は通知でお知らせします。
