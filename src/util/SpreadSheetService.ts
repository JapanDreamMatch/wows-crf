import { GoogleSpreadsheet, GoogleSpreadsheetWorksheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

export class GoogleSpreadsheetService {
    private doc: GoogleSpreadsheet;

    /**
     * GoogleSpreadsheet を編集するクラス
     *
     * @param sheetID 操作するSpreadSheetのID
     * @see APIドキュメント {@link https://theoephraim.github.io/node-google-spreadsheet/#/}
     */
    public constructor(sheetID: string) {
        const { GOOGLE_SERVICE_ACCOUNT_EMAIL } = process.env;
        const { GOOGLE_PRIVATE_KEY } = process.env;
        const auth = new JWT({
            email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
            key: (GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
        this.doc = new GoogleSpreadsheet(sheetID, auth);
    }

    /**
     * シートを追加
     * @param sheetName 追加するシートの名前
     * @param headerValues 1行目の内容
     *
     */
    async addSheet(sheetName: string, headerValues?: string[]): Promise<GoogleSpreadsheetWorksheet>{
        return await this.doc.addSheet({title: sheetName, headerValues});
    }

    /**
     * 複数行を追加する
     *
     * @param sheetTitle シート名
     * @param values 追加する行の値の配列
     *
     * 例①: // 配列による追加
     * <code>
     *  await spreadService.addRows(
     *      'sheetName',
     *      [
     *          ["aaa", "bbb", "ccc"],
     *          ["ddd", "eee", "fff"]
     *      ]
     *  );
     * </code>
     *
     * 例②: // ヘッダ似合うような形で行を追加
     * <code>
     *  await spreadService.addRows(
     *      'sheetName',
     *      [
     *          {name: 'suzuki', email: 'suzuki@mail.com'},
     *          {name: 'sato', email: 'sato@mail.jp'}
     *      ]
     *  );
     * </code>
     */
    async addRows(sheetTitle: string, values: (string[] | Record<string, string | number | boolean>)[]) {
        const sheet = this.doc.sheetsByTitle[sheetTitle];

        if (!sheet) { return; }
        await sheet.addRows(values);
    }

    /**
     * 行を取得する。
     *
     * @param sheetTitle シート名
     */
    async getRows(sheetTitle: string) {
        const sheet = this.doc.sheetsByTitle[sheetTitle];

        if (!sheet) {
            return [];
        }
        return await sheet.getRows(); //GoogleSpreadsheetRow<Record<string, any>>[]
    }

    /**
     * sheet名の一覧を取得する。
     */
    async getSheetNames(): Promise<string[]> {
        await this.doc.loadInfo();
        return this.doc.sheetsByIndex.map((sheet) => sheet.title);
    }
}