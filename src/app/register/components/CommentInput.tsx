import {Path, FieldValues, useFormContext} from "react-hook-form";
import {Box, Field, Input} from "@chakra-ui/react";

export default function CommentInput<T extends FieldValues = never>(
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
                    <Field.Label className="pl-2">その他のご意見またはご質問</Field.Label>
                </div>
                <div>
                    <Input
                        id={rhfName}
                        placeholder="Please input Comment"
                        {...register(rhfName)}
                    />
                    <Field.ErrorText>{errorMsg}</Field.ErrorText>
                </div>
            </Box>
        </Field.Root>
    );
}