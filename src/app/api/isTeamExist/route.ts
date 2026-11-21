import { NextRequest, NextResponse } from "next/server";
import { getCachedRegisterSheetNames } from "@/util/AppSettingsCache";
import { checkRateLimit, extractClientIp } from "@/util/RateLimiter";
import { logServerError } from "@/util/SafeLogger";
import { hasDuplicateSheetName } from "@/util/TeamValidation";
import { readJsonWithLimit } from "@/util/RequestGuard";
import { verifySameOriginRequest } from "@/util/OriginGuard";

export async function POST(req: NextRequest) {
    try {
        const originCheck = verifySameOriginRequest(req);
        if (!originCheck.ok) {
            return NextResponse.json(
                { message: originCheck.message },
                { status: originCheck.status },
            );
        }

        const rate = checkRateLimit("isTeamExist", extractClientIp(req), 30, 60_000);
        if (!rate.allowed) {
            return NextResponse.json(
                { message: "リクエストが多すぎます。少し待ってから再度お試しください" },
                { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } },
            );
        }

        const jsonResult = await readJsonWithLimit<{ teamNickName?: unknown }>(req);
        if (!jsonResult.ok) {
            return NextResponse.json(
                { message: jsonResult.message },
                { status: jsonResult.status },
            );
        }

        const rawNick = jsonResult.data?.teamNickName;
        if (typeof rawNick !== "string") {
            return NextResponse.json({ message: "チーム略名を文字列で指定してください" }, { status: 400 });
        }

        const sheetNames = await getCachedRegisterSheetNames();
        return NextResponse.json({ isExist: hasDuplicateSheetName(sheetNames, rawNick) });
    } catch (error: unknown) {
        logServerError("POST /api/isTeamExist", error);
        return NextResponse.json(
            { message: "チーム確認処理中にエラーが発生しました" },
            { status: 500 },
        );
    }
}
