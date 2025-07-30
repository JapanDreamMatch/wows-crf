import {GoogleSpreadsheetService} from "@/util/SpreadSheetService";

export async function CheckTeamAmount(): Promise<boolean> {
    const { REGISTER_SHEET_ID, API_SETTINGS_SHEET_ID } = process.env;

    //チーム上限の設定取得
    const settingsBook = new GoogleSpreadsheetService(API_SETTINGS_SHEET_ID ?? "");
    const settingsSheet = await settingsBook.getSheet("maxTeamAmount");
    await settingsSheet.loadCells({startRowIndex: 0, endRowIndex: 2, startColumnIndex: 0, endColumnIndex: 2});
    const maxAmount = Number(settingsSheet.getCell(1,0).value?.toString() ?? "0");

    //チームの配列取得
    const spreadSheet = new GoogleSpreadsheetService(REGISTER_SHEET_ID ?? "");
    const sheetNames = await spreadSheet.getSheetNames();

    return Boolean(sheetNames.length < maxAmount);
}