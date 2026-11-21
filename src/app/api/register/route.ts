import { NextRequest, NextResponse } from "next/server";
import type { GoogleSpreadsheetWorksheet } from "google-spreadsheet";
import { Player } from "@/util/Player";
import { GoogleSpreadsheetService } from "@/util/SpreadSheetService";
import { REGISTER_HEADER } from "@/util/SheetHeader";
import { CheckTime } from "@/app/api/isApplication/checkTime";
import { CheckTeamAmount } from "@/app/api/isApplication/checkTeamAmount";
import { IsIgnore } from "@/app/api/isApplication/isIgnore";
import { CloudStorageService } from "@/util/StorageService";
import {
    detectImageType,
    MAX_LOGO_SIZE,
    DetectedImage,
    validateImageDimensions,
} from "@/util/ImageValidator";
import {
    generateSalt,
    hashPassword,
    MAX_PASSWORD_LENGTH,
    MIN_PASSWORD_LENGTH,
} from "@/util/Argon2Service";
import { withTeamLocks } from "@/util/TeamAuth";
import { getCachedAppSettings, invalidateRegisterSheetNamesCache } from "@/util/AppSettingsCache";
import { checkRateLimit, extractClientIp } from "@/util/RateLimiter";
import { readFormDataWithLimit } from "@/util/RequestGuard";
import { verifySameOriginRequest } from "@/util/OriginGuard";
import {
    extractFormString,
    hasDuplicateSheetName,
    MAX_PLAYER_COUNT,
    validateComment,
    validateContact,
    validatePlayerRoster,
    validateTeamName,
    validateTeamNickName,
} from "@/util/TeamValidation";
import { assertSafeSheetCellString } from "@/util/SpreadsheetSanitizer";
import { logServerError } from "@/util/SafeLogger";

export async function POST(req: NextRequest) {
    const isStream = req.headers.get("accept")?.includes("application/x-ndjson");
    const encoder = new TextEncoder();

    const runProcess = async (
        sendProgress?: (step: string, progress: number) => void
    ): Promise<{ status: number; body: Record<string, any> }> => {
        try {
            const originCheck = verifySameOriginRequest(req);
            if (!originCheck.ok) {
                return { status: originCheck.status, body: { message: originCheck.message } };
            }

            const rate = checkRateLimit("register", extractClientIp(req), 10, 60_000);
            if (!rate.allowed) {
                return {
                    status: 429,
                    body: { message: "リクエストが多すぎます。少し待ってから再度お試しください" },
                };
            }

            const { REGISTER_SHEET_ID } = process.env;

            // (1) Content-Type・ストリームサイズ上限チェック（chunked 含む）
            const formResult = await readFormDataWithLimit(req, MAX_LOGO_SIZE + 1024 * 1024);
            if (!formResult.ok) {
                return { status: formResult.status, body: { message: formResult.message } };
            }
            const formData = formResult.formData;

            // 文字列フィールドの型安全抽出
            const passwordField = extractFormString(formData, "password");
            const teamNameField = extractFormString(formData, "teamName");
            const teamNickField = extractFormString(formData, "teamNickname");
            const contactField = extractFormString(formData, "contact");
            const commentField = extractFormString(formData, "comment");
            if (
                !passwordField.ok ||
                !teamNameField.ok ||
                !teamNickField.ok ||
                !contactField.ok ||
                !commentField.ok
            ) {
                return { status: 400, body: { message: "入力データの形式が不正です" } };
            }

            const igns: string[] = [];
            for (let i = 1; i <= MAX_PLAYER_COUNT; i++) {
                const playerField = extractFormString(formData, `player${i}`);
                if (!playerField.ok) {
                    return { status: 400, body: { message: `出場者${i}の形式が不正です` } };
                }
                igns.push(playerField.value.trim());
            }

            // パスワードおよび全フォーム項目のサーバーサイドバリデーション
            const password = passwordField.value;
            if (password.length < MIN_PASSWORD_LENGTH) {
                return {
                    status: 400,
                    body: { message: `パスワードは${MIN_PASSWORD_LENGTH}文字以上で入力してください` },
                };
            }
            if (password.length > MAX_PASSWORD_LENGTH) {
                return {
                    status: 400,
                    body: { message: `パスワードは${MAX_PASSWORD_LENGTH}文字以内で入力してください` },
                };
            }

            const teamName = teamNameField.value.trim();
            const teamNickName = teamNickField.value.trim();
            const contact = contactField.value.trim();
            const comment = commentField.value.trim();

            const validationErrors = [
                validateTeamName(teamName),
                validateTeamNickName(teamNickName),
                validateContact(contact),
                validateComment(comment),
                validatePlayerRoster(igns),
            ].filter((e): e is string => Boolean(e));

            if (validationErrors.length > 0) {
                return { status: 400, body: { message: validationErrors[0] } };
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
                const dimErr = validateImageDimensions(logoBuffer, logoType);
                if (dimErr) {
                    return {
                        status: 400,
                        body: { message: dimErr },
                    };
                }
            }

            const lockedExec = await withTeamLocks(["__register_global__", teamNickName], async () => {
                sendProgress?.("チーム情報の確認", 5);

                // 提出期限・募集上限チェック
                const [checkTime, checkTeamAmount, isIgnore, appSettings] = await Promise.all([
                    CheckTime(),
                    CheckTeamAmount(),
                    IsIgnore(),
                    getCachedAppSettings(),
                ]);
                if (!(isIgnore || (checkTime && checkTeamAmount))) {
                    return {
                        status: 503,
                        body: { message: "募集期間が過ぎています" },
                    };
                }

                // サーバーサイドでチーム略名の重複チェック（@を含むタブ名は除外・大文字小文字非区別）
                const spreadSheet = new GoogleSpreadsheetService(REGISTER_SHEET_ID ?? "");
                const sheetNames = await spreadSheet.getSheetNames();
                const validSheetNames = sheetNames.filter((name) => !name.includes("@"));

                // チーム数上限チェック
                if (!isIgnore && validSheetNames.length >= appSettings.maxTeamAmount) {
                    return {
                        status: 503,
                        body: { message: "募集チーム数が上限に達したため締め切りました" },
                    };
                }

                if (hasDuplicateSheetName(sheetNames, teamNickName)) {
                    return {
                        status: 409,
                        body: { message: "このチーム略名は既に登録されています" },
                    };
                }

                // ソルト生成 & Argon2idハッシュ計算
                const salt = generateSalt();
                const hash = await hashPassword(password, salt);

                // プレイヤーの実在・勝率確認
                const players: Player[] = [];
                for (let i = 0; i < igns.length; i++) {
                    sendProgress?.(`出場者${i + 1}の確認`, 10 + i * 7);
                    if (!igns[i]) {
                        players.push(new Player(""));
                        continue;
                    }
                    const p = await new Player(igns[i]).getInstance();
                    if (!p.getUid()) {
                        return {
                            status: 400,
                            body: { message: `出場者${i + 1}（${igns[i]}）がWargamingアカウントで確認できませんでした` },
                        };
                    }
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

                // ロゴ保存先ディレクトリの取得 (AppSettingsCache)
                const logoDirectory = appSettings.logoDirectory;

                // (3) アップロード → シート書き込み（失敗時はGCS＋シート双方をロールバック）
                const storage = new CloudStorageService();
                let uploaded: { objectName: string; url: string } | null = null;
                let createdSheet: GoogleSpreadsheetWorksheet | null = null;
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
                            IGN: assertSafeSheetCellString(teamNickName),
                            ID: assertSafeSheetCellString(teamName),
                            WinRate: teamWinRate,
                            Contact: assertSafeSheetCellString(contact),
                            Comment: assertSafeSheetCellString(comment),
                            LogoURL: assertSafeSheetCellString(uploaded?.url ?? ""), // G2セル
                            SaltAndHash: assertSafeSheetCellString(salt),          // H2セル (Salt)
                        },
                    ];
                    for (let i = 0; i < players.length; i++) {
                        const ign = players[i].getIgn();
                        const row: Record<string, string | number | boolean> = {
                            Type: `player${i + 1}`,
                            IGN: assertSafeSheetCellString(ign),
                            ID: ign ? (players[i].getUid() ?? "undefined") : "",
                            WinRate: ign ? (players[i].getWinRate() ?? "undefined") : "",
                        };
                        if (i === 0) {
                            row.SaltAndHash = hash; // H3セル (Hash)
                        } else if (i === 1) {
                            row.SaltAndHash = 0;    // H4セル (失敗回数初期値 0)
                        }
                        sheetRows.push(row);
                    }

                    // spreadsheetへの情報書き込み (RAW モード)
                    createdSheet = await spreadSheet.addSheet(teamNickName, REGISTER_HEADER);
                    await spreadSheet.addRows(teamNickName, sheetRows, { raw: true });
                    invalidateRegisterSheetNamesCache();
                } catch (e) {
                    if (createdSheet) {
                        try {
                            await createdSheet.delete();
                        } catch (rollbackErr) {
                            logServerError("POST /api/register rollback sheet", rollbackErr);
                        }
                    }
                    if (uploaded) {
                        await storage.deleteObject(uploaded.objectName);
                    }
                    throw e;
                }

                sendProgress?.("登録完了", 100);
                return { status: 200, body: { message: "ok" } };
            });

            if (lockedExec.locked) {
                return {
                    status: 429,
                    body: { message: "現在登録処理が混み合っています。少し待ってから再度お試しください" },
                };
            }

            return lockedExec.result;
        } catch (error: unknown) {
            logServerError("POST /api/register", error);
            return {
                status: 500,
                body: { message: "登録処理中にエラーが発生しました" },
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
