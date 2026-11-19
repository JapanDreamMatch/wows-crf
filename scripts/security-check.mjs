#!/usr/bin/env node
/**
 * scripts/security-check.mjs
 *
 * パブリックリポジトリ用の高速セキュリティ・安全性検査スクリプト（実行時間 < 0.5秒）
 * PR時およびローカルの `npm run security:check` で以下を検証します:
 *   1. Git追跡ファイルに `.env*` や秘密鍵ファイル（`*.pem`, `*.key`, `*credentials*.json`）が含まれていないこと
 *   2. `.gitignore` に `.env*.local` と `*.pem` の除外設定が存在すること
 *   3. 追跡ファイル内に実在の秘密鍵（PEM）、GCPサービスアカウントJSON、Webhook URL等が混入していないこと
 *   4. `src/` 内で `NEXT_PUBLIC_` プレフィックス付きの秘密環境変数が参照されていないこと
 *   5. `Access-Control-Allow-Origin` が `src/app/api/shipchecker/route.ts` 以外に付与されていないこと
 *   6. `src/` 内で `dangerouslySetInnerHTML` や `eval(` が使用されていないこと
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT_DIR = process.cwd();
const errors = [];

function reportError(category, detail) {
    errors.push(`[${category}] ${detail}`);
}

// 1. Git追跡ファイル＋未ステージ新規ファイル（.gitignore除外済み）一覧の取得
let trackedFiles = [];
try {
    const stdout = execFileSync(
        "git",
        ["ls-files", "-z", "--cached", "--others", "--exclude-standard"],
        {
            cwd: ROOT_DIR,
            encoding: "utf8",
        },
    );
    trackedFiles = Array.from(new Set(stdout.split("\0").filter(Boolean)));
} catch (err) {
    reportError("GIT", `git ls-files の実行に失敗しました: ${err.message}`);
}

// 2. 追跡禁止ファイル名パターンの検査
const FORBIDDEN_FILE_PATTERNS = [
    { regex: /(^|\/)\.env(\..+)?$/i, allow: /(^|\/)\.env\.example$/i, reason: "環境変数ファイル (.env*)" },
    { regex: /\.(pem|key|p12|pfx)$/i, reason: "秘密鍵・証明書ファイル (*.pem, *.key, *.p12, *.pfx)" },
    { regex: /(^|\/)(credentials|service[-_]?account).*\.json$/i, reason: "GCP認証情報JSONファイル" },
];

for (const file of trackedFiles) {
    for (const rule of FORBIDDEN_FILE_PATTERNS) {
        if (rule.regex.test(file) && !(rule.allow && rule.allow.test(file))) {
            reportError("FORBIDDEN_FILE", `追跡禁止ファイルがGitに含まれています: ${file} (${rule.reason})`);
        }
    }
}

// 3. .gitignore の必須エントリ確認
const gitignorePath = path.join(ROOT_DIR, ".gitignore");
if (!fs.existsSync(gitignorePath)) {
    reportError("GITIGNORE", ".gitignore ファイルが存在しません");
} else {
    const gitignoreContent = fs.readFileSync(gitignorePath, "utf8");
    if (!gitignoreContent.includes(".env*.local") && !gitignoreContent.includes(".env*")) {
        reportError("GITIGNORE", ".gitignore に .env*.local の除外設定がありません");
    }
    if (!gitignoreContent.includes("*.pem")) {
        reportError("GITIGNORE", ".gitignore に *.pem の除外設定がありません");
    }
}

// 4. テキストファイル内の秘密情報・セキュリティ不変条件スキャン
const BINARY_EXTENSIONS = new Set([
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".ico",
    ".webp",
    ".pptx",
    ".pdf",
    ".woff",
    ".woff2",
    ".ttf",
    ".eot",
]);

const SECRET_PATTERNS = [
    {
        name: "PEM Private Key",
        // README等のダミー記述 (-----BEGIN PRIVATE KEY-----\nlonglongkey や ...) を除外し、実鍵（64文字以上のBase64塊）を検出
        regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----(?:\\n|\r?\n)[A-Za-z0-9+/=\\n\r]{64,}/,
    },
    {
        name: "GCP Service Account JSON Key",
        regex: /"type"\s*:\s*"service_account"/,
    },
    {
        name: "GitHub Personal Access Token",
        regex: /\b(?:ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{82})\b/,
    },
    {
        name: "Discord Webhook URL",
        regex: /https:\/\/discord(?:app)?\.com\/api\/webhooks\/[0-9]+\/[A-Za-z0-9_-]+/,
    },
];

const ALLOWED_CORS_FILE = "src/app/api/shipchecker/route.ts";

for (const relPath of trackedFiles) {
    const normalizedPath = relPath.replace(/\\/g, "/");
    const ext = path.extname(normalizedPath).toLowerCase();
    if (BINARY_EXTENSIONS.has(ext) || normalizedPath === "package-lock.json") {
        continue;
    }

    const absPath = path.join(ROOT_DIR, relPath);
    if (!fs.existsSync(absPath) || fs.statSync(absPath).isDirectory()) {
        continue;
    }

    const content = fs.readFileSync(absPath, "utf8");

    // 4-1. 秘密情報パターンの検査（自身 security-check.mjs は除外）
    if (normalizedPath !== "scripts/security-check.mjs") {
        for (const pattern of SECRET_PATTERNS) {
            if (pattern.regex.test(content)) {
                reportError("SECRET_LEAK", `${normalizedPath} に ${pattern.name} の疑いがある文字列が含まれています`);
            }
        }
    }

    // 4-2. src/ および next.config.mjs のコード安全性検査
    const isSourceCode = normalizedPath.startsWith("src/") || normalizedPath === "next.config.mjs";
    if (isSourceCode) {
        // CORS 境界検査: Access-Control-Allow-Origin は src/app/api/shipchecker/route.ts のみ許可
        if (content.includes("Access-Control-Allow-Origin") && normalizedPath !== ALLOWED_CORS_FILE) {
            reportError(
                "CORS_BOUNDARY",
                `${normalizedPath} で Access-Control-Allow-Origin が設定されています（許可されているのは ${ALLOWED_CORS_FILE} のみです）`,
            );
        }

        // Credentials 付きワイルドカード CORS の禁止
        if (content.includes("Access-Control-Allow-Credentials")) {
            reportError(
                "CORS_CREDENTIALS",
                `${normalizedPath} で Access-Control-Allow-Credentials が使用されています`,
            );
        }

        // サーバー専用秘密変数の NEXT_PUBLIC_ 露出検査
        if (
            /NEXT_PUBLIC_[A-Z0-9_]*(PRIVATE_KEY|SERVICE_ACCOUNT|SHEET_ID|WOWS_API_APP_ID|CREDENTIALS)/i.test(
                content,
            )
        ) {
            reportError(
                "PUBLIC_ENV_EXPOSURE",
                `${normalizedPath} でサーバー専用の秘密環境変数に NEXT_PUBLIC_ プレフィックスが使用されています`,
            );
        }

        // 危険な XSS シンク / eval の検査 (Emotion SSR style tag の ThemeProvider.tsx のみ例外許可)
        if (
            content.includes("dangerouslySetInnerHTML") &&
            normalizedPath !== "src/components/ThemeProvider.tsx"
        ) {
            reportError("XSS_SINK", `${normalizedPath} で dangerouslySetInnerHTML が使用されています`);
        }
        if (/\beval\s*\(/.test(content)) {
            reportError("UNSAFE_EVAL", `${normalizedPath} で eval() が使用されています`);
        }
    }
}

if (errors.length > 0) {
    console.error("✖ Security check failed with the following issue(s):");
    for (const err of errors) {
        console.error(`  - ${err}`);
    }
    process.exit(1);
}

console.log(`✔ Security check passed (${trackedFiles.length} tracked files verified).`);
