import {Path, FieldValues, useFormContext} from "react-hook-form";
import {Box, FormControl, FormErrorMessage, FormLabel, Input} from "@chakra-ui/react";

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
        <FormControl isInvalid={Boolean(errorMsg)} className="py-4">
            <Box borderWidth='0px' borderRadius='lg' className="p-2">
                <div className="mt-2">
                    <FormLabel className="pl-2">その他のご意見またはご質問</FormLabel>
                </div>
                <div>
                    <Input
                        id={rhfName}
                        placeholder="Please input Comment"
                        {...register(rhfName)}
                    />
                    <FormErrorMessage>{errorMsg}</FormErrorMessage>
                </div>
            </Box>
        </FormControl>
    );
}