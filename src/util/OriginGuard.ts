/**
 * 状態変更系 API に対するクロスサイト Simple Request 抑止用オリジン検証ヘルパー
 * （外部公開 CORS API である /api/shipchecker には適用しない）
 */

function parseAllowedOriginsEnv(): Set<string> {
    const raw = process.env.ALLOWED_ORIGINS ?? "";
    return new Set(
        raw
            .split(",")
            .map((item) => item.trim().toLowerCase())
            .filter(Boolean),
    );
}

/**
 * リクエストが同一オリジン（または明示許可オリジン）由来であることを検証する。
 */
export function verifySameOriginRequest(
    req: Request,
): { ok: true } | { ok: false; status: 403; message: string } {
    const allowedOrigins = parseAllowedOriginsEnv();
    const originHeader = req.headers.get("origin");
    const secFetchSite = req.headers.get("sec-fetch-site")?.trim().toLowerCase();

    if (originHeader !== null) {
        const trimmedOrigin = originHeader.trim();
        if (!trimmedOrigin || trimmedOrigin.toLowerCase() === "null") {
            return { ok: false, status: 403, message: "不正な送信元からのリクエストです" };
        }

        let parsedOrigin: URL;
        try {
            parsedOrigin = new URL(trimmedOrigin);
        } catch {
            return { ok: false, status: 403, message: "不正な送信元からのリクエストです" };
        }

        if (parsedOrigin.protocol !== "http:" && parsedOrigin.protocol !== "https:") {
            return { ok: false, status: 403, message: "不正な送信元からのリクエストです" };
        }

        if (allowedOrigins.has(parsedOrigin.origin.toLowerCase())) {
            return { ok: true };
        }

        const forwardedHost = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
        const hostHeader = (forwardedHost || req.headers.get("host") || "").trim().toLowerCase();
        const forwardedProto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase();
        const expectedProtocol =
            forwardedProto === "http" || forwardedProto === "https"
                ? `${forwardedProto}:`
                : null;
        if (
            hostHeader &&
            parsedOrigin.host.toLowerCase() === hostHeader &&
            (!expectedProtocol || parsedOrigin.protocol === expectedProtocol)
        ) {
            return { ok: true };
        }

        return { ok: false, status: 403, message: "許可されていないオリジンからのリクエストです" };
    }

    if (secFetchSite === "cross-site") {
        return { ok: false, status: 403, message: "クロスサイトリクエストは許可されていません" };
    }

    return { ok: true };
}
