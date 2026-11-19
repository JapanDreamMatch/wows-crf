# AGENTS.md — AI Coding Agent Harness (`wows-crf`)

このファイルは **Antigravity**、**Claude Code**、**OpenAI Codex**、**GitHub Copilot** をはじめとするすべての AI コーディングエージェントおよび開発者向けの共通ハーネス（Single Source of Truth）です。

本リポジトリは **パブリックリポジトリ（MIT License）** として公開されており、実際の大会（World of Warships: Japan Dream Match）の運営インフラ（Google SpreadSheet / Google Cloud Storage / Wargaming API / GCP Cloud Run）と連携して稼働します。**安全性・後方互換性・クォータ保護**を最優先として作業してください。

---

## 1. プロジェクト概要・技術スタック

- **名称**: `wows-crf` (`World of Warships (Japan Dream Match) contestant registration form`)
- **主な機能**:
  1. **大会出場チーム登録 (`/register`, `POST /api/register`)**: チーム情報・選手1〜10名（Wargaming APIでIGN/UID/勝率検証）・チームロゴ（GCS保存）・変更用パスワード（Argon2idハッシュ化）を Google SpreadSheet に記録。
  2. **登録内容変更 (`/update`, `POST /api/team/verify`, `POST /api/team/update`)**: チーム略名＋パスワード認証（連続10回失敗で1時間ロック・並列排他制御付き）による選手・連絡先・ロゴ等の更新。
  3. **艦艇チェッカー (`/shipchecker`, `GET /api/shipchecker`)**: 大会レギュレーション（隻数・艦種・国家・レーダー・航空機・Tier11・BAN艦等）の編成検証ツール。外部編成ツール向けに CORS API と URL クエリ初期選択（`?ships=...&radar=...`）を公開。
  4. **運営用ハッシュ生成 (`/generatehash`)**: ブラウザ完結の Argon2id ハッシュ検証・生成ツール。
- **技術スタック**:
  - Next.js 16 (App Router) / React 19 / TypeScript 5 (`strict: true`)
  - UI: Chakra UI v3 + Tailwind CSS v3
  - フォーム: `react-hook-form` v7
  - 外部連携: `google-spreadsheet` v5, `google-auth-library`, `@google-cloud/storage`, `axios`, `hash-wasm` (Argon2id)
  - テスト: Vitest (`npm test`)

---

## 2. ディレクトリ構成と設計書ルール (`docs/design/`)

```text
wows-crf/
├── AGENTS.md                        # 全エージェント共通ハーネス（本ファイル）
├── CLAUDE.md                        # Claude Code エントリポイント（@AGENTS.md 参照）
├── .agents/skills/                  # Antigravity / Agent Skills（設計書作成・PR検証）
├── .github/
│   ├── copilot-instructions.md      # GitHub Copilot 共通インストラクション
│   ├── instructions/                # GitHub Copilot パス別インストラクション
│   ├── PULL_REQUEST_TEMPLATE.md     # PR テンプレート
│   └── workflows/pr-check.yml       # PR 自動テスト・安全性検証 CI
├── docs/
│   ├── design/                      # 【正本】機能・アーキテクチャ設計書格納ディレクトリ
│   │   ├── README.md                # 設計書の配置ルール・理想的な書き方ガイド
│   │   ├── _template.md             # 新規設計書テンプレート
│   │   └── *.md                     # 各機能の設計書
│   ├── annual-setup-guide.md        # 大会運営向け年次セットアップ手順書
│   └── shipchecker-api/             # 艦艇チェッカー外部連携公開ドキュメント
├── scripts/
│   └── security-check.mjs           # パブリックリポジトリ安全性・秘密情報検査スクリプト
├── src/
│   ├── app/                         # Next.js App Router (Pages & API Route Handlers)
│   ├── components/                  # 共通 UI コンポーネント
│   └── util/                        # 純粋ビジネスロジック・外部サービスラッパー
└── tests/                           # Vitest 単体テスト・セキュリティ回帰テスト
```

### 設計書の配置と書き方（必須ルール）
- **配置場所**: すべての設計書・実装計画書は **`docs/design/<kebab-case-feature-name>.md`** に配置します（ルート直下に別フォルダを作らないでください）。
- **執筆ガイドとテンプレート**: 新規機能の設計や API・スプレッドシート仕様の変更を行う際は、必ず **[`docs/design/README.md`](./docs/design/README.md)** の4原則（**Decision-First / Contract-Explicit / Security-By-Design / Test-Traceable**）に従い、**[`docs/design/_template.md`](./docs/design/_template.md)** をベースに作成・更新してください。
- **純粋ロジックの分離**: 新規ロジックは Route Handler (`src/app/api/**/route.ts`) に直接ベタ書きせず、`src/util/*.ts` に純粋関数として切り出し、`tests/*.test.ts` で単体テストを追加してください。

---

## 3. パブリックリポジトリ・セキュリティ絶対規約 (Security Invariants)

エージェントは以下のセキュリティ境界を **いかなる場合も緩和・迂回してはなりません**。

1. **秘密情報・個人情報のコミット厳禁**:
   - `.env*`、サービスアカウント JSON（`-----BEGIN PRIVATE KEY-----`）、実在の Google SpreadSheet ID、Wargaming API キー、非公開 Discord 招待リンク、実在プレイヤーの個人連絡先をコード・テスト・設計書・コミット履歴に絶対に含めないでください。
   - クライアントバンドル（`NEXT_PUBLIC_*`）にサーバー用環境変数（`GOOGLE_PRIVATE_KEY`, `REGISTER_SHEET_ID`, `API_SETTINGS_SHEET_ID`, `WOWS_API_APP_ID` 等）を露出させないでください。
2. **CORS 公開範囲の厳格な限定**:
   - `Access-Control-Allow-Origin: *` を許可してよいのは **`GET /api/shipchecker` および `OPTIONS /api/shipchecker` のみ** です。
   - `next.config.mjs` でのグローバル CORS 設定や、登録・認証・変更系 API（`/api/register`, `/api/team/*`, `/api/ign`, `/api/isApplication`, `/api/isTeamExist`）への CORS 付与は絶対に行わないでください。
3. **認証・パスワード・ロック機構の保護 (`src/util/Argon2Service.ts`, `src/util/TeamAuth.ts`)**:
   - パスワードのソルト生成・Argon2id ハッシュ化・検証は必ずサーバーサイドで行い、平文パスワードを保存・ログ出力しないでください（運営用ローカルツール `/generatehash` のみブラウザ内計算）。
   - ハッシュ比較には必ず `timingSafeEqual`（定数時間比較）を使用してください。
   - 連続10回失敗時の1時間ロック（`H4="Lock"`, `H5=ISO解除時刻`）およびインメモリ排他制御（`withTeamLock` / `withTeamLocks` の辞書順ロック）を維持してください。
4. **アップロード画像のマジックナンバー検証とロールバック (`src/util/ImageValidator.ts`)**:
   - クライアント申告の `Content-Type` や拡張子を信用せず、必ず `detectImageType(buf)` で先頭バイト（PNG / JPEG）を検証し、サイズ上限（`MAX_LOGO_SIZE = 20MB`）および枚数上限（1枚）を強制してください。
   - Cloud Storage アップロード後に Google SpreadSheet 書き込みが失敗した場合は、必ずアップロード済みオブジェクトを削除（ロールバック）してください。
5. **Google Sheets API クォータ保護とエラー秘匿**:
   - Google Sheets API の読み取り上限（60 req/分/サービスアカウント）を守るため、`/api/shipchecker` では `spreadSheet.loadInfo()` を1回に集約し、`ShipCheckerCache`（TTL・Singleflight・Stale-on-Error 30秒クールダウン）を必ず経由してください。
   - 未認証クライアントからのキャッシュ強制破棄パラメータ（`?refresh=1` 等）は DoS 経路となるため実装しないでください。
   - `500` エラー時にスプレッドシート ID や Google API の生スタックトレースをレスポンス JSON に含めないでください。

---

## 4. ドメイン・後方互換性の不変条件 (Domain & Compatibility Invariants)

1. **`@` プレフィックスによるシート除外規則**:
   - 応募登録用スプレッドシート（`REGISTER_SHEET_ID`）では、`@init` など **`@` を含むシート名を「非チーム用タブ」としてチーム数カウントや重複判定から除外** します。
   - そのため、チーム略名（`teamNickName`）には `@` を絶対に使用させてはなりません（`TEAM_NICKNAME_PATTERN = /^[a-zA-Z0-9_-]+$/`、2〜5文字）。
2. **応募登録シートの8列ヘッダー契約 (`src/util/SheetHeader.ts`)**:
   - `REGISTER_HEADER`: `["Type", "IGN", "ID", "WinRate", "Contact", "Comment", "LogoURL", "SaltAndHash"]`（A〜H列）。
   - `Row 2 (TeamInfo)`: `B2`=略名, `C2`=チーム名, `D2`=平均勝率, `E2`=連絡先, `F2`=コメント, `G2`=ロゴURL, `H2`=Salt(32hex)。
   - `Row 3 (player1)`: `H3`=Argon2id Hash(64hex)。
   - `Row 4 (player2)`: `H4`=認証失敗回数または `"Lock"`。
   - `Row 5 (player3)`: `H5`=ロック解除時刻（ISO 8601）。
3. **外部公開スキーマのスペル維持 (`hasRader` / `allRader`)**:
   - `src/util/ShipCheckRules.ts` および `GET /api/shipchecker` の `hasRader`（プロパティ名）と `allRader`（特殊ルール識別子）は、外部連携ツールとの後方互換性のため **意図的に `Rader` のスペルを維持** しています。「タイポ修正」として `hasRadar` 等にリネームしないでください。
4. **React Hook Form バリデーション方針**:
   - `RegisterForm` では各入力コンポーネント内の `register(rhfName, { validate, ... })` でバリデーションを定義しています。`useForm` に `yupResolver` を接続すると各コンポーネントの `validate` が無効化されるため、`yupResolver` は導入しないでください。

---

## 5. 開発・PR提出前の必須検証コマンド (Verification Commands)

コードを変更した際、および PR を作成・更新する前には、以下のコマンドをすべて実行し、エラーがゼロであることを確認してください（CI の `.github/workflows/pr-check.yml` でも同一チェックが実行されます）。

```bash
# 1. パブリックリポジトリ安全性・秘密情報・セキュリティ不変条件チェック
npm run security:check

# 2. TypeScript 型チェック
npm run typecheck

# 3. ESLint 静的解析
npm run lint

# 4. Vitest 単体テスト・セキュリティ回帰テスト
npm test

# 5. Next.js 本番ビルド検証（時間がある場合・PR提出前）
npm run build
```

すべてのチェック（1〜4）を一括で高速実行する場合は以下を実行してください：

```bash
npm run check
```
