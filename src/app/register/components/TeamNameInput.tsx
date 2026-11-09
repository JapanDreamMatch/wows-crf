import {Path, FieldValues, useFormContext} from "react-hook-form";
import {Box, FormControl, FormErrorMessage, FormLabel, Input, Text} from "@chakra-ui/react";

export default function TeamNameInput<T extends FieldValues = never>(
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
                    <FormLabel className="pl-2 mb-1">チーム名</FormLabel>
                    <Text color="red.400" fontSize="sm" fontWeight="bold" className="pl-2 mb-2">
                        ※チーム名は送信後変更ができません
                    </Text>
                </div>
                <div>
                    <Input
                        id={rhfName}
                        placeholder="Please input team Name"
                        {...register(rhfName, {
                            required: "チーム名を入力してください",
                            maxLength: {
                                value: 50,
                                message: "50字以内で入力してください"
                            },
                        })}
                    />
                    <FormErrorMessage>{errorMsg}</FormErrorMessage>
                </div>
            </Box>
        </FormControl>
    );
}
