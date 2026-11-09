import {NextResponse} from "next/server";
import {CheckTime} from "@/app/api/isApplication/checkTime";
import {CheckTeamAmount} from "@/app/api/isApplication/checkTeamAmount";
import {IsIgnore} from "@/app/api/isApplication/isIgnore";

export async function POST() {
    const checkTime = await CheckTime();
    const checkTeamAmount = await CheckTeamAmount();
    const isIgnore = await IsIgnore();

    const canUpdate = isIgnore || checkTime ? "YES" : "NO";

    if(isIgnore || (checkTime && checkTeamAmount)){
        return NextResponse.json({canRegister: "YES", canUpdate});
    }else {
        const reason = !checkTime ? "period" : "amount";
        return NextResponse.json({canRegister: "NO", canUpdate, reason});
    }
}