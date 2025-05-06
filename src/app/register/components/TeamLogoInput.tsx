import {Path, FieldValues, useFormContext} from "react-hook-form";
import {Box, FormControl, FormErrorMessage, FormLabel, Input} from "@chakra-ui/react";
import {ChangeEvent, useRef, useState} from "react";
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

    const { ref, onChange: rhfOnChange, ...rest } = register(rhfName);

    // 添付画像を状態管理
    const [imageFile, setImageFile] = useState<File | null>(null);

    function onChange(e: ChangeEvent<HTMLInputElement>){
        console.log("Image Changed!");
        console.log(e.currentTarget?.files);

        if (e.target.files && e.target.files[0]) {
            setImageFile(e.target.files[0]);
        }
        void rhfOnChange(e);// React Hook Form の onChange を明示的に呼び出すことでoverwriteしている
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
                        onChange={onChange}
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