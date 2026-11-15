export const TEAM_NAME_MAX_LENGTH = 50;
export const TEAM_NICKNAME_MIN_LENGTH = 2;
export const TEAM_NICKNAME_MAX_LENGTH = 5;
export const TEAM_NICKNAME_PATTERN = /^[a-zA-Z0-9_-]+$/;

/**
 * チーム名のバリデーション（エラー時はメッセージ、正常時は null）
 */
export function validateTeamName(rawValue: string): string | null {
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
