import {Path, FieldValues, useFormContext} from "react-hook-form";
import {Box, Field, Input, Text} from "@chakra-ui/react";
import {TEAM_NAME_MAX_LENGTH} from "@/util/TeamValidation";

export default function TeamNameInput<T extends FieldValues = never>(
    {
        rhfName,
        errorMsg,
        noticeText,
    }:{
        rhfName: Path<T>;
        errorMsg: string | undefined;
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
                    <Field.Label className="pl-2 mb-1">チーム名</Field.Label>
                    {noticeText && (
                        <Text className="pl-2 mb-2 text-xs text-slate-500 dark:text-slate-400">
                            {noticeText}
                        </Text>
                    )}
                </div>
                <div>
                    <Input
                        id={rhfName}
                        placeholder="Please input team Name"
                        {...register(rhfName, {
                            required: "チーム名を入力してください",
                            validate: (v) =>
                                (v ?? "").toString().trim().length > 0 || "チーム名を入力してください",
                            maxLength: {
                                value: TEAM_NAME_MAX_LENGTH,
                                message: `${TEAM_NAME_MAX_LENGTH}字以内で入力してください`
                            },
                        })}
                    />
                    <Field.ErrorText>{errorMsg}</Field.ErrorText>
                </div>
            </Box>
        </Field.Root>
    );
}
