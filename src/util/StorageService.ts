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

export class CloudStorageService {
    private storage: Storage;
    private bucketName: string;

    constructor() {
        this.bucketName = process.env.GCS_BUCKET_NAME || 'jdm-team-icon';

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
