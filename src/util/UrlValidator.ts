/**
 * 外部リンク・画像 URL 用の安全なスキーム／ホスト許可リスト検証ヘルパー
 */

/**
 * Discord 招待 URL が安全な HTTPS 招待リンクであるかを検証する。
 */
export function isSafeDiscordInviteUrl(rawUrl: string): boolean {
    const trimmed = rawUrl.trim();
    if (!trimmed) {
        return false;
    }

    let parsed: URL;
    try {
        parsed = new URL(trimmed);
    } catch {
        return false;
    }

    if (parsed.protocol !== "https:") {
        return false;
    }

    const host = parsed.hostname.toLowerCase();
    if (host === "discord.gg") {
        return parsed.pathname.length > 1 && !parsed.pathname.includes("..");
    }
    if (host === "discord.com" || host === "www.discord.com") {
        return parsed.pathname.startsWith("/invite/") && parsed.pathname.length > "/invite/".length;
    }

    return false;
}

/**
 * クライアント側で描画するチームロゴ URL が公式 GCS エンドポイントであるかを検証する。
 */
export function isSafeGcsLogoUrl(rawUrl: string): boolean {
    const trimmed = rawUrl.trim();
    if (!trimmed) {
        return false;
    }

    let parsed: URL;
    try {
        parsed = new URL(trimmed);
    } catch {
        return false;
    }

    if (parsed.protocol !== "https:" || parsed.hostname.toLowerCase() !== "storage.googleapis.com") {
        return false;
    }

    const parts = parsed.pathname.split("/").filter(Boolean);
    if (parts.length < 2) {
        return false;
    }
    return !parts.some((p) => p === "." || p === ".." || p.includes(".."));
}
