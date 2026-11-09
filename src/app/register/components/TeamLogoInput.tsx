import {Path, FieldValues, useFormContext} from "react-hook-form";
import {Box, Field, Input} from "@chakra-ui/react";
import {useRef} from "react";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const SUPPORTED_FORMATS = ["image/jpeg", "image/png"];

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

    const { ref, onChange: rhfOnChange, ...rest } = register(rhfName, {
        validate: {
            fileCount: (v: FileList | File | null | undefined) =>
                !(v instanceof FileList) || v.length <= 1 || "チームロゴは1枚のみ添付できます",
            fileSize: (v: FileList | File | null | undefined) => {
                const f = v instanceof FileList ? v[0] : v;
                return !f || f.size === 0 || f.size <= MAX_FILE_SIZE || "ファイルサイズは20MB以内である必要があります";
            },
            fileType: (v: FileList | File | null | undefined) => {
                const f = v instanceof FileList ? v[0] : v;
                return !f || f.size === 0 || SUPPORTED_FORMATS.includes(f.type) || "対応フォーマットはjpeg, jpg, pngのみです";
            },
        },
    });

    const fileInput = useRef<HTMLInputElement | null>(null);

    return(
        <Field.Root invalid={Boolean(errorMsg)} className="py-4">
            <Box borderWidth='0px' borderRadius='lg' className="p-2 w-full">
                <div className="mt-2">
                    <Field.Label className="pl-2">チームロゴ(任意)</Field.Label>
                </div>
                <div>
                    <Input
                        type="file"
                        ref={(e) =>{
                            ref(e);
                            fileInput.current = e;
                        }}
                        onChange={rhfOnChange}
                        accept="image/png, image/jpeg, .png, .jpg, .jpeg"
                        className="pt-1"
                        {...rest}
                    />
                    <Field.HelperText className="pl-2 text-xs text-slate-500 dark:text-slate-400">
                        ※jpeg, jpg, png形式、20MB以内、1枚のみ
                    </Field.HelperText>
                    <Field.ErrorText>{errorMsg}</Field.ErrorText>
                </div>
            </Box>
        </Field.Root>
    );
}
