/**
 * 秘密情報・APIキーを露出させない安全なサーバーエラーログ出力ユーティリティ
 */

/**
 * エラーメッセージ等に含まれるクエリパラメータ上の API キー等をマスクする。
 */
export function sanitizeErrorMessage(input: string): string {
    return input
        .replace(/(application_id|api_key|key|token|secret)=([^&\s]+)/gi, "$1=[REDACTED]")
        .replace(/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, "[REDACTED_PRIVATE_KEY]");
}

/**
 * レスポンス JSON に生例外を返さず、サーバーログに安全化された概要のみ出力する。
 */
export function logServerError(context: string, error: unknown): void {
    if (error instanceof Error) {
        console.error(`[${context}] ${error.name}: ${sanitizeErrorMessage(error.message)}`);
        return;
    }
    if (typeof error === "string") {
        console.error(`[${context}] ${sanitizeErrorMessage(error)}`);
        return;
    }
    console.error(`[${context}] Unexpected non-Error exception`);
}
