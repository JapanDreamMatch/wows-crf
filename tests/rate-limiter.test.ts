import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkRateLimit, extractClientIp, resetRateLimiterForTest } from "@/util/RateLimiter";

describe("RateLimiter", () => {
    const originalHops = process.env.TRUSTED_PROXY_HOPS;

    beforeEach(() => {
        resetRateLimiterForTest();
        delete process.env.TRUSTED_PROXY_HOPS;
    });

    afterEach(() => {
        resetRateLimiterForTest();
        if (originalHops === undefined) {
            delete process.env.TRUSTED_PROXY_HOPS;
        } else {
            process.env.TRUSTED_PROXY_HOPS = originalHops;
        }
        vi.useRealTimers();
    });

    it("enforces sliding-window limit and recovers after window expires", () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-11-21T00:00:00Z"));

        expect(checkRateLimit("ign", "1.2.3.4", 2, 10_000).allowed).toBe(true);
        expect(checkRateLimit("ign", "1.2.3.4", 2, 10_000).allowed).toBe(true);

        const blocked = checkRateLimit("ign", "1.2.3.4", 2, 10_000);
        expect(blocked.allowed).toBe(false);
        expect(blocked.retryAfterSeconds).toBeGreaterThanOrEqual(1);

        // Different IP or bucket is independent
        expect(checkRateLimit("ign", "5.6.7.8", 2, 10_000).allowed).toBe(true);

        vi.advanceTimersByTime(10_001);
        expect(checkRateLimit("ign", "1.2.3.4", 2, 10_000).allowed).toBe(true);
    });

    it("extracts rightmost trusted proxy hop from x-forwarded-for to resist client spoofing", () => {
        const spoofedReq = new Request("https://example.com", {
            headers: { "x-forwarded-for": "198.51.100.99, 203.0.113.10" },
        });
        expect(extractClientIp(spoofedReq)).toBe("203.0.113.10");

        process.env.TRUSTED_PROXY_HOPS = "2";
        const multiHopReq = new Request("https://example.com", {
            headers: { "x-forwarded-for": "198.51.100.99, 203.0.113.10, 10.0.0.1" },
        });
        expect(extractClientIp(multiHopReq)).toBe("203.0.113.10");

        // Does not unconditionally trust x-real-ip without x-forwarded-for
        const realIpOnlyReq = new Request("https://example.com", {
            headers: { "x-real-ip": "198.51.100.2" },
        });
        expect(extractClientIp(realIpOnlyReq)).toBe("unknown");
    });
});
