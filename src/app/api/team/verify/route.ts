import { NextRequest, NextResponse } from "next/server";
import { authenticateTeam } from "@/util/TeamAuth";
import { CheckTime } from "@/app/api/isApplication/checkTime";
import { IsIgnore } from "@/app/api/isApplication/isIgnore";
import { MAX_PASSWORD_LENGTH } from "@/util/Argon2Service";
import { checkRateLimit, extractClientIp } from "@/util/RateLimiter";
import { logServerError } from "@/util/SafeLogger";
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

        const rate = checkRateLimit("team-verify", extractClientIp(req), 20, 60_000);
        if (!rate.allowed) {
            return NextResponse.json(
                { message: "リクエストが多すぎます。少し待ってから再度お試しください" },
                { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } },
            );
        }

        const [checkTime, isIgnore] = await Promise.all([CheckTime(), IsIgnore()]);
        if (!(isIgnore || checkTime)) {
            return NextResponse.json(
                { message: "現在は変更受付期間ではありません" },
                { status: 503 },
            );
        }

        const jsonResult = await readJsonWithLimit<{ teamNickName?: unknown; password?: unknown }>(req);
        if (!jsonResult.ok) {
            return NextResponse.json(
                { message: jsonResult.message },
                { status: jsonResult.status },
            );
        }

        const parsed = jsonResult.data;
        const teamNickName = typeof parsed?.teamNickName === "string" ? parsed.teamNickName : "";
        const password = typeof parsed?.password === "string" ? parsed.password : "";

        if (password.length > MAX_PASSWORD_LENGTH) {
            return NextResponse.json(
                { message: "パスワードが正しくありません" },
                { status: 401 },
            );
        }

        const auth = await authenticateTeam(teamNickName, password);
        if (!auth.ok) {
            return NextResponse.json(
                { message: auth.message },
                { status: auth.status },
            );
        }

        return NextResponse.json({
            teamData: auth.teamData,
        });
    } catch (error: unknown) {
        logServerError("POST /api/team/verify", error);
        return NextResponse.json(
            { message: "認証処理中にエラーが発生しました" },
            { status: 500 },
        );
    }
}
