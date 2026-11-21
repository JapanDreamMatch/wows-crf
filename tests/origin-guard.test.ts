import { afterEach, describe, expect, it } from "vitest";
import { verifySameOriginRequest } from "@/util/OriginGuard";

describe("OriginGuard", () => {
    const originalAllowed = process.env.ALLOWED_ORIGINS;

    afterEach(() => {
        if (originalAllowed === undefined) {
            delete process.env.ALLOWED_ORIGINS;
        } else {
            process.env.ALLOWED_ORIGINS = originalAllowed;
        }
    });

    it("allows requests whose Origin host matches Host header", () => {
        const req = new Request("https://jdm.example.com/api/register", {
            method: "POST",
            headers: {
                host: "jdm.example.com",
                origin: "https://jdm.example.com",
            },
        });
        expect(verifySameOriginRequest(req)).toEqual({ ok: true });
    });

    it("rejects mismatched cross-site Origin or Sec-Fetch-Site: cross-site", () => {
        const badOrigin = new Request("https://jdm.example.com/api/register", {
            method: "POST",
            headers: {
                host: "jdm.example.com",
                origin: "https://evil.example.net",
            },
        });
        expect(verifySameOriginRequest(badOrigin).ok).toBe(false);

        const crossSite = new Request("https://jdm.example.com/api/register", {
            method: "POST",
            headers: {
                "sec-fetch-site": "cross-site",
            },
        });
        expect(verifySameOriginRequest(crossSite).ok).toBe(false);
    });

    it("allows explicitly configured ALLOWED_ORIGINS", () => {
        process.env.ALLOWED_ORIGINS = "https://preview.example.com";
        const req = new Request("https://jdm.example.com/api/register", {
            method: "POST",
            headers: {
                host: "jdm.example.com",
                origin: "https://preview.example.com",
            },
        });
        expect(verifySameOriginRequest(req)).toEqual({ ok: true });
    });

    it("verifies protocol matches x-forwarded-proto on same-host origin comparison", () => {
        const downgradeOrigin = new Request("https://jdm.example.com/api/register", {
            method: "POST",
            headers: {
                host: "jdm.example.com",
                "x-forwarded-proto": "https",
                origin: "http://jdm.example.com",
            },
        });
        expect(verifySameOriginRequest(downgradeOrigin).ok).toBe(false);

        const matchingProto = new Request("https://jdm.example.com/api/register", {
            method: "POST",
            headers: {
                host: "jdm.example.com",
                "x-forwarded-proto": "https",
                origin: "https://jdm.example.com",
            },
        });
        expect(verifySameOriginRequest(matchingProto)).toEqual({ ok: true });
    });
});
