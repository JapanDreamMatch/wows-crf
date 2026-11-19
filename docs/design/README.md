# 設計書ガイドライン（Design Document Guide）

本ディレクトリ（`docs/design/`）は、`wows-crf`（World of Warships Japan Dream Match 出場者登録フォーム & 艦艇チェッカー）の機能設計書・アーキテクチャ設計書を格納する **単一の正本（Single Source of Truth）** です。

人間（開発者・大会運営）と AI コーディングエージェント（Antigravity / Claude Code / Codex / GitHub Copilot）の双方が迷わず参照・執筆できるよう、設計書の配置ルールと理想的な書き方を以下に定めます。

---

## 1. 設計書の配置ルール（Where to Put Design Docs）

### 1.1 保存先ディレクトリと命名規則
- **保存先**: `docs/design/`
- **ファイル名**: `<kebab-case-feature-name>.md`（半角英小文字とハイフン区切りで機能の責務が直感的に分かる名前）
  - 例: `docs/design/shipchecker-external-integration.md`
  - 例: `docs/design/team-member-update-and-argon2-auth.md`
- **テンプレート**: 新規作成時は [`docs/design/_template.md`](./_template.md) をコピーして執筆を開始してください。
- **一覧への登録**: 新規設計書を追加した際は、本ファイル末尾の「[5. 設計書インデックス](#5-設計書インデックス)」に1行追記してください。

### 1.2 ドキュメント種別との棲み分け (`docs/` 配下の構造)
| パス | 役割・対象読者 |
|---|---|
| **`docs/design/`** | **【本ディレクトリ】機能・アーキテクチャ設計書**（Why / What / How、要件・API/シート契約・セキュリティ・テスト計画） |
| `docs/annual-setup-guide.md` | 大会運営向け年次セットアップ・運用手順書（Google Sheets / GCS / 環境変数設定） |
| `docs/shipchecker-api/` | 外部ツール開発者向け公開リファレンス（CORS API・URL クエリ連携仕様） |
| `docs/dev-memo/` | 開発時の非公式スクラッチメモ |

### 1.3 設計書の作成が必須となる変更（When to Write）
以下のいずれかに該当する変更を行う場合は、**実装に着手する前（または PR 提出と同時）に `docs/design/` へ設計書を作成・更新**してください。

1. **API エンドポイント（`src/app/api/**`）の新設・仕様変更**（リクエスト/レスポンス形式、ステータスコード、CORS、キャッシュ挙動）
2. **Google SpreadSheet のシート構造・セル座標の変更**（`REGISTER_HEADER` の列定義、`@init` 除外規則、`H2〜H5` 認証セル、`API_SETTINGS_SHEET_ID` や `SHIP_AND_RULES_SHEET_ID` のタブ・列仕様）
3. **Google Cloud Storage のオブジェクト命名規則・IAM 前提・ロールバック処理の変更**
4. **認証・認可・レート制限・排他ロック・バリデーション境界の変更**（Argon2id、10回失敗ロック、画像マジックナンバー検証等）
5. **外部連携契約（URL クエリパラメータ `?ships=...&radar=...` 等）の追加・変更**

> [!TIP]
> 軽微な UI 文言修正、タイポ修正、依存パッケージのパッチ更新、リファクタリング（外部契約やシート構造が変わらないもの）では新規設計書の作成は不要です。

---

## 2. 理想的な設計書の書き方（4つの設計原則）

パブリックリポジトリかつ AI エージェント協調開発において、理想的な設計書は以下の4原則を満たします。

### 原則① Decision-First（結論とトレードオフの明示）
- 単なるコードの写経ではなく、**「なぜこの設計を選んだのか（背景・制約）」「なぜ他の案を採らなかったのか（却下した代替案）」** を冒頭（セクション1）に明記します。
- 特に本システムは **Google SpreadSheet をデータベースとして使用している** ため、Google Sheets API の読み取り/書き込みクォータ（60 req/分/ユーザー）やレイテンシへの影響を必ず定量的に記載します。

### 原則② Contract-Explicit（インターフェースとシート座標の厳密な契約）
- 曖昧な自然言語（「シートに保存する」「エラーを返す」等）を避け、**表（Markdown Table）と TypeScript 型定義**で契約を記述します。
- スプレッドシートを操作する場合は、**シート名・行番号・列アルファベット（例: `G2 = LogoURL`, `H2 = Salt`, `H3 = Hash`, `H4 = 失敗回数 / Lock`, `H5 = ロック解除時刻`）** を明記します。
- 既存の外部互換性（例: `hasRader` / `allRader` のスペル維持、`@` を含むシート名のチーム数カウント除外）を壊さないことを明示します。

### 原則③ Security-By-Design & Pure Logic Separation（安全設計と純粋ロジック分離）
- **純粋関数（`src/util/*.ts`）と外部 I/O（`src/app/api/**/route.ts`, Google Sheets, GCS, Wargaming API）を分離**する設計にします。これにより、外部 API を叩かずにミリ秒単位で実行できる単体テスト（PR 自動テスト）が可能になります。
- **パブリックリポジトリとしての安全性チェックリスト**（CORS 範囲、秘密情報の非露出、500エラー時の内部情報秘匿、マジックナンバー検証、排他制御、キャッシュバイパス防止）を必ず含めます。

### 原則④ Test-Traceable（PR テストへ直結する検証シナリオ）
- 設計書の末尾に `T-1`, `T-2`... の識別子付きで **テスト・検証シナリオ表** を記載します。
- 正常系だけでなく、境界値・異常系・セキュリティ退行（例: 拡張子偽装ファイル、並列リクエストによるロックすり抜け、Google Sheets 429 障害時の Stale フォールバック、ロールバック削除）を網羅し、`tests/` 配下の自動テストからトレーサビリティを持たせます。

---

## 3. 標準構成（7セクション）

[`docs/design/_template.md`](./_template.md) は以下の7セクションで構成されています。

1. **メタデータ & 1. 概要 (Overview)**: ステータス（`Draft` / `Accepted` / `Implemented` / `Superseded`）、背景、現行課題、全体方針・代替案比較
2. **2. 要件定義・インターフェース契約 (Requirements & Contracts)**: 機能要件表、API 入出力型、スプレッドシートセル配置 / GCS パス仕様、後方互換性
3. **3. アーキテクチャ・処理フロー (Architecture & Flow)**: Mermaid `sequenceDiagram` または `flowchart`（正常系＋エラー/ロールバック分岐）
4. **4. 詳細設計・モジュール分割 (Detailed Design)**: `src/util/`（純粋ロジック）と `src/app/`（API / UI）の責務分割、主要シグネチャ
5. **5. インフラ・セキュリティ・クォータ考慮事項 (Security & Quota)**: Google Sheets API クォータ試算、セキュリティチェックリスト、運用注意点
6. **6. 環境変数・関連ドキュメント更新計画 (Environment & Docs)**: `.env.local` 例、`README.md`、`docs/annual-setup-guide.md` への反映箇所
7. **7. テスト・検証シナリオ (Test & Verification Plan)**: 自動テスト（Unit）および手動/ビルド検証のケース一覧

---

## 4. 執筆時のフォーマット規約

- **図表**: シーケンス図やフローチャートには **Mermaid**（`sequenceDiagram`, `flowchart TD`）を使用してください（外部画像ファイルは差分レビューや AI 読み取りが困難なため非推奨）。
- **強調アラート**: GitHub Flavored Markdown のアラート（`> [!NOTE]`, `> [!IMPORTANT]`, `> [!WARNING]`, `> [!CAUTION]`）を活用し、破壊的変更やセキュリティ境界を目立たせてください。
- **秘密情報の記載禁止**: 設計書内のサンプルには**実在するスプレッドシート ID、API キー、サービスアカウント名、非公開 Discord URL、個人のプレイヤー情報を一切記載せず**、ダミー値（`abcdefghijklmn123456789` 等）を使用してください。

---

## 5. 設計書インデックス

| 設計書ファイル | ステータス | 概要 | 主な関連モジュール |
|---|---|---|---|
| [`team-icon-cloud-storage-upload.md`](./team-icon-cloud-storage-upload.md) | `Implemented` | Google Drive 廃止に伴う Google Cloud Storage (`jdm-team-icon`) へのチームロゴ直接アップロード・マジックナンバー検証・失敗時ロールバック設計 | `src/util/ImageValidator.ts`, `src/util/StorageService.ts`, `src/app/api/register/route.ts` |
| [`team-member-update-and-argon2-auth.md`](./team-member-update-and-argon2-auth.md) | `Implemented` | 出場者変更機能 (`/update`)、サーバーサイド Argon2id 認証、10回連続失敗ロック (`H4`/`H5`)、インメモリ排他制御 (`withTeamLocks`)、`/generatehash` 設計 | `src/util/Argon2Service.ts`, `src/util/TeamAuth.ts`, `src/util/TeamValidation.ts`, `src/app/api/team/**` |
| [`shipchecker-external-integration.md`](./shipchecker-external-integration.md) | `Implemented` | `/api/shipchecker` の CORS 限定公開、`doc.loadInfo()` 1回化、インメモリキャッシュ（TTL・Singleflight・Stale-on-Error）、`/shipchecker?ships=...&radar=...` URL クエリ初期選択設計 | `src/util/ShipCheckerCache.ts`, `src/util/ShipCheckerQuery.ts`, `src/util/ShipCheckRules.ts`, `src/app/api/shipchecker/route.ts` |
