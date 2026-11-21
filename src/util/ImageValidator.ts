export const MAX_LOGO_SIZE = 20 * 1024 * 1024; // 20MB
export const MAX_LOGO_DIMENSION = 4096; // 4096 x 4096 px

export type DetectedImage = { mime: "image/png" | "image/jpeg"; ext: "png" | "jpg" };

export interface ImageDimensions {
    width: number;
    height: number;
}

export function detectImageType(buf: Buffer): DetectedImage | null {
    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
        buf.length >= 8 &&
        buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    ) {
        return { mime: "image/png", ext: "png" };
    }
    // JPEG: FF D8 FF
    if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
        return { mime: "image/jpeg", ext: "jpg" };
    }
    return null;
}

function isJpegSofMarker(marker: number): boolean {
    return (
        (marker >= 0xc0 && marker <= 0xc3) ||
        (marker >= 0xc5 && marker <= 0xc7) ||
        (marker >= 0xc9 && marker <= 0xcb) ||
        (marker >= 0xcd && marker <= 0xcf)
    );
}

/**
 * PNG (IHDR) または JPEG (SOF0..SOF15) ヘッダから画像ピクセル解像度を抽出する。
 */
export function extractImageDimensions(
    buf: Buffer,
    imageType: DetectedImage,
): ImageDimensions | null {
    if (imageType.ext === "png") {
        // IHDR チャンク: offset 12..15 = "IHDR", 16..19 = width, 20..23 = height
        if (buf.length < 24) {
            return null;
        }
        if (buf.subarray(12, 16).toString("ascii") !== "IHDR") {
            return null;
        }
        const width = buf.readUInt32BE(16);
        const height = buf.readUInt32BE(20);
        return { width, height };
    }

    // JPEG マーカー走査
    let offset = 2;
    while (offset + 1 < buf.length) {
        if (buf[offset] !== 0xff) {
            offset += 1;
            continue;
        }
        while (offset < buf.length && buf[offset] === 0xff) {
            offset += 1;
        }
        if (offset >= buf.length) {
            break;
        }
        const marker = buf[offset];
        offset += 1;

        // SOI / EOI / RSTn / TEM はデータ長を持たない
        if (
            marker === 0x00 ||
            marker === 0x01 ||
            marker === 0xd8 ||
            marker === 0xd9 ||
            (marker >= 0xd0 && marker <= 0xd7)
        ) {
            continue;
        }
        // SOS (Start of Scan) 到達後は画像データ本体
        if (marker === 0xda) {
            break;
        }
        if (offset + 1 >= buf.length) {
            break;
        }
        const segmentLength = buf.readUInt16BE(offset);
        if (segmentLength < 2 || offset + segmentLength > buf.length) {
            break;
        }

        if (isJpegSofMarker(marker)) {
            if (offset + 7 > buf.length) {
                return null;
            }
            const height = buf.readUInt16BE(offset + 3);
            const width = buf.readUInt16BE(offset + 5);
            return { width, height };
        }

        offset += segmentLength;
    }

    return null;
}

/**
 * 画像デコード爆弾対策として、画像ヘッダ上のピクセル解像度上限を検証する。
 */
export function validateImageDimensions(buf: Buffer, imageType: DetectedImage): string | null {
    const dims = extractImageDimensions(buf, imageType);
    if (!dims || dims.width <= 0 || dims.height <= 0) {
        return "画像ファイルが破損しているか、読み取れない形式です";
    }
    if (dims.width > MAX_LOGO_DIMENSION || dims.height > MAX_LOGO_DIMENSION) {
        return `画像の解像度は${MAX_LOGO_DIMENSION}x${MAX_LOGO_DIMENSION}px以内である必要があります`;
    }
    return null;
}
