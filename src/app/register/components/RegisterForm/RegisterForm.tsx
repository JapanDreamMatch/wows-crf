"use client"

import {useRef, useState} from "react";
import {Box, Button, Heading} from "@chakra-ui/react";
import {FormProvider, useForm} from "react-hook-form";
import {registerType, useRegisterForm} from "@/app/register/components/RegisterForm/useRegisterForm";
import PlayerInput from "@/app/register/components/PlayerInput";
import TeamNameInput from "@/app/register/components/TeamNameInput";
import TeamNickNameInput from "@/app/register/components/TeamNickNameInput";
import PasswordInput from "@/app/register/components/PasswordInput";
import TeamLogoInput from "@/app/register/components/TeamLogoInput";
import ContactInput from "@/app/register/components/ContactInput";
import CommentInput from "@/app/register/components/CommentInput";
import {useRouter} from "next/navigation";
import {SubmitProgressProvider} from "@/components/SubmitProgressContext";
import SubmitProgressBox from "@/components/SubmitProgressBox";


export default function RegisterForm(){

    const { onSubmit } = useRegisterForm();
    const isSubmittingClickRef = useRef(false);
    const [progressState, setProgressState] = useState({
        stepText: "",
        progress: 0,
    });

    //react-hook-form Validation
    const methods  = useForm<registerType>({
        mode: "onBlur", // onChange, onBlur, onSubmit, onTouched, allが選択可能
    });
    const {
        errors,
        isSubmitting,
    } = methods.formState;
    const router = useRouter();

    const updateStep = (stepText: string, progress: number) => {
        if (!isSubmittingClickRef.current) return;
        setProgressState({ stepText, progress });
    };

    // 送信ハンドラをラップしてエラー時に遷移
    const handleSubmit = async (data: registerType) => {
        try {
            await onSubmit(data, (stepText, progress) => {
                setProgressState({ stepText, progress });
            });
            router.push('/register/success');
        } catch (e: any) {
            isSubmittingClickRef.current = false;
            router.push(`/register/error?msg=${encodeURIComponent(e.message || "内部エラーが発生しました")}`);
        }
    };

    const handleInvalid = () => {
        isSubmittingClickRef.current = false;
    };


    return(
        <SubmitProgressProvider value={{ updateStep }}>
            <FormProvider {...methods}>
                <form
                    onSubmit={(e) => {
                        isSubmittingClickRef.current = true;
                        setProgressState({ stepText: "入力内容の確認中...", progress: 1 });
                        return methods.handleSubmit(handleSubmit, handleInvalid)(e);
                    }}
                >

                {/* チーム概要 */}
                <Box borderWidth='1px' borderRadius='lg' className="max-w-3xl p-2 mx-auto my-4 bg-slate-50 dark:bg-transparent border-slate-300 dark:border-slate-700 shadow-sm dark:shadow-none">
                    <Heading
                        size="lg"
                        className="text-center border-b-2 border-slate-300 dark:border-slate-400 mt-2 mx-4 pb-1">
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

                        {/* 出場者変更用パスワード */}
                        <PasswordInput
                            rhfName={"password"}
                            confirmRhfName={"passwordConfirm"}
                            errorMsg={errors.password && errors.password.message}
                            confirmErrorMsg={errors.passwordConfirm && errors.passwordConfirm.message}
                        />

                        {/* チームロゴ */}
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
                <Box borderWidth='1px' borderRadius='lg' className="max-w-3xl p-2 mx-auto my-4 bg-slate-50 dark:bg-transparent border-slate-300 dark:border-slate-700 shadow-sm dark:shadow-none">
                    <Heading
                        size="lg"
                        className="text-center border-b-2 border-slate-300 dark:border-slate-400 mt-2 mx-4 pb-1">
                        出場者
                    </Heading>
                    <div className="mx-auto w-4/5">

                        {/* 出場者1 */}
                        <PlayerInput
                            label="出場者1 (代表者)"
                            rhfName={"player1"}
                            errorMsg={errors.player1 && errors.player1.message}
                            canEmpty={false}
                        />

                        {/* 出場者2 */}
                        <PlayerInput
                            label="出場者2"
                            rhfName={"player2"}
                            errorMsg={errors.player2 && errors.player2.message}
                            canEmpty={false}
                        />

                        {/* 出場者3 */}
                        <PlayerInput
                            label="出場者3"
                            rhfName={"player3"}
                            errorMsg={errors.player3 && errors.player3.message}
                            canEmpty={false}
                        />

                        {/* 出場者4 */}
                        <PlayerInput
                            label="出場者4"
                            rhfName={"player4"}
                            errorMsg={errors.player4 && errors.player4.message}
                            canEmpty={false}
                        />

                        {/* 出場者5 */}
                        <PlayerInput
                            label="出場者5"
                            rhfName={"player5"}
                            errorMsg={errors.player5 && errors.player5.message}
                            canEmpty={false}
                        />

                        {/* 出場者6 */}
                        <PlayerInput
                            label="出場者6"
                            rhfName={"player6"}
                            errorMsg={errors.player6 && errors.player6.message}
                            canEmpty={false}
                        />

                        {/* 出場者7 */}
                        <PlayerInput
                            label="出場者7"
                            rhfName={"player7"}
                            errorMsg={errors.player7 && errors.player7.message}
                            canEmpty={false}
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
                <Box borderWidth='1px' borderRadius='lg' className="max-w-3xl p-2 mx-auto my-4 bg-slate-50 dark:bg-transparent border-slate-300 dark:border-slate-700 shadow-sm dark:shadow-none">
                    <Heading
                        size="lg"
                        className="text-center border-b-2 border-slate-300 dark:border-slate-400 mt-2 mx-4 pb-1">
                        その他ご意見ご質問
                    </Heading>
                    <div className="mx-auto w-4/5">
                        <CommentInput rhfName={"comment"} errorMsg={errors.comment && errors.comment.message}/>
                    </div>
                </Box>

                {/* 送信ボタン */}
                <Box borderWidth='0px'
                     className="max-w-3xl p-2 mx-auto mt-4 pb-16 flex flex-col items-center justify-center">
                    <Button
                        colorPalette='teal'
                        size='lg'
                        type="submit"
                        className="mx-auto"
                        disabled={isSubmitting}
                        loading={isSubmitting}
                    >
                        {isSubmitting && <span className="spinner-border spinner-border-sm mr-1"></span>}
                        送信
                    </Button>
                    {isSubmitting && (
                        <SubmitProgressBox
                            stepText={progressState.stepText}
                            progress={progressState.progress}
                        />
                    )}
                </Box>

                </form>
            </FormProvider>
        </SubmitProgressProvider>


    )
}
