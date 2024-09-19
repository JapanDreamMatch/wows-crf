import {NextResponse} from "next/server";

export async function POST() {
    console.log(process.env.NEXT_PUBLIC_TEST_SECRET);
    return NextResponse.json({ test: process.env.NEXT_PUBLIC_TEST_SECRET });
}