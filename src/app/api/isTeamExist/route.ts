import {NextRequest, NextResponse} from "next/server";
import {GoogleSpreadsheetService} from "@/util/SpreadSheetService";

export async function POST(req: NextRequest) {
    const { teamNickName } = await req.json();
    const { REGISTER_SHEET_ID } = process.env;
    const spreadSheet = new GoogleSpreadsheetService(REGISTER_SHEET_ID ?? "");
    const sheetNames = await spreadSheet.getSheetNames();

    // @を含むタブ名は除外
    const validSheetNames = sheetNames.filter(name => !name.includes("@"));

    return NextResponse.json({ isExist: validSheetNames.includes(teamNickName) });
}