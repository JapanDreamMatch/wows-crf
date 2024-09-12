import {NextRequest, NextResponse} from "next/server";
import axios from "axios";

export async function POST(req: NextRequest) {
    const { username } = await req.json();

    const wowsApiResponse
        = await axios.get(`https://api.worldofwarships.asia/wows/account/list/?application_id=0f26e2f6c892c67615769a7db4624898&search=${username}`)
        .then(res => {
            const count = Number(res.data.meta.count);
            if(count == 1){
                return res.data.data[0].nickname as string;
            }else{
                return undefined;
            }

        })
        .catch(function(err) {
            return NextResponse.json({ message: "err: wows-api access error; " + err.message });
        })

    return NextResponse.json({ message: wowsApiResponse });
}