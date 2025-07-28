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
- react-hook-form
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
GOOGLE_CREDENTIALS='cledentials_json'
GOOGLE_PRIVATE_KEY='-----BEGIN PRIVATE KEY-----\nlonglongkey\n-----END PRIVATE KEY-----\n'
GOOGLE_SERVICE_ACCOUNT_EMAIL='name@project-123456.iam.gserviceaccount.com'
REGISTER_SHEET_ID='sheetid'
WOWS_API_APP_ID="appid"
```

