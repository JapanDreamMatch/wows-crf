# 艦艇チェッカー 外部連携ガイド

World of Warships Japan Dream Match (JDM) 公式艦艇チェッカー（`https://form.japandreammatch.info/shipchecker`）のデータを外部サイトから取得する **API（CORS 対応）** と、編成を引き継いで画面を開く **URL クエリ連携** の利用ガイドです。

チーム編成検討ツールなどの外部アプリケーションから、最新の艦艇リスト・規約ルールを参照したり、作成した編成を公式チェッカー上で最終確認する用途にご利用いただけます。

---

## ドキュメント一覧

| ドキュメント | 内容 |
|---|---|
| [API リファレンス (`api-reference.md`)](./api-reference.md) | `GET /api/shipchecker` の CORS 仕様、キャッシュ仕様、レスポンス JSON スキーマ、ルール判定ロジック |
| [URL クエリ連携ガイド (`url-integration.md`)](./url-integration.md) | `/shipchecker?ships=...&radar=...` による初期選択・レーダー指定、艦名照合ルール、制限・警告仕様 |

---

## クイックスタート

### 1. 最新の艦艇一覧・ルールをブラウザから取得する（CORS 対応）

`GET https://form.japandreammatch.info/api/shipchecker` は `Access-Control-Allow-Origin: *` を返すため、外部サイトのフロントエンド（ブラウザ JS）からそのまま `fetch` できます。

```javascript
const response = await fetch("https://form.japandreammatch.info/api/shipchecker");
if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
}
const data = await response.json();

console.log(data.version);   // レギュレーション/バージョン表記
console.log(data.ships);     // 艦艇配列
console.log(data.rules);     // 隻数上限 (shipAmount) とルール一覧 (rules)
```

### 2. 編成を URL で渡して公式チェッカーを開く

`ships` と `radar` クエリパラメータを付与して `/shipchecker` へ遷移すると、指定した艦艇・レーダー設定が選択された状態でチェッカーが開きます。

```text
https://form.japandreammatch.info/shipchecker?ships=Des%20Moines,Shimakaze&radar=Des%20Moines
```

---

## 利用上の主な注意点

1. **キャッシュによる反映遅延（最大5分程度）**
   - バックエンドの負荷保護（Google SpreadSheet 連携保護）のため、サーバー側・ブラウザ側ともに **デフォルト 300秒（5分）** のキャッシュが有効です。運営がルールや禁止艦を更新した直後は、反映まで数分かかる場合があります。
   - 画面を開いたタイミング等で **1回取得してクライアントメモリ内に保持する** 使い方を推奨します（ポーリングや操作ごとの頻繁な再取得はお控えください）。
2. **フィールド名のスペル互換**
   - 既存システムとの互換性維持のため、艦艇データのレーダー項目は `hasRader`、レーダー使用数制限ルールは `allRader` というスペルになっています（`Radar` ではなく `Rader`）。
3. **他の API エンドポイントについて**
   - CORS が許可されているのは `/api/shipchecker` のみです。大会応募やチーム変更用の API には CORS 許可は付与されていません。
