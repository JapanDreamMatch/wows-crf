import { describe, expect, it } from "vitest";
import {
    detectImageType,
    extractImageDimensions,
    MAX_LOGO_DIMENSION,
    validateImageDimensions,
} from "@/util/ImageValidator";

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

    it("extracts and validates PNG and JPEG image dimensions to reject image bombs", () => {
        const makePng = (w: number, h: number) => {
            const buf = Buffer.alloc(24);
            Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buf, 0);
            buf.writeUInt32BE(13, 8);
            buf.write("IHDR", 12, "ascii");
            buf.writeUInt32BE(w, 16);
            buf.writeUInt32BE(h, 20);
            return buf;
        };

        const validPng = makePng(512, 512);
        expect(extractImageDimensions(validPng, { mime: "image/png", ext: "png" })).toEqual({
            width: 512,
            height: 512,
        });
        expect(validateImageDimensions(validPng, { mime: "image/png", ext: "png" })).toBeNull();

        const bombPng = makePng(MAX_LOGO_DIMENSION + 1, 512);
        expect(validateImageDimensions(bombPng, { mime: "image/png", ext: "png" })).not.toBeNull();

        const makeJpeg = (w: number, h: number) => {
            const buf = Buffer.alloc(15);
            buf[0] = 0xff;
            buf[1] = 0xd8; // SOI
            buf[2] = 0xff;
            buf[3] = 0xc0; // SOF0
            buf.writeUInt16BE(11, 4); // length
            buf[6] = 8; // precision
            buf.writeUInt16BE(h, 7);
            buf.writeUInt16BE(w, 9);
            return buf;
        };

        const validJpeg = makeJpeg(1024, 768);
        expect(extractImageDimensions(validJpeg, { mime: "image/jpeg", ext: "jpg" })).toEqual({
            width: 1024,
            height: 768,
        });
        expect(validateImageDimensions(validJpeg, { mime: "image/jpeg", ext: "jpg" })).toBeNull();

        const bombJpeg = makeJpeg(1024, MAX_LOGO_DIMENSION + 100);
        expect(validateImageDimensions(bombJpeg, { mime: "image/jpeg", ext: "jpg" })).not.toBeNull();

        // Malformed JPEG SOF segment with segmentLength < 7 followed by other bytes
        const shortSofJpeg = Buffer.alloc(16);
        shortSofJpeg[0] = 0xff;
        shortSofJpeg[1] = 0xd8;
        shortSofJpeg[2] = 0xff;
        shortSofJpeg[3] = 0xc0;
        shortSofJpeg.writeUInt16BE(4, 4); // < 7 bytes
        expect(extractImageDimensions(shortSofJpeg, { mime: "image/jpeg", ext: "jpg" })).toBeNull();
    });
});
