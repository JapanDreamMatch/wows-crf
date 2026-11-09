import { NextRequest, NextResponse } from "next/server";
import { authenticateTeam } from "@/util/TeamAuth";
import { CheckTime } from "@/app/api/isApplication/checkTime";
import { IsIgnore } from "@/app/api/isApplication/isIgnore";

export async function POST(req: NextRequest) {
    try {
        const checkTime = await CheckTime();
        const isIgnore = await IsIgnore();
        if (!(isIgnore || checkTime)) {
            return NextResponse.json(
                { message: "現在は変更受付期間ではありません" },
                { status: 503 }
            );
        }

        const body = await req.json();
        const teamNickName = typeof body?.teamNickName === "string" ? body.teamNickName : "";
        const password = typeof body?.password === "string" ? body.password : "";

        const auth = await authenticateTeam(teamNickName, password);
        if (!auth.ok) {
            return NextResponse.json(
                { message: auth.message },
                { status: auth.status }
            );
        }

        return NextResponse.json({
            teamData: auth.teamData,
        });
    } catch (error: any) {
        console.error(error);
        return NextResponse.json(
            { message: "認証処理中にエラーが発生しました" },
            { status: 500 }
        );
    }
}

