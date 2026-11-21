import { describe, expect, it } from "vitest";
import {
    MAX_PASSWORD_LENGTH,
    bytesToHex,
    generateSalt,
    hashPassword,
    hexToBytes,
} from "@/util/Argon2Service";

describe("Argon2Service", () => {
    it("generateSalt produces a unique 32-character lowercase hex string (16 bytes)", () => {
        const salt1 = generateSalt();
        const salt2 = generateSalt();

        expect(salt1).toMatch(/^[0-9a-f]{32}$/);
        expect(salt2).toMatch(/^[0-9a-f]{32}$/);
        expect(salt1).not.toBe(salt2);
    });

    it("hexToBytes and bytesToHex round-trip accurately and normalize uppercase hex", () => {
        const originalHex = "0123456789abcdef0123456789ABCDEF";
        const bytes = hexToBytes(originalHex);

        expect(bytes).toBeInstanceOf(Uint8Array);
        expect(bytes.length).toBe(16);
        expect(bytesToHex(bytes)).toBe(originalHex.toLowerCase());
    });

    it("hexToBytes rejects empty, odd-length, or non-hex strings", () => {
        expect(() => hexToBytes("")).toThrow();
        expect(() => hexToBytes("   ")).toThrow();
        expect(() => hexToBytes("abc")).toThrow();
        expect(() => hexToBytes("0123456789abcdef0123456789abcdeg")).toThrow();
        expect(() => hexToBytes("0123-567")).toThrow();
    });

    it("hashPassword produces a deterministic 64-character hex Argon2id hash and varies with salt/password", async () => {
        const saltA = "00112233445566778899aabbccddeeff";
        const saltB = "ffeeddccbbaa99887766554433221100";

        const hash1 = await hashPassword("correct-horse-battery", saltA);
        const hash2 = await hashPassword("correct-horse-battery", saltA.toUpperCase());
        const hashDifferentPassword = await hashPassword("wrong-password-123", saltA);
        const hashDifferentSalt = await hashPassword("correct-horse-battery", saltB);

        expect(hash1).toMatch(/^[0-9a-f]{64}$/);
        expect(hash1).toBe(hash2);
        expect(hash1).not.toBe(hashDifferentPassword);
        expect(hash1).not.toBe(hashDifferentSalt);
    });

    it("rejects passwords exceeding MAX_PASSWORD_LENGTH to prevent Argon2id CPU/memory DoS", async () => {
        const salt = "00112233445566778899aabbccddeeff";
        const oversized = "a".repeat(MAX_PASSWORD_LENGTH + 1);
        await expect(hashPassword(oversized, salt)).rejects.toThrow();
    });
});
