import {NextRequest, NextResponse} from "next/server";
import {GoogleSpreadsheetService} from "@/util/SpreadSheetService";

export async function POST(req: NextRequest) {
    const { teamNickName } = await req.json();
    const { REGISTER_SHEET_ID } = process.env;
    const spreadSheet = new GoogleSpreadsheetService(REGISTER_SHEET_ID ?? "");
    const sheetNames = await spreadSheet.getSheetNames();

    return NextResponse.json({ isExist: sheetNames.includes(teamNickName) });
}