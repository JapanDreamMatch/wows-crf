import {Path, FieldValues, useFormContext} from "react-hook-form";
import {Box, Field, Input, Text} from "@chakra-ui/react";
import axios from "axios";
import {
    TEAM_NICKNAME_MAX_LENGTH,
    TEAM_NICKNAME_MIN_LENGTH,
    TEAM_NICKNAME_PATTERN,
} from "@/util/TeamValidation";

export default function TeamNickNameInput<T extends FieldValues = never>(
    {
        rhfName,
        errorMsg,
        currentNickName,
        noticeText,
    }:{
        rhfName: Path<T>;
        errorMsg: string | undefined;
        currentNickName?: string;
        noticeText?: string;
    }
){

    const {
        register
    } = useFormContext();


    return(
        <Field.Root invalid={Boolean(errorMsg)} className="py-4">
            <Box borderWidth='0px' borderRadius='lg' className="p-2 w-full">
                <div className="mt-2">
                    <Field.Label className="pl-2 mb-1">チーム略名</Field.Label>
                    {noticeText && (
                        <Text className="pl-2 mb-2 text-xs text-slate-500 dark:text-slate-400">
                            {noticeText}
                        </Text>
                    )}
                </div>
                <div>
                    <Input
                        id={rhfName}
                        placeholder="Please input team nickname."
                        {...register(rhfName, {
                            required: "チーム略名を入力してください",
                            minLength:{
                                value: TEAM_NICKNAME_MIN_LENGTH,
                                message: `${TEAM_NICKNAME_MIN_LENGTH}文字以上で入力してください`
                            },
                            maxLength: {
                                value: TEAM_NICKNAME_MAX_LENGTH,
                                message: `${TEAM_NICKNAME_MAX_LENGTH}字以内で入力してください`
                            },
                            pattern: {
                                value: TEAM_NICKNAME_PATTERN,
                                message: "ハイフン、アンダーバー、半角英数字(大文字含む)のみで入力してください"
                            },
                            validate: {
                                isExist: async (v) => {
                                    const teamNickName = (v ?? "").toString().trim();
                                    if (
                                        currentNickName !== undefined &&
                                        teamNickName === currentNickName.trim()
                                    ) {
                                        return true;
                                    }
                                    const response = await axios.post(`/api/isTeamExist`, { teamNickName });
                                    if(response.data.isExist){
                                        return "そのチーム略名は既に存在しています."
                                    }
                                    return true;
                                }
                            }
                        })}
                    />
                    <Field.ErrorText>{errorMsg}</Field.ErrorText>
                </div>
            </Box>
        </Field.Root>
    );
}
