これはWoWSの大会出場者登録フォーム用のサイトです。  

# なにこれ
JDMの大会出場者登録用フォーム＋α作ろうと思ってやったやつです。
正式名称は次の通りなんですがあまりにも長いので略してます。  
正式名称：`World of Warships (Japan Dream Match) contestant registration form.`  
略名：`wows-crf`  

JDM用に出場艦艇チェッカーとか入れてますが、その辺除けばほかの大会でも利用いただいて構いません。  
本プログラムは [MIT License](LICENSE) のもとで自由に利用できます。  

# JDM大会開催時の運用マニュアル
毎年の開催準備手順（スプレッドシートやCloud Storage、環境変数の更新手順）については、[JDM開催時 Webフォーム準備・更新手順書](docs/annual-setup-guide.md) を参照してください。

# 艦艇チェッカー 外部連携ドキュメント (CORS API / URL連携)
外部サイト・編成ツールから `/api/shipchecker` を取得する方法や `/shipchecker?ships=...&radar=...` 連携仕様については、[艦艇チェッカー 外部連携ガイド](docs/shipchecker-api/README.md) を参照してください。

# 開発・設計書・テスト (Development & Architecture)
- **設計書・執筆ガイドライン**: 各機能の設計書および新規設計書のテンプレートは [`docs/design/`](docs/design/README.md) に格納されています。
- **AI エージェントハーネス**: Antigravity / Claude Code / Codex / GitHub Copilot 向けの共通規約は [`AGENTS.md`](AGENTS.md) を参照してください。
- **PR・ローカル品質チェック**:
  ```bash
  npm run check   # セキュリティ検査 + 型チェック + ESLint + Vitest 単体テストを一括実行
  npm test        # Vitest 単体テストのみ実行
  ```

# 導入ライブラリ
※`create-next-app`で作成した際に導入されたものを除く
- [chakra-ui](https://v2.chakra-ui.com/getting-started)
- [react-hook-form](https://www.react-hook-form.com/api/)
  - ※ クライアント側の検証は React Hook Form 標準の `validate`、サーバー側の検証は `src/util/TeamValidation.ts` へ統一したため、`yup` および `@hookform/resolvers` は廃止しました。
- axios
- @google-cloud/storage
- google-auth-library
- google-spreadsheet
- googleapis
- hash-wasm

# .env.local
次の内容を記載してます。各自とってきてください。  
```.ini
API_SETTINGS_SHEET_ID=''
GCS_BUCKET_NAME='jdm-team-icon'
GOOGLE_APPLICATION_CREDENTIALS='FILEPATH/credentials.json'
GOOGLE_PRIVATE_KEY='-----BEGIN PRIVATE KEY-----\nlonglongkey\n-----END PRIVATE KEY-----\n'
GOOGLE_SERVICE_ACCOUNT_EMAIL='name@project-123456.iam.gserviceaccount.com'
REGISTER_SHEET_ID='sheetid'
WOWS_API_APP_ID="appid"
SHIP_AND_RULES_SHEET_ID=''
# 任意: /api/shipchecker のサーバー側キャッシュ有効秒数（デフォルト: 300、0 で無効化）
SHIPCHECKER_CACHE_TTL_SECONDS='300'
# 任意: 同一ホスト以外の許可オリジン（プレビューURL等を併用する場合のみカンマ区切りで指定、通常は未設定）
# ALLOWED_ORIGINS='https://example.com'
```
※ 従来の `DRIVE_FOLDER_ID`（Google Drive）は廃止され、Cloud Storage（`GCS_BUCKET_NAME`）に移行しました（本番環境では `GCS_BUCKET_NAME` の明示設定が必須です）。  
※ 本番環境の GCP Cloud Run では、インメモリ排他ロック・キャッシュ・レート制限の整合性を保つため、**インスタンスの最大数（`--max-instances`）を `1`** に設定してください。

# Google Cloud Storage (チームロゴ保存先) の設定
1. GCP コンソールで Cloud Storage バケット（例: `jdm-team-icon`）を作成
   - ロケーション: Cloud Run と同一リージョン（例: `us-central1`）推奨
   - アクセス制御: 「均一（Uniform）」を推奨
   - 公開アクセスの防止 (Public Access Prevention): 「適用しない（オフ）」に設定
2. バケットの「権限」タブで以下のIAM権限を設定:
   - **サービスアカウント (`GOOGLE_SERVICE_ACCOUNT_EMAIL`)**:
     - ロール: `ストレージ オブジェクト管理者` (`roles/storage.objectAdmin`) を付与（アップロードおよび失敗時のロールバック削除用）
   - **一般ユーザー向け読み取り専用（リンクを知っていれば誰でもDL可能）**:
     - プリンシパル: `allUsers`
     - ロール: `ストレージ 以前のオブジェクト読み取り` (`roles/storage.legacyObjectReader`) を付与（バケット一覧の閲覧 `list` は不許可とし、ファイル直URLのみ閲覧・DLを許可）
3. バケット名を `.env.local` の `GCS_BUCKET_NAME`（および Cloud Run の環境変数）に設定

# Google SpreadSheetの設定
## 応募登録の記録シート(名前任意)
1. Google SpreadSheetを作成
2. 作成したSpreadSheetを`GOOGLE_SERVICE_ACCOUNT_EMAIL`のアドレスに共有設定する
3. シートの名前を`@init`とする
> NOTE:  
> `@init`にしないと、シート数で名前を判断しているため除外されません。  
> `@`が含まれる名前はすべて除外されます。出場チームに@を使った名前は登録できません。
4. SpreadSheetのIDを取得し、`.env.local`の`REGISTER_SHEET_ID`に設定する(もしくはSecretManagerを用いてください)

## API設定シート(名前任意)
1. Google SpreadSheetを作成
2. 作成したSpreadSheetを`GOOGLE_SERVICE_ACCOUNT_EMAIL`のアドレスに共有設定する
3. シート`registerPeriod`、`maxTeamAmount`、`logo_directory`の3つを作成する

### registerPeriodシートの設定
| startDate | endDate | Ignore(debug) |
|-----------|---------|---------------|
| 2025-11-14T00:00:00+09:00 | 2025-12-04T23:59:59+09:00 | YES           |

### maxTeamAmountシートの設定
| teamAmount |
|------------|
| 12         |

### logo_directoryシートの設定
| FolderName |
|------------|
| JDM9       |
※Cloud Storageバケット内で画像を格納するフォルダ名です。画像ファイルは `{FolderName}/{チーム略名}.png`（または `.jpg`）として保存されます。

# Google Documentの設定(Discord Link)
1. Google Documentを作成
2. 作成したDocumentの共有設定を公開設定にする(どうせリンク公開するので)
3. `src/app/components/DiscordLink.tsx`の`docURL`にDocumentのURLを設定する

# SpreadSheetのIDの取得方法
Google SpreadSheetのURLに含まれる文字列がIDです。  
URL例：`https://docs.google.com/spreadsheets/d/abcdefghijklmn123456789/edit?gid`  
この場合のID：`abcdefghijklmn123456789`