import { validateSafeSheetText } from "@/util/SpreadsheetSanitizer";

export const TEAM_NAME_MAX_LENGTH = 50;
export const TEAM_NICKNAME_MIN_LENGTH = 2;
export const TEAM_NICKNAME_MAX_LENGTH = 5;
export const TEAM_NICKNAME_PATTERN = /^[a-zA-Z0-9_-]+$/;
export const CONTACT_MAX_LENGTH = 200;
export const COMMENT_MAX_LENGTH = 1000;
export const PLAYER_IGN_MIN_LENGTH = 3;
export const PLAYER_IGN_MAX_LENGTH = 24;
export const PLAYER_IGN_PATTERN = /^[a-zA-Z0-9_]+$/;
export const REQUIRED_PLAYER_COUNT = 7;
export const MAX_PLAYER_COUNT = 10;

/**
 * FormData から文字列値を型安全に抽出する（File オブジェクト等が渡された場合は不正とみなす）
 */
export function extractFormString(
    formData: FormData,
    key: string
): { ok: true; value: string } | { ok: false } {
    const raw = formData.get(key);
    if (raw === null) {
        return { ok: true, value: "" };
    }
    if (typeof raw !== "string") {
        return { ok: false };
    }
    return { ok: true, value: raw };
}

/**
 * チーム名のバリデーション（エラー時はメッセージ、正常時は null）
 */
export function validateTeamName(rawValue: string): string | null {
    const unsafeErr = validateSafeSheetText(rawValue, "チーム名");
    if (unsafeErr) {
        return unsafeErr;
    }
    const value = rawValue.trim();
    if (!value) {
        return "チーム名を入力してください";
    }
    if (value.length > TEAM_NAME_MAX_LENGTH) {
        return `${TEAM_NAME_MAX_LENGTH}字以内で入力してください`;
    }
    return null;
}

/**
 * チーム略名のバリデーション（エラー時はメッセージ、正常時は null）
 */
export function validateTeamNickName(rawValue: string): string | null {
    const value = rawValue.trim();
    if (!value) {
        return "チーム略名を入力してください";
    }
    if (value.length < TEAM_NICKNAME_MIN_LENGTH) {
        return `${TEAM_NICKNAME_MIN_LENGTH}文字以上で入力してください`;
    }
    if (value.length > TEAM_NICKNAME_MAX_LENGTH) {
        return `${TEAM_NICKNAME_MAX_LENGTH}字以内で入力してください`;
    }
    if (!TEAM_NICKNAME_PATTERN.test(value)) {
        return "ハイフン、アンダーバー、半角英数字(大文字含む)のみで入力してください";
    }
    return null;
}

/**
 * 代表者連絡先のバリデーション（エラー時はメッセージ、正常時は null）
 */
export function validateContact(rawValue: string): string | null {
    const unsafeErr = validateSafeSheetText(rawValue, "代表者連絡先");
    if (unsafeErr) {
        return unsafeErr;
    }
    const value = rawValue.trim();
    if (!value) {
        return "代表者連絡先を入力してください";
    }
    if (value.length > CONTACT_MAX_LENGTH) {
        return `代表者連絡先は${CONTACT_MAX_LENGTH}字以内で入力してください`;
    }
    return null;
}

/**
 * コメント欄のバリデーション（エラー時はメッセージ、正常時は null）
 */
export function validateComment(rawValue: string): string | null {
    const unsafeErr = validateSafeSheetText(rawValue, "コメント");
    if (unsafeErr) {
        return unsafeErr;
    }
    const value = rawValue.trim();
    if (value.length > COMMENT_MAX_LENGTH) {
        return `コメントは${COMMENT_MAX_LENGTH}字以内で入力してください`;
    }
    return null;
}

/**
 * 出場者 IGN のバリデーション（エラー時はメッセージ、正常時は null）
 */
export function validatePlayerIgn(rawValue: string, required: boolean): string | null {
    const value = rawValue.trim();
    if (!value) {
        return required ? "ゲーム内のプレイヤー名を入力してください" : null;
    }
    if (value.length < PLAYER_IGN_MIN_LENGTH) {
        return "プレイヤー名が短すぎます";
    }
    if (value.length > PLAYER_IGN_MAX_LENGTH) {
        return `プレイヤー名は${PLAYER_IGN_MAX_LENGTH}字以内で入力してください`;
    }
    if (!PLAYER_IGN_PATTERN.test(value)) {
        return "有効なプレイヤー名を入力してください";
    }
    return null;
}

/**
 * 出場者ロスター（player1〜10）の必須数・書式・チーム内重複を検証する
 */
export function validatePlayerRoster(rawIgns: string[]): string | null {
    if (rawIgns.length !== MAX_PLAYER_COUNT) {
        return "出場者情報の形式が不正です";
    }
    const seen = new Set<string>();
    for (let i = 0; i < rawIgns.length; i++) {
        const required = i < REQUIRED_PLAYER_COUNT;
        const err = validatePlayerIgn(rawIgns[i], required);
        if (err) {
            return `出場者${i + 1}: ${err}`;
        }
        const normalized = rawIgns[i].trim().toLowerCase();
        if (normalized) {
            if (seen.has(normalized)) {
                return `出場者${i + 1}のプレイヤー名がチーム内で重複しています`;
            }
            seen.add(normalized);
        }
    }
    return null;
}

/**
 * @ を含む管理用タブを除外した上で、大文字・小文字を区別せずチーム略名の重複を判定する
 */
export function hasDuplicateSheetName(sheetNames: string[], targetNickName: string): boolean {
    const normalizedTarget = targetNickName.trim().toLowerCase();
    if (!normalizedTarget) {
        return false;
    }
    return sheetNames
        .filter((name) => !name.includes("@"))
        .some((name) => name.trim().toLowerCase() === normalizedTarget);
}
