## 1. 変更概要 (Summary)

<!-- この PR で何を・なぜ変更したのかを簡潔に記載してください -->
- **背景 / 目的**: 
- **主な変更内容**:
  - 

## 2. 変更種別 (Type of Change)

- [ ] 新機能追加 (`feat`)
- [ ] バグ修正 (`fix`)
- [ ] セキュリティ・クォータ保護・バリデーション改善 (`security` / `perf`)
- [ ] 設計書・運用ドキュメント更新 (`docs`)
- [ ] テスト・CI・リファクタリング (`test` / `ci` / `refactor`)

## 3. 関連設計書・ドキュメント (Design & Docs)

<!-- API仕様、スプレッドシート構造、GCS保存パス、認証・キャッシュ仕様を変更した場合は docs/design/ の設計書を記載してください -->
- **設計書 (`docs/design/`)**: 
  - [ ] 新規作成・更新済み（パス: `docs/design/xxxx.md`）
  - [ ] 設計書不要（UI軽微修正・リファクタリング・テスト追加のみ）
- **運用・外部連携ドキュメント**:
  - [ ] `README.md` / `docs/annual-setup-guide.md` / `docs/shipchecker-api/` を更新済み（または更新不要）

## 4. セキュリティ・後方互換性チェックリスト (Safety & Compatibility)

- [ ] **秘密情報の保護**: コード・テスト・設計書・エラーレスポンスに実在のスプレッドシート ID、秘密鍵、API キー、非公開 URL、個人情報が一切含まれていない
- [ ] **CORS 境界の維持**: `Access-Control-Allow-Origin: *` を `/api/shipchecker` 以外の API（`/api/register`, `/api/team/*` 等）や `next.config.mjs` に付与していない
- [ ] **Google Sheets クォータ・シート互換性**:
  - `REGISTER_HEADER`（8列: `A`〜`H`、`G2`=LogoURL、`H2〜H5`=Salt/Hash/Lock）および `@init` 等の `@` 付きシート除外規則を壊していない
  - 不要な `doc.loadInfo()` の重複呼び出しや未認証キャッシュバイパス経路を追加していない
- [ ] **外部連携スキーマ互換**: `/api/shipchecker` のレスポンス構造（`hasRader` / `allRader` のスペル等）の後方互換性を維持している

## 5. テスト・検証結果 (Verification)

- [ ] `npm run check`（`security:check` + `typecheck` + `lint` + `test`）がすべてパスすることを確認済み
- [ ] `npm run build` がエラーなく成功することを確認済み
- [ ] 新規・変更したビジネスロジックに対して `tests/*.test.ts` に単体テストを追加済み（該当する場合）

### 補足・レビュアーへの共有事項 (Notes)
<!-- 重点的に見てほしい箇所や、本番 Cloud Run / 環境変数への反映手順があれば記載してください -->
