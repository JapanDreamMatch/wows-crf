import {NextResponse} from "next/server";

export async function POST() {
    const { NEXT_PUBLIC_TEST_SECRET } = process.env;

    if (NEXT_PUBLIC_TEST_SECRET) {
        try{
            return JSON.parse(NEXT_PUBLIC_TEST_SECRET.toString());
        }catch (err){
            throw Error(
                `Unable to parse secret from Secret Manager. Make sure that the secret is JSON formatted: ${err}`
            );
        }
    }

    return NextResponse.json(
        { test: process.env.NEXT_PUBLIC_TEST_SECRET, neko: "neko", test2: NEXT_PUBLIC_TEST_SECRET }
    );
}