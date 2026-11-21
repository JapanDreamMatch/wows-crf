import { argon2id } from "hash-wasm";

export const ARGON2_CONFIG = {
    parallelism: 1,
    iterations: 2,
    memorySize: 19456, // 19,456 KiB (19 MiB)
    hashLength: 32,    // 32 bytes -> 64 hex chars
    saltByteLength: 16 // 16 bytes -> 32 hex chars
} as const;

export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 128;

/**
 * 16進文字列をバイト列 (Uint8Array) にデコードする
 */
export function hexToBytes(hex: string): Uint8Array {
    const clean = hex.trim().toLowerCase();
    if (clean.length === 0 || clean.length % 2 !== 0 || !/^[0-9a-f]+$/.test(clean)) {
        throw new Error("ソルトは偶数桁の16進文字列（0-9, a-f）で入力してください");
    }
    const bytes = new Uint8Array(clean.length / 2);
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(clean.substring(i * 2, i * 2 + 2), 16);
    }
    return bytes;
}

/**
 * バイト列 (Uint8Array) を16進文字列 (小文字) にエンコードする
 */
export function bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}

/**
 * 16バイトの暗号論的擬似乱数ソルトを生成し、32文字のhex文字列で返す
 */
export function generateSalt(): string {
    const bytes = new Uint8Array(ARGON2_CONFIG.saltByteLength);
    globalThis.crypto.getRandomValues(bytes);
    return bytesToHex(bytes);
}

/**
 * パスワードとhex形式のソルトから Argon2id ハッシュ（64文字hex）を計算する
 * サーバー側APIおよび /generatehash で同一の計算を行う
 */
export async function hashPassword(password: string, saltHex: string): Promise<string> {
    if (password.length > MAX_PASSWORD_LENGTH) {
        throw new Error(`パスワードは${MAX_PASSWORD_LENGTH}文字以内で入力してください`);
    }
    const saltBytes = hexToBytes(saltHex);
    return await argon2id({
        password,
        salt: saltBytes,
        parallelism: ARGON2_CONFIG.parallelism,
        iterations: ARGON2_CONFIG.iterations,
        memorySize: ARGON2_CONFIG.memorySize,
        hashLength: ARGON2_CONFIG.hashLength,
        outputType: "hex",
    });
}

