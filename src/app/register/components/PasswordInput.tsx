import { FieldValues, Path, useFormContext } from "react-hook-form";
import {
    Box,
    Button,
    Field,
    HStack,
    Input,
} from "@chakra-ui/react";
import { useState } from "react";
import { MIN_PASSWORD_LENGTH } from "@/util/Argon2Service";

export default function PasswordInput<T extends FieldValues = never>({
    rhfName,
    confirmRhfName,
    errorMsg,
    confirmErrorMsg,
}: {
    rhfName: Path<T>;
    confirmRhfName: Path<T>;
    errorMsg: string | undefined;
    confirmErrorMsg: string | undefined;
}) {
    const { register, getValues } = useFormContext();
    const [showPassword, setShowPassword] = useState(false);

    return (
        <Box borderWidth="0px" borderRadius="lg" className="p-2 py-4">
            <Field.Root invalid={Boolean(errorMsg)} className="mb-4">
                <div className="mt-2">
                    <Field.Label className="pl-2 mb-1">出場者変更用パスワード</Field.Label>
                    <Field.HelperText className="pl-2 mb-2 text-xs text-slate-600 dark:text-slate-300">
                        ※出場メンバー等の変更時に必要となります。忘れないよう必ず控えてください。（{MIN_PASSWORD_LENGTH}文字以上）
                    </Field.HelperText>
                </div>
                <HStack className="w-full">
                    <Input
                        id={rhfName}
                        type={showPassword ? "text" : "password"}
                        placeholder="8文字以上のパスワードを入力"
                        {...register(rhfName, {
                            required: "パスワードを入力してください",
                            minLength: {
                                value: MIN_PASSWORD_LENGTH,
                                message: `${MIN_PASSWORD_LENGTH}文字以上で入力してください`,
                            },
                        })}
                    />
                    <Button
                        type="button"
                        variant="outline"
                        colorPalette="gray"
                        className="text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-600 shrink-0"
                        onClick={() => setShowPassword((prev) => !prev)}
                    >
                        {showPassword ? "隠す" : "表示"}
                    </Button>
                </HStack>
                <Field.ErrorText>{errorMsg}</Field.ErrorText>
            </Field.Root>

            <Field.Root invalid={Boolean(confirmErrorMsg)}>
                <Field.Label className="pl-2 mb-1 text-sm">
                    出場者変更用パスワード（確認用）
                </Field.Label>
                <Input
                    id={confirmRhfName}
                    type={showPassword ? "text" : "password"}
                    placeholder="確認のためもう一度パスワードを入力"
                    {...register(confirmRhfName, {
                        required: "確認用パスワードを入力してください",
                        validate: {
                            matchesPassword: (value) =>
                                value === getValues(rhfName as string) ||
                                "パスワードが一致しません",
                        },
                    })}
                />
                <Field.ErrorText>{confirmErrorMsg}</Field.ErrorText>
            </Field.Root>
        </Box>
    );
}

