import {NextRequest, NextResponse} from "next/server";
import {Player} from "@/util/Player";
import {GoogleSpreadsheetService} from "@/util/SpreadSheetService";
import {REGISTER_HEADER} from "@/util/SheetHeader";

export async function POST(req: NextRequest) {

    const { REGISTER_SHEET_ID } = process.env;

    const {
        teamName,
        teamNickName,
        teamLogo,
        contact,
        ign1,
        ign2,
        ign3,
        ign4,
        ign5,
        ign6,
        ign7,
        ign8,
        ign9,
        ign10,
        comment
    } = await req.json();

    //プレイヤーの取得
    const players = await Promise.all([
        new Player(ign1).getInstance(),
        new Player(ign2).getInstance(),
        new Player(ign3).getInstance(),
        new Player(ign4).getInstance(),
        new Player(ign5).getInstance(),
        new Player(ign6).getInstance(),
        new Player(ign7).getInstance(),
        new Player(ign8).getInstance(),
        new Player(ign9).getInstance(),
        new Player(ign10).getInstance()
    ]);

    const teamMemberWinRate = players
        .map(p => p.getWinRate())
        .filter((wr): wr is number => typeof wr === 'number');
    const teamWinRate = teamMemberWinRate
        .reduce(function(prev, current, i ,arr){
            return prev+current;
        }) / teamMemberWinRate.length;

    const sheetRows: (string[] | Record<string, string | number | boolean>)[] = [
        {
            Type: "TeamInfo",
            IGN: teamNickName,
            ID: teamName,
            WinRate: teamWinRate,
            Contact: contact,
            Comment: comment
        }
    ];
    for(let i = 0; i<players.length; i++){
        sheetRows.push(
            {
                Type: `player${i+1}`,
                IGN: players[i].getIgn(),
                ID: players[i].getUid() ?? "undefined",
                WinRate: players[i].getWinRate() ?? "undefined",
            }
        );
    }

    const spreadSheet = new GoogleSpreadsheetService(REGISTER_SHEET_ID ?? "");
    await spreadSheet.addSheet(teamNickName, REGISTER_HEADER);
    await spreadSheet.addRows(teamNickName,sheetRows);

    return NextResponse.json({ message: "ok" });
}