import { NextRequest, NextResponse } from "next/server";
import { CheckTime } from "@/app/api/isApplication/checkTime";
import { CheckTeamAmount } from "@/app/api/isApplication/checkTeamAmount";
import { IsIgnore } from "@/app/api/isApplication/isIgnore";
import { checkRateLimit, extractClientIp } from "@/util/RateLimiter";
import { logServerError } from "@/util/SafeLogger";

export async function POST(req: NextRequest) {
    try {
        const rate = checkRateLimit("isApplication", extractClientIp(req), 60, 60_000);
        if (!rate.allowed) {
            return NextResponse.json(
                { message: "リクエストが多すぎます。少し待ってから再度お試しください" },
                { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } },
            );
        }

        const [checkTime, checkTeamAmount, isIgnore] = await Promise.all([
            CheckTime(),
            CheckTeamAmount(),
            IsIgnore(),
        ]);

        const canUpdate = isIgnore || checkTime ? "YES" : "NO";

        if (isIgnore || (checkTime && checkTeamAmount)) {
            return NextResponse.json({ canRegister: "YES", canUpdate });
        }

        const reason = !checkTime ? "period" : "amount";
        return NextResponse.json({ canRegister: "NO", canUpdate, reason });
    } catch (error: unknown) {
        logServerError("POST /api/isApplication", error);
        return NextResponse.json(
            { message: "受付状況の確認中にエラーが発生しました" },
            { status: 500 },
        );
    }
}
