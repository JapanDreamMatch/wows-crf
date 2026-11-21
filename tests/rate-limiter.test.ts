import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkRateLimit, extractClientIp, resetRateLimiterForTest } from "@/util/RateLimiter";

describe("RateLimiter", () => {
    beforeEach(() => {
        resetRateLimiterForTest();
    });

    afterEach(() => {
        resetRateLimiterForTest();
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

    it("extracts client IP from x-forwarded-for or x-real-ip", () => {
        const req1 = new Request("https://example.com", {
            headers: { "x-forwarded-for": "203.0.113.10, 10.0.0.1" },
        });
        expect(extractClientIp(req1)).toBe("203.0.113.10");

        const req2 = new Request("https://example.com", {
            headers: { "x-real-ip": "198.51.100.2" },
        });
        expect(extractClientIp(req2)).toBe("198.51.100.2");
    });
});
