import {NextResponse} from "next/server";

export async function POST() {
    const { NEXT_PUBLIC_TEST_SECRET } = process.env;
    let result = "";

    if (NEXT_PUBLIC_TEST_SECRET) {
        try{
            // @ts-ignore
            result = JSON.parse(NEXT_PUBLIC_TEST_SECRET.toString('utf8'));
        }catch (err){
            result = `Unable to parse secret from Secret Manager. Make sure that the secret is JSON formatted: ${err}`;
        }
    }else{
        result = "NEXT_PUBLIC_TEST_SECRET is undefined";
    }

    return NextResponse.json(
        { test: process.env.NEXT_PUBLIC_TEST_SECRET, neko: "neko", test2: result }
    );
}