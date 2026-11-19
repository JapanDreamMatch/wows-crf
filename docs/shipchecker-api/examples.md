# 艦艇チェッカー API・URL連携 コードサンプル集

外部ツール（Web アプリ・スクリプト・Discord Bot 等）から艦艇チェッカー API（`GET /api/shipchecker`）を取得し、取得データを活用して `/shipchecker?ships=...&radar=...` 連携 URL を生成するための実践サンプル集です。

---

## 目次

- [1. TypeScript（ブラウザ / React / Next.js 向け）](#1-typescriptブラウザ--react--nextjs-向け)
- [2. JavaScript（HTML + バニラ JS 最小サンプル）](#2-javascripthtml--バニラ-js-最小サンプル)
- [3. Python（標準ライブラリのみ・追加インストール不要）](#3-python標準ライブラリのみ追加インストール不要)
- [4. Python（`requests` ライブラリ利用）](#4-pythonrequests-ライブラリ利用)
- [5. `curl`（動作確認・ヘッダー確認用）](#5-curl動作確認ヘッダー確認用)
- [6. よくあるつまずき・FAQ](#6-よくあるつまずきfaq)

---

## 1. TypeScript（ブラウザ / React / Next.js 向け）

型定義付きの取得関数、クライアントメモリ内への1回キャッシュ（同一セッション内の再取得防止）、Tier 10 未 BAN 艦の抽出、連携 URL 生成までをまとめた完全な例です。

```typescript
// shipcheckerClient.ts

export type ShipType = "dd" | "ca-cl" | "bb" | "cv" | "sb";
export type RadarCapability = "Default" | "Optional" | "No";
export type RuleKind = "namePattern" | "shipName" | "country" | "type" | "feature" | "special";

export interface ShipData {
    id: string;
    type: ShipType;
    rawName: string;
    displayName: string;
    aliases: string[];
    country: string;
    tier: number | null;
    hasRadar: RadarCapability;
    hasAircraft: boolean;
    isBan: boolean;
    addDate: string;
    model: string;
}

export interface ShipRule {
    id: string;
    kind: RuleKind;
    targets: string[];
    limit: number;
    raw: string;
}

export interface ShipRuleSet {
    shipAmount: number;
    rules: ShipRule[];
}

export interface ShipCheckerApiResponse {
    version: string;
    countries: string[];
    ships: ShipData[];
    rules: ShipRuleSet;
    fetchedAt: string;
}

const API_URL = "https://form.japandreammatch.info/api/shipchecker";
const CHECKER_PAGE_URL = "https://form.japandreammatch.info/shipchecker";

let inMemoryPromise: Promise<ShipCheckerApiResponse> | null = null;

/**
 * 艦艇一覧とルールを取得します（画面表示中1回だけ呼ぶ用途を想定）。
 * credentials はデフォルト（"same-origin"）または "omit" を使用してください。
 */
export async function fetchShipCheckerData(forceReload = false): Promise<ShipCheckerApiResponse> {
    if (inMemoryPromise && !forceReload) {
        return inMemoryPromise;
    }

    inMemoryPromise = (async () => {
        const res = await fetch(API_URL, { method: "GET" });
        if (!res.ok) {
            throw new Error(`ShipChecker API error: HTTP ${res.status}`);
        }

        const cacheStatus = res.headers.get("X-Cache"); // "HIT" | "MISS" | "STALE" | "BYPASS" | null
        console.debug("ShipChecker X-Cache:", cacheStatus);

        return (await res.json()) as ShipCheckerApiResponse;
    })();

    try {
        return await inMemoryPromise;
    } catch (error) {
        inMemoryPromise = null;
        throw error;
    }
}

export interface SelectedShipInput {
    /** /api/shipchecker の ship.displayName を推奨 */
    name: string;
    /** hasRadar === "Optional" の艦をレーダー使用として数える場合 true */
    useOptionalRadar?: boolean;
}

/**
 * 公式艦艇チェッカーで編成を再現するための URL を生成します。
 */
export function buildShipCheckerUrl(selectedShips: SelectedShipInput[]): string {
    if (selectedShips.length === 0) {
        return CHECKER_PAGE_URL;
    }

    const params = new URLSearchParams();
    const shipNames = selectedShips.map((s) => s.name.trim()).filter(Boolean);
    const radarNames = selectedShips
        .filter((s) => s.useOptionalRadar)
        .map((s) => s.name.trim())
        .filter(Boolean);

    if (shipNames.length > 0) {
        params.set("ships", shipNames.join(","));
    }
    if (radarNames.length > 0) {
        params.set("radar", radarNames.join(","));
    }

    const query = params.toString();
    return query ? `${CHECKER_PAGE_URL}?${query}` : CHECKER_PAGE_URL;
}

// --- 利用例 ---
async function example() {
    const data = await fetchShipCheckerData();
    console.log(`バージョン: ${data.version}, 隻数上限: ${data.rules.shipAmount}`);

    // Tier 10 の使用可能艦（非 BAN）だけ抽出
    const availableTier10Ships = data.ships.filter((ship) => ship.tier === 10 && !ship.isBan);
    console.log(`選択可能な Tier 10 艦: ${availableTier10Ships.length} 隻`);

    // Optional レーダー艦を探す例
    const optionalRadarShips = availableTier10Ships.filter((ship) => ship.hasRadar === "Optional");
    console.log("レーダー選択可能艦の例:", optionalRadarShips.slice(0, 5).map((s) => s.displayName));

    // 公式チェッカーを開く URL を生成
    const checkerUrl = buildShipCheckerUrl([
        { name: "Des Moines" },
        { name: "Minotaur", useOptionalRadar: true },
        { name: "Minotaur", useOptionalRadar: false },
        { name: "Shimakaze" },
    ]);
    console.log("チェッカーURL:", checkerUrl);
}
```

---

## 2. JavaScript（HTML + バニラ JS 最小サンプル）

ビルド環境なしの静的 HTML ページから、CORS 経由でデータを取得してチェッカーリンクを作る最小構成です。

```html
<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <title>艦艇チェッカー連携サンプル</title>
</head>
<body>
  <h1 id="title">読み込み中...</h1>
  <p><a id="checker-link" href="#" target="_blank" rel="noopener noreferrer">公式チェッカーで確認する</a></p>

  <script type="module">
    const res = await fetch("https://form.japandreammatch.info/api/shipchecker");
    if (!res.ok) {
      document.getElementById("title").textContent = `取得エラー (HTTP ${res.status})`;
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    document.getElementById("title").textContent =
      `バージョン: ${data.version} / 登録艦艇数: ${data.ships.length} / ルール数: ${data.rules.rules.length}`;

    // 例として先頭の非BAN艦2隻を URL に渡す
    const picks = data.ships.filter((s) => !s.isBan).slice(0, 2);
    const params = new URLSearchParams({
      ships: picks.map((s) => s.displayName).join(","),
    });

    const radarTargets = picks.filter((s) => s.hasRadar === "Optional").map((s) => s.displayName);
    if (radarTargets.length > 0) {
      params.set("radar", radarTargets.join(","));
    }

    document.getElementById("checker-link").href =
      `https://form.japandreammatch.info/shipchecker?${params.toString()}`;
  </script>
</body>
</html>
```

---

## 3. Python（標準ライブラリのみ・追加インストール不要）

`urllib.request` と `urllib.parse` だけを使うため、`pip install` なしでそのまま実行できます（Discord Bot や集計スクリプト等にもそのまま組み込めます）。

```python
import json
import urllib.parse
import urllib.request
from typing import Any

API_URL = "https://form.japandreammatch.info/api/shipchecker"
CHECKER_PAGE_URL = "https://form.japandreammatch.info/shipchecker"


def fetch_shipchecker_data(timeout: float = 10.0) -> dict[str, Any]:
    """公式艦艇チェッカー API から最新データを取得する。"""
    req = urllib.request.Request(
        API_URL,
        headers={
            "Accept": "application/json",
            "User-Agent": "jdm-fleet-tool/1.0",
        },
        method="GET",
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        cache_status = resp.headers.get("X-Cache")
        print(f"HTTP {resp.status}, X-Cache={cache_status}")
        return json.loads(resp.read().decode("utf-8"))


def build_shipchecker_url(
    ships: list[str],
    radar_ships: list[str] | None = None,
) -> str:
    """ships / radar から公式艦艇チェッカーの連携 URL を生成する。"""
    cleaned_ships = [s.strip() for s in ships if s.strip()]
    if not cleaned_ships:
        return CHECKER_PAGE_URL

    query_params: dict[str, str] = {"ships": ",".join(cleaned_ships)}
    if radar_ships:
        cleaned_radar = [r.strip() for r in radar_ships if r.strip()]
        if cleaned_radar:
            query_params["radar"] = ",".join(cleaned_radar)

    # スペースを %20 でエンコードしたい場合は quote_via=urllib.parse.quote を指定
    encoded = urllib.parse.urlencode(query_params, quote_via=urllib.parse.quote)
    return f"{CHECKER_PAGE_URL}?{encoded}"


if __name__ == "__main__":
    data = fetch_shipchecker_data()
    print("Version:", data["version"])
    print("Ship amount limit:", data["rules"]["shipAmount"])
    print("Total ships:", len(data["ships"]))
    print("Rules count:", len(data["rules"]["rules"]))

    # Optional レーダー艦と非 BAN 艦の例を表示
    optional_ships = [
        s["displayName"]
        for s in data["ships"]
        if s["hasRadar"] == "Optional" and not s["isBan"]
    ]
    print("Optional radar ships (sample):", optional_ships[:5])

    url = build_shipchecker_url(
        ships=["Des Moines", "Minotaur", "Minotaur", "Shimakaze"],
        radar_ships=["Minotaur"],
    )
    print("Checker URL:", url)
```

---

## 4. Python（`requests` ライブラリ利用）

`requests` を使うプロジェクト向けの実装例です（`pip install requests`）。

```python
import urllib.parse
from typing import Any
import requests

API_URL = "https://form.japandreammatch.info/api/shipchecker"
CHECKER_PAGE_URL = "https://form.japandreammatch.info/shipchecker"


def fetch_shipchecker_data(timeout: float = 10.0) -> dict[str, Any]:
    response = requests.get(API_URL, timeout=timeout)
    response.raise_for_status()
    print("X-Cache:", response.headers.get("X-Cache"))
    return response.json()


def build_shipchecker_url(ships: list[str], radar_ships: list[str] | None = None) -> str:
    params: dict[str, str] = {"ships": ",".join(s.strip() for s in ships if s.strip())}
    if radar_ships:
        radar_list = [r.strip() for r in radar_ships if r.strip()]
        if radar_list:
            params["radar"] = ",".join(radar_list)

    if not params["ships"]:
        return CHECKER_PAGE_URL

    return f"{CHECKER_PAGE_URL}?{urllib.parse.urlencode(params, quote_via=urllib.parse.quote)}"


if __name__ == "__main__":
    data = fetch_shipchecker_data()

    # BAN 艦の一覧確認
    banned = [s["displayName"] for s in data["ships"] if s["isBan"]]
    print(f"バージョン: {data['version']} / BAN艦数: {len(banned)}")

    # 各ルールの概要表示
    for rule in data["rules"]["rules"]:
        print(f"- [{rule['kind']}] {rule['targets']} <= {rule['limit']}")

    print(
        build_shipchecker_url(
            ships=["Des Moines", "Shimakaze"],
            radar_ships=["Des Moines"],
        )
    )
```

---

## 5. `curl`（動作確認・ヘッダー確認用）

### データとキャッシュヘッダーの確認
```bash
curl -i https://form.japandreammatch.info/api/shipchecker
```

### CORS プリフライト（`OPTIONS`）の確認
```bash
curl -i -X OPTIONS https://form.japandreammatch.info/api/shipchecker \
  -H "Origin: https://example.com" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Content-Type"
```

---

## 6. よくあるつまずき・FAQ

### Q1. ブラウザからの `fetch` が CORS エラーになります
- **`credentials: "include"` を付けていませんか？**
  - 本 API は認証不要の公開データであり `Access-Control-Allow-Origin: *` を返すため、`Access-Control-Allow-Credentials` は返却しません。`fetch(url)`（デフォルト）または `fetch(url, { credentials: "omit" })` を使用してください。
- **許可されていないカスタムリクエストヘッダーを付けていませんか？**
  - `Authorization` や独自の `X-*` ヘッダー、あるいは `Cache-Control: no-cache`（例: `fetch(url, { cache: "no-store" })` 等）を付けると CORS プリフライトで弾かれます。通常の `fetch("https://form.japandreammatch.info/api/shipchecker")` で呼び出してください。

### Q2. 運営がスプレッドシートを更新したのに API の内容がすぐ変わりません
サーバー側・ブラウザ側ともに **デフォルト 300秒（5分）のキャッシュ** が効いています。5分前後経過してから再読み込みしてください。

### Q3. 外部ツール側のデータ保存で艦の `id` をキーにしても大丈夫ですか？
`id`（例: `ca-cl-0-des-moines`）にはスプレッドシートの行インデックスが含まれるため、運営が行の追加・削除を行うと番号がずれる場合があります。編成の保存や URL 連携には **`ship.displayName`** を使うことをおすすめします。

### Q4. URL の `ships` に空白や日本語を含めるときの注意点は？
`URLSearchParams`（JS/TS）や `urllib.parse.urlencode(..., quote_via=urllib.parse.quote)`（Python）等で URL エンコードしてください。空白は `%20` でも `+` でも受け付けます（例: `Des%20Moines` / `Des+Moines`）。また、カンマ `,` は艦名の区切り文字として解釈されます。
