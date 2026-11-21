import { describe, expect, it, vi } from "vitest";
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

    it("aborts and cancels chunked streams (without Content-Length) exceeding byte limit", async () => {
        const onCancel = vi.fn();
        let sent = 0;
        const stream = new ReadableStream<Uint8Array>({
            pull(controller) {
                if (sent < 5) {
                    sent += 1;
                    controller.enqueue(new Uint8Array(600));
                } else {
                    controller.close();
                }
            },
            cancel: onCancel,
        });
        const mockReq = {
            headers: new Headers(),
            body: stream,
        } as unknown as Request;

        const result = await readBodyBytesWithLimit(mockReq, 1024);
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.status).toBe(413);
        expect(onCancel).toHaveBeenCalledOnce();
    });

    it("enforces exact application/json media type (415) and parses valid JSON within limit", async () => {
        const wrongCt = new Request("https://example.com", {
            method: "POST",
            headers: { "content-type": "text/plain" },
            body: '{"a":1}',
        });
        const ctRes = await readJsonWithLimit(wrongCt);
        expect(ctRes.ok).toBe(false);
        if (!ctRes.ok) expect(ctRes.status).toBe(415);

        const spoofedCt = new Request("https://example.com", {
            method: "POST",
            headers: { "content-type": "text/plain; x=application/json" },
            body: '{"a":1}',
        });
        const spoofedRes = await readJsonWithLimit(spoofedCt);
        expect(spoofedRes.ok).toBe(false);
        if (!spoofedRes.ok) expect(spoofedRes.status).toBe(415);

        const charsetCt = new Request("https://example.com", {
            method: "POST",
            headers: { "content-type": "application/json; charset=utf-8" },
            body: JSON.stringify({ teamNickName: "JDM" }),
        });
        expect(await readJsonWithLimit<{ teamNickName: string }>(charsetCt)).toEqual({
            ok: true,
            data: { teamNickName: "JDM" },
        });

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

    it("enforces size limit on FormData requests and parses valid multipart bodies", async () => {
        const fd = new FormData();
        fd.append("teamName", "x".repeat(2000));
        const serialized = new Response(fd);
        const contentType = serialized.headers.get("content-type") ?? "";
        const rawBytes = Buffer.from(await serialized.arrayBuffer());

        const tooBigReq = new Request("https://example.com", {
            method: "POST",
            headers: { "content-type": contentType },
            body: rawBytes,
        });
        const tooBig = await readFormDataWithLimit(tooBigReq, 100);
        expect(tooBig.ok).toBe(false);
        if (!tooBig.ok) expect(tooBig.status).toBe(413);

        const validReq = new Request("https://example.com", {
            method: "POST",
            headers: { "content-type": contentType },
            body: rawBytes,
        });
        const valid = await readFormDataWithLimit(validReq, 10_000);
        expect(valid.ok).toBe(true);
        if (valid.ok) {
            expect(valid.formData.get("teamName")).toBe("x".repeat(2000));
        }
    });
});
