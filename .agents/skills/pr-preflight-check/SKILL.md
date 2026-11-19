---
name: pr-preflight-check
description: >-
  Runs the full pre-PR safety, security, typecheck, lint, unit test, and build verification suite
  for wows-crf, and prepares the PR summary following .github/PULL_REQUEST_TEMPLATE.md.
  Use before committing, opening, or reviewing a Pull Request.
---

# `wows-crf` PR 提出前プリフライト検証スキル (`pr-preflight-check`)

パブリックリポジトリである `wows-crf` において、PR 作成・更新前に安全性と品質を高速・確実に検証する手順です。

## ステップ 1: 一括高速チェック (`npm run check`) の実行
以下のコマンドを実行し、すべてのゲートがパスすることを確認します（通常10秒以内に完了します）。

```bash
npm run check
```

`npm run check` は内部で以下の4つを順次実行します：
1. `npm run security:check` (`node scripts/security-check.mjs`):
   - 秘密情報（秘密鍵、サービスアカウント JSON、`.env` ファイル等）の追跡混入がないか
   - `Access-Control-Allow-Origin` が `src/app/api/shipchecker/route.ts` 以外に漏れていないか
   - `NEXT_PUBLIC_` プレフィックスでサーバー秘密環境変数が露出していないか
   - `dangerouslySetInnerHTML` 等の危険な XSS シンクが使われていないか
2. `npm run typecheck` (`tsc --noEmit`):
   - TypeScript の型整合性チェック
3. `npm run lint` (`eslint .`):
   - Next.js Core Web Vitals / React Hooks ルールチェック
4. `npm test` (`vitest run`):
   - `src/util/`（認証・Argon2id・排他ロック・画像マジックナンバー・チーム名検証・艦艇ルール・キャッシュ・URLクエリ）およびセキュリティ不変条件の単体テスト

## ステップ 2: 新規ロジックに対するテスト・設計書の確認
- `src/util/` または `src/app/api/` にロジックを追加・変更した場合、`tests/` 配下に単体テストが追加されているか確認します。
- API 契約・シート構造・GCS パス・認証仕様を変更した場合、`docs/design/` の設計書および `docs/annual-setup-guide.md` / `docs/shipchecker-api/` が最新化されているか確認します。

## ステップ 3: 本番ビルド検証 (`npm run build`)
ページコンポーネント (`src/app/**/page.tsx`)、`useSearchParams()`（`<Suspense>` 境界必須）、または Route Handler (`src/app/api/**/route.ts`) を変更した場合は、本番ビルドが通ることを確認します。

```bash
npm run build
```

## ステップ 4: PR テンプレートに沿った記述
`.github/PULL_REQUEST_TEMPLATE.md` の項目（変更概要、関連設計書リンク、セキュリティ・クォータチェックリスト、テスト結果）を埋めて PR 本文を作成します。
