import { Storage } from '@google-cloud/storage';
import type { DetectedImage } from '@/util/ImageValidator';
import { validateTeamNickName } from '@/util/TeamValidation';

const SAFE_FOLDER_PATTERN = /^[a-zA-Z0-9/_-]+$/;

function sanitizeLogoFolderName(folderName: string): string {
    const cleaned = folderName.replace(/^\/+|\/+$/g, '').trim();
    if (!cleaned || cleaned.includes('..') || !SAFE_FOLDER_PATTERN.test(cleaned)) {
        return 'logos';
    }
    return cleaned;
}

/**
 * 公式 GCS 公開 URL からオブジェクト名を厳格に抽出する（他ドメイン・別バケット・トラバーサルを拒否）
 */
export function extractObjectNameFromUrl(url: string, expectedBucketName: string): string | null {
    if (!url || !expectedBucketName) return null;
    const trimmed = url.trim();
    const withoutQueryOrHash = trimmed.split(/[?#]/)[0] ?? "";
    if (/(?:^|\/)(?:\.|%2e){2}(?:\/|$)/i.test(withoutQueryOrHash)) {
        return null;
    }

    let parsed: URL;
    try {
        parsed = new URL(trimmed);
    } catch {
        return null;
    }

    if (parsed.protocol !== 'https:' || parsed.hostname.toLowerCase() !== 'storage.googleapis.com') {
        return null;
    }

    const parts = parsed.pathname.split('/').filter(Boolean);
    if (parts.length < 2 || parts[0] !== expectedBucketName) {
        return null;
    }

    const decodedParts: string[] = [];
    for (const part of parts.slice(1)) {
        let decoded: string;
        try {
            decoded = decodeURIComponent(part);
        } catch {
            return null;
        }
        if (!decoded || decoded === '.' || decoded === '..' || decoded.includes('..') || /[\x00-\x1f\\]/.test(decoded)) {
            return null;
        }
        decodedParts.push(decoded);
    }

    return decodedParts.join('/');
}

export class CloudStorageService {
    private storage: Storage;
    private bucketName: string;

    constructor() {
        const envBucket = process.env.GCS_BUCKET_NAME?.trim();
        if (!envBucket) {
            if (process.env.NODE_ENV === 'production') {
                throw new Error('GCS_BUCKET_NAME is not configured.');
            }
            this.bucketName = 'jdm-team-icon';
        } else {
            this.bucketName = envBucket;
        }

        const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
        const privateKey = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

        if (email && privateKey) {
            this.storage = new Storage({
                credentials: { client_email: email, private_key: privateKey },
            });
        } else {
            // Cloud Run環境等でのADCフォールバック
            this.storage = new Storage();
        }
    }

    public getBucketName(): string {
        return this.bucketName;
    }

    private buildPublicUrl(objectName: string): string {
        const encodedPath = objectName
            .split('/')
            .map((part) => encodeURIComponent(part))
            .join('/');
        return `https://storage.googleapis.com/${this.bucketName}/${encodedPath}`;
    }

    /**
     * 検証済みのチームロゴをアップロードする
     * @param buffer 画像データ（検証済み）
     * @param image  マジックナンバーで判定した形式
     * @param teamNickName チーム略名（ファイル名「チーム略名.拡張子」に使用）
     * @param folderName 格納先フォルダ名（スプレッドシートの logo_directory より取得）
     * @returns objectName と 公開URL
     */
    async uploadTeamLogo(
        buffer: Buffer,
        image: DetectedImage,
        teamNickName: string,
        folderName: string = 'logos'
    ): Promise<{ objectName: string; url: string }> {
        const nickErr = validateTeamNickName(teamNickName);
        if (nickErr) {
            throw new Error(`Invalid teamNickName for upload: ${nickErr}`);
        }
        const safeNick = teamNickName.trim();
        const sanitizedFolder = sanitizeLogoFolderName(folderName);
        const objectName = `${sanitizedFolder}/${safeNick}.${image.ext}`;

        await this.storage.bucket(this.bucketName).file(objectName).save(buffer, {
            contentType: image.mime,          // 申告値ではなく判定結果
            resumable: false,
            metadata: {
                cacheControl: 'public, max-age=31536000',
                contentDisposition: 'inline',
                metadata: { teamNickName },   // カスタムメタデータ
            },
        });

        return {
            objectName,
            url: this.buildPublicUrl(objectName),
        };
    }

    /**
     * 既存のチームロゴを新しいチーム略名のオブジェクトへコピーする
     * （フォルダ・拡張子・Content-Type 等の既存メタデータを維持し、カスタムメタデータの teamNickName のみ更新）
     */
    async copyTeamLogo(
        srcObjectName: string,
        newTeamNickName: string
    ): Promise<{ objectName: string; url: string }> {
        const nickErr = validateTeamNickName(newTeamNickName);
        if (nickErr) {
            throw new Error(`Invalid newTeamNickName for copy: ${nickErr}`);
        }
        if (!srcObjectName || srcObjectName.includes('..')) {
            throw new Error('Invalid source object name');
        }
        const safeNewNick = newTeamNickName.trim();
        const lastSlash = srcObjectName.lastIndexOf('/');
        const dir = lastSlash >= 0 ? srcObjectName.slice(0, lastSlash) : '';
        const baseName = lastSlash >= 0 ? srcObjectName.slice(lastSlash + 1) : srcObjectName;
        const lastDot = baseName.lastIndexOf('.');
        const ext = lastDot > 0 ? baseName.slice(lastDot) : '';
        const newObjectName = dir ? `${dir}/${safeNewNick}${ext}` : `${safeNewNick}${ext}`;

        if (newObjectName === srcObjectName) {
            return {
                objectName: srcObjectName,
                url: this.buildPublicUrl(srcObjectName),
            };
        }

        const bucket = this.storage.bucket(this.bucketName);
        const srcFile = bucket.file(srcObjectName);
        const destFile = bucket.file(newObjectName);

        await srcFile.copy(destFile);
        await destFile.setMetadata({
            cacheControl: 'public, max-age=31536000',
            contentDisposition: 'inline',
            metadata: { teamNickName: newTeamNickName },
        });

        return {
            objectName: newObjectName,
            url: this.buildPublicUrl(newObjectName),
        };
    }

    /** 書き込み失敗時のロールバック用（失敗しても握りつぶす） */
    async deleteObject(objectName: string): Promise<void> {
        try {
            await this.storage.bucket(this.bucketName).file(objectName).delete({ ignoreNotFound: true });
        } catch (e) {
            console.error("failed to delete orphan logo:", objectName, e);
        }
    }
}
