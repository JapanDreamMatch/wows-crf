import type { ShipData, ShipRuleSet } from "@/util/ShipCheckRules";

export interface ShipCheckerPayload {
    version: string;
    countries: string[];
    ships: ShipData[];
    rules: ShipRuleSet;
    fetchedAt: string;
}

export type ShipCheckerCacheStatus = "HIT" | "MISS" | "STALE" | "BYPASS";

export interface ShipCheckerCacheResult {
    data: ShipCheckerPayload;
    cacheStatus: ShipCheckerCacheStatus;
    ttlSeconds: number;
}

interface CacheEntry {
    data: ShipCheckerPayload;
    expiresAt: number;
    staleRetryAt?: number;
}

interface InFlightResult {
    data: ShipCheckerPayload;
    cacheStatus: "MISS" | "STALE";
}

interface CacheStore {
    entry: CacheEntry | null;
    inFlight: Promise<InFlightResult> | null;
}

const DEFAULT_CACHE_TTL_SECONDS = 300;
const STALE_RETRY_COOLDOWN_MS = 30_000;
const GLOBAL_STORE_KEY = Symbol.for("wows-crf.shipchecker.cacheStore");

function getCacheStore(): CacheStore {
    const g = globalThis as typeof globalThis & { [GLOBAL_STORE_KEY]?: CacheStore };
    if (!g[GLOBAL_STORE_KEY]) {
        g[GLOBAL_STORE_KEY] = { entry: null, inFlight: null };
    }
    return g[GLOBAL_STORE_KEY];
}

/**
 * 環境変数 SHIPCHECKER_CACHE_TTL_SECONDS を非負整数として取得する。
 * 未設定・不正値時はデフォルト 300 秒、0 指定時はキャッシュ無効（BYPASS）。
 */
export function getShipCheckerCacheTtlSeconds(): number {
    const raw = process.env.SHIPCHECKER_CACHE_TTL_SECONDS;
    if (raw === undefined || raw.trim() === "") {
        return DEFAULT_CACHE_TTL_SECONDS;
    }
    const parsed = Number(raw.trim());
    if (!Number.isFinite(parsed) || parsed < 0) {
        return DEFAULT_CACHE_TTL_SECONDS;
    }
    return Math.floor(parsed);
}

/**
 * インメモリキャッシュ・Singleflight・Stale-on-Error（30秒クールダウン付き）を通して
 * shipchecker のデータを取得する。
 */
export async function getCachedShipCheckerData(
    fetcher: () => Promise<ShipCheckerPayload>,
): Promise<ShipCheckerCacheResult> {
    const ttlSeconds = getShipCheckerCacheTtlSeconds();
    if (ttlSeconds === 0) {
        const data = await fetcher();
        return { data, cacheStatus: "BYPASS", ttlSeconds };
    }

    const store = getCacheStore();
    const now = Date.now();
    if (store.entry && now < store.entry.expiresAt) {
        return {
            data: store.entry.data,
            cacheStatus: "HIT",
            ttlSeconds,
        };
    }

    if (store.entry && store.entry.staleRetryAt !== undefined && now < store.entry.staleRetryAt) {
        return {
            data: store.entry.data,
            cacheStatus: "STALE",
            ttlSeconds,
        };
    }

    if (!store.inFlight) {
        let fetchPromise: Promise<InFlightResult> | null = null;
        fetchPromise = (async () => {
            try {
                const data = await fetcher();
                store.entry = {
                    data,
                    expiresAt: Date.now() + ttlSeconds * 1000,
                };
                return { data, cacheStatus: "MISS" as const };
            } catch (error: unknown) {
                if (store.entry) {
                    store.entry.staleRetryAt = Date.now() + STALE_RETRY_COOLDOWN_MS;
                    console.warn("Failed to refresh shipchecker cache; serving stale data.", error);
                    return { data: store.entry.data, cacheStatus: "STALE" as const };
                }
                throw error;
            } finally {
                if (store.inFlight === fetchPromise) {
                    store.inFlight = null;
                }
            }
        })();
        store.inFlight = fetchPromise;
    }

    const resolved = await store.inFlight;
    return {
        data: resolved.data,
        cacheStatus: resolved.cacheStatus,
        ttlSeconds,
    };
}

export function resetShipCheckerCacheForTest(): void {
    const store = getCacheStore();
    store.entry = null;
    store.inFlight = null;
}
