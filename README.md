これはWoWSの大会出場者登録フォーム用のサイトです。  

# なにこれ
JDMの大会出場者登録用フォーム＋α作ろうと思ってやったやつです。
正式名称は次の通りなんですがあまりにも長いので略してます。  
正式名称：`World of Warships (Japan Dream Match) contestant registration form.`  
略名：`wows-crf`  

JDM用に出場艦艇チェッカーとか入れてますが、その辺除けばほかの大会でも利用いただいて構いません。  
本プログラムはMIT Lisenceの元で自由に利用できます。  

# 導入ライブラリ
※`create-next-app`で作成した際に導入されたものを除く
- [chakra-ui](https://v2.chakra-ui.com/getting-started)
- [react-hook-form](https://www.react-hook-form.com/api/)
- yup
- axios
- google-auth-library
- google-spreadsheet
- googleapis

# .env.local
次の内容を記載してます。各自とってきてください。  
```.ini
API_SETTINGS_SHEET_ID=''
DRIVE_FOLDER_ID='DriveFolderID'
GOOGLE_APPLICATION_CREDENTIALS='FILEPATH/credentials.json'
GOOGLE_PRIVATE_KEY='-----BEGIN PRIVATE KEY-----\nlonglongkey\n-----END PRIVATE KEY-----\n'
GOOGLE_SERVICE_ACCOUNT_EMAIL='name@project-123456.iam.gserviceaccount.com'
REGISTER_SHEET_ID='sheetid'
WOWS_API_APP_ID="appid"
SHIP_AND_RULES_SHEET_ID=''
```

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
3. シート`registerPeriod`、`maxTeamAmount`の2つを作成する

### registerPeriodシートの設定
| startDate | endDate | Ignore(debug) |
|-----------|---------|---------------|
| 2025-11-14T00:00:00+09:00 | 2025-12-04T23:59:59+09:00 | YES           |

### maxTeamAmountシートの設定
| teamAmount |
|------------|
| 12         |

# Google Documentの設定(Discord Link)
1. Google Documentを作成
2. 作成したDocumentの共有設定を公開設定にする(どうせリンク公開するので)
3. `src/app/components/DiscordLink.tsx`の`docURL`にDocumentのURLを設定する

# SpreadSheetのIDの取得方法
Google SpreadSheetのURLに含まれる文字列がIDです。  
URL例：`https://docs.google.com/spreadsheets/d/abcdefghijklmn123456789/edit?gid`  
この場合のID：`abcdefghijklmn123456789`