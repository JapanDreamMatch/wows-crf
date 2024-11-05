import {NextResponse} from "next/server";

export async function POST() {
    const { NEXT_PUBLIC_DISCORD_LINK} = process.env;
    return NextResponse.json({ link: NEXT_PUBLIC_DISCORD_LINK ?? "" });
}