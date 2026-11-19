---
applyTo: "docs/design/**"
---

# Design Document Authoring Instructions (`wows-crf`)

`docs/design/**` 配下の設計書を作成・更新する際は、[`docs/design/README.md`](../../docs/design/README.md) および [`docs/design/_template.md`](../../docs/design/_template.md) に従ってください。

1. **必須構成**:
   - ステータス・対象エンドポイント・関連モジュールのメタデータ表
   - `1. 概要`（背景・Google Sheets クォータ等の現行課題・意思決定の根拠）
   - `2. 要件定義・インターフェース契約`（要件表・TypeScript 型定義・スプレッドシートのセル座標/GCS パス）
   - `3. システムアーキテクチャ・処理フロー`（Mermaid `sequenceDiagram`、エラー・ロールバック分岐を含む）
   - `4. 詳細設計・モジュール分割`（`src/util/` の純粋ロジックと `src/app/` の I/O 分離）
   - `5. インフラ・セキュリティ・クォータ考慮事項`（Sheets API 呼び出し回数試算とセキュリティチェックリスト）
   - `6. 環境変数・ドキュメント更新計画`
   - `7. テスト・検証シナリオ`（`T-1`, `T-2`... のトレーサブルな表）
2. **秘密情報の記載禁止**:
   - 実在のスプレッドシート ID、API キー、秘密鍵、非公開 URL を例示に使わず、必ずダミー文字列を使用してください。
3. **インデックス更新**:
   - 新規設計書を追加した場合は、`docs/design/README.md` の「5. 設計書インデックス」に追記してください。
