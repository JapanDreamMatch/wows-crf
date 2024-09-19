import {NextResponse} from "next/server";

export async function POST() {
    return NextResponse.json({ test: process.env.NEXT_PUBLIC_TEST_SECRET });
}