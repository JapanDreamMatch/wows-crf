import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    getCachedShipCheckerData,
    getShipCheckerCacheTtlSeconds,
    resetShipCheckerCacheForTest,
    type ShipCheckerPayload,
} from "@/util/ShipCheckerCache";

const SAMPLE_PAYLOAD: ShipCheckerPayload = {
    version: "v2026.1",
    countries: ["Japan", "U.S.A."],
    ships: [],
    rules: { shipAmount: 7, rules: [] },
    fetchedAt: "2026-11-19T00:00:00.000Z",
};

describe("ShipCheckerCache (Quota Protection, Singleflight & Stale-on-Error)", () => {
    const originalEnv = process.env.SHIPCHECKER_CACHE_TTL_SECONDS;

    beforeEach(() => {
        resetShipCheckerCacheForTest();
        delete process.env.SHIPCHECKER_CACHE_TTL_SECONDS;
    });

    afterEach(() => {
        resetShipCheckerCacheForTest();
        if (originalEnv === undefined) {
            delete process.env.SHIPCHECKER_CACHE_TTL_SECONDS;
        } else {
            process.env.SHIPCHECKER_CACHE_TTL_SECONDS = originalEnv;
        }
        vi.useRealTimers();
    });

    it("parses SHIPCHECKER_CACHE_TTL_SECONDS safely with fallback to 300s", () => {
        expect(getShipCheckerCacheTtlSeconds()).toBe(300);

        process.env.SHIPCHECKER_CACHE_TTL_SECONDS = "120";
        expect(getShipCheckerCacheTtlSeconds()).toBe(120);

        process.env.SHIPCHECKER_CACHE_TTL_SECONDS = "0";
        expect(getShipCheckerCacheTtlSeconds()).toBe(0);

        process.env.SHIPCHECKER_CACHE_TTL_SECONDS = "-10";
        expect(getShipCheckerCacheTtlSeconds()).toBe(300);

        process.env.SHIPCHECKER_CACHE_TTL_SECONDS = "invalid";
        expect(getShipCheckerCacheTtlSeconds()).toBe(300);
    });

    it("returns MISS on first fetch and HIT within TTL without calling fetcher again", async () => {
        const fetcher = vi.fn(async () => SAMPLE_PAYLOAD);

        const first = await getCachedShipCheckerData(fetcher);
        expect(first.cacheStatus).toBe("MISS");
        expect(first.data).toEqual(SAMPLE_PAYLOAD);
        expect(fetcher).toHaveBeenCalledTimes(1);

        const second = await getCachedShipCheckerData(fetcher);
        expect(second.cacheStatus).toBe("HIT");
        expect(second.data).toEqual(SAMPLE_PAYLOAD);
        expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it("bypasses cache when SHIPCHECKER_CACHE_TTL_SECONDS=0", async () => {
        process.env.SHIPCHECKER_CACHE_TTL_SECONDS = "0";
        const fetcher = vi.fn(async () => SAMPLE_PAYLOAD);

        const first = await getCachedShipCheckerData(fetcher);
        const second = await getCachedShipCheckerData(fetcher);

        expect(first.cacheStatus).toBe("BYPASS");
        expect(second.cacheStatus).toBe("BYPASS");
        expect(fetcher).toHaveBeenCalledTimes(2);
    });

    it("deduplicates concurrent requests via Singleflight to prevent Google Sheets quota exhaustion", async () => {
        let resolveFetch!: (value: ShipCheckerPayload) => void;
        const fetcher = vi.fn(
            () =>
                new Promise<ShipCheckerPayload>((resolve) => {
                    resolveFetch = resolve;
                }),
        );

        const concurrentCalls = Array.from({ length: 10 }, () => getCachedShipCheckerData(fetcher));
        expect(fetcher).toHaveBeenCalledTimes(1);

        resolveFetch(SAMPLE_PAYLOAD);
        const results = await Promise.all(concurrentCalls);

        for (const res of results) {
            expect(res.data).toEqual(SAMPLE_PAYLOAD);
            expect(res.cacheStatus).toBe("MISS");
        }
    });

    it("serves STALE data with 30s cooldown when refresh fails (e.g. Google Sheets 429)", async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-11-19T00:00:00Z"));
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

        let shouldFail = false;
        const fetcher = vi.fn(async () => {
            if (shouldFail) {
                throw new Error("429 Too Many Requests");
            }
            return SAMPLE_PAYLOAD;
        });

        // 1. Initial populate (MISS)
        const initial = await getCachedShipCheckerData(fetcher);
        expect(initial.cacheStatus).toBe("MISS");
        expect(fetcher).toHaveBeenCalledTimes(1);

        // 2. Advance past 300s TTL and simulate Google Sheets 429 error
        vi.advanceTimersByTime(301_000);
        shouldFail = true;

        const staleResult = await getCachedShipCheckerData(fetcher);
        expect(staleResult.cacheStatus).toBe("STALE");
        expect(staleResult.data).toEqual(SAMPLE_PAYLOAD);
        expect(fetcher).toHaveBeenCalledTimes(2);
        expect(warnSpy).toHaveBeenCalledOnce();

        // 3. Within 30s cooldown, fetcher must NOT be called again
        vi.advanceTimersByTime(10_000);
        const cooldownResult = await getCachedShipCheckerData(fetcher);
        expect(cooldownResult.cacheStatus).toBe("STALE");
        expect(fetcher).toHaveBeenCalledTimes(2);

        // 4. After 30s cooldown expires and API recovers, refreshes to MISS
        vi.advanceTimersByTime(25_000);
        shouldFail = false;
        const recoveredResult = await getCachedShipCheckerData(fetcher);
        expect(recoveredResult.cacheStatus).toBe("MISS");
        expect(fetcher).toHaveBeenCalledTimes(3);
    });
});
