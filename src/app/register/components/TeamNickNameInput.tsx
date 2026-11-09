import {Path, FieldValues, useFormContext} from "react-hook-form";
import {Box, Field, Input, Text} from "@chakra-ui/react";
import axios from "axios";

export default function TeamNickNameInput<T extends FieldValues = never>(
    {
        rhfName,
        errorMsg,
    }:{
        rhfName: Path<T>;
        errorMsg: string | undefined;
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
                    <Text color="red.400" fontSize="sm" fontWeight="bold" className="pl-2 mb-2">
                        ※チーム略名は送信後変更ができません
                    </Text>
                </div>
                <div>
                    <Input
                        id={rhfName}
                        placeholder="Please input team nickname."
                        {...register(rhfName, {
                            required: "チーム略名を入力してください",
                            minLength:{
                                value: 2,
                                message: "2文字以上で入力してください"
                            },
                            maxLength: {
                                value: 5,
                                message: "5字以内で入力してください"
                            },
                            pattern: {
                                value: /^[a-zA-Z0-9_-]+$/,
                                message: "ハイフン、アンダーバー、半角英数字(大文字含む)のみで入力してください"
                            },
                            validate: {
                                isExist: async v => {
                                    const teamNickName = v;
                                    const response = await axios.post(`/api/isTeamExist`, { teamNickName });
                                    if(response.data.isExist){
                                        return "そのチーム略名は既に存在しています."
                                    }
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
