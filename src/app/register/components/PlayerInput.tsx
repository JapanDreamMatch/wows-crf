import {Path, FieldValues, useFormContext} from "react-hook-form";
import {Box, FormControl, FormErrorMessage, FormLabel, HStack, Input} from "@chakra-ui/react";
import axios from "axios";
import {useState} from "react";
import {PLAYER_NOT_FOUND, TOO_MANY_PLAYERS} from "@/util/type/PlayerChecker";
import Link from "next/link";

export default function PlayerInput<T extends FieldValues = never>(
    {
        label,
        rhfName,
        errorMsg,
        canEmpty
    }: {
        label: string;
        rhfName: Path<T>;
        errorMsg: string | undefined;
        canEmpty: boolean;
    }
) {

    const {
        register
    } = useFormContext();

    const [accountId, setAccountId] = useState<string | undefined>(undefined);
    const [lastValidatedUsername, setLastValidatedUsername] = useState<string | undefined>(undefined);

    return (
        <FormControl isInvalid={Boolean(errorMsg)} className="py-4">
            <Box borderWidth='0px' borderRadius='lg' className="p-2">
                <div className="mt-2">
                    <FormLabel className="pl-2">{label}</FormLabel>
                </div>
                <div>
                    <Input
                        id={rhfName}
                        placeholder="Please input WoWS IGN."
                        {...register(rhfName, {
                            validate: {
                                required: v => {
                                    const value = v as string;
                                    if(!canEmpty && value.length == 0) {
                                        setAccountId(undefined);
                                        return "ゲーム内のプレイヤー名を入力してください";
                                    }
                                },

                                pattern: v => {
                                    const username = v as string;
                                    if (canEmpty && username.length == 0) return true; //補欠用
                                    const ptn = /^[a-zA-Z0-9_]+$/
                                    if(!ptn.test(username)){
                                        setAccountId(undefined);
                                        return "有効なプレイヤー名を入力してください"
                                    }
                                },

                                checkLength: v => {
                                    const value = v as string;
                                    if (value.length < 3 && !(canEmpty && value.length == 0)) {
                                        setAccountId(undefined);
                                        return "プレイヤー名が短すぎます";
                                    }
                                    return true;
                                },

                                checkPlayer: async v => {
                                    const username = v as string;
                                    if (canEmpty && username.length == 0) {
                                        setAccountId(undefined);
                                        setLastValidatedUsername("");
                                        return true; //補欠用
                                    }

                                    // 既に同じユーザー名でチェック通過済みの場合は再通信をスキップ
                                    if (accountId !== undefined && lastValidatedUsername === username) {
                                        return true;
                                    }

                                    const response = await axios.post(`/api/ign`, {username});
                                    const trulyName = response.data.nickname;
                                    const uid = response.data.account_id;
                                    const err = response.data.errorMsg;

                                    setAccountId(undefined);
                                    setLastValidatedUsername(undefined);

                                    //エラーがある場合、エラー内容を返す
                                    if (err !== undefined) {
                                        switch (err) {
                                            case PLAYER_NOT_FOUND:
                                                return "存在しないプレイヤー名です";
                                            case TOO_MANY_PLAYERS:
                                                return "存在しないプレイヤー名です"
                                            default:
                                                return err;
                                        }
                                    }

                                    //入力が間違ってるが、候補が絞れる場合　例 => 入力:Seaoftrees0 返答:Seaoftrees08
                                    if (username !== trulyName) {
                                        return `入力が誤っています。「${trulyName}」の間違いですか？`
                                    }

                                    setAccountId(uid);
                                    setLastValidatedUsername(username);
                                    return true;
                                }
                            }
                        })}
                    />
                    <FormErrorMessage>{errorMsg}</FormErrorMessage>
                    <HStack
                        hidden={accountId === undefined}
                        justify="right"
                    >
                        <p>アカウント: </p>
                        <Link
                            href={`https://profile.worldofwarships.asia/statistics/${accountId}`}
                            className="text-blue-600 dark:text-blue-400 hover:underline break-all"
                            target="_blank"
                        >
                            {`https://profile.worldofwarships.asia/statistics/${accountId}`}
                        </Link>
                    </HStack>

                </div>
            </Box>
        </FormControl>
    );
}