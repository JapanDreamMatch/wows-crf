import {NextRequest, NextResponse} from "next/server";
import {GoogleAuth} from "google-auth-library";
import * as fs from "node:fs";
import {google} from "googleapis";

export async function POST(req: NextRequest) {
    const { username } = await req.json();
    const response = `${username}hello`;

    //Google driveへのアップロード
    //https://developers.google.com/workspace/drive/api/guides/manage-uploads?hl=ja
    //https://github.com/googleworkspace/node-samples/blob/main/drive/snippets/drive_v3/file_snippets/upload_basic.js
    //Licensed under the Apache License, Version 2.0 (the "License");
    //https://www.apache.org/licenses/LICENSE-2.0

    return NextResponse.json({ message: response });
}