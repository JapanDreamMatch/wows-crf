import { describe, expect, it } from "vitest";
import {
    readBodyBytesWithLimit,
    readFormDataWithLimit,
    readJsonWithLimit,
    validateContentLengthHeader,
} from "@/util/RequestGuard";

describe("RequestGuard", () => {
    it("rejects negative or non-numeric Content-Length and oversized headers", () => {
        const badReq = new Request("https://example.com", {
            method: "POST",
            headers: { "content-length": "abc" },
        });
        expect(validateContentLengthHeader(badReq, 1024).ok).toBe(false);

        const bigReq = new Request("https://example.com", {
            method: "POST",
            headers: { "content-length": "2048" },
        });
        const res = validateContentLengthHeader(bigReq, 1024);
        expect(res.ok).toBe(false);
        if (!res.ok) expect(res.status).toBe(413);
    });

    it("aborts chunked streams (without Content-Length) exceeding byte limit", async () => {
        let sent = 0;
        const stream = new ReadableStream<Uint8Array>({
            pull(controller) {
                if (sent < 3) {
                    sent += 1;
                    controller.enqueue(new Uint8Array(600));
                } else {
                    controller.close();
                }
            },
        });
        const req = new Request("https://example.com", {
            method: "POST",
            body: stream,
            // @ts-expect-error Node fetch duplex option
            duplex: "half",
        });

        const result = await readBodyBytesWithLimit(req, 1024);
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.status).toBe(413);
    });

    it("enforces application/json Content-Type (415) and parses valid JSON within limit", async () => {
        const wrongCt = new Request("https://example.com", {
            method: "POST",
            headers: { "content-type": "text/plain" },
            body: '{"a":1}',
        });
        const ctRes = await readJsonWithLimit(wrongCt);
        expect(ctRes.ok).toBe(false);
        if (!ctRes.ok) expect(ctRes.status).toBe(415);

        const invalidJson = new Request("https://example.com", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: "{broken",
        });
        const parseRes = await readJsonWithLimit(invalidJson);
        expect(parseRes.ok).toBe(false);
        if (!parseRes.ok) expect(parseRes.status).toBe(400);

        const validReq = new Request("https://example.com", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ teamNickName: "JDM" }),
        });
        const okRes = await readJsonWithLimit<{ teamNickName: string }>(validReq);
        expect(okRes).toEqual({ ok: true, data: { teamNickName: "JDM" } });
    });

    it("enforces size limit on FormData requests", async () => {
        const fd = new FormData();
        fd.append("teamName", "x".repeat(2000));
        const req = new Request("https://example.com", {
            method: "POST",
            body: fd,
        });
        const tooBig = await readFormDataWithLimit(req, 100);
        expect(tooBig.ok).toBe(false);
        if (!tooBig.ok) expect(tooBig.status).toBe(413);
    });
});
