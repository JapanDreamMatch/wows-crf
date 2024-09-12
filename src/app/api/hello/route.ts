import {NextRequest, NextResponse} from "next/server";

export async function POST(req: NextRequest) {
    const { username } = await req.json();
    const response = `${username}hello`;
    return NextResponse.json({ message: response });
}