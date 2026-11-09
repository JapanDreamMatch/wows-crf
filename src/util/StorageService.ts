import { Storage } from '@google-cloud/storage';
import type { DetectedImage } from '@/util/ImageValidator';

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
        const sanitizedFolder = folderName.replace(/^\/+|\/+$/g, '').trim() || 'logos';
        const objectName = `${sanitizedFolder}/${teamNickName}.${image.ext}`;

        await this.storage.bucket(this.bucketName).file(objectName).save(buffer, {
            contentType: image.mime,          // 申告値ではなく判定結果
            resumable: false,
            metadata: {
                cacheControl: 'public, max-age=31536000',
                contentDisposition: 'inline',
                metadata: { teamNickName },   // カスタムメタデータ
            },
        });

        const encodedPath = objectName
            .split('/')
            .map((part) => encodeURIComponent(part))
            .join('/');

        return {
            objectName,
            url: `https://storage.googleapis.com/${this.bucketName}/${encodedPath}`,
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
