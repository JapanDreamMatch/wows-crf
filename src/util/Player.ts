import axios from "axios";
import { logServerError } from "@/util/SafeLogger";
import { PLAYER_NOT_FOUND, TOO_MANY_PLAYERS } from "@/util/type/PlayerChecker";

export interface WowsAccountEntry {
    nickname?: string;
    account_id?: string | number;
}

export interface AccountResolution {
    nickname?: string;
    accountId?: string | number;
    errorMsg?: string;
}

const WG_API_TIMEOUT_MS = 10_000;

/**
 * Wargaming account/list レスポンスから完全一致（または単一候補）アカウントを解決する純粋関数。
 * `allowSuggestionForSingle` が true の場合（/api/ign 用）、1件のみヒット時は前方一致候補も返す。
 */
export function resolveAccountFromList(
    username: string,
    accounts: WowsAccountEntry[] | undefined,
    allowSuggestionForSingle: boolean = false,
): AccountResolution {
    const list = Array.isArray(accounts) ? accounts : [];
    const count = list.length;

    if (count === 0) {
        return { errorMsg: PLAYER_NOT_FOUND };
    }

    if (count === 1) {
        const candidate = list[0];
        if (!allowSuggestionForSingle && candidate?.nickname !== username) {
            return { errorMsg: PLAYER_NOT_FOUND };
        }
        return {
            nickname: candidate?.nickname,
            accountId: candidate?.account_id,
        };
    }

    for (let i = 0; i < count; i++) {
        if (username === list[i]?.nickname) {
            return {
                nickname: list[i].nickname,
                accountId: list[i].account_id,
            };
        }
    }

    return { errorMsg: TOO_MANY_PLAYERS };
}

export class Player {
    private readonly ign: string;
    private uid?: string | number;
    private winRate?: number;

    public constructor(ign: string) {
        this.ign = ign;
    }

    public async getInstance(): Promise<Player> {
        const instance = new Player(this.ign);
        if (!instance.ign) {
            return instance;
        }

        const { WOWS_API_APP_ID } = process.env;

        try {
            const listRes = await axios.get(
                "https://api.worldofwarships.asia/wows/account/list/",
                {
                    params: {
                        application_id: WOWS_API_APP_ID,
                        search: instance.ign,
                    },
                    timeout: WG_API_TIMEOUT_MS,
                },
            );
            const resolved = resolveAccountFromList(instance.ign, listRes.data?.data, false);
            if (resolved.accountId !== undefined) {
                instance.uid = resolved.accountId;
            }
        } catch (err) {
            logServerError("Player.getInstance account/list", err);
            return instance;
        }

        if (instance.uid === undefined) {
            return instance;
        }

        try {
            const infoRes = await axios.get(
                "https://api.worldofwarships.asia/wows/account/info/",
                {
                    params: {
                        application_id: WOWS_API_APP_ID,
                        account_id: instance.uid,
                    },
                    timeout: WG_API_TIMEOUT_MS,
                },
            );
            if (infoRes.data?.status === "ok") {
                const userData = infoRes.data?.data?.[String(instance.uid)];
                const battles = userData?.statistics?.pvp?.battles;
                const wins = userData?.statistics?.pvp?.wins;
                if (typeof battles === "number" && battles > 0 && typeof wins === "number") {
                    instance.winRate = (wins * 100.0) / battles;
                }
            }
        } catch (err) {
            logServerError("Player.getInstance account/info", err);
        }

        return instance;
    }

    public getIgn() {
        return this.ign;
    }

    public getWinRate() {
        return this.winRate;
    }

    public getUid() {
        return this.uid;
    }
}
