import {Path, FieldValues, useFormContext} from "react-hook-form";
import {Box, FormControl, FormErrorMessage, FormLabel, Input} from "@chakra-ui/react";

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
        <FormControl isInvalid={Boolean(errorMsg)} className="py-4">
            <Box borderWidth='0px' borderRadius='lg' className="p-2">
                <div className="mt-2">
                    <FormLabel className="pl-2">チーム略名</FormLabel>
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
                            }
                        })}
                    />
                    <FormErrorMessage>{errorMsg}</FormErrorMessage>
                </div>
            </Box>
        </FormControl>
    );
}