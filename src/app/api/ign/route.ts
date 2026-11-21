import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { resolveAccountFromList, type WowsAccountEntry } from "@/util/Player";
import { checkRateLimit, extractClientIp } from "@/util/RateLimiter";
import { logServerError } from "@/util/SafeLogger";
import { validatePlayerIgn } from "@/util/TeamValidation";
import { readJsonWithLimit } from "@/util/RequestGuard";
import { verifySameOriginRequest } from "@/util/OriginGuard";

export async function POST(req: NextRequest) {
    const originCheck = verifySameOriginRequest(req);
    if (!originCheck.ok) {
        return NextResponse.json(
            { errorMsg: originCheck.message },
            { status: originCheck.status },
        );
    }

    const rate = checkRateLimit("ign", extractClientIp(req), 30, 60_000);
    if (!rate.allowed) {
        return NextResponse.json(
            { errorMsg: "リクエストが多すぎます。少し待ってから再度お試しください" },
            { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } },
        );
    }

    const jsonResult = await readJsonWithLimit<{ username?: unknown }>(req);
    if (!jsonResult.ok) {
        return NextResponse.json(
            { errorMsg: jsonResult.message },
            { status: jsonResult.status },
        );
    }

    const rawUsername = jsonResult.data?.username;
    if (typeof rawUsername !== "string") {
        return NextResponse.json({ errorMsg: "プレイヤー名を文字列で指定してください" }, { status: 400 });
    }

    const username = rawUsername.trim();
    const ignErr = validatePlayerIgn(username, true);
    if (ignErr) {
        return NextResponse.json(
            { nickname: undefined, account_id: undefined, errorMsg: ignErr },
            { status: 400 },
        );
    }

    const { WOWS_API_APP_ID } = process.env;
    try {
        const res = await axios.get<{ data?: WowsAccountEntry[] }>(
            "https://api.worldofwarships.asia/wows/account/list/",
            {
                params: {
                    application_id: WOWS_API_APP_ID,
                    search: username,
                },
                timeout: 10_000,
            },
        );
        const resolved = resolveAccountFromList(username, res.data?.data, true);
        return NextResponse.json({
            nickname: resolved.nickname,
            account_id: resolved.accountId,
            errorMsg: resolved.errorMsg,
        });
    } catch (err: unknown) {
        logServerError("POST /api/ign", err);
        return NextResponse.json(
            {
                nickname: undefined,
                account_id: undefined,
                errorMsg: "プレイヤー情報の取得に失敗しました",
            },
            { status: 502 },
        );
    }
}
