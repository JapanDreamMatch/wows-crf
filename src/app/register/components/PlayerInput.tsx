import {Path, FieldValues, useFormContext} from "react-hook-form";
import {Box, Field, HStack, Input} from "@chakra-ui/react";
import axios from "axios";
import { useState } from "react";
import { PLAYER_NOT_FOUND, TOO_MANY_PLAYERS } from "@/util/type/PlayerChecker";
import { PLAYER_IGN_MAX_LENGTH } from "@/util/TeamValidation";
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
        <Field.Root invalid={Boolean(errorMsg)} className="py-4">
            <Box borderWidth='0px' borderRadius='lg' className="p-2 w-full">
                <div className="mt-2">
                    <Field.Label className="pl-2">{label}</Field.Label>
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
                                    if (value.length > PLAYER_IGN_MAX_LENGTH) {
                                        setAccountId(undefined);
                                        return `プレイヤー名は${PLAYER_IGN_MAX_LENGTH}字以内で入力してください`;
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

                                    let responseData: {
                                        nickname?: string;
                                        account_id?: string;
                                        errorMsg?: string;
                                    };
                                    try {
                                        const response = await axios.post(`/api/ign`, { username });
                                        responseData = response.data;
                                    } catch (e: unknown) {
                                        setAccountId(undefined);
                                        setLastValidatedUsername(undefined);
                                        if (
                                            axios.isAxiosError(e) &&
                                            typeof e.response?.data?.errorMsg === "string" &&
                                            e.response.data.errorMsg
                                        ) {
                                            return e.response.data.errorMsg;
                                        }
                                        return "プレイヤーの確認に失敗しました。少し待ってから再度お試しください";
                                    }

                                    const trulyName = responseData.nickname;
                                    const uid = responseData.account_id;
                                    const err = responseData.errorMsg;

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
                    <Field.ErrorText>{errorMsg}</Field.ErrorText>
                    {accountId !== undefined && (
                        <HStack justify="right">
                            <p>アカウント: </p>
                            <Link
                                href={`https://profile.worldofwarships.asia/statistics/${accountId}`}
                                className="text-blue-600 dark:text-blue-400 hover:underline break-all"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                {`https://profile.worldofwarships.asia/statistics/${accountId}`}
                            </Link>
                        </HStack>
                    )}

                </div>
            </Box>
        </Field.Root>
    );
}