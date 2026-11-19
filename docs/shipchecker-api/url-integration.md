# 艦艇チェッカー URL クエリ連携ガイド

外部ツールで決定した編成を、公式艦艇チェッカー（`https://form.japandreammatch.info/shipchecker`）の画面に初期選択した状態で開くための仕様です。

---

## URL フォーマット

```text
https://form.japandreammatch.info/shipchecker?ships=<艦名1>,<艦名2>,...&radar=<艦名A>,<艦名B>,...
```

### 例
```text
https://form.japandreammatch.info/shipchecker?ships=Des%20Moines,Minotaur,Minotaur,Shimakaze&radar=Minotaur
```

---

## クエリパラメータ仕様

| パラメータ | 必須/任意 | 説明 |
|---|---|---|
| `ships` | 任意 | 初期選択する艦艇名のリスト。カンマ（`,`）区切り、または `?ships=A&ships=B` のように同名パラメータを複数指定可能。 |
| `radar` | 任意 | `hasRader === "Optional"` の艦を「実際にレーダーを使用する艦艇（`allRader` ルール対象）」としてカウントするための艦艇名リスト。カンマ区切り・複数指定に対応。 |

- **URL エンコード**: スペースや日本語を含む艦名は `encodeURIComponent`（または `URLSearchParams`）でエンコードしてください。
- **区切り文字**: カンマ（`,`）で分割し、各要素の前後の空白を除去して空要素を除外します。
- **初回1回のみ適用**: ページ読み込み完了時に初回1回だけ初期選択へ反映されます。その後、ユーザーが画面上で言語切替や艦艇の追加・削除を行っても URL の内容で上書きされません。また、画面操作による URL への自動書き戻しは行いません。

---

## 艦名の照合ルール

指定された文字列は次のルールで `/api/shipchecker` の `ships` 一覧と照合されます。

1. **正規化処理**:
   - NFKC 正規化（全角英数字・全角スペースの半角化等）
   - 前後空白のトリム、連続空白の半角スペース1つへの圧縮
   - 小文字化（大文字・小文字を区別しない）
2. **照合の優先順位**:
   1. `displayName` の正規化完全一致
   2. `aliases`（日本語名などの別名）のいずれかの正規化完全一致
   3. `displayName` のアクセント記号・特殊文字除去後の一致
   4. `aliases` のアクセント記号・特殊文字除去後の一致
   - 例: `Kléber` ↔ `Kleber`、`Gdańsk` ↔ `Gdansk`、`Preußen` ↔ `Preussen`、`Błyskawica` ↔ `Blyskawica`、`ø` ↔ `o` を吸収します。
   - 日本語の濁点・半濁点（例: `ば` と `は`）は同一視されません。
3. **照合対象外**:
   - **`model` フィールド（コラボ艦等の派生元モデル艦名）は照合対象外**です（例: `Yamato` を指定しても `ARP Yamato` に誤一致しません）。

---

## `radar` パラメータの適用ルール

- `radar` の各艦名も上記と同じロジックで艦艇を解決します。
- 選択済み艦（`ships`）の先頭から走査し、**`hasRader === "Optional"` の艦に対して出現回数ベースでレーダー使用（チェックボックス ON）を割り当てます**。
  - 例1: `ships=Minotaur,Minotaur&radar=Minotaur` → 1隻目の `Minotaur` のみレーダー使用 ON、2隻目は OFF
  - 例2: `ships=Minotaur,Minotaur&radar=Minotaur,Minotaur` → 2隻ともレーダー使用 ON
- **`Default` 艦 / `No` 艦の扱い**:
  - `ships` に含まれている `hasRader === "Default"` 艦（例: `Des Moines`）や `"No"` 艦が `radar` に含まれていても、エラーや警告は表示せず無視します（`Default` 艦は仕様上もともと `allRader` としてカウントされます）。
- **警告対象**:
  - マスター一覧に存在しない艦名（typo 等）、または `ships` に含まれていない艦名が `radar` に指定された場合は、適用漏れ防止のため警告バナーに艦名を表示します（`ships` 未指定で `?radar=...` のみ渡された場合も警告対象です）。

---

## シート BAN 艦・ルール違反艦・上限の扱い

| ケース | 画面上の挙動 |
|---|---|
| **シート BAN 艦（`isBan: true`）** | 規約違反の確認ができるよう **スキップせず選択状態に読み込みます**。左ペイン「選択済み艦艇」のカードに「シートBAN / Sheet BAN」バッジが表示され、下部のルール確認欄で違反が表示されます。 |
| **ルール違反の組み合わせ・隻数超過** | そのまま選択状態に読み込み、ルール確認欄で該当ルールが赤くハイライトされ違反件数が表示されます。 |
| **一覧に存在しない艦名** | 該当艦のみスキップし、他の有効な艦はすべて読み込みます。画面上部に閉じる可能な警告バナー（日本語 / 英語対応）で未解決艦名を通知します。 |
| **31隻以上の指定（上限超過）** | 1度に読み込める上限は **`30` 隻（`MAX_URL_SHIPS = 30`）** です。31隻目以降は無視され、警告バナーで切り捨て隻数を通知します。 |

---

## URL 生成サンプルコード (TypeScript / JavaScript)

```typescript
export interface SelectedShipInput {
    /** /api/shipchecker の displayName または aliases に含まれる艦名 */
    name: string;
    /** Optional レーダー艦でレーダーを使用する場合 true */
    useOptionalRadar?: boolean;
}

export function buildShipCheckerUrl(selectedShips: SelectedShipInput[]): string {
    const baseUrl = "https://form.japandreammatch.info/shipchecker";
    if (selectedShips.length === 0) {
        return baseUrl;
    }

    const params = new URLSearchParams();
    const shipNames = selectedShips.map((item) => item.name.trim()).filter(Boolean);
    const radarNames = selectedShips
        .filter((item) => item.useOptionalRadar)
        .map((item) => item.name.trim())
        .filter(Boolean);

    if (shipNames.length > 0) {
        params.set("ships", shipNames.join(","));
    }
    if (radarNames.length > 0) {
        params.set("radar", radarNames.join(","));
    }

    const query = params.toString();
    return query ? `${baseUrl}?${query}` : baseUrl;
}

// 使用例
const url = buildShipCheckerUrl([
    { name: "Des Moines" },
    { name: "Minotaur", useOptionalRadar: true },
    { name: "Minotaur", useOptionalRadar: false },
    { name: "Shimakaze" },
]);
// => "https://form.japandreammatch.info/shipchecker?ships=Des+Moines%2CMinotaur%2CMinotaur%2CShimakaze&radar=Minotaur"
```

> [!TIP]
> `/api/shipchecker` から取得した `ship.displayName` をそのまま `name` に渡すと、表記揺れや別名変更の影響を受けにくく最も確実です。

---

## URL 生成サンプルコード (Python)

```python
import urllib.parse


def build_shipchecker_url(ships: list[str], radar_ships: list[str] | None = None) -> str:
    base_url = "https://form.japandreammatch.info/shipchecker"
    cleaned_ships = [s.strip() for s in ships if s.strip()]
    if not cleaned_ships:
        return base_url

    params: dict[str, str] = {"ships": ",".join(cleaned_ships)}
    if radar_ships:
        cleaned_radar = [r.strip() for r in radar_ships if r.strip()]
        if cleaned_radar:
            params["radar"] = ",".join(cleaned_radar)

    return f"{base_url}?{urllib.parse.urlencode(params, quote_via=urllib.parse.quote)}"


url = build_shipchecker_url(
    ships=["Des Moines", "Minotaur", "Minotaur", "Shimakaze"],
    radar_ships=["Minotaur"],
)
# => "https://form.japandreammatch.info/shipchecker?ships=Des%20Moines%2CMinotaur%2CMinotaur%2CShimakaze&radar=Minotaur"
```

JavaScript・TypeScript・Python（データ取得〜URL生成の結合例）や FAQ は [コードサンプル集 (`examples.md`)](./examples.md) を参照してください。
