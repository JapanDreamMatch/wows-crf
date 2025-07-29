import {GoogleSpreadsheetService} from "@/util/SpreadSheetService";

export async function IsIgnore(): Promise<boolean> {
    const { API_SETTINGS_SHEET_ID } = process.env;
    const spreadSheet = new GoogleSpreadsheetService(API_SETTINGS_SHEET_ID ?? "");

    const sheet = await spreadSheet.getSheet(registerPeriod);
    const isIgnore = sheet.getCell(1,2).value?.toString() ?? undefined;

    return !(isIgnore == undefined || isIgnore != "YES")
}