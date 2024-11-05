import axios from "axios";

export class Player{

    private readonly ign: string;
    private static instance?: Player;
    private uid?: string;
    private winRate?: number;

    // private readonly notfound = 404;
    // private readonly errorNum = -1;

    public constructor(ign: string){
        this.ign = ign;
    }

    public async getInstance():Promise<Player> {
        if (Player.instance !== undefined) {
            return Player.instance;
        }

        const instance = new Player(this.ign);

        //Player UIDを取得する
        const { WOWS_API_APP_ID } = process.env;
        await axios.get(`https://api.worldofwarships.asia/wows/account/list/?application_id=${WOWS_API_APP_ID}&search=${instance.ign}`)
            .then(res => {
                const count = Number(res.data.meta.count);
                if (count == 1) {
                    instance.uid = res.data.data[0].account_id;
                } else {
                    for (let i = 0; i < count; i++) {
                        if (instance.ign === res.data.data[i].nickname) {
                            instance.uid = res.data.data[0].account_id;
                        }
                    }
                }
            })
            .catch(function (err) {
                //error
            })

        //パーソナルデータの取得
        instance.winRate = await axios.get(`https://api.worldofwarships.asia/wows/account/info/?application_id=${WOWS_API_APP_ID}&account_id=${instance.uid}`)
            .then(res => {
                const status = res.data.status as unknown as string;
                if (status == "ok") {
                    const userData = instance.uid ? res.data.data[instance.uid] : undefined;
                    const battles = userData ? userData.statistics.pvp.battles: undefined;
                    const wins = userData ? userData.statistics.pvp.wins : undefined;
                    return battles && wins ? wins*100.0/battles : undefined;
                } else {
                    //not found
                    return undefined;
                }
            })
            .catch((err) => {
                return undefined;
            })

        return instance;

    }

    public getIgn(){
        return this.ign;
    }

    public getWinRate(){
        return this.winRate;
    }

    public getUid(){
        return this.uid;
    }
}