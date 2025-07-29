import {NextResponse} from "next/server";
import {GoogleSpreadsheetService} from "@/util/SpreadSheetService";

export async function POST() {
    const { API_SETTINGS_SHEET_ID } = process.env;
    const spreadSheet = new GoogleSpreadsheetService(API_SETTINGS_SHEET_ID ?? "");

    const sheet = await spreadSheet.getSheet(registerPeriod);
    const startCell = sheet.getCell(1,0).value?.toString() ?? undefined;
    const endCell = sheet.getCell(1,1).value?.toString() ?? undefined;
    const isIgnore = sheet.getCell(1,2).value?.toString() ?? undefined;

    if(startCell == undefined || endCell == undefined || isIgnore == undefined) {
        return NextResponse.json({ canRegister: "NO" });
    }

    if(isIgnore.toString() == "YES") {
        return NextResponse.json({ canRegister: "YES" });
    }

    const now = new Date();
    const startDate = new Date(startCell);
    const endDate = new Date(endCell);

    if(startDate <= now && now <= endDate){
        return NextResponse.json({ canRegister: "YES" });
    }

    return NextResponse.json({ canRegister: "NO" });
}