import formidable from "formidable";
import {NextRequest, NextResponse} from "next/server";

export async function POST(
    req: NextRequest,
) {
    if (req.method !== "POST") return;

    const {
        teamName,
        teamNickName,
        teamLogo,
        contact,
        ign1,
        ign2,
        ign3,
        ign4,
        ign5,
        ign6,
        ign7,
        ign8,
        ign9,
        ign10,
        comment
    } = await req.json();

    console.log("teamName: " + teamName);
    console.log("teamNickName: " + teamNickName);
    console.log("teamLogo: " + teamLogo);
    console.log("contact: " + contact);
    console.log("ign1: " + ign1);
    console.log("ign2: " + ign2);
    console.log("ign3: " + ign3);
    console.log("ign4: " + ign4);
    console.log("ign5: " + ign5);
    console.log("ign6: " + ign6);
    console.log("ign7: " + ign7);
    console.log("ign8: " + ign8);
    console.log("ign9: " + ign9);
    console.log("ign10: " + ign10);
    console.log("comment: " + comment);

    // const form = formidable({ multiples: false, uploadDir: __dirname });
    // form.onPart = (part) => {
    //     // let formidable handle only non-file parts
    //     if (part.originalFilename === "" || !part.mimetype) {
    //         // used internally, please do not override!
    //         form._handlePart(part);
    //     } else if (part.originalFilename) {
    //         console.log( "part name: " + part.name); //TODO: remove
    //         //Upload
    //     }
    // }
    //
    // //input[type="file"]以外のデータ
    // form.on('field', (name, value) => {
    //     console.log(name);
    //     console.log(value);
    // })
    //
    // // 変換処理
    // void form.parse(req)

    return NextResponse.json({ message: "ok" });
}