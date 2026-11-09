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
    const isStream = req.headers.get("accept")?.includes("application/x-ndjson");
    const encoder = new TextEncoder();

    const runProcess = async (
        sendProgress?: (step: string, progress: number) => void
    ): Promise<{ status: number; body: Record<string, any> }> => {
        try {
            const { REGISTER_SHEET_ID, API_SETTINGS_SHEET_ID } = process.env;

            // (1) 早期サイズチェック（formData() の前）
            const contentLength = Number(req.headers.get("content-length") ?? 0);
            if (contentLength > MAX_LOGO_SIZE + 1024 * 1024) {
                return {
                    status: 413,
                    body: { message: "画像サイズは20MB以内である必要があります" },
                };
            }

            const formData = await req.formData();

            // パスワードバリデーション
            const password = (formData.get("password") as string) ?? "";
            if (password.length < MIN_PASSWORD_LENGTH) {
                return {
                    status: 400,
                    body: { message: `パスワードは${MIN_PASSWORD_LENGTH}文字以上で入力してください` },
                };
            }

            // (2) 画像検証（Player API 呼び出しの前）
            const logos = formData
                .getAll("teamLogo")
                .filter((v): v is File => typeof v === "object" && v.size > 0);
            if (logos.length > 1) {
                return {
                    status: 400,
                    body: { message: "チームロゴは1枚のみ添付できます" },
                };
            }
            let logoBuffer: Buffer | null = null;
            let logoType: DetectedImage | null = null;
            if (logos.length === 1) {
                if (logos[0].size > MAX_LOGO_SIZE) {
                    return {
                        status: 400,
                        body: { message: "画像サイズは20MB以内である必要があります" },
                    };
                }
                logoBuffer = Buffer.from(await logos[0].arrayBuffer());
                logoType = detectImageType(logoBuffer);
                if (!logoType) {
                    return {
                        status: 400,
                        body: { message: "画像ファイルはjpeg, jpg, png形式のみ受け付けています" },
                    };
                }
            }

            sendProgress?.("チーム情報の確認", 5);

            //提出期限すぎていないかのチェック
            const checkTime = await CheckTime();
            const checkTeamAmount = await CheckTeamAmount();
            const isIgnore = await IsIgnore();
            if (!(isIgnore || (checkTime && checkTeamAmount))) {
                return {
                    status: 503,
                    body: { message: "募集期間が過ぎています" },
                };
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
                return {
                    status: 500,
                    body: { message: "チーム略名に「@」は使用できません" },
                };
            }

            // サーバーサイドでチーム略名の重複チェック（@を含むタブ名は除外）
            const spreadSheet = new GoogleSpreadsheetService(REGISTER_SHEET_ID ?? "");
            const sheetNames = await spreadSheet.getSheetNames();
            const validSheetNames = sheetNames.filter((name) => !name.includes("@"));

            // チーム数上限チェック
            //チーム上限の設定取得
            const settingsBook = new GoogleSpreadsheetService(API_SETTINGS_SHEET_ID ?? "");
            const settingsSheet = await settingsBook.getSheet("maxTeamAmount");
            await settingsSheet.loadCells({
                startRowIndex: 0,
                endRowIndex: 2,
                startColumnIndex: 0,
                endColumnIndex: 2,
            });
            const MAX_TEAM_AMOUNT = Number(settingsSheet.getCell(1, 0).value?.toString() ?? "0");
            if (validSheetNames.length >= MAX_TEAM_AMOUNT) {
                return {
                    status: 503,
                    body: { message: "募集チーム数が上限に達したため締め切りました" },
                };
            }

            if (validSheetNames.includes(teamNickName)) {
                return {
                    status: 500,
                    body: { message: "このチーム略名は既に登録されています" },
                };
            }

            // ソルト生成 & Argon2idハッシュ計算
            const salt = generateSalt();
            const hash = await hashPassword(password, salt);

            //プレイヤーの取得
            const igns = [ign1, ign2, ign3, ign4, ign5, ign6, ign7, ign8, ign9, ign10];
            const players: Player[] = [];
            for (let i = 0; i < igns.length; i++) {
                sendProgress?.(`出場者${i + 1}の確認`, 10 + i * 7);
                const p = await new Player(igns[i]).getInstance();
                players.push(p);
            }

            const teamMemberWinRate = players
                .map((p) => p.getWinRate())
                .filter((wr): wr is number => typeof wr === "number");
            const teamWinRate =
                teamMemberWinRate.length > 0
                    ? teamMemberWinRate.reduce((prev, current) => prev + current, 0) /
                      teamMemberWinRate.length
                    : 0;

            // ロゴ保存先ディレクトリの取得 (logo_directory シート)
            let logoDirectory = "logos";
            try {
                const logoDirSheet = await settingsBook.getSheet("logo_directory");
                if (logoDirSheet) {
                    await logoDirSheet.loadCells({
                        startRowIndex: 0,
                        endRowIndex: 2,
                        startColumnIndex: 0,
                        endColumnIndex: 1,
                    });
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
                    sendProgress?.("画像のアップロード", 82);
                    uploaded = await storage.uploadTeamLogo(
                        logoBuffer,
                        logoType,
                        teamNickName,
                        logoDirectory
                    );
                }

                sendProgress?.("登録情報の書き込み", 92);

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
                    },
                ];
                for (let i = 0; i < players.length; i++) {
                    const row: Record<string, string | number | boolean> = {
                        Type: `player${i + 1}`,
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

            sendProgress?.("登録完了", 100);
            return { status: 200, body: { message: "ok" } };
        } catch (error: any) {
            console.error(error); // エラー内容をログ出力
            return {
                status: 500,
                body: { message: error?.message ?? "登録処理中にエラーが発生しました" },
            };
        }
    };

    if (!isStream) {
        const res = await runProcess();
        return NextResponse.json(res.body, { status: res.status });
    }

    const stream = new ReadableStream({
        async start(controller) {
            const sendEvent = (data: Record<string, any>) => {
                controller.enqueue(encoder.encode(JSON.stringify(data) + "\n"));
            };
            const res = await runProcess((step, progress) => {
                sendEvent({ type: "progress", step, progress });
            });
            if (res.status >= 200 && res.status < 300) {
                sendEvent({ type: "done", ...res.body });
            } else {
                sendEvent({
                    type: "error",
                    status: res.status,
                    message: res.body.message ?? "登録処理中にエラーが発生しました",
                });
            }
            controller.close();
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "application/x-ndjson; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
        },
    });
}
