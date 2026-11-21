import { NextRequest, NextResponse } from "next/server";
import type { GoogleSpreadsheetWorksheet } from "google-spreadsheet";
import { authenticateTeamUnlocked, withTeamLocks } from "@/util/TeamAuth";
import { CheckTime } from "@/app/api/isApplication/checkTime";
import { IsIgnore } from "@/app/api/isApplication/isIgnore";
import { Player } from "@/util/Player";
import { GoogleSpreadsheetService } from "@/util/SpreadSheetService";
import { REGISTER_HEADER } from "@/util/SheetHeader";
import { CloudStorageService } from "@/util/StorageService";
import { detectImageType, DetectedImage, MAX_LOGO_SIZE } from "@/util/ImageValidator";
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
import { assertSafeSheetCellString, setCellStringSafe } from "@/util/SpreadsheetSanitizer";
import { logServerError } from "@/util/SafeLogger";

/**
 * 既存の公開URLからGCSオブジェクト名を抽出する（拡張子変更時の旧ファイル削除用）
 */
function extractObjectNameFromUrl(url: string): string | null {
    if (!url) return null;
    try {
        const parsed = new URL(url);
        // https://storage.googleapis.com/{bucketName}/{objectName}
        const parts = parsed.pathname.split("/").filter(Boolean);
        if (parts.length < 2) return null;
        return parts
            .slice(1)
            .map((p) => decodeURIComponent(p))
            .join("/");
    } catch {
        return null;
    }
}

/**
 * API設定シートからロゴ保存先ディレクトリ名を取得する
 */
async function resolveLogoDirectory(apiSettingsSheetId: string): Promise<string> {
    let logoDirectory = "logos";
    try {
        const settingsBook = new GoogleSpreadsheetService(apiSettingsSheetId);
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
    return logoDirectory;
}

/**
 * チームシート新規作成用の行データを組み立てる
 */
function buildRecreatedSheetRows(params: {
    teamNickName: string;
    teamName: string;
    teamWinRate: number;
    contact: string;
    comment: string;
    logoUrl: string;
    salt: string;
    passwordHash: string;
    players: Player[];
}): Record<string, string | number | boolean>[] {
    const rows: Record<string, string | number | boolean>[] = [
        {
            Type: "TeamInfo",
            IGN: assertSafeSheetCellString(params.teamNickName),
            ID: assertSafeSheetCellString(params.teamName),
            WinRate: params.teamWinRate,
            Contact: assertSafeSheetCellString(params.contact),
            Comment: assertSafeSheetCellString(params.comment),
            LogoURL: assertSafeSheetCellString(params.logoUrl),
            SaltAndHash: assertSafeSheetCellString(params.salt),
        },
    ];

    for (let i = 0; i < params.players.length; i++) {
        const p = params.players[i];
        const ign = p.getIgn();
        const row: Record<string, string | number | boolean> = {
            Type: `player${i + 1}`,
            IGN: assertSafeSheetCellString(ign),
            ID: ign ? (p.getUid() ?? "undefined") : "",
            WinRate: ign ? (p.getWinRate() ?? "undefined") : "",
        };
        if (i === 0) {
            row.SaltAndHash = params.passwordHash; // H3: Hash
        } else if (i === 1) {
            row.SaltAndHash = 0; // H4: 失敗回数初期値 0
        }
        rows.push(row);
    }
    return rows;
}

export async function POST(req: NextRequest) {
    const isStream = req.headers.get("accept")?.includes("application/x-ndjson");
    const encoder = new TextEncoder();

    const runProcess = async (
        sendProgress?: (step: string, progress: number) => void
    ): Promise<{ status: number; body: Record<string, any> }> => {
        try {
            const { REGISTER_SHEET_ID, API_SETTINGS_SHEET_ID } = process.env;

            // (1) 早期サイズチェック
            const contentLength = Number(req.headers.get("content-length") ?? 0);
            if (contentLength > MAX_LOGO_SIZE + 1024 * 1024) {
                return {
                    status: 413,
                    body: { message: "画像サイズは20MB以内である必要があります" },
                };
            }

            const formData = await req.formData();

            const nickKey = formData.get("teamNickName") !== null ? "teamNickName" : "teamNickname";
            const teamNickField = extractFormString(formData, nickKey);
            const newNickField = extractFormString(formData, "newTeamNickName");
            const teamNameField = extractFormString(formData, "teamName");
            const passwordField = extractFormString(formData, "password");
            const contactField = extractFormString(formData, "contact");
            const commentField = extractFormString(formData, "comment");

            if (
                !teamNickField.ok ||
                !newNickField.ok ||
                !teamNameField.ok ||
                !passwordField.ok ||
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

            const teamNickName = teamNickField.value.trim();
            const hasExplicitNewNick = formData.get("newTeamNickName") !== null;
            const newTeamNickName =
                hasExplicitNewNick && newNickField.value.trim() !== ""
                    ? newNickField.value.trim()
                    : hasExplicitNewNick
                        ? ""
                        : teamNickName;
            const teamName = teamNameField.value.trim();
            const password = passwordField.value;
            const contact = contactField.value.trim();
            const comment = commentField.value.trim();

            // 全テキストフィールド・ロスターのサーバーサイドバリデーション
            const validationErrors = [
                validateTeamName(teamName),
                validateTeamNickName(newTeamNickName),
                validateContact(contact),
                validateComment(comment),
                validatePlayerRoster(igns),
            ].filter((e): e is string => Boolean(e));
            if (validationErrors.length > 0) {
                return { status: 400, body: { message: validationErrors[0] } };
            }

            // (2) 画像検証
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

            // 同一チーム（略名変更時は旧・新両方）の同時リクエスト排他ロック内で認証・更新を実行
            const lockedExec = await withTeamLocks([teamNickName, newTeamNickName], async () => {
                sendProgress?.("チーム情報の確認", 5);

                // (3) 認証 & シート取得
                const auth = await authenticateTeamUnlocked(teamNickName, password);
                if (!auth.ok) {
                    return {
                        status: auth.status,
                        body: { message: auth.message },
                    };
                }

                // (4) 募集期間チェック
                const checkTime = await CheckTime();
                const isIgnore = await IsIgnore();
                if (!(isIgnore || checkTime)) {
                    return {
                        status: 503,
                        body: { message: "現在は変更受付期間ではありません" },
                    };
                }

                const isNickChanged = newTeamNickName !== auth.teamData.teamNickName;
                const spreadSheet = isNickChanged
                    ? new GoogleSpreadsheetService(REGISTER_SHEET_ID ?? "")
                    : null;

                // 略名変更時は新しい略名の重複チェックを Player API 呼び出し前に実施（大文字小文字非区別）
                if (isNickChanged && spreadSheet) {
                    const sheetNames = await spreadSheet.getSheetNames();
                    if (hasDuplicateSheetName(sheetNames, newTeamNickName)) {
                        return {
                            status: 409,
                            body: { message: "このチーム略名は既に登録されています" },
                        };
                    }
                }

                // (5) Wargaming API でプレイヤーの UID・勝率を取得
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

                // (6) ロゴ処理（新規アップロード、または略名変更に伴う既存ロゴのコピー）
                const storage = new CloudStorageService();
                let logoResult: { objectName: string; url: string } | null = null;
                const prevLogoUrl = auth.teamData.logoUrl;
                const prevObjectName = extractObjectNameFromUrl(prevLogoUrl);

                if (logoBuffer && logoType) {
                    sendProgress?.("画像のアップロード", 82);
                    const logoDirectory = await resolveLogoDirectory(API_SETTINGS_SHEET_ID ?? "");
                    logoResult = await storage.uploadTeamLogo(
                        logoBuffer,
                        logoType,
                        newTeamNickName,
                        logoDirectory
                    );
                } else if (isNickChanged && prevObjectName) {
                    sendProgress?.("画像の移行", 82);
                    logoResult = await storage.copyTeamLogo(prevObjectName, newTeamNickName);
                }

                const createdNewLogo = Boolean(
                    logoResult && (!prevObjectName || prevObjectName !== logoResult.objectName)
                );
                let createdSheet: GoogleSpreadsheetWorksheet | null = null;

                try {
                    sendProgress?.("登録情報の書き込み", 92);

                    if (!isNickChanged) {
                        const { sheet } = auth;
                        // Row 2 (index 1: TeamInfo) の更新（B2 チーム略名・H列 Salt/Hash/Lock は維持）
                        setCellStringSafe(sheet.getCell(1, 2), teamName);  // C2: チーム名
                        sheet.getCell(1, 3).numberValue = teamWinRate;     // D2: WinRate
                        setCellStringSafe(sheet.getCell(1, 4), contact);   // E2: Contact
                        setCellStringSafe(sheet.getCell(1, 5), comment);   // F2: Comment
                        if (logoResult) {
                            setCellStringSafe(sheet.getCell(1, 6), `${logoResult.url}?v=${Date.now()}`); // G2: LogoURL
                        }

                        // Row 3〜12 (index 2〜11: player1〜player10) の更新
                        for (let i = 0; i < 10; i++) {
                            const rowIndex = 2 + i;
                            const p = players[i];
                            const ign = p.getIgn();
                            setCellStringSafe(sheet.getCell(rowIndex, 0), `player${i + 1}`);
                            setCellStringSafe(sheet.getCell(rowIndex, 1), ign);

                            const uid = p.getUid();
                            const idCell = sheet.getCell(rowIndex, 2);
                            if (ign && typeof uid === "number" && Number.isFinite(uid)) {
                                idCell.numberValue = uid;
                            } else {
                                setCellStringSafe(idCell, ign ? String(uid ?? "undefined") : "");
                            }

                            const wr = p.getWinRate();
                            const wrCell = sheet.getCell(rowIndex, 3);
                            if (ign && typeof wr === "number" && Number.isFinite(wr)) {
                                wrCell.numberValue = wr;
                            } else {
                                setCellStringSafe(wrCell, ign ? "undefined" : "");
                            }
                        }

                        await sheet.saveUpdatedCells();
                    } else if (spreadSheet) {
                        // 略名変更時: ① 新シート作成＆書き込み → ② 旧シート削除
                        const nextLogoUrl = logoResult
                            ? `${logoResult.url}?v=${Date.now()}`
                            : prevLogoUrl;
                        const sheetRows = buildRecreatedSheetRows({
                            teamNickName: newTeamNickName,
                            teamName,
                            teamWinRate,
                            contact,
                            comment,
                            logoUrl: nextLogoUrl,
                            salt: auth.salt,
                            passwordHash: auth.passwordHash,
                            players,
                        });

                        createdSheet = await spreadSheet.addSheet(newTeamNickName, REGISTER_HEADER);
                        await createdSheet.addRows(sheetRows, { raw: true });
                        await auth.sheet.delete();
                    }
                } catch (e) {
                    if (createdSheet) {
                        try {
                            await createdSheet.delete();
                        } catch (rollbackErr) {
                            logServerError("POST /api/team/update rollback sheet", rollbackErr);
                        }
                    }
                    if (createdNewLogo && logoResult) {
                        await storage.deleteObject(logoResult.objectName);
                    }
                    throw e;
                }

                // 略名変更や拡張子変更等で旧ロゴと別オブジェクトになった場合、シート反映後に旧ロゴを削除
                if (logoResult && prevObjectName && prevObjectName !== logoResult.objectName) {
                    await storage.deleteObject(prevObjectName);
                }

                sendProgress?.("更新完了", 100);
                return {
                    status: 200,
                    body: {
                        message: "ok",
                        nickChanged: isNickChanged,
                        teamNickName: newTeamNickName,
                    },
                };
            });

            if (lockedExec.locked) {
                return {
                    status: 429,
                    body: { message: "現在処理中です。しばらく待ってから再度お試しください" },
                };
            }

            return lockedExec.result;
        } catch (error: unknown) {
            logServerError("POST /api/team/update", error);
            return {
                status: 500,
                body: { message: "更新処理中にエラーが発生しました" },
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
                    message: res.body.message ?? "更新処理中にエラーが発生しました",
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

