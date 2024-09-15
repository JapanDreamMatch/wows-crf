"use client"

import {Box, FormControl, FormErrorMessage, FormLabel, Heading, Input, Link} from "@chakra-ui/react";
import {useForm} from "react-hook-form";
import {yupResolver} from "@hookform/resolvers/yup";
import {registerSchema, registerType, onSubmit} from "@/app/register/components/RegisterForm/useRegisterForm";
import {SyntheticEvent, useEffect} from "react";
import axios from "axios";
import {string} from "yup";
import APITester from "@/components/Sample/APITester";



export default function RegisterForm(){

    //react-hook-form
    const {
        register,
        handleSubmit,
        formState: {errors, isSubmitting},
        getValues,
        setValue,
        setError,
        watch
    } = useForm<registerType>({
        resolver: yupResolver(registerSchema), // Yupと紐付け
        mode: "onBlur", // onChange, onBlur, onSubmit, onTouched, allが選択可能
    });

    useEffect(() => {
        console.log("呼ばれたよ！");
    },[watch])

    return(
        <div className="text-slate-100 bg-gray-800">

            <APITester/>

            <Box m={4} className="max-w-full">
                <form onSubmit={handleSubmit(onSubmit)}>

                    {/* チーム概要 */}
                    <Box borderWidth='1px' borderRadius='lg' className="max-w-3xl p-2 mx-auto my-4">
                        <Heading size="lg" className="text-center border-b-2 border-slate-400 mt-2 mx-4">チーム概要</Heading>
                        <div className="mx-auto w-4/5">

                            {/* チーム名 */}

                            {/* チーム略名 */}

                            {/* チームロゴ 今はパス */}

                            {/* 代表者連絡先 */}

                        </div>

                    </Box>

                    {/* 出場者 */}
                    <Box borderWidth='1px' borderRadius='lg' className="max-w-3xl p-2 mx-auto my-4">
                        <Heading size="lg" className="text-center border-b-2 border-slate-400 mt-2 mx-4">出場者</Heading>
                        <div className="mx-auto w-4/5">

                            {/* 出場者1 */}
                            <FormControl isInvalid={!!errors.ign} className="py-4">
                                <Box borderWidth='0px' borderRadius='lg' className="p-2">
                                    <div className="mt-2">
                                        <FormLabel className="pl-2">出場者1 (代表者)</FormLabel>
                                    </div>
                                    <div>
                                        <Input
                                            id="ign"
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
                            <FormControl isInvalid={!!errors.ign2} className="py-4">
                                <Box borderWidth='0px' borderRadius='lg' className="p-2">
                                    <div className="mt-2">
                                        <FormLabel className="pl-2">出場者2 (代表者)</FormLabel>
                                    </div>
                                    <div>
                                        <Input
                                            id="ign2"
                                            placeholder="Please input WoWS IGN."
                                            {...register("ign2",{
                                                onBlur: async (e: SyntheticEvent) => {
                                                    const inputUserName = getValues("ign2");
                                                    const response = await axios.post('http://localhost:3000/api/ign', {inputUserName});
                                                    console.log(response.data.message);
                                                    const trulyIGN = response.data.message && response.data.message[0] as string;
                                                    if(inputUserName != trulyIGN){
                                                        setError("ign2", {type: "custom", message: "プレイヤー名が存在しないか、候補が多すぎます"});
                                                        return;
                                                    }
                                                    setValue("uid2", Number(response.data.message[1]));
                                                }
                                            })}
                                        />
                                        <FormErrorMessage>
                                            {errors.ign2 && errors.ign2.message}
                                        </FormErrorMessage>
                                    </div>
                                </Box>
                            </FormControl>

                        </div>

                    </Box>

                    {/* その他ご意見ご質問 */}

                    {/* 送信ボタン */}


                </form>
            </Box>
        </div>

    )
}