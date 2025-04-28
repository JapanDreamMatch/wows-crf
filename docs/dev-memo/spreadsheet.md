# TSでSpreadSheet使う手順
## GCP
- GCPで`Google Spreads API`を有効化
- `サービスアカウント`を作成
- 作ったサービスから、鍵(json)を作成

## .env.local
下記を設定
- WOWS_API_APP_ID
- REGISTER_SHEET_ID
- GOOGLE_SERVICE_ACCOUNT_EMAIL
- GOOGLE_PRIVATE_KEY

具体的には次の通り  
```ini
# 以下全て、適当な文字入れているので、置き換えてください
# wows-APIでAppを作成すると得られるID  
WOWS_API_APP_ID="nhfzwj8nbb5qhrmxp0q5mgjdpz64pvd9"

# スプレッドシートのURLに含まれる文字列
# 例：https://docs.google.com/spreadsheets/d/abcdefghijklmn123456789/edit?gid=0#gid=0
REGISTER_SHEET_ID='abcdefghijklmn123456789'

# サービスアカウントのアドレス
# さっきGCPで作ったサービスアカウントのアドレス
GOOGLE_SERVICE_ACCOUNT_EMAIL='accountname@ProjectName-123456.iam.gserviceaccount.com'

# サービスアカウントのkeyのJSONに含まれる`"private_key"`の値
GOOGLE_PRIVATE_KEY='longlongprivatekey'
```

## npm
パッケージをインストール  
`npm install google-spreadsheet`
`npm install google-auth-library`

## TSでスプレッドシートを操作する
https://zenn.dev/nananaoto/articles/e8c0ac181224cd