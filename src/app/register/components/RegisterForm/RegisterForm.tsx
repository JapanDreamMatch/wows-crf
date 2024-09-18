"use client"

import {Box, Button, Heading} from "@chakra-ui/react";
import {FormProvider, useForm} from "react-hook-form";
import {registerType, onSubmit} from "@/app/register/components/RegisterForm/useRegisterForm";
import PlayerInput from "@/app/register/components/PlayerInput";
import TeamNameInput from "@/app/register/components/TeamNameInput";
import TeamNickNameInput from "@/app/register/components/TeamNickNameInput";
import TeamLogoInput from "@/app/register/components/TeamLogoInput";
import {JdmDiscordLink} from "@/components/JdmDiscordLink";
import ContactInput from "@/app/register/components/ContactInput";
import CommentInput from "@/app/register/components/CommentInput";
import {useEffect} from "react";
import {useRouter} from "next/navigation";


export default function RegisterForm(){

    //react-hook-form
    const methods  = useForm<registerType>({
        mode: "onBlur", // onChange, onBlur, onSubmit, onTouched, allが選択可能
    });
    const {errors,
        isSubmitting,
        isSubmitSuccessful
    } = methods.formState;
    const router = useRouter();

    const isTest = true;

    useEffect(() => {
        if(isSubmitSuccessful){
            router.push('/success')
        }
    }, [isSubmitSuccessful]);

    return(
        <div className="text-slate-100 bg-gray-800">

            <Box m={4} className="max-w-full">

                {/* フォーム注意事項 */}
                <Box borderWidth='1px' borderRadius='lg' className="max-w-3xl p-2 mx-auto my-4">
                    <Heading
                        size="lg"
                        className="text-center border-b-2 border-slate-400 mt-2 mx-4">
                        フォーム注意事項
                    </Heading>
                    <p className="break-all mx-4 my-2">・このフォームは、出場チーム1つにつき1つ提出となります。</p>
                    <p className="break-all mx-4 my-2">
                        ・提出後の変更は{<JdmDiscordLink/>}の運営ロールの付いた者への直接DMで受け付けます。
                    </p>
                </Box>

                <FormProvider {...methods}>
                    <form onSubmit={methods.handleSubmit(onSubmit)}>

                        {/* チーム概要 */}
                        <Box borderWidth='1px' borderRadius='lg' className="max-w-3xl p-2 mx-auto my-4">
                            <Heading
                                size="lg"
                                className="text-center border-b-2 border-slate-400 mt-2 mx-4">
                                チーム概要
                            </Heading>
                            <div className="mx-auto w-4/5">

                                {/* チーム名 */}
                                <TeamNameInput
                                    rhfName={"teamName"}
                                    errorMsg={errors.teamName && errors.teamName.message}
                                />

                                {/* チーム略名 */}
                                <TeamNickNameInput
                                    rhfName={"teamNickname"}
                                    errorMsg={errors.teamNickname && errors.teamNickname.message}
                                />

                                {/* チームロゴ 今はパス */}
                                <TeamLogoInput
                                    rhfName={"teamLogo"}
                                    errorMsg={errors.teamLogo && errors.teamLogo.message}
                                />

                                {/* 代表者連絡先 */}
                                <ContactInput
                                    rhfName={"contact"}
                                    errorMsg={errors.contact && errors.contact.message}
                                />

                            </div>

                        </Box>

                        {/* 出場者 */}
                        <Box borderWidth='1px' borderRadius='lg' className="max-w-3xl p-2 mx-auto my-4">
                            <Heading
                                size="lg"
                                className="text-center border-b-2 border-slate-400 mt-2 mx-4">
                                出場者
                            </Heading>
                            <div className="mx-auto w-4/5">

                                {/* 出場者1 */}
                                <PlayerInput
                                    label="出場者1 (代表者)"
                                    rhfName={"player1"}
                                    errorMsg={errors.player1 && errors.player1.message}
                                    canEmpty={false || isTest}
                                />

                                {/* 出場者2 */}
                                <PlayerInput
                                    label="出場者2"
                                    rhfName={"player2"}
                                    errorMsg={errors.player2 && errors.player2.message}
                                    canEmpty={false|| isTest}
                                />

                                {/* 出場者3 */}
                                <PlayerInput
                                    label="出場者3"
                                    rhfName={"player3"}
                                    errorMsg={errors.player3 && errors.player3.message}
                                    canEmpty={false|| isTest}
                                />

                                {/* 出場者4 */}
                                <PlayerInput
                                    label="出場者4"
                                    rhfName={"player4"}
                                    errorMsg={errors.player4 && errors.player4.message}
                                    canEmpty={false|| isTest}
                                />

                                {/* 出場者5 */}
                                <PlayerInput
                                    label="出場者5"
                                    rhfName={"player5"}
                                    errorMsg={errors.player5 && errors.player5.message}
                                    canEmpty={false|| isTest}
                                />

                                {/* 出場者6 */}
                                <PlayerInput
                                    label="出場者6"
                                    rhfName={"player6"}
                                    errorMsg={errors.player6 && errors.player6.message}
                                    canEmpty={false|| isTest}
                                />

                                {/* 出場者7 */}
                                <PlayerInput
                                    label="出場者7"
                                    rhfName={"player7"}
                                    errorMsg={errors.player7 && errors.player7.message}
                                    canEmpty={false|| isTest}
                                />

                                {/* 出場者8 (補欠) */}
                                <PlayerInput
                                    label="出場者8 (補欠)"
                                    rhfName={"player8"}
                                    errorMsg={errors.player8 && errors.player8.message}
                                    canEmpty={true}
                                />

                                {/* 出場者9 (補欠) */}
                                <PlayerInput
                                    label="出場者9 (補欠)"
                                    rhfName={"player9"}
                                    errorMsg={errors.player9 && errors.player9.message}
                                    canEmpty={true}
                                />

                                {/* 出場者10 (補欠) */}
                                <PlayerInput
                                    label="出場者10 (補欠)"
                                    rhfName={"player10"}
                                    errorMsg={errors.player10 && errors.player10.message}
                                    canEmpty={true}
                                />

                            </div>

                        </Box>

                        {/* その他ご意見ご質問 */}
                        <Box borderWidth='1px' borderRadius='lg' className="max-w-3xl p-2 mx-auto my-4">
                            <Heading
                                size="lg"
                                className="text-center border-b-2 border-slate-400 mt-2 mx-4">
                                その他ご意見ご質問
                            </Heading>
                            <div className="mx-auto w-4/5">
                                <CommentInput rhfName={"comment"} errorMsg={errors.comment && errors.comment.message}/>
                            </div>
                        </Box>

                        {/* 送信ボタン */}
                        <Box borderWidth='0px'
                             className="max-w-3xl p-2 mx-auto mt-4 pb-16 flex items-center justify-center">
                            <Button
                                colorScheme='teal'
                                size='lg'
                                type="submit"
                                className="mx-auto"
                                disabled={isSubmitting}
                                isLoading={isSubmitting}
                            >
                                {isSubmitting && <span className="spinner-border spinner-border-sm mr-1"></span>}
                                送信
                            </Button>
                            <p>isSubmitting: {isSubmitting ? "true" : "false"}</p>
                        </Box>

                    </form>
                </FormProvider>
            </Box>
        </div>

    )
}