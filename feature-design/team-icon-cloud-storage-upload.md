# チームロゴ Cloud Storage アップロード機能 実装計画・設計書

## 1. 概要 (Overview)

### 1.1 背景
現在、応募フォームにおけるチームロゴ（画像）のアップロード機能は、Googleのセキュリティ仕様変更に伴う個人Google Driveへのアップロード制限・権限エラーにより停止されており、Discord上での個別提出を案内している状態となっています。

### 1.2 目的
Google Driveへの依存を廃止し、専用の Google Cloud Storage (GCS) バケット（`jdm-team-icon`）へ直接アップロードする方式へと刷新します。
これにより、ユーザーが応募フォームから直接チームロゴをアップロードできるようにし、アップロードされた画像の公開ダウンロードURLを応募登録スプレッドシートの指定セル（F3セル: player1のComment列）へ自動記録する仕組みを構築します。

---

## 2. 要件定義 (Requirements)

### 2.1 アップロード仕様
| 項目 | 要件仕様 | 備考 |
|---|---|---|
| **対象ファイル** | チームロゴ（画像） | 任意提出（従来仕様を維持、未添付でも登録可能） |
| **許可フォーマット** | `jpeg`, `jpg`, `png` | MIMEタイプ: `image/jpeg`, `image/png`。サーバー側ではマジックナンバーでも検証 |
| **ファイルサイズ** | **20MB 以内** | クライアント側（Yup）およびサーバー側で厳格に検証 |
| **枚数制限** | **1枚のみ** | UIは複数選択不可（`multiple`なし）。サーバー側でも2件以上は拒否 |

### 2.2 ストレージ仕様 (Cloud Storage)
| 項目 | 要件仕様 |
|---|---|
| **ストレージ種別** | Google Cloud Storage (GCS) |
| **バケット名** | `jdm-team-icon`（環境変数 `GCS_BUCKET_NAME` で指定可能とする） |
| **アクセス権限** | **読み取り専用（公開）**：リンクを知っていれば誰でもダウンロード・閲覧可能。ただしバケット内の一覧取得は不可 |
| **オブジェクト名** | `{FolderName}/{チーム略名}.{png\|jpg}`（`FolderName`はスプレッドシートの`logo_directory`より取得、デフォルト: `logos`） |
| **URL形式** | `https://storage.googleapis.com/{bucketName}/{objectName}` |

### 2.3 スプレッドシート連携仕様
- 登録先: 応募登録用スプレッドシート（`REGISTER_SHEET_ID`）の新規作成シート（チーム略名タブ）
- ヘッダー（`REGISTER_HEADER`、`src/util/SheetHeader.ts` で確認済み）: `Type, IGN, ID, WinRate, Contact, Comment`（A〜F列）
- 記載箇所: **F3 セル**（`player1` の行、`Comment` 列）
  - 行1: ヘッダー
  - 行2: `TeamInfo` (A2〜F2: チーム情報・代表者連絡先・ひとことコメント)
  - 行3: `player1` (A3: `player1`, B3: 代表者IGN, C3: アカウントID, D3: 勝率, E3: 空欄, **F3: 画像URL**)
- 画像未添付時: F3セルは空欄のまま記録

---

## 3. システムアーキテクチャ・処理フロー

### 3.1 全体シーケンス図

```mermaid
sequenceDiagram
    autonumber
    actor User as 応募者
    participant Form as フロントエンド<br/>(RegisterForm)
    participant API as バックエンドAPI<br/>(/api/register)
    participant GCS as Cloud Storage<br/>(jdm-team-icon)
    participant Sheets as Google SpreadSheet<br/>(REGISTER_SHEET_ID)

    User->>Form: フォーム入力 & チームロゴ添付
    Form->>Form: クライアントバリデーション<br/>(形式: jpeg/jpg/png, サイズ<=20MB, 1枚)
    Form->>API: POST /api/register (multipart/form-data)

    API->>API: Content-Length 早期チェック (413)
    API->>API: 画像検証 (件数/サイズ/MIME/マジックナンバー)
    API->>API: 期間/チーム上限/略名/重複チェック<br/>(すべてのバリデーションを完了)

    alt 画像添付あり
        API->>GCS: 画像オブジェクト保存 (検証済みMIMEで保存)
        GCS-->>API: 成功 (公開URL組み立て)
    else 画像添付なし
        API->>API: 画像URL = ""
    end

    API->>Sheets: チーム略名シート作成 + 行データ追加 (F3に画像URL)
    alt シート書き込み失敗
        API->>GCS: アップロード済み画像を削除 (ベストエフォート)
        API-->>Form: 500 エラー
    else 成功
        API-->>Form: 200 OK
        Form-->>User: 登録完了画面 (/register/success)
    end
```

---

## 4. 詳細設計 (Detailed Design)

### 4.1 ライブラリ選定
GCSとの連携には、Google Cloud公式の **`@google-cloud/storage`** パッケージを採用します。

- 既存の `googleapis` でもStorage APIは呼べますが、アップロード・削除・型定義の面で `@google-cloud/storage` のほうが簡潔です。
- 認証情報は既存の `GOOGLE_SERVICE_ACCOUNT_EMAIL` と `GOOGLE_PRIVATE_KEY` を流用します（Cloud Run上ではADCにフォールバック）。
- **確認事項**: `Dockerfile` / Next.js のビルド（standalone出力の有無）で依存が正しく含まれることを動作検証で確認します。

```bash
npm install @google-cloud/storage
```

---

### 4.2 画像検証ユーティリティ (`src/util/ImageValidator.ts`)

クライアント申告の `File.type` は信頼せず、先頭バイトで形式を判定します。判定結果から保存時の拡張子・`contentType` を決定します。

```typescript
export const MAX_LOGO_SIZE = 20 * 1024 * 1024; // 20MB

export type DetectedImage = { mime: "image/png" | "image/jpeg"; ext: "png" | "jpg" };

export function detectImageType(buf: Buffer): DetectedImage | null {
    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (buf.length >= 8 &&
        buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
        return { mime: "image/png", ext: "png" };
    }
    // JPEG: FF D8 FF
    if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
        return { mime: "image/jpeg", ext: "jpg" };
    }
    return null;
}
```

---

### 4.3 GCSアップロードサービス設計 (`src/util/StorageService.ts`)

```typescript
import { Storage } from '@google-cloud/storage';
import { randomUUID } from 'node:crypto';
import type { DetectedImage } from '@/util/ImageValidator';

export class CloudStorageService {
    private storage: Storage;
    private bucketName: string;

    constructor() {
        this.bucketName = process.env.GCS_BUCKET_NAME || 'jdm-team-icon';

        const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
        const privateKey = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

        if (email && privateKey) {
            this.storage = new Storage({
                credentials: { client_email: email, private_key: privateKey },
            });
        } else {
            // Cloud Run環境等でのADCフォールバック
            this.storage = new Storage();
        }
    }

    /**
     * 検証済みのチームロゴをアップロードする
     * @param buffer 画像データ（検証済み）
     * @param image  マジックナンバーで判定した形式
     * @param teamNickName チーム略名（カスタムメタデータとして保存。オブジェクト名には使わない）
     * @returns objectName と 公開URL
     */
    async uploadTeamLogo(buffer: Buffer, image: DetectedImage, teamNickName: string)
        : Promise<{ objectName: string; url: string }> {
        const objectName = `logos/${Date.now()}-${randomUUID()}.${image.ext}`;
        await this.storage.bucket(this.bucketName).file(objectName).save(buffer, {
            contentType: image.mime,          // 申告値ではなく判定結果
            resumable: false,
            metadata: {
                cacheControl: 'public, max-age=31536000',
                contentDisposition: 'inline',
                metadata: { teamNickName },   // 追跡用（URLには含まれない）
            },
        });
        return {
            objectName,
            url: `https://storage.googleapis.com/${this.bucketName}/${objectName}`,
        };
    }

    /** 書き込み失敗時のロールバック用（失敗しても握りつぶす） */
    async deleteObject(objectName: string): Promise<void> {
        try {
            await this.storage.bucket(this.bucketName).file(objectName).delete({ ignoreNotFound: true });
        } catch (e) {
            console.error("failed to delete orphan logo:", objectName, e);
        }
    }
}
```

---

### 4.4 バックエンドAPI設計 (`src/app/api/register/route.ts`)

#### 主な変更点
1. **処理順序**: 「全バリデーション完了 → GCSアップロード → スプレッドシート書き込み」とする。
   - 画像の形式・サイズ検証は、WoWS API 呼び出し（`Player.getInstance()`）より**前**に行い、不正リクエストを早期に弾く。
   - GCSアップロードは、期間・上限・略名・重複チェックがすべて通過した**直後**（`addSheet` の直前）に実施する。
   - シート書き込み（`addSheet` / `addRows`）が失敗した場合は、アップロード済み画像を削除してからエラーを返す。
2. **早期サイズチェック**: `req.formData()` は全体をメモリへ展開するため、先頭で `Content-Length` が `MAX_LOGO_SIZE + 1MB` 超なら 413 を返す。
3. **サーバーサイドバリデーション**:
   - `formData.getAll("teamLogo")` のうち `size > 0` の `File` が2件以上 → 400
   - サイズが20MB超 → 400
   - 先頭バイトが PNG/JPEG でない → 400（MIME申告・拡張子は判定に使わない）
4. **F3セルへのURL格納**: `player1`（`i === 0`）の `Comment` に URL を設定。
5. **Drive関連コードの削除**: `DRIVE_FOLDER_ID`、`node:stream` の `Readable`、`GoogleAuth` / `googleapis` の `require` と Drive アップロード処理をすべて削除。

#### 実装イメージ
```typescript
// (1) 早期サイズチェック（formData() の前）
const contentLength = Number(req.headers.get("content-length") ?? 0);
if (contentLength > MAX_LOGO_SIZE + 1024 * 1024) {
    return NextResponse.json({ message: "画像サイズは20MB以内である必要があります" }, { status: 413 });
}
const formData = await req.formData();

// (2) 画像検証（Player API 呼び出しの前）
const logos = formData.getAll("teamLogo")
    .filter((v): v is File => typeof v === "object" && v.size > 0);
if (logos.length > 1) {
    return NextResponse.json({ message: "チームロゴは1枚のみ添付できます" }, { status: 400 });
}
let logoBuffer: Buffer | null = null;
let logoType: DetectedImage | null = null;
if (logos.length === 1) {
    if (logos[0].size > MAX_LOGO_SIZE) {
        return NextResponse.json({ message: "画像サイズは20MB以内である必要があります" }, { status: 400 });
    }
    logoBuffer = Buffer.from(await logos[0].arrayBuffer());
    logoType = detectImageType(logoBuffer);
    if (!logoType) {
        return NextResponse.json({ message: "画像ファイルはjpeg, jpg, png形式のみ受け付けています" }, { status: 400 });
    }
}

// ... 既存: 期間/上限/略名/重複チェックをすべて通過 ...

// (3) アップロード → シート書き込み（失敗時はロールバック）
const storage = new CloudStorageService();
let uploaded: { objectName: string; url: string } | null = null;
try {
    if (logoBuffer && logoType) {
        uploaded = await storage.uploadTeamLogo(logoBuffer, logoType, teamNickName);
    }
    const sheetRows = buildSheetRows(/* ..., */ uploaded?.url ?? "");
    await spreadSheet.addSheet(teamNickName, REGISTER_HEADER);
    await spreadSheet.addRows(teamNickName, sheetRows);
} catch (e) {
    if (uploaded) await storage.deleteObject(uploaded.objectName);
    throw e; // 外側の catch が 500 を返す
}
```

```typescript
// sheetRows: player1 (i === 0) の Comment に URL を設定
for (let i = 0; i < players.length; i++) {
    sheetRows.push({
        Type: `player${i + 1}`,
        IGN: players[i].getIgn(),
        ID: players[i].getUid() ?? "undefined",
        WinRate: players[i].getWinRate() ?? "undefined",
        Comment: i === 0 ? teamLogoUrl : "",   // F3
    });
}
```

> [!NOTE]
> 現行コードでは `sheetRows` 生成が重複チェックより前にあります。URL確定後に組み立てるため、`sheetRows` の生成はアップロード後（または URL を後から `sheetRows[1].Comment` へ代入）へ移動します。

#### リクエストサイズ・メモリ
- Cloud Run のHTTP/1リクエスト上限は32MB。20MB + multipartオーバーヘッドは収まる。
- `formData()` と `arrayBuffer()` で最大 約40MB 相当のメモリを同時に使うため、Cloud Run のメモリ割り当て（目安: 512MiB以上）と同時実行数を確認する。

---

### 4.5 フロントエンドUI・バリデーション設計

#### ① バリデーション方針（既存コンポーネント設計に統一）

**現状の確認結果**:
- `RegisterForm.tsx` の `useForm<registerType>({ mode: "onBlur" })` には `yupResolver` が接続されておらず、`registerSchema` は `registerType` の型推論にしか使われていない。
- 他の入力コンポーネント（`TeamNickNameInput.tsx`、`PlayerInput.tsx` など）は、各コンポーネント内の `register(rhfName, { required, validate, ... })` でバリデーションを定義している。
- `useForm` に `yupResolver(registerSchema)` を追加すると、React Hook Form の仕様により各コンポーネントの `register(...)` 内のバリデーションが無効化されるため、**`yupResolver` は導入しない**。

**方針**:
- ファイルのバリデーションは `TeamLogoInput.tsx` の `register(rhfName, { validate: { fileCount, fileSize, fileType } })` で実装する。
- `useRegisterForm.tsx` の `registerSchema` は **型推論用**として更新する（`teamLogo` を `FileList | File` 対応にする。検証ロジックは持たせない）。

```typescript
// useRegisterForm.tsx（型推論用。検証は TeamLogoInput 側）
teamLogo: yup.mixed<FileList | File>().nullable().notRequired(),
```

- 現行の `value && value.size <= 2MB` は不要になるため削除する（未添付時に `false` となるバグの解消にもなる）。
- 既存の `onSubmit` は `FileList` → `[0]` を取り出しており、変更不要。
- axios の `headers: {"Content-Type": "multipart/form-data"}` は boundary 自動付与のため削除を推奨。
- 送信ボタンは `isSubmitting` で既に無効化済みのため、二重送信は防止される。

#### ② `RegisterForm.tsx`
- 既存の「Googleセキュリティ仕様の変更により現在利用できません。… `<JdmDiscordLink/>` 上での提出…」の案内文（73行付近）を削除する。
- コメントアウトされている `TeamLogoInput`（76〜78行付近）を復活させる。
- `JdmDiscordLink` の import が他で未使用になる場合は削除する。
- `useForm` の設定（`mode: "onBlur"`、resolverなし）は変更しない。

```tsx
<TeamLogoInput
    rhfName={"teamLogo"}
    errorMsg={errors.teamLogo && errors.teamLogo.message}
/>
```

#### ③ `TeamLogoInput.tsx`
**現行の不具合**: 18行目で `const { ref, onChange: rhfOnChange, ...rest } = register(rhfName);` と分割代入しているが、`rhfOnChange` が `<Input>` に渡されておらず、ファイル選択が React Hook Form に伝わらない。`onChange` を必ず渡す。

```tsx
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const SUPPORTED_FORMATS = ["image/jpeg", "image/png"];

const { ref, onChange: rhfOnChange, ...rest } = register(rhfName, {
    validate: {
        fileCount: (v: FileList | File | null | undefined) =>
            !(v instanceof FileList) || v.length <= 1 || "チームロゴは1枚のみ添付できます",
        fileSize: (v: FileList | File | null | undefined) => {
            const f = v instanceof FileList ? v[0] : v;
            return !f || f.size === 0 || f.size <= MAX_FILE_SIZE || "ファイルサイズは20MB以内である必要があります";
        },
        fileType: (v: FileList | File | null | undefined) => {
            const f = v instanceof FileList ? v[0] : v;
            return !f || f.size === 0 || SUPPORTED_FORMATS.includes(f.type) || "対応フォーマットはjpeg, jpg, pngのみです";
        },
    },
});

<Input
    type="file"
    ref={(e) => { ref(e); fileInput.current = e; }}
    onChange={rhfOnChange}   // ← 欠落していた onChange を渡す
    accept="image/png, image/jpeg, .png, .jpg, .jpeg"
    {...rest}
/>
```

- `accept` を `image/*` から絞り込む（補助。検証は上記 `validate` とサーバー側が担う）。
- 補助テキスト「※jpeg, jpg, png形式、20MB以内、1枚のみ」を `FormHelperText` で追加。
- `multiple` は指定しない。

---
## 5. GCPインフラ・セキュリティ設定

### 5.1 GCSバケットの作成設定
- **バケット名**: `jdm-team-icon`
- **ロケーション**: **（要確認）** Cloud Run のデプロイ先は `us-central1`（`cloudbuild.yaml` の `_DEPLOY_REGION`）。作成済みの `jdm-team-icon` の実リージョンを GCP コンソールで確認し、ここへ記載する（`us-central1` が望ましい）。
- **ストレージクラス**: Standard
- **アクセス制御**: **均一（Uniform）**
- **公開アクセスの防止 (Public Access Prevention)**: **「適用しない」**（公開のため必須）
- **ライフサイクルルール（推奨）**: 大会終了後に不要となる時期（例: 作成から365日後）で自動削除するルールを設定。

### 5.2 権限 (IAM) の付与

#### ① サービスアカウント（アップロード・ロールバック削除用）
- **対象**: `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- **ロール**: `ストレージ オブジェクト管理者` (`roles/storage.objectAdmin`)
  - 理由: シート書き込み失敗時のロールバック削除（`storage.objects.delete`）が必要なため。`objectCreator` では削除できない。
  - バケット単位で付与し、プロジェクト全体には付与しない。

#### ② 全体公開権限（誰でもDL用）
- **対象リソース**: バケット `jdm-team-icon`
- **プリンシパル**: `allUsers`
- **ロール**: `ストレージ 以前のオブジェクト読み取り` (`roles/storage.legacyObjectReader`)
  - `objectViewer` は `storage.objects.list` を含み、誰でもバケット内の全ロゴを列挙できてしまう。
  - `legacyObjectReader` はオブジェクト取得のみ許可するため、「リンクを知っていれば誰でもDL可能（URLを知らなければ見つけられない）」という要件に忠実。
  - オブジェクト名にUUIDを含めることで、URLの推測も困難にしている。

> [!IMPORTANT]
> 設定後、未ログイン状態（シークレットウィンドウ等）でオブジェクトURLにアクセスでき、`https://storage.googleapis.com/jdm-team-icon/` へのアクセス（一覧）は拒否されることを確認する。

> [!NOTE]
> 組織ポリシーで `allUsers` への付与が禁止されている場合（ドメイン制限共有など）は、ポリシーの例外設定が必要。

---

## 6. 環境変数・ドキュメント更新計画

### 6.1 環境変数の変更
| 環境変数名 | 変更内容 | 設定値例 | 備考 |
|---|---|---|---|
| `GCS_BUCKET_NAME` | **新規追加** | `jdm-team-icon` | チームロゴ保存先バケット名（未設定時は `jdm-team-icon`） |
| `DRIVE_FOLDER_ID` | **廃止** | - | `route.ts` の参照も削除。Cloud Run / `cloudbuild.yaml` の設定にあれば除去 |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | 既存維持 | - | GCSへの書き込み・削除権限が必要 |
| `GOOGLE_PRIVATE_KEY` | 既存維持 | - | サービスアカウント秘密鍵 |

### 6.2 `README.md` およびマニュアルの追記内容
`README.md` の `.env.local` 項目に `GCS_BUCKET_NAME` を追記し、GCSバケット設定手順を追加します。

```ini
# .env.local
API_SETTINGS_SHEET_ID='...'
GCS_BUCKET_NAME='jdm-team-icon'
GOOGLE_APPLICATION_CREDENTIALS='FILEPATH/credentials.json'
GOOGLE_PRIVATE_KEY='-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n'
GOOGLE_SERVICE_ACCOUNT_EMAIL='name@project-123456.iam.gserviceaccount.com'
REGISTER_SHEET_ID='...'
WOWS_API_APP_ID="..."
```

また、`docs/annual-setup-guide.md` の「1-4. チームロゴ保存用」を「Google Drive」から「Cloud Storage」の手順（バケット作成・IAM・ライフサイクル）に更新します。

---

## 7. 実装計画・タスク一覧 (Task List)

```mermaid
flowchart TD
    T0[タスク0: GCPバケット作成・IAM設定] --> T1[タスク1: 依存追加<br/>@google-cloud/storage]
    T1 --> T2[タスク2: ImageValidator / StorageService 実装]
    T2 --> T3[タスク3: route.ts 改修]
    T3 --> T4[タスク4: フロントエンド改修]
    T4 --> T5[タスク5: ドキュメント更新]
    T5 --> T6[タスク6: 動作検証]
```

### ステップ別作業内容

0. **GCPバケット準備**: 5章のとおり設定（リージョン確認、`legacyObjectReader` 公開、SAへ `objectAdmin`）。
1. **パッケージ導入**: `@google-cloud/storage` をインストール。
2. **ユーティリティ作成**: `src/util/ImageValidator.ts`、`src/util/StorageService.ts` を作成。
3. **バックエンドAPI改修** (`src/app/api/register/route.ts`):
   - Content-Length 早期チェック、画像検証（件数・サイズ・マジックナンバー）。
   - 全バリデーション通過後に GCS アップロード → シート書き込み。失敗時は画像削除。
   - `player1` の `Comment`（F3）にURLを設定。
   - Drive関連コード（`DRIVE_FOLDER_ID`、`Readable`、`GoogleAuth`、`googleapis`）を削除。
4. **フロントエンド改修**:
   - `TeamLogoInput.tsx`: `onChange` を渡し、`register` の `validate` で件数・20MB・MIME を検証（`yupResolver` は導入しない）。
   - `useRegisterForm.tsx`: `registerSchema` を型推論用（`FileList | File`）に更新。axios の Content-Type 手動指定を削除。
   - `RegisterForm.tsx`: Discord提出案内を削除し、`TeamLogoInput` を有効化。不要になった import を整理。
   - `TeamLogoInput.tsx`: `accept` の絞り込みと補助テキスト追加。
5. **ドキュメント更新**: `README.md`、`docs/annual-setup-guide.md`、`.env.local` 例、`cloudbuild.yaml` / Cloud Run の環境変数。
6. **動作検証**:
   - `npm run dev` / `npm run build` が通ること（`@google-cloud/storage` のバンドル確認）。
   - 20MB以内のJPG/PNGのアップロード成功。
   - 20MB超、GIF/WebP/SVG、拡張子偽装（`.png` だが中身がHTML等）、複数ファイルで拒否されること。
   - **画像未添付でも登録できること**（現行Yupバグの解消確認）。
   - F3に公開URLが書き込まれ、未ログイン状態でDL・表示できること。バケット一覧は取得不可であること。
   - 重複略名・上限超過・期間外のとき、GCSに画像が残らないこと。
   - シート書き込みを意図的に失敗させたとき、アップロード済み画像が削除されること。
   - 日本語のチーム略名でも URL が正常であること。

---

## 8. 確認事項・検討事項 (Open Questions)

1. **チームロゴの必須/任意**: 従来仕様に合わせて「任意」。必須化する場合は Yup とサーバー側に未添付エラーを追加。
2. **GCSバケットのリージョン**: Cloud Run は `us-central1`。作成済みバケットの実リージョンを確認して 5.1 へ記載する。
3. **EXIF等のメタデータ除去**: 本設計では行わない（位置情報付きのスマホ写真がそのまま公開される）。必要なら `sharp` による再エンコードを検討（依存増・メモリ増とのトレードオフ）。
4. **組織ポリシー**: `allUsers` への公開が禁止されている場合は、バケット単位でポリシー例外が必要。
5. **画像の差し替え・削除**: 本機能では提供しない。誤送信は運営が GCS 上で削除し、シートのURLを手動更新する運用とする。