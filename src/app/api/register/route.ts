import {NextRequest, NextResponse} from "next/server";
import {Player} from "@/util/Player";
import {GoogleSpreadsheetService} from "@/util/SpreadSheetService";
import {REGISTER_HEADER} from "@/util/SheetHeader";
import {CheckTime} from "@/app/api/isApplication/checkTime";
import {CheckTeamAmount} from "@/app/api/isApplication/checkTeamAmount";
import {IsIgnore} from "@/app/api/isApplication/isIgnore";
import {CloudStorageService} from "@/util/StorageService";
import {detectImageType, MAX_LOGO_SIZE, DetectedImage} from "@/util/ImageValidator";
import {generateSalt, hashPassword, MIN_PASSWORD_LENGTH} from "@/util/Argon2Service";

export async function POST(req: NextRequest) {

    try {
        const { REGISTER_SHEET_ID, API_SETTINGS_SHEET_ID } = process.env;

        // (1) 早期サイズチェック（formData() の前）
        const contentLength = Number(req.headers.get("content-length") ?? 0);
        if (contentLength > MAX_LOGO_SIZE + 1024 * 1024) {
            return NextResponse.json(
                { message: "画像サイズは20MB以内である必要があります" },
                { status: 413 }
            );
        }

        const formData = await req.formData();

        // パスワードバリデーション
        const password = (formData.get("password") as string) ?? "";
        if (password.length < MIN_PASSWORD_LENGTH) {
            return NextResponse.json(
                { message: `パスワードは${MIN_PASSWORD_LENGTH}文字以上で入力してください` },
                { status: 400 }
            );
        }

        // (2) 画像検証（Player API 呼び出しの前）
        const logos = formData
            .getAll("teamLogo")
            .filter((v): v is File => typeof v === "object" && v.size > 0);
        if (logos.length > 1) {
            return NextResponse.json(
                { message: "チームロゴは1枚のみ添付できます" },
                { status: 400 }
            );
        }
        let logoBuffer: Buffer | null = null;
        let logoType: DetectedImage | null = null;
        if (logos.length === 1) {
            if (logos[0].size > MAX_LOGO_SIZE) {
                return NextResponse.json(
                    { message: "画像サイズは20MB以内である必要があります" },
                    { status: 400 }
                );
            }
            logoBuffer = Buffer.from(await logos[0].arrayBuffer());
            logoType = detectImageType(logoBuffer);
            if (!logoType) {
                return NextResponse.json(
                    { message: "画像ファイルはjpeg, jpg, png形式のみ受け付けています" },
                    { status: 400 }
                );
            }
        }

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

        // ソルト生成 & Argon2idハッシュ計算
        const salt = generateSalt();
        const hash = await hashPassword(password, salt);

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
        const teamWinRate = teamMemberWinRate.length > 0
            ? teamMemberWinRate.reduce((prev, current) => prev + current, 0) / teamMemberWinRate.length
            : 0;

        // ロゴ保存先ディレクトリの取得 (logo_directory シート)
        let logoDirectory = "logos";
        try {
            const logoDirSheet = await settingsBook.getSheet("logo_directory");
            if (logoDirSheet) {
                await logoDirSheet.loadCells({startRowIndex: 0, endRowIndex: 2, startColumnIndex: 0, endColumnIndex: 1});
                const dirVal = logoDirSheet.getCell(1, 0).value?.toString()?.trim();
                if (dirVal) {
                    logoDirectory = dirVal;
                }
            }
        } catch (e) {
            console.warn("Failed to load logo_directory setting, fallback to 'logos':", e);
        }

        // (3) アップロード → シート書き込み（失敗時はロールバック）
        const storage = new CloudStorageService();
        let uploaded: { objectName: string; url: string } | null = null;
        try {
            if (logoBuffer && logoType) {
                uploaded = await storage.uploadTeamLogo(logoBuffer, logoType, teamNickName, logoDirectory);
            }

            const sheetRows: (string[] | Record<string, string | number | boolean>)[] = [
                {
                    Type: "TeamInfo",
                    IGN: teamNickName,
                    ID: teamName,
                    WinRate: teamWinRate,
                    Contact: contact,
                    Comment: comment,
                    LogoURL: uploaded?.url ?? "", // G2セル
                    SaltAndHash: salt,            // H2セル (Salt)
                }
            ];
            for(let i = 0; i < players.length; i++){
                const row: Record<string, string | number | boolean> = {
                    Type: `player${i+1}`,
                    IGN: players[i].getIgn(),
                    ID: players[i].getUid() ?? "undefined",
                    WinRate: players[i].getWinRate() ?? "undefined",
                };
                if (i === 0) {
                    row.SaltAndHash = hash; // H3セル (Hash)
                } else if (i === 1) {
                    row.SaltAndHash = 0;    // H4セル (失敗回数初期値 0)
                }
                sheetRows.push(row);
            }

            //spreadsheetへの情報書き込み
            await spreadSheet.addSheet(teamNickName, REGISTER_HEADER);
            await spreadSheet.addRows(teamNickName, sheetRows);

        } catch (e) {
            if (uploaded) {
                await storage.deleteObject(uploaded.objectName);
            }
            throw e;
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
