import {NextRequest, NextResponse} from "next/server";
import {Player} from "@/util/Player";
import {GoogleSpreadsheetService} from "@/util/SpreadSheetService";
import {REGISTER_HEADER} from "@/util/SheetHeader";
import {Readable} from "node:stream";
import {CheckTime} from "@/app/api/isApplication/checkTime";
import {CheckTeamAmount} from "@/app/api/isApplication/checkTeamAmount";
import {IsIgnore} from "@/app/api/isApplication/isIgnore";

export async function POST(req: NextRequest) {

    try {
        const { REGISTER_SHEET_ID, API_SETTINGS_SHEET_ID } = process.env;
        const DRIVE_FOLDER_ID = process.env.DRIVE_FOLDER_ID ?? "";

        const formData = await req.formData();


        //提出期限すぎていないかのチェック
        const checkTime = await CheckTime();
        const checkTeamAmount = await CheckTeamAmount();
        const isIgnore = await IsIgnore();
        if(!(isIgnore || (checkTime && checkTeamAmount))){
            return NextResponse.json(
                { message: "募集期間が過ぎています" },
                { status: 503 }
            );
        }

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

        // サーバーサイドでチーム略名のバリデーション（@を含む場合はエラー）
        if (teamNickName.includes("@")) {
            return NextResponse.json(
                { message: "チーム略名に「@」は使用できません" },
                { status: 500 }
            );
        }

        // サーバーサイドでチーム略名の重複チェック（@を含むタブ名は除外）
        const spreadSheet = new GoogleSpreadsheetService(REGISTER_SHEET_ID ?? "");
        const sheetNames = await spreadSheet.getSheetNames();
        const validSheetNames = sheetNames.filter(name => !name.includes("@"));

        // チーム数上限チェック
        //チーム上限の設定取得
        const settingsBook = new GoogleSpreadsheetService(API_SETTINGS_SHEET_ID ?? "");
        const settingsSheet = await settingsBook.getSheet("maxTeamAmount");
        await settingsSheet.loadCells({startRowIndex: 0, endRowIndex: 2, startColumnIndex: 0, endColumnIndex: 2});
        const MAX_TEAM_AMOUNT = Number(settingsSheet.getCell(1,0).value?.toString() ?? "0");
        if (validSheetNames.length >= MAX_TEAM_AMOUNT) {
            return NextResponse.json(
                { message: "募集チーム数が上限に達したため締め切りました" },
                { status: 503 }
            );
        }

        if (validSheetNames.includes(teamNickName)) {
            return NextResponse.json(
                { message: "このチーム略名は既に登録されています" },
                { status: 500 }
            );
        }

        //spreadsheetへの情報書き込み
        await spreadSheet.addSheet(teamNickName, REGISTER_HEADER);
        await spreadSheet.addRows(teamNickName,sheetRows);


        //画像に(チームロゴ)関する処理
        if (teamLogo && typeof teamLogo === "object" && teamLogo.size > 0) {
            // const fs = require('fs');
            const {GoogleAuth} = require('google-auth-library');
            const {google} = require('googleapis');

            // ファイルを ArrayBuffer として取得し、Buffer に変換
            const arrayBuffer = await teamLogo.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            // Buffer から Node.js のストリームを作成
            const nodeStream = Readable.from(buffer);

            //ファイル名を作成
            const lastDotIndex = teamLogo.name.lastIndexOf(".");
            const fileName = teamNickName + (lastDotIndex !== -1 ? teamLogo.name.slice(lastDotIndex) : "");

            // Get credentials and build service
            const auth = new GoogleAuth({
                scopes: 'https://www.googleapis.com/auth/drive',
            });
            const drive = google.drive({version: 'v3', auth});
            const fileMetadata = {
                name: fileName,
                parents: [DRIVE_FOLDER_ID],
            };
            // ファイルのアップロード
            await drive.files.create({
                requestBody: fileMetadata,
                media: {
                    mimeType: teamLogo.type,
                    body: nodeStream,
                },
                fields: "id",
            });
        }

        return NextResponse.json({ message: "ok" });

    } catch (error: any) {
        console.error(error); // エラー内容をログ出力
        // エラー時はエラーメッセージを返す
        return NextResponse.json(
            { message: error?.message ?? "登録処理中にエラーが発生しました" },
            { status: 500 }
        );
    }
}