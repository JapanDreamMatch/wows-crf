import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    getCachedAppSettings,
    getCachedRegisterSheetNames,
    invalidateRegisterSheetNamesCache,
    resetAppSettingsCacheForTest,
    type AppSettingsSnapshot,
} from "@/util/AppSettingsCache";

const SAMPLE_SETTINGS: AppSettingsSnapshot = {
    startDate: "2026-01-01T00:00:00Z",
    endDate: "2026-12-31T23:59:59Z",
    isIgnore: false,
    maxTeamAmount: 32,
    logoDirectory: "logos",
};

describe("AppSettingsCache", () => {
    beforeEach(() => {
        resetAppSettingsCacheForTest();
    });

    afterEach(() => {
        resetAppSettingsCacheForTest();
        vi.useRealTimers();
    });

    it("caches settings within TTL and deduplicates concurrent fetches via Singleflight", async () => {
        const fetcher = vi.fn(async () => SAMPLE_SETTINGS);

        const concurrent = await Promise.all(
            Array.from({ length: 8 }, () => getCachedAppSettings(fetcher, 20_000)),
        );
        expect(fetcher).toHaveBeenCalledTimes(1);
        for (const item of concurrent) {
            expect(item).toEqual(SAMPLE_SETTINGS);
        }

        const cached = await getCachedAppSettings(fetcher, 20_000);
        expect(cached).toEqual(SAMPLE_SETTINGS);
        expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it("serves stale settings on refresh failure with cooldown and invalidates sheet names cleanly", async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-11-21T00:00:00Z"));
        const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

        let shouldFail = false;
        const fetcher = vi.fn(async () => {
            if (shouldFail) throw new Error("429 Quota Exceeded");
            return SAMPLE_SETTINGS;
        });

        await getCachedAppSettings(fetcher, 10_000);
        expect(fetcher).toHaveBeenCalledTimes(1);

        vi.advanceTimersByTime(11_000);
        shouldFail = true;
        const stale = await getCachedAppSettings(fetcher, 10_000);
        expect(stale).toEqual(SAMPLE_SETTINGS);
        expect(fetcher).toHaveBeenCalledTimes(2);
        expect(errSpy).toHaveBeenCalledOnce();

        // Within cooldown, fetcher is not called
        vi.advanceTimersByTime(5_000);
        await getCachedAppSettings(fetcher, 10_000);
        expect(fetcher).toHaveBeenCalledTimes(2);

        // Register sheet names cache invalidation
        const namesFetcher = vi.fn(async () => ["@init", "JDM"]);
        expect(await getCachedRegisterSheetNames(namesFetcher, 10_000)).toEqual(["@init", "JDM"]);
        expect(await getCachedRegisterSheetNames(namesFetcher, 10_000)).toEqual(["@init", "JDM"]);
        expect(namesFetcher).toHaveBeenCalledTimes(1);

        invalidateRegisterSheetNamesCache();
        await getCachedRegisterSheetNames(namesFetcher, 10_000);
        expect(namesFetcher).toHaveBeenCalledTimes(2);
    });

    it("prevents stale inFlight fetch from overwriting cache after invalidateRegisterSheetNamesCache()", async () => {
        let resolveStale!: (names: string[]) => void;
        let callCount = 0;
        const fetcher = vi.fn(() => {
            callCount += 1;
            if (callCount === 1) {
                return new Promise<string[]>((resolve) => {
                    resolveStale = resolve;
                });
            }
            return Promise.resolve(["@init", "JDM", "NEW1"]);
        });

        const inFlightPromise = getCachedRegisterSheetNames(fetcher, 10_000);
        expect(fetcher).toHaveBeenCalledTimes(1);

        // Invalidate while the first fetch is still in flight
        invalidateRegisterSheetNamesCache();

        // A new fetch started after invalidation must NOT share the stale inFlight promise
        const freshResult = await getCachedRegisterSheetNames(fetcher, 10_000);
        expect(freshResult).toEqual(["@init", "JDM", "NEW1"]);
        expect(fetcher).toHaveBeenCalledTimes(2);

        // Resolving the stale fetch afterwards must NOT overwrite the newer cached list
        resolveStale(["@init", "JDM"]);
        await inFlightPromise;

        const cachedAfterStaleResolve = await getCachedRegisterSheetNames(fetcher, 10_000);
        expect(cachedAfterStaleResolve).toEqual(["@init", "JDM", "NEW1"]);
        expect(fetcher).toHaveBeenCalledTimes(2);
    });
});
