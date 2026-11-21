import { timingSafeEqual } from "crypto";
import { GoogleSpreadsheetWorksheet } from "google-spreadsheet";
import { GoogleSpreadsheetService } from "@/util/SpreadSheetService";
import { hashPassword, MAX_PASSWORD_LENGTH } from "@/util/Argon2Service";
import { logServerError } from "@/util/SafeLogger";

export const MAX_AUTH_FAILURES = 10;
export const LOCK_DURATION_MS = 60 * 60 * 1000; // 1時間

export interface TeamData {
    teamNickName: string;
    teamName: string;
    contact: string;
    comment: string;
    logoUrl: string;
    players: string[]; // player1 〜 player10 の IGN (10要素)
}

export type AuthResult =
    | {
          ok: true;
          status: 200;
          sheet: GoogleSpreadsheetWorksheet;
          teamData: TeamData;
          salt: string;
          passwordHash: string;
      }
    | {
          ok: false;
          status: 400 | 401 | 403 | 404 | 429 | 500;
          message: string;
      };

// 同一プロセス内での並列リクエスト排他制御用セット
const globalForAuth = globalThis as unknown as {
    __wowsCrfProcessingTeams?: Set<string>;
};
const processingTeams =
    globalForAuth.__wowsCrfProcessingTeams ??
    (globalForAuth.__wowsCrfProcessingTeams = new Set<string>());

/**
 * 複数チームキーに対する認証・更新処理を排他実行するラッパー（デッドロック防止のため辞書順処理）
 */
export async function withTeamLocks<T>(
    teamNickNames: string[],
    fn: () => Promise<T>
): Promise<{ locked: true } | { locked: false; result: T }> {
    const keys = Array.from(
        new Set(teamNickNames.map((name) => name.trim().toLowerCase()).filter(Boolean))
    ).sort();

    if (keys.some((key) => processingTeams.has(key))) {
        return { locked: true };
    }
    for (const key of keys) {
        processingTeams.add(key);
    }
    try {
        const result = await fn();
        return { locked: false, result };
    } finally {
        for (const key of keys) {
            processingTeams.delete(key);
        }
    }
}

/**
 * 同一チームに対する認証・更新処理を排他実行するラッパー
 */
export async function withTeamLock<T>(
    teamNickName: string,
    fn: () => Promise<T>
): Promise<{ locked: true } | { locked: false; result: T }> {
    return withTeamLocks([teamNickName], fn);
}

/**
 * 定数時間でのハッシュ文字列比較
 */
function safeCompareHex(a: string, b: string): boolean {
    const cleanA = a.trim().toLowerCase();
    const cleanB = b.trim().toLowerCase();
    if (cleanA.length === 0 || cleanA.length !== cleanB.length) {
        return false;
    }
    const bufA = Buffer.from(cleanA, "utf8");
    const bufB = Buffer.from(cleanB, "utf8");
    if (bufA.length !== bufB.length) {
        return false;
    }
    return timingSafeEqual(bufA, bufB);
}

/**
 * チーム略名とパスワードを検証し、ロック制御およびシートデータの取得を行う
 * （呼び出し側で withTeamLock 内に包むか、単体で authenticateTeamWithLock を使用する）
 */
export async function authenticateTeamUnlocked(
    teamNickName: string,
    password: string
): Promise<AuthResult> {
    const trimmedNick = (teamNickName ?? "").trim();
    if (!trimmedNick || trimmedNick.includes("@")) {
        return {
            ok: false,
            status: 404,
            message: "指定されたチームが見つかりません",
        };
    }

    if (!password || password.length > MAX_PASSWORD_LENGTH) {
        return {
            ok: false,
            status: 401,
            message: "パスワードが正しくありません",
        };
    }

    const { REGISTER_SHEET_ID } = process.env;
    const spreadSheet = new GoogleSpreadsheetService(REGISTER_SHEET_ID ?? "");
    const sheet = await spreadSheet.getSheet(trimmedNick);

    if (!sheet) {
        return {
            ok: false,
            status: 404,
            message: "指定されたチームが見つかりません",
        };
    }

    // A1:H12 (Row 0..11, Col 0..7) を一括ロード
    await sheet.loadCells({
        startRowIndex: 0,
        endRowIndex: 12,
        startColumnIndex: 0,
        endColumnIndex: 8,
    });

    const saltCell = sheet.getCell(1, 7);      // H2: Salt
    const hashCell = sheet.getCell(2, 7);      // H3: Hash
    const failCell = sheet.getCell(3, 7);      // H4: 失敗回数 or "Lock"
    const lockUntilCell = sheet.getCell(4, 7); // H5: ロック解除時刻 (ISO 8601)

    const salt = saltCell.value?.toString()?.trim() ?? "";
    const storedHash = hashCell.value?.toString()?.trim()?.toLowerCase() ?? "";

    // H2 または H3 が未設定（旧データ）
    if (!salt || !storedHash) {
        return {
            ok: false,
            status: 403,
            message: "パスワード未設定です。運営へお問い合わせください",
        };
    }

    // ロック状態の確認 (H4 / H5)
    // 運営が H4・H5 を空にした場合は「失敗回数0・ロックなし」として扱う
    const rawFail = failCell.value?.toString()?.trim() ?? "";
    const rawLockUntil = lockUntilCell.value?.toString()?.trim() ?? "";

    let failCount = 0;
    if (rawFail.toLowerCase() === "lock") {
        const unlockTimestamp = rawLockUntil ? Date.parse(rawLockUntil) : NaN;
        if (!Number.isNaN(unlockTimestamp) && Date.now() < unlockTimestamp) {
            return {
                ok: false,
                status: 429,
                message: "ロック中です。しばらくしてから再度お試しください",
            };
        }
        // ロック解除時刻を過ぎている、またはH5が空の場合は自動解除してカウント0から再開
        failCount = 0;
    } else if (rawFail !== "") {
        const parsed = Number(rawFail);
        if (Number.isFinite(parsed) && parsed >= 0) {
            failCount = Math.floor(parsed);
        }
        if (failCount >= MAX_AUTH_FAILURES) {
            const unlockTimestamp = rawLockUntil ? Date.parse(rawLockUntil) : NaN;
            if (!Number.isNaN(unlockTimestamp) && Date.now() < unlockTimestamp) {
                return {
                    ok: false,
                    status: 429,
                    message: "ロック中です。しばらくしてから再度お試しください",
                };
            }
            failCount = 0;
        }
    }

    // Argon2id でハッシュ計算して定数時間比較
    let computedHash: string;
    try {
        computedHash = await hashPassword(password, salt);
    } catch {
        return {
            ok: false,
            status: 500,
            message: "認証処理中にエラーが発生しました",
        };
    }

    const isMatch = safeCompareHex(computedHash, storedHash);

    if (!isMatch) {
        const nextFail = failCount + 1;
        if (nextFail >= MAX_AUTH_FAILURES) {
            failCell.value = "Lock";
            lockUntilCell.value = new Date(Date.now() + LOCK_DURATION_MS).toISOString();
        } else {
            failCell.value = nextFail;
            lockUntilCell.value = "";
        }
        await sheet.saveUpdatedCells();

        return {
            ok: false,
            status: 401,
            message: "パスワードが正しくありません",
        };
    }

    // 認証成功: H4を0に戻し、H5をクリア
    if (failCell.value !== 0 || (lockUntilCell.value !== null && lockUntilCell.value !== "")) {
        failCell.value = 0;
        lockUntilCell.value = "";
        await sheet.saveUpdatedCells();
    }

    // シートから現在のチームデータを抽出（数式セルが混入していた場合は評価結果を返却しない）
    const readSafeCellString = (row: number, col: number, fallback = ""): string => {
        const cell = sheet.getCell(row, col);
        if (cell.formula) {
            logServerError("TeamAuth.readSafeCellString", `Formula detected in cell (${row}, ${col})`);
            return "";
        }
        return cell.value?.toString() ?? fallback;
    };

    const players: string[] = [];
    for (let i = 0; i < 10; i++) {
        const rawIgn = readSafeCellString(2 + i, 1).trim();
        players.push(rawIgn === "undefined" ? "" : rawIgn);
    }

    const teamData: TeamData = {
        teamNickName: readSafeCellString(1, 1, trimmedNick),
        teamName: readSafeCellString(1, 2),
        contact: readSafeCellString(1, 4),
        comment: readSafeCellString(1, 5),
        logoUrl: readSafeCellString(1, 6),
        players,
    };

    return {
        ok: true,
        status: 200,
        sheet,
        teamData,
        salt,
        passwordHash: storedHash,
    };
}

/**
 * インメモリ排他ロック付きでチーム認証を実行する
 */
export async function authenticateTeam(
    teamNickName: string,
    password: string
): Promise<AuthResult> {
    const lockedExec = await withTeamLock(teamNickName ?? "", () =>
        authenticateTeamUnlocked(teamNickName, password)
    );
    if (lockedExec.locked) {
        return {
            ok: false,
            status: 429,
            message: "現在処理中です。しばらく待ってから再度お試しください",
        };
    }
    return lockedExec.result;
}

