/**
 * HTTP リクエストボディのサイズ上限監視（chunked 転送含む）および Content-Type 検証ユーティリティ
 */

export const DEFAULT_MAX_JSON_BYTES = 16 * 1024; // 16KB

export type GuardSuccess<T> = { ok: true } & T;
export type GuardFailure = { ok: false; status: 400 | 413 | 415; message: string };

/**
 * Content-Length ヘッダの妥当性と上限サイズを検証する。
 */
export function validateContentLengthHeader(
    req: Request,
    maxBytes: number,
): { ok: true } | GuardFailure {
    const raw = req.headers.get("content-length");
    if (raw === null || raw.trim() === "") {
        return { ok: true };
    }
    const trimmed = raw.trim();
    if (!/^\d+$/.test(trimmed)) {
        return { ok: false, status: 400, message: "不正な Content-Length ヘッダです" };
    }
    const length = Number(trimmed);
    if (!Number.isSafeInteger(length) || length < 0) {
        return { ok: false, status: 400, message: "不正な Content-Length ヘッダです" };
    }
    if (length > maxBytes) {
        return { ok: false, status: 413, message: "リクエストサイズが上限を超えています" };
    }
    return { ok: true };
}

/**
 * Transfer-Encoding: chunked を含め、ストリームを逐次読み取りながらバイト数上限を強制する。
 */
export async function readBodyBytesWithLimit(
    req: Request,
    maxBytes: number,
): Promise<GuardSuccess<{ bytes: Uint8Array }> | GuardFailure> {
    const headerCheck = validateContentLengthHeader(req, maxBytes);
    if (!headerCheck.ok) {
        return headerCheck;
    }

    if (!req.body) {
        return { ok: true, bytes: new Uint8Array(0) };
    }

    const reader = req.body.getReader();
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                break;
            }
            if (value) {
                totalBytes += value.byteLength;
                if (totalBytes > maxBytes) {
                    await reader.cancel().catch(() => {});
                    return {
                        ok: false,
                        status: 413,
                        message: "リクエストサイズが上限を超えています",
                    };
                }
                chunks.push(value);
            }
        }
    } finally {
        reader.releaseLock();
    }

    const merged = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
        merged.set(chunk, offset);
        offset += chunk.byteLength;
    }

    return { ok: true, bytes: merged };
}

/**
 * Content-Type: application/json とサイズ上限を強制した上で JSON をパースする。
 */
export async function readJsonWithLimit<T = Record<string, unknown>>(
    req: Request,
    options?: { maxBytes?: number; allowEmpty?: boolean },
): Promise<GuardSuccess<{ data: T }> | GuardFailure> {
    const maxBytes = options?.maxBytes ?? DEFAULT_MAX_JSON_BYTES;
    const contentType = req.headers.get("content-type") ?? "";
    const mediaType = contentType.split(";")[0]?.trim().toLowerCase() ?? "";
    if (mediaType !== "application/json") {
        return {
            ok: false,
            status: 415,
            message: "Content-Type は application/json を指定してください",
        };
    }

    const bodyResult = await readBodyBytesWithLimit(req, maxBytes);
    if (!bodyResult.ok) {
        return bodyResult;
    }

    const text = new TextDecoder("utf-8", { fatal: false }).decode(bodyResult.bytes);
    if (options?.allowEmpty && text.trim() === "") {
        return { ok: true, data: {} as T };
    }

    try {
        const data = JSON.parse(text) as T;
        return { ok: true, data };
    } catch {
        return { ok: false, status: 400, message: "不正なリクエスト形式です" };
    }
}

/**
 * Content-Type (multipart/form-data 等) とバイト数上限を強制した上で FormData をパースする。
 */
export async function readFormDataWithLimit(
    req: Request,
    maxBytes: number,
): Promise<GuardSuccess<{ formData: FormData }> | GuardFailure> {
    const contentType = req.headers.get("content-type") ?? "";
    const mediaType = contentType.split(";")[0]?.trim().toLowerCase() ?? "";
    if (
        mediaType !== "multipart/form-data" &&
        mediaType !== "application/x-www-form-urlencoded"
    ) {
        return {
            ok: false,
            status: 415,
            message: "不正な Content-Type です",
        };
    }

    const bodyResult = await readBodyBytesWithLimit(req, maxBytes);
    if (!bodyResult.ok) {
        return bodyResult;
    }

    try {
        const bodyView = Buffer.from(
            bodyResult.bytes.buffer,
            bodyResult.bytes.byteOffset,
            bodyResult.bytes.byteLength,
        );
        const res = new Response(bodyView, {
            headers: { "content-type": contentType },
        });
        const formData = await res.formData();
        return { ok: true, formData };
    } catch {
        return { ok: false, status: 400, message: "フォームデータの解析に失敗しました" };
    }
}
