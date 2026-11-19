# 艦艇チェッカー API リファレンス (`GET /api/shipchecker`)

## エンドポイント概要

| 項目 | 内容 |
|---|---|
| **本番 URL** | `https://form.japandreammatch.info/api/shipchecker` |
| **許可メソッド** | `GET`, `OPTIONS` |
| **認証** | 不要（公開読み取り専用） |
| **レスポンス形式** | `application/json` |

---

## CORS 仕様

ブラウザ上の別オリジン（任意の外部ドメイン・`localhost` 等）から直接リクエストできます。

| レスポンスヘッダー | 値 | 説明 |
|---|---|---|
| `Access-Control-Allow-Origin` | `*` | すべてのオリジンからの読み取りを許可 |
| `Access-Control-Allow-Methods` | `GET, OPTIONS` | 許可 HTTP メソッド |
| `Access-Control-Allow-Headers` | `Content-Type` | プリフライト時の許可ヘッダー |
| `Access-Control-Expose-Headers` | `X-Cache` | ブラウザ JS から `response.headers.get("X-Cache")` を参照可能 |
| `Access-Control-Max-Age` | `86400` | `OPTIONS` プリフライトのブラウザキャッシュ時間（24時間） |

> [!NOTE]
> - `Access-Control-Allow-Credentials` は返却しません。外部サイト側で `fetch(..., { credentials: "include" })` を指定すると CORS エラーになるため、`credentials` はデフォルト（`same-origin`）または `"omit"` のままご利用ください。
> - `200`（正常・stale 含む）、`204`（`OPTIONS`）、`500`（サーバーエラー）のすべてに CORS ヘッダーを付与しています。

---

## キャッシュ仕様

Google SpreadSheet への過剰なアクセスを防ぐため、サーバー側インメモリキャッシュおよび HTTP キャッシュヘッダーを併用しています。

| 状態 (`X-Cache`) | `Cache-Control` ヘッダー | 意味 |
|---|---|---|
| `MISS` | `public, max-age=300, stale-while-revalidate=300`（※1） | サーバー側キャッシュが期限切れ／未作成だったため最新データを取得して返却 |
| `HIT` | `public, max-age=300, stale-while-revalidate=300`（※1） | サーバー側インメモリキャッシュから返却 |
| `STALE` | `public, max-age=30` | Sheets 取得が一時失敗したため、直前の有効キャッシュをフォールバック返却（30秒再試行クールダウンあり） |
| `BYPASS` | `no-store` | 環境変数 `SHIPCHECKER_CACHE_TTL_SECONDS=0` 指定時のみ（主に開発検証用） |

※1 `max-age` および `stale-while-revalidate` の秒数は環境変数 `SHIPCHECKER_CACHE_TTL_SECONDS` の値（デフォルト `300`）に連動します。

- レスポンス JSON の `fetchedAt` には、キャッシュされたデータがスプレッドシートから取得された時刻（ISO 8601）が入ります。
- 認証なしの強制キャッシュ更新パラメータ（`?refresh=1` 等）は提供していません。

---

## レスポンス構造 (`200 OK`)

### JSON サンプル

```json
{
  "version": "JDM10",
  "countries": ["usa", "japan", "uk", "ussr", "germany", "france"],
  "ships": [
    {
      "id": "cr-0-des-moines",
      "type": "cr",
      "rawName": "Des Moines, デモイン",
      "displayName": "Des Moines",
      "aliases": ["Des Moines", "デモイン"],
      "country": "usa",
      "tier": 10,
      "hasRader": "Default",
      "hasAircraft": false,
      "isBan": false,
      "addDate": "2024-09-01",
      "model": ""
    },
    {
      "id": "cr-1-minotaur",
      "type": "cr",
      "rawName": "Minotaur, マイノーター",
      "displayName": "Minotaur",
      "aliases": ["Minotaur", "マイノーター"],
      "country": "uk",
      "tier": 10,
      "hasRader": "Optional",
      "hasAircraft": false,
      "isBan": false,
      "addDate": "",
      "model": ""
    }
  ],
  "rules": {
    "shipAmount": 7,
    "rules": [
      {
        "id": "rule-1",
        "kind": "type",
        "targets": ["bb"],
        "limit": 2,
        "raw": "bb,2"
      },
      {
        "id": "rule-2",
        "kind": "special",
        "targets": ["allRader"],
        "limit": 3,
        "raw": "allRader,3"
      }
    ]
  },
  "fetchedAt": "2026-11-19T12:00:00.000Z"
}
```

### ルートオブジェクト

| フィールド | 型 | 説明 |
|---|---|---|
| `version` | `string` | シートの `version` タブ A1 セルの値（未設定時は `""`） |
| `countries` | `string[]` | 国家識別子の一覧 |
| `ships` | `ShipData[]` | 艦艇一覧（`dd` → `cr` → `bb` → `cv` → `sb` の順、同艦種内は `displayName` 英語ロケール昇順） |
| `rules` | `ShipRuleSet` | 編成隻数上限およびルール一覧 |
| `fetchedAt` | `string` | スプレッドシートからの取得時刻（ISO 8601 UTC） |

### `ShipData`

| フィールド | 型 | 説明 |
|---|---|---|
| `id` | `string` | `{type}-{rowIndex}-{slug}` 形式の識別子（シート行変更で変わりうるため、外部保存時は `displayName` の併用を推奨） |
| `type` | `"dd" \| "cr" \| "bb" \| "cv" \| "sb"` | 艦種コード（`dd`: 駆逐, `cr`: 巡洋, `bb`: 戦艦, `cv`: 空母, `sb`: 潜水艦） |
| `rawName` | `string` | シートの `name` 列の生文字列 |
| `displayName` | `string` | 表示用の代表艦名（`aliases[0]`） |
| `aliases` | `string[]` | `rawName` を `,` 分割した別名リスト（英名・日本語名など） |
| `country` | `string` | 国家名 |
| `tier` | `number \| null` | Tier（数値変換できない場合は `null`） |
| `hasRader` | `"Default" \| "Optional" \| "No"` | レーダー搭載区分（`Default`: 固定/標準、 `Optional`: 選択可能、 `No`: なし）※スペル注意 |
| `hasAircraft` | `boolean` | 操作可能な航空機を持つ艦艇かどうか |
| `isBan` | `boolean` | シート上で使用禁止（BAN）に指定されているか |
| `addDate` | `string` | シートの `addDate` 列の値 |
| `model` | `string` | コラボ艦等の派生元モデル艦名（例: `"Yamato"`） |

### `ShipRuleSet` / `ShipRule`

| フィールド | 型 | 説明 |
|---|---|---|
| `shipAmount` | `number` | 編成可能な最大艦艇数（シート未指定時のデフォルト `7`） |
| `rules` | `ShipRule[]` | 個別の上限ルール一覧 |
| `rules[].id` | `string` | `"rule-1"`, `"rule-2"`, ... |
| `rules[].kind` | `"namePattern" \| "shipName" \| "country" \| "type" \| "feature" \| "special"` | ルール種別 |
| `rules[].targets` | `string[]` | 判定対象トークン配列 |
| `rules[].limit` | `number` | 許容上限数（`該当隻数 <= limit` で適合、`> limit` で違反） |
| `rules[].raw` | `string` | シートの元ルール表記 |

---

## 公式チェッカーのルール判定ロジック（参考）

外部ツール側で公式チェッカー（[ShipCheckRules.ts](../../src/util/ShipCheckRules.ts)）と完全に同じ判定を実装する場合の仕様です。

1. **基本チェック（常に実施）**
   - **隻数上限**: 選択艦数 `<= rules.shipAmount`
   - **シート BAN**: `ship.isBan === true` の艦数 `<= 0`
2. **個別ルール (`rules.rules`)**
   - 選択艦のうち `targets` のいずれかに一致する艦数を数え、`actual <= rule.limit` を確認します（いずれも `trim().toLowerCase()` で比較）。
   - `kind === "namePattern"`: `target` 先頭の `*` を除いた文字列に対し、単語境界正規表現 `` (^|[\s\-_/])<pattern>($|[\s\-_/]) ``（大文字小文字無視）が `displayName` / `rawName` / `aliases` / `model` のいずれかに一致する艦。
   - `kind === "shipName"`: `displayName` / `rawName` / `aliases` / `model` のいずれかが `targets` と完全一致する艦。
   - `kind === "country"`: `ship.country` が `targets` に一致する艦。
   - `kind === "type"`: `ship.type` が `targets` に一致する艦。
   - `kind === "feature"`:
     - `"hasrader"`: `ship.hasRader === "Default" || ship.hasRader === "Optional"`
     - `"hasaircraft"`: `ship.hasAircraft === true`
   - `kind === "special"`:
     - `"allrader"`: `ship.hasRader === "Default" || (ship.hasRader === "Optional" && useOptionalRadar === true)`
     - `"tier11"`: `ship.tier === 11`

> [!NOTE]
> **ルール判定と URL 初期選択の違い**:
> `namePattern` / `shipName` のルール判定では `model`（派生元モデル艦）も照合対象に含まれますが、[URL クエリ連携](./url-integration.md)での艦名解決時は別艦艇への誤爆を防ぐため `model` を照合対象外としています。

---

## エラーレスポンス (`500 Internal Server Error`)

スプレッドシートへの接続障害や設定不備が発生した場合、`500` を返します（CORS ヘッダーと `Cache-Control: no-store` が付与されます）。

```json
{
  "message": "Failed to load shipchecker data."
}
```

---

## 呼び出しサンプル (TypeScript)

```typescript
export interface ShipData {
    id: string;
    type: "dd" | "cr" | "bb" | "cv" | "sb";
    rawName: string;
    displayName: string;
    aliases: string[];
    country: string;
    tier: number | null;
    hasRader: "Default" | "Optional" | "No";
    hasAircraft: boolean;
    isBan: boolean;
    addDate: string;
    model: string;
}

export interface ShipCheckerApiResponse {
    version: string;
    countries: string[];
    ships: ShipData[];
    rules: {
        shipAmount: number;
        rules: Array<{
            id: string;
            kind: "namePattern" | "shipName" | "country" | "type" | "feature" | "special";
            targets: string[];
            limit: number;
            raw: string;
        }>;
    };
    fetchedAt: string;
}

export async function fetchShipCheckerMaster(): Promise<ShipCheckerApiResponse> {
    const res = await fetch("https://form.japandreammatch.info/api/shipchecker", {
        method: "GET",
    });

    if (!res.ok) {
        throw new Error(`Failed to fetch shipchecker data: HTTP ${res.status}`);
    }

    const cacheStatus = res.headers.get("X-Cache"); // "HIT" | "MISS" | "STALE" | "BYPASS" | null
    console.debug("shipchecker cache status:", cacheStatus);

    return (await res.json()) as ShipCheckerApiResponse;
}
```
