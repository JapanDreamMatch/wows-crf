import {NextRequest, NextResponse} from "next/server";
import {Player} from "@/util/Player";
import {GoogleSpreadsheetService} from "@/util/SpreadSheetService";
import {REGISTER_HEADER} from "@/util/SheetHeader";
import {Readable} from "node:stream";
import {drive} from "googleapis/build/src/apis/drive";

export async function POST(req: NextRequest) {

    const { REGISTER_SHEET_ID } = process.env;
    const DRIVE_CLIENT_ID = process.env.DRIVE_CLIENT_ID ?? "";
    const DRIVE_CLIENT_SECRET = process.env.DRIVE_CLIENT_SECRET ?? "";
    const DRIVE_REDIRECT_URI = process.env.DRIVE_REDIRECT_URI ?? "";
    const DRIVE_FOLDER_ID = process.env.DRIVE_FOLDER_ID ?? "";
    const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS ?? "" as string);

    const formData = await req.formData();

    //テキストデータ
    const teamName = formData.get("teamName") as string;
    const teamNickName = formData.get("teamNickname") as string;
    const contact = formData.get("contact") as string;
    const teamLogo = formData.get("teamLogo") as File;
    const ign1 = formData.get("player1") as string;
    const ign2 = formData.get("player2") as string;
    const ign3 = formData.get("player3") as string;
    const ign4 = formData.get("player4") as string;
    const ign5 = formData.get("player5") as string;
    const ign6 = formData.get("player6") as string;
    const ign7 = formData.get("player7") as string;
    const ign8 = formData.get("player8") as string;
    const ign9 = formData.get("player9") as string;
    const ign10 = formData.get("player10") as string;
    const comment = formData.get("comment") as string;

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

    //spreadsheetへの情報書き込み
    // const spreadSheet = new GoogleSpreadsheetService(REGISTER_SHEET_ID ?? "");
    // await spreadSheet.addSheet(teamNickName, REGISTER_HEADER);
    // await spreadSheet.addRows(teamNickName,sheetRows);


    //画像に(チームロゴ)関する処理
    const fs = require('fs');
    const {GoogleAuth} = require('google-auth-library');
    const {google} = require('googleapis');

    // ファイルを ArrayBuffer として取得し、Buffer に変換
    const arrayBuffer = await teamLogo.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Buffer から Node.js のストリームを作成
    const nodeStream = Readable.from(buffer);

    // Get credentials and build service
    // TODO (developer) - Use appropriate auth mechanism for your app
    const auth = new GoogleAuth({
        scopes: 'https://www.googleapis.com/auth/drive',
    });
    const drive = google.drive({version: 'v3', auth});
    const fileMetadata = {
        name: teamLogo.name,
        parents: [DRIVE_FOLDER_ID],
    };
    // ファイルのアップロード
    const uploadResponse = await drive.files.create({
        requestBody: fileMetadata,
        media: {
            mimeType: teamLogo.type,
            body: nodeStream,
        },
        fields: "id",
    });
    console.log("File Id:", uploadResponse.data.id);


    //確認用
    // アップロード後、ファイルのメタデータを取得して確認
    const fileRecord = await drive.files.get({
        fileId: uploadResponse.data.id,
        fields: "id, name, parents",
    });
    console.log("File metadata:", fileRecord.data);


    console.log("run end")
    return NextResponse.error();
    return NextResponse.json({ message: "ok" });
}