import {Path, FieldValues, useFormContext} from "react-hook-form";
import {Box, FormControl, FormErrorMessage, FormLabel, Input} from "@chakra-ui/react";
import {ChangeEvent, useRef} from "react";
export default function TeamLogoInput<T extends FieldValues = never>(
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

    const { ref, ...rest } = register(rhfName, {
        onChange,
    })

    function onChange(e: ChangeEvent<HTMLInputElement>){
        console.log("Uploaded!") //TODO: ファイルストレージへのアップロード
        console.log(e.currentTarget.value)
    }

    const fileInput = useRef<HTMLInputElement | null>(null);

    return(
        <FormControl isInvalid={Boolean(errorMsg)} className="py-4">
            <Box borderWidth='0px' borderRadius='lg' className="p-2">
                <div className="mt-2">
                    <FormLabel className="pl-2">チームロゴ(任意)</FormLabel>
                </div>
                <div>
                    <Input
                        type="file"
                        ref={(e) =>{
                            ref(e);
                            fileInput.current = e;
                        }}
                        accept="image/*"
                        className="pt-1"
                        {...rest}
                    />
                    <FormErrorMessage>{errorMsg}</FormErrorMessage>
                </div>
            </Box>
        </FormControl>
    );
}