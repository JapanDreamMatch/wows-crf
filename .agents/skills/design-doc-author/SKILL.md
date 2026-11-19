---
name: design-doc-author
description: >-
  Authors, updates, and reviews feature and architecture design documents in docs/design/ for wows-crf.
  Use when designing a new feature, modifying API endpoints, changing Google Spreadsheet cell layouts
  or Cloud Storage object paths, or reviewing a design document against project standards.
---

# `wows-crf` 設計書作成・レビュースキル (`design-doc-author`)

`wows-crf` の新機能設計・既存仕様変更時に、プロジェクト標準の設計書を `docs/design/` に作成・更新するための手順書です。

## ステップ 1: ガイドラインと既存設計書の確認
1. `docs/design/README.md` を読み、4つの設計原則（**Decision-First / Contract-Explicit / Security-By-Design / Test-Traceable**）と既存設計書インデックスを確認します。
2. `docs/design/_template.md` を読み込みます。
3. 関連する既存の設計書（例: `shipchecker-external-integration.md`, `team-member-update-and-argon2-auth.md`, `team-icon-cloud-storage-upload.md`）および対象ソースコード（`src/util/`, `src/app/api/`）を確認します。

## ステップ 2: 設計書の執筆 (`docs/design/<kebab-case-feature-name>.md`)
以下の必須チェック項目を満たすように執筆します。

- **1. 概要と意思決定 (Decision-First)**:
  - 背景と解決したい課題を記述しているか？
  - 採用した方針の理由と、却下した代替案（特に Google Sheets API の 60 req/分 クォータやレイテンシの観点）を明記しているか？
- **2. インターフェース・シート契約 (Contract-Explicit)**:
  - API のリクエスト/レスポンス型（TypeScript `interface`）、HTTP ステータスコード、URL クエリパラメータが表とコードブロックで明示されているか？
  - Google SpreadSheet を扱う場合、`REGISTER_HEADER`（A〜H列）や対象セル座標（例: `G2`, `H2〜H5`）、`@init` 除外規則との整合性が明記されているか？
  - 既存外部連携との後方互換性（例: `/api/shipchecker` の `hasRadar` / `allRadar` / `ca-cl`）を破壊していないか？
- **3. シーケンス図 (Mermaid)**:
  - `sequenceDiagram` で正常系だけでなく、バリデーション失敗・外部 API エラー・GCS ロールバック削除・Stale キャッシュフォールバックなどの異常系分岐が描かれているか？
- **4. 純粋ロジックと I/O の分離**:
  - バリデーション・正規化・ルール評価・キャッシュ制御が `src/util/*.ts` の純粋関数として切り出され、Vitest (`tests/*.test.ts`) で外部通信なしに単体テストできる設計になっているか？
- **5. セキュリティ・クォータチェックリスト**:
  - 1リクエストあたりの Google Sheets API 呼び出し回数の試算があるか？
  - CORS 境界（`/api/shipchecker` のみ）、秘密情報の非露出、マジックナンバー検証、排他ロック、XSS 対策が確認されているか？
- **6. テストシナリオ表 (`T-1`, `T-2`...)**:
  - `tests/` の自動テストケースに対応する検証項目が一覧化されているか？

## ステップ 3: インデックスの更新
新規設計書を作成した場合は、`docs/design/README.md` の「5. 設計書インデックス」テーブルに新しい行を追記してください。
