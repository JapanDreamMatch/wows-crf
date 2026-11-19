---
applyTo: "src/app/api/**,src/util/**"
---

# API & Utility Security Instructions (`wows-crf`)

`src/app/api/**` および `src/util/**` を編集する際は、以下のセキュリティ・クォータ・データ整合性ルールを厳守してください。

1. **純粋ロジックと I/O の分離**:
   - バリデーション・正規化・ルール判定・キャッシュ制御などは `src/util/*.ts` に副作用の少ない関数として実装し、`tests/*.test.ts` でユニットテストを記述してください。
2. **CORS 境界**:
   - `Access-Control-Allow-Origin: *` は `src/app/api/shipchecker/route.ts` の `GET` / `OPTIONS` 以外に絶対に付与しないでください。
   - `Access-Control-Allow-Credentials` は付与しないでください。
3. **エラーハンドリングとロールバック**:
   - クライアントへ返す `500` レスポンスに内部の例外スタックトレースや `REGISTER_SHEET_ID` / `SHIP_AND_RULES_SHEET_ID` 等の環境変数値を露出させないでください。
   - Cloud Storage への画像保存後に Google SpreadSheet の書き込み・更新が失敗した場合は、`try / catch` で新規アップロードしたオブジェクトを確実に `storage.deleteObject()` でロールバック削除してください。
4. **Google SpreadSheet セル座標と排他制御**:
   - チームシート更新時は `withTeamLocks` で対象チーム略名（変更時は旧・新の両方）を辞書順ロックしてください。
   - `REGISTER_HEADER` の8列構造（`G2`=LogoURL, `H2`=Salt, `H3`=Hash, `H4`=失敗回数/`Lock`, `H5`=ロック解除時刻）を厳守してください。
