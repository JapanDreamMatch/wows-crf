import {NextRequest, NextResponse} from "next/server";
import axios from "axios";

export async function POST(req: NextRequest) {
    const { username } = await req.json();

    const wowsApiResponse
        = await axios.get(`https://api.worldofwarships.asia/wows/account/list/?application_id=${process.env.WOWS_API_APP_ID}&search=${username}`)
        .then(res => {
            const count = Number(res.data.meta.count);
            if(count == 1){
                console.log("↓in ign route.ts↓")
                console.log(res.data.data[0].nickname)
                console.log(res.data.data[0].account_id)
                return [res.data.data[0].nickname as string, res.data.data[0].account_id as string];
            }else{
                console.log("undefined!");
                return undefined;
            }

        })
        .catch(function(err) {
            return NextResponse.json({ message: "err: wows-api access error; " + err.message });
        })

    return NextResponse.json({ message: wowsApiResponse });
}