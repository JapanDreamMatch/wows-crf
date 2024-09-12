"use client"

import {Box, FormControl, FormErrorMessage, FormLabel, Heading, Input, Stack} from "@chakra-ui/react";
import {useForm} from "react-hook-form";
import {yupResolver} from "@hookform/resolvers/yup";
import {registerSchema, registerType} from "@/components/YupSchema";


export default function RegisterForm(){

    //react-hook-form
    const {
        register,
        handleSubmit,
        formState: {errors, isSubmitting}
    } = useForm<registerType>({
        resolver: yupResolver(registerSchema), // Yupと紐付け
        mode: "onBlur", // onChange, onBlur, onSubmit, onTouched, allが選択可能
    });

    //送信ボタンの動作
    async function onSubmit(){
        return;
    }

    return(
        <div className="text-slate-100 bg-gray-800">
            <Box m={4} className="max-w-full">
                <form onSubmit={()=>{}}>
                    {/* チーム名 */}

                    {/* チーム略名 */}

                    {/* チームロゴ 今はパス */}

                    {/* 代表者連絡先 */}

                    {/* 出場者 */}
                    <Box borderWidth='1px' borderRadius='lg' className="max-w-3xl p-2 mx-auto">
                        <Heading size="lg" className="text-center border-b-2 border-slate-400 mt-2 mx-4">出場者</Heading>
                        <div className="mx-auto w-4/5">

                            {/* 出場者1 */}
                            <FormControl isInvalid={!!errors.ign} className="py-4">
                                <Box borderWidth='0px' borderRadius='lg' className="p-2">
                                    <div className="mt-2">
                                        <FormLabel className="pl-2 max-w-32">出場者1 (代表者)</FormLabel>
                                    </div>
                                    <div>
                                        <Input
                                            id="name"
                                            placeholder="Please input WoWS IGN."
                                            {...register("ign")}
                                        />
                                        <FormErrorMessage>
                                            {errors.ign && errors.ign.message}
                                        </FormErrorMessage>
                                    </div>
                                </Box>
                            </FormControl>

                            {/* 出場者2 */}


                        </div>

                    </Box>

                    {/* その他ご意見ご質問 */}

                    {/* 送信ボタン */}


                </form>
            </Box>
        </div>

    )
}