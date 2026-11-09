import { Path, FieldValues, useFormContext } from "react-hook-form";
import { Box, Field, Input } from "@chakra-ui/react";
import { JdmDiscordLink } from "@/components/JdmDiscordLink";

export default function ContactInput<T extends FieldValues = never>(
    {
        rhfName,
        errorMsg,
    }: {
        rhfName: Path<T>;
        errorMsg: string | undefined;
    }
) {

    const {
        register
    } = useFormContext();


    return (
        <Field.Root invalid={Boolean(errorMsg)} className="py-4">
            <Box borderWidth='0px' borderRadius='lg' className="p-2 w-full">
                <div className="mt-2">
                    <Field.Label className="pl-2">代表者連絡先</Field.Label>
                    <div className="my-2 mx-4 text-sm">
                        <p className="break-all">Discord IDもしくは公開𝕏(旧Twitter)のDMを入力してください。</p>
                        <p className="break-all">チームへの連絡は{<JdmDiscordLink />}にて行います。</p>
                    </div>
                </div>
                <div>
                    <Input
                        id={rhfName}
                        placeholder="Please input team Name"
                        {...register(rhfName, {
                            required: "代表者連絡先を入力してください",
                        })}
                    />
                    <Field.ErrorText>{errorMsg}</Field.ErrorText>
                </div>
            </Box>
        </Field.Root>
    );
}