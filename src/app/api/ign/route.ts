import {NextRequest, NextResponse} from "next/server";
import axios from "axios";
import {PLAYER_NOT_FOUND, TOO_MANY_PLAYERS} from "@/util/type/PlayerChecker";

export async function POST(req: NextRequest) {
    const { username } = await req.json();

    const wowsApiResponse
        = await axios.get(`https://api.worldofwarships.asia/wows/account/list/?application_id=${process.env.WOWS_API_APP_ID}&search=${username}`)
        .then(res => {

            let nickname, account_id, errorMsg = undefined;

            const count = Number(res.data.meta.count);
            if(count == 0) {
                errorMsg = PLAYER_NOT_FOUND;
            }else if(count == 1){
                nickname = res.data.data[0].nickname;
                account_id = res.data.data[0].account_id;
            }else{
                for(let i=0; i<count; i++){
                    if(username === res.data.data[i].nickname){
                        nickname = res.data.data[0].nickname;
                        account_id = res.data.data[0].account_id;
                        return [nickname, account_id, errorMsg];
                    }
                }
                errorMsg = TOO_MANY_PLAYERS;
            }

            return [nickname, account_id, errorMsg];
        })
        .catch(function(err) {
            return [undefined, undefined, "err: wows-api access error; " + err.message];
        })

    return NextResponse.json({
        nickname: wowsApiResponse[0],
        account_id: wowsApiResponse[1],
        errorMsg: wowsApiResponse[2]
    });
}