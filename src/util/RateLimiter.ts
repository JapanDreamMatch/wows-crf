/**
 * 単一インスタンス（Cloud Run --max-instances=1 等）向けの
 * インメモリ・スライディングウィンドウ IP レートリミッター
 */

export interface RateLimitResult {
    allowed: boolean;
    retryAfterSeconds: number;
}

interface RateLimitEntry {
    timestamps: number[];
    expiresAt: number;
}

const MAX_STORE_ENTRIES = 10_000;
const GLOBAL_STORE_KEY = Symbol.for("wows-crf.rateLimiter.store");

function getStore(): Map<string, RateLimitEntry> {
    const g = globalThis as typeof globalThis & {
        [GLOBAL_STORE_KEY]?: Map<string, RateLimitEntry>;
    };
    if (!g[GLOBAL_STORE_KEY]) {
        g[GLOBAL_STORE_KEY] = new Map<string, RateLimitEntry>();
    }
    return g[GLOBAL_STORE_KEY];
}

/**
 * リクエストヘッダからクライアント識別 IP を抽出する。
 */
export function extractClientIp(req: Request): string {
    const forwardedFor = req.headers.get("x-forwarded-for");
    if (forwardedFor) {
        const firstIp = forwardedFor.split(",")[0]?.trim();
        if (firstIp) {
            return firstIp;
        }
    }
    const realIp = req.headers.get("x-real-ip")?.trim();
    if (realIp) {
        return realIp;
    }
    return "unknown";
}

function pruneExpiredEntries(store: Map<string, RateLimitEntry>, now: number): void {
    for (const [k, entry] of store.entries()) {
        if (entry.expiresAt <= now) {
            store.delete(k);
        }
    }
    if (store.size >= MAX_STORE_ENTRIES) {
        // 最も古いエントリから一定数を削減しメモリ肥大を防止
        const removeCount = Math.ceil(MAX_STORE_ENTRIES * 0.2);
        let removed = 0;
        for (const k of store.keys()) {
            store.delete(k);
            removed++;
            if (removed >= removeCount) break;
        }
    }
}

/**
 * 指定バケット・キー（IP 等）のレート制限を判定する。
 */
export function checkRateLimit(
    bucket: string,
    key: string,
    limit: number,
    windowMs: number,
): RateLimitResult {
    if (limit <= 0 || windowMs <= 0) {
        return { allowed: true, retryAfterSeconds: 0 };
    }

    const store = getStore();
    const now = Date.now();
    const storeKey = `${bucket}:${key}`;

    if (store.size >= MAX_STORE_ENTRIES && !store.has(storeKey)) {
        pruneExpiredEntries(store, now);
    }

    const existing = store.get(storeKey);
    const windowStart = now - windowMs;
    const recent = existing
        ? existing.timestamps.filter((ts) => ts > windowStart)
        : [];

    if (recent.length >= limit) {
        const oldest = recent[0] ?? now;
        const retryAfterMs = Math.max(1000, oldest + windowMs - now);
        store.set(storeKey, {
            timestamps: recent,
            expiresAt: oldest + windowMs,
        });
        return {
            allowed: false,
            retryAfterSeconds: Math.ceil(retryAfterMs / 1000),
        };
    }

    recent.push(now);
    store.set(storeKey, {
        timestamps: recent,
        expiresAt: now + windowMs,
    });
    return {
        allowed: true,
        retryAfterSeconds: 0,
    };
}

export function resetRateLimiterForTest(): void {
    getStore().clear();
}
