# GitHub Copilot Repository Instructions (`wows-crf`)

本リポジトリの詳細なアーキテクチャ規約・セキュリティ境界・設計書ガイドラインの正本はルート直下の **[`AGENTS.md`](../AGENTS.md)** および **[`docs/design/README.md`](../docs/design/README.md)** に定義されています。コード生成・レビュー・PR作成時は以下を厳守してください。

## 1. 設計書ファースト (`docs/design/`)
- すべての機能設計書は `docs/design/<kebab-case-feature-name>.md` に格納します。
- API 仕様、Google SpreadSheet のセル配置、Cloud Storage の保存パス、認証・キャッシュ挙動を変更する場合は、`docs/design/README.md` のガイドラインと `docs/design/_template.md` に従って設計書を作成・更新してください。
- ビジネスロジックやバリデーションは `src/util/*.ts` に純粋関数として切り出し、`tests/*.test.ts` に Vitest の単体テストを追加してください。

## 2. セキュリティ・パブリックリポジトリ絶対規約
- **秘密情報の混入防止**: `.env.local`、サービスアカウント秘密鍵（`-----BEGIN PRIVATE KEY-----`）、実在のスプレッドシート ID、API キーをコード・テスト・ドキュメントに含めないでください。
- **CORS 制限**: `Access-Control-Allow-Origin: *` は `src/app/api/shipchecker/route.ts`（`GET` / `OPTIONS`）のみに限定します。他の API（`/api/register`, `/api/team/*` 等）や `next.config.mjs` に CORS を追加しないでください。
- **認証とロック**: パスワードはサーバーサイドで `src/util/Argon2Service.ts` により Argon2id ハッシュ化し、`src/util/TeamAuth.ts` の `timingSafeEqual`・連続10回失敗時の1時間ロック（`H4`/`H5`）・`withTeamLocks` 排他制御を維持してください。
- **画像検証**: ファイルアップロードは `src/util/ImageValidator.ts` の `detectImageType`（マジックナンバー検証：PNG/JPEG）と `MAX_LOGO_SIZE`（20MB）を必ず通してください。
- **Google Sheets クォータ保護**: `doc.loadInfo()` の重複呼び出しを避け、`/api/shipchecker` では `ShipCheckerCache`（Singleflight & Stale-on-Error）を維持してください。

## 3. 後方互換性の維持
- `hasRadar`、`allRadar`、および艦種コード（`dd` / `ca-cl` / `bb` / `cv` / `sb`）は `SHIP_AND_RULES_SHEET_ID` および外部ツール連携の契約と一致させてください。
- 応募シートで `@` を含むタブ名（`@init` 等）はチーム数カウントから除外される仕様です。チーム略名に `@` を許可しないでください。
- `REGISTER_HEADER`（8列: `Type, IGN, ID, WinRate, Contact, Comment, LogoURL, SaltAndHash`）の列順序・セル座標を壊さないでください。

## 4. 必須検証コマンド
変更完了時は `npm run check`（`npm run security:check && npm run typecheck && npm run lint && npm test`）および必要に応じて `npm run build` が成功することを確認してください。
