import { NextRequest, NextResponse } from "next/server";
import { authenticateTeamUnlocked, withTeamLock } from "@/util/TeamAuth";
import { CheckTime } from "@/app/api/isApplication/checkTime";
import { IsIgnore } from "@/app/api/isApplication/isIgnore";
import { Player } from "@/util/Player";
import { GoogleSpreadsheetService } from "@/util/SpreadSheetService";
import { CloudStorageService } from "@/util/StorageService";
import { detectImageType, DetectedImage, MAX_LOGO_SIZE } from "@/util/ImageValidator";

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

export async function POST(req: NextRequest) {
    try {
        const { API_SETTINGS_SHEET_ID } = process.env;

        // (1) 早期サイズチェック
        const contentLength = Number(req.headers.get("content-length") ?? 0);
        if (contentLength > MAX_LOGO_SIZE + 1024 * 1024) {
            return NextResponse.json(
                { message: "画像サイズは20MB以内である必要があります" },
                { status: 413 }
            );
        }

        const formData = await req.formData();

        const teamNickName = (
            (formData.get("teamNickName") ?? formData.get("teamNickname") ?? "") as string
        ).trim();
        const password = ((formData.get("password") ?? "") as string);

        // (2) 画像検証
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

        // 同一チームの同時リクエスト排他ロック内で認証・更新を実行
        const lockedExec = await withTeamLock(teamNickName, async () => {
            // (3) 認証 & シート取得
            const auth = await authenticateTeamUnlocked(teamNickName, password);
            if (!auth.ok) {
                return NextResponse.json(
                    { message: auth.message },
                    { status: auth.status }
                );
            }

            // (4) 募集期間チェック
            const checkTime = await CheckTime();
            const isIgnore = await IsIgnore();
            if (!(isIgnore || checkTime)) {
                return NextResponse.json(
                    { message: "現在は変更受付期間ではありません" },
                    { status: 503 }
                );
            }

            const contact = ((formData.get("contact") ?? "") as string);
            const comment = ((formData.get("comment") ?? "") as string);
            const igns: string[] = [];
            for (let i = 1; i <= 10; i++) {
                igns.push(((formData.get(`player${i}`) ?? "") as string).trim());
            }

            // 必須プレイヤー (player1 〜 player7) のチェック
            for (let i = 0; i < 7; i++) {
                if (!igns[i]) {
                    return NextResponse.json(
                        { message: `出場者${i + 1}を入力してください` },
                        { status: 400 }
                    );
                }
            }

            // (5) Wargaming API でプレイヤーの UID・勝率を取得
            const players = await Promise.all(
                igns.map((ign) => new Player(ign).getInstance())
            );

            const teamMemberWinRate = players
                .map((p) => p.getWinRate())
                .filter((wr): wr is number => typeof wr === "number");
            const teamWinRate =
                teamMemberWinRate.length > 0
                    ? teamMemberWinRate.reduce((prev, current) => prev + current, 0) /
                      teamMemberWinRate.length
                    : 0;

            // (6) ロゴアップロード（添付がある場合のみ）
            const storage = new CloudStorageService();
            let uploaded: { objectName: string; url: string } | null = null;
            const prevLogoUrl = auth.teamData.logoUrl;
            const prevObjectName = extractObjectNameFromUrl(prevLogoUrl);

            if (logoBuffer && logoType) {
                let logoDirectory = "logos";
                try {
                    const settingsBook = new GoogleSpreadsheetService(API_SETTINGS_SHEET_ID ?? "");
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

                uploaded = await storage.uploadTeamLogo(
                    logoBuffer,
                    logoType,
                    auth.teamData.teamNickName,
                    logoDirectory
                );
            }

            try {
                const { sheet } = auth;

                // Row 2 (index 1: TeamInfo) の更新
                // B2 (teamNickName), C2 (teamName), H列 (Salt/Hash/Lock) は絶対に変更しない
                sheet.getCell(1, 3).value = teamWinRate; // D2: WinRate
                sheet.getCell(1, 4).value = contact;     // E2: Contact
                sheet.getCell(1, 5).value = comment;     // F2: Comment
                if (uploaded) {
                    sheet.getCell(1, 6).value = `${uploaded.url}?v=${Date.now()}`; // G2: LogoURL
                }

                // Row 3〜12 (index 2〜11: player1〜player10) の更新
                for (let i = 0; i < 10; i++) {
                    const rowIndex = 2 + i;
                    const p = players[i];
                    const ign = p.getIgn();
                    sheet.getCell(rowIndex, 0).value = `player${i + 1}`;
                    sheet.getCell(rowIndex, 1).value = ign;
                    sheet.getCell(rowIndex, 2).value = ign ? (p.getUid() ?? "undefined") : "";
                    sheet.getCell(rowIndex, 3).value = ign ? (p.getWinRate() ?? "undefined") : "";
                }

                await sheet.saveUpdatedCells();

                // 拡張子変更等でオブジェクト名が変わった場合、旧ロゴオブジェクトを削除
                if (uploaded && prevObjectName && prevObjectName !== uploaded.objectName) {
                    await storage.deleteObject(prevObjectName);
                }
            } catch (e) {
                // 新規オブジェクトを作成していた場合はロールバック削除
                if (uploaded && (!prevObjectName || prevObjectName !== uploaded.objectName)) {
                    await storage.deleteObject(uploaded.objectName);
                }
                throw e;
            }

            return NextResponse.json({ message: "ok" });
        });

        if (lockedExec.locked) {
            return NextResponse.json(
                { message: "現在処理中です。しばらく待ってから再度お試しください" },
                { status: 429 }
            );
        }

        return lockedExec.result;
    } catch (error: any) {
        console.error(error);
        return NextResponse.json(
            { message: error?.message ?? "更新処理中にエラーが発生しました" },
            { status: 500 }
        );
    }
}

