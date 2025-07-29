import {GoogleSpreadsheetService} from "@/util/SpreadSheetService";

export async function CheckTime(): Promise<boolean> {
    const { API_SETTINGS_SHEET_ID } = process.env;
    const spreadSheet = new GoogleSpreadsheetService(API_SETTINGS_SHEET_ID ?? "");

    const sheet = await spreadSheet.getSheet(registerPeriod);
    const startCell = sheet.getCell(1,0).value?.toString() ?? undefined;
    const endCell = sheet.getCell(1,1).value?.toString() ?? undefined;

    if(startCell == undefined || endCell == undefined) {
        return false;
    }

    const now = new Date();
    const startDate = new Date(startCell);
    const endDate = new Date(endCell);

    return startDate <= now && now <= endDate;
}