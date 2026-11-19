@AGENTS.md

## Claude Code 向け補足ガイド

- **共通ハーネスの参照**: 上記 `@AGENTS.md` がプロジェクト全体の正本（Single Source of Truth）です。
- **設計書の参照・作成**:
  - 機能追加・API変更・シート構造変更を行う際は、まず `docs/design/README.md` と既存の `docs/design/*.md` を確認してください。
  - 新規設計書は `docs/design/_template.md` をベースに `docs/design/<feature-name>.md` として作成してください。
- **変更後の検証**:
  - タスク完了前に必ず `npm run check`（`security:check` + `typecheck` + `lint` + `test`）を実行し、すべてパスすることを確認してください。
  - ページや Route Handler (`src/app/**`) を変更した場合は `npm run build` も実行して App Router の静的解析・Suspense 境界エラーがないことを確認してください。
