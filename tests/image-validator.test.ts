import { describe, expect, it } from "vitest";
import { detectImageType } from "@/util/ImageValidator";

describe("ImageValidator (Magic Number Verification)", () => {
    it("detects valid PNG buffers", () => {
        const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x01]);
        expect(detectImageType(pngHeader)).toEqual({
            mime: "image/png",
            ext: "png",
        });
    });

    it("detects valid JPEG buffers", () => {
        const jpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
        expect(detectImageType(jpegHeader)).toEqual({
            mime: "image/jpeg",
            ext: "jpg",
        });
    });

    it("rejects empty and truncated buffers", () => {
        expect(detectImageType(Buffer.alloc(0))).toBeNull();
        // Partial PNG (7 bytes instead of 8)
        expect(detectImageType(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a]))).toBeNull();
        // Partial JPEG (2 bytes instead of 3)
        expect(detectImageType(Buffer.from([0xff, 0xd8]))).toBeNull();
    });

    it("rejects spoofed non-PNG/JPEG payloads (HTML/SVG XSS, GIF, WebP, PDF, EXE)", () => {
        const htmlPayload = Buffer.from("<!DOCTYPE html><script>alert(1)</script>", "utf8");
        const svgPayload = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>', "utf8");
        const gifPayload = Buffer.from("GIF89a\x01\x00\x01\x00", "binary");
        const webpPayload = Buffer.from("RIFF\x00\x00\x00\x00WEBP", "binary");
        const pdfPayload = Buffer.from("%PDF-1.7", "utf8");
        const exePayload = Buffer.from([0x4d, 0x5a, 0x90, 0x00]); // MZ header

        expect(detectImageType(htmlPayload)).toBeNull();
        expect(detectImageType(svgPayload)).toBeNull();
        expect(detectImageType(gifPayload)).toBeNull();
        expect(detectImageType(webpPayload)).toBeNull();
        expect(detectImageType(pdfPayload)).toBeNull();
        expect(detectImageType(exePayload)).toBeNull();
    });
});
