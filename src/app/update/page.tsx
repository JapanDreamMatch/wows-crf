"use client";

import { useEffect, useRef, useState } from "react";
import {
    Box,
    Button,
    Field,
    Heading,
    HStack,
    Input,
    Text,
    VStack,
} from "@chakra-ui/react";
import { FormProvider, useForm } from "react-hook-form";
import axios from "axios";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PlayerInput from "@/app/register/components/PlayerInput";
import TeamLogoInput from "@/app/register/components/TeamLogoInput";
import TeamNameInput from "@/app/register/components/TeamNameInput";
import TeamNickNameInput from "@/app/register/components/TeamNickNameInput";
import ContactInput from "@/app/register/components/ContactInput";
import CommentInput from "@/app/register/components/CommentInput";
import type { TeamData } from "@/util/TeamAuth";
import { SubmitProgressProvider } from "@/components/SubmitProgressContext";
import SubmitProgressBox from "@/components/SubmitProgressBox";
import { postWithProgress } from "@/util/postWithProgress";

interface UpdateFormValues {
    teamName: string;
    teamNickName: string;
    teamLogo?: FileList | File | null;
    contact: string;
    player1: string;
    player2: string;
    player3: string;
    player4: string;
    player5: string;
    player6: string;
    player7: string;
    player8: string;
    player9: string;
    player10: string;
    comment: string;
}

export default function TeamUpdatePage() {
    const router = useRouter();

    // 表示期間チェック状態
    const [status, setStatus] = useState<"loading" | "yes" | "no">("loading");
    const [loadingDots, setLoadingDots] = useState<string>(".");

    useEffect(() => {
        if (status !== "loading") return;
        let count = 1;
        const interval = setInterval(() => {
            setLoadingDots(".".repeat((count % 3) + 1));
            count++;
        }, 300);
        return () => clearInterval(interval);
    }, [status]);

    useEffect(() => {
        let isMounted = true;
        (async () => {
            try {
                const res = await axios.post("/api/isApplication", {});
                if (!isMounted) return;
                if (res.data?.canUpdate === "YES" || res.data?.canRegister === "YES") {
                    setStatus("yes");
                } else {
                    setStatus("no");
                }
            } catch {
                if (isMounted) setStatus("no");
            }
        })();
        return () => {
            isMounted = false;
        };
    }, []);

    // Phase 1: 認証状態
    const [authNickName, setAuthNickName] = useState<string>("");
    const [authPassword, setAuthPassword] = useState<string>("");
    const [showAuthPassword, setShowAuthPassword] = useState<boolean>(false);
    const [isVerifying, setIsVerifying] = useState<boolean>(false);
    const [authError, setAuthError] = useState<string>("");

    // Phase 2: 読み込んだチームデータ
    const [teamData, setTeamData] = useState<TeamData | null>(null);
    const [verifiedPassword, setVerifiedPassword] = useState<string>("");
    const [updateError, setUpdateError] = useState<string>("");
    const isSubmittingClickRef = useRef(false);
    const [progressState, setProgressState] = useState({
        stepText: "",
        progress: 0,
    });

    const updateStep = (stepText: string, progress: number) => {
        if (!isSubmittingClickRef.current) return;
        setProgressState({ stepText, progress });
    };

    const methods = useForm<UpdateFormValues>({
        mode: "onBlur",
    });

    const {
        errors,
        isSubmitting,
    } = methods.formState;

    // Phase 1: 認証 & チームデータ読み込み
    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setAuthError("");
        setUpdateError("");

        const trimmedNick = authNickName.trim();
        if (!trimmedNick) {
            setAuthError("チーム略名を入力してください");
            return;
        }
        if (!authPassword) {
            setAuthError("パスワードを入力してください");
            return;
        }

        setIsVerifying(true);
        try {
            const res = await axios.post("/api/team/verify", {
                teamNickName: trimmedNick,
                password: authPassword,
            });
            const loaded: TeamData = res.data.teamData;
            setTeamData(loaded);
            setVerifiedPassword(authPassword);

            methods.reset({
                teamName: loaded.teamName ?? "",
                teamNickName: loaded.teamNickName ?? "",
                contact: loaded.contact ?? "",
                comment: loaded.comment ?? "",
                player1: loaded.players[0] ?? "",
                player2: loaded.players[1] ?? "",
                player3: loaded.players[2] ?? "",
                player4: loaded.players[3] ?? "",
                player5: loaded.players[4] ?? "",
                player6: loaded.players[5] ?? "",
                player7: loaded.players[6] ?? "",
                player8: loaded.players[7] ?? "",
                player9: loaded.players[8] ?? "",
                player10: loaded.players[9] ?? "",
            });
        } catch (err: any) {
            setAuthError(
                err?.response?.data?.message || "認証に失敗しました。入力内容をご確認ください"
            );
        } finally {
            setIsVerifying(false);
        }
    };

    // Phase 2: 更新送信
    const handleUpdateSubmit = async (data: UpdateFormValues) => {
        if (!teamData) return;
        setUpdateError("");

        let logo: File | undefined;
        if (data.teamLogo instanceof FileList && data.teamLogo.length > 0) {
            logo = data.teamLogo[0];
        } else if (data.teamLogo instanceof File && data.teamLogo.size > 0) {
            logo = data.teamLogo;
        }

        const trimmedTeamName = (data.teamName ?? "").trim();
        const trimmedNewNickName = (data.teamNickName ?? "").trim();
        const isNickChanged = trimmedNewNickName !== teamData.teamNickName;

        const sendData = new FormData();
        sendData.append("teamNickName", teamData.teamNickName);
        sendData.append("newTeamNickName", trimmedNewNickName);
        sendData.append("teamName", trimmedTeamName);
        sendData.append("password", verifiedPassword);
        if (logo) {
            sendData.append("teamLogo", logo);
        }
        sendData.append("contact", data.contact ?? "");
        sendData.append("player1", data.player1 ?? "");
        sendData.append("player2", data.player2 ?? "");
        sendData.append("player3", data.player3 ?? "");
        sendData.append("player4", data.player4 ?? "");
        sendData.append("player5", data.player5 ?? "");
        sendData.append("player6", data.player6 ?? "");
        sendData.append("player7", data.player7 ?? "");
        sendData.append("player8", data.player8 ?? "");
        sendData.append("player9", data.player9 ?? "");
        sendData.append("player10", data.player10 ?? "");
        sendData.append("comment", data.comment ?? "");

        try {
            await postWithProgress(
                "/api/team/update",
                sendData,
                (stepText, progress) => {
                    setProgressState({ stepText, progress });
                },
                "更新に失敗しました。しばらくしてから再度お試しください"
            );
            if (isNickChanged) {
                router.push(
                    `/update/success?nickChanged=1&newNickName=${encodeURIComponent(trimmedNewNickName)}`
                );
            } else {
                router.push("/update/success");
            }
        } catch (err: any) {
            isSubmittingClickRef.current = false;
            setUpdateError(
                err?.message || "更新に失敗しました。しばらくしてから再度お試しください"
            );
        }
    };

    const handleInvalid = () => {
        isSubmittingClickRef.current = false;
    };

    if (status === "loading") {
        return (
            <div className="text-slate-900 dark:text-slate-100 bg-slate-200 dark:bg-gray-800 min-h-screen py-4 transition-colors duration-200">
                <Box m={4} className="max-w-full">
                    <Box className="max-w-3xl p-2 mx-auto my-4 text-center flex flex-col items-center">
                        <span className="inline-flex items-center justify-center">
                            <span>読み込み中</span>
                            <span
                                style={{
                                    display: "inline-block",
                                    width: "2.2em", // ドット3つ分の幅を確保
                                    textAlign: "left",
                                    marginLeft: "0.2em",
                                    letterSpacing: "0.1em",
                                }}
                                aria-live="polite"
                            >
                                {loadingDots}
                            </span>
                        </span>
                    </Box>
                </Box>
            </div>
        );
    }

    if (status === "no") {
        return (
            <div className="text-slate-900 dark:text-slate-100 bg-slate-200 dark:bg-gray-800 min-h-screen py-4 transition-colors duration-200">
                <Box m={4} className="max-w-full">
                    <Box className="max-w-3xl p-2 mx-auto my-4 text-center">
                        <Heading size="lg" className="mb-4">
                            現在は募集期間ではありません
                        </Heading>
                        <Link href="/" className="">
                            <Button colorPalette="teal">トップに戻る</Button>
                        </Link>
                    </Box>
                </Box>
            </div>
        );
    }

    return (
        <div className="text-slate-900 dark:text-slate-100 bg-slate-200 dark:bg-gray-800 min-h-screen py-4 transition-colors duration-200">
            <Box m={4} className="max-w-full">
                {/* Phase 1: チーム認証 */}
                <Box borderWidth="1px" borderRadius="lg" className="max-w-3xl p-4 mx-auto my-4 bg-slate-50 dark:bg-transparent border-slate-300 dark:border-slate-700 shadow-sm dark:shadow-none">
                    <Heading
                        size="lg"
                        className="text-center border-b-2 border-slate-300 dark:border-slate-400 mt-2 mx-4 pb-2"
                    >
                        出場者の変更（チーム認証）
                    </Heading>
                    <form onSubmit={handleVerify} className="mx-auto w-4/5 py-4">
                        <VStack gap={4} align="stretch">
                            <Text className="text-sm text-slate-600 dark:text-slate-300">
                                応募時に登録した「チーム略名」と「出場者変更用パスワード」を入力して、現在の登録情報を読み込んでください。
                            </Text>

                            <Field.Root>
                                <Field.Label>チーム略名</Field.Label>
                                <Input
                                    value={authNickName}
                                    onChange={(e) => setAuthNickName(e.target.value)}
                                    placeholder="例: JDM"
                                />
                            </Field.Root>

                            <Field.Root>
                                <Field.Label>出場者変更用パスワード</Field.Label>
                                <HStack className="w-full">
                                    <Input
                                        type={showAuthPassword ? "text" : "password"}
                                        value={authPassword}
                                        onChange={(e) => setAuthPassword(e.target.value)}
                                        placeholder="登録時に設定したパスワード"
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        colorPalette="gray"
                                        className="text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-600 shrink-0"
                                        onClick={() => setShowAuthPassword((prev) => !prev)}
                                    >
                                        {showAuthPassword ? "隠す" : "表示"}
                                    </Button>
                                </HStack>
                            </Field.Root>

                            {authError && (
                                <Text color="red.400" fontWeight="bold" fontSize="sm">
                                    {authError}
                                </Text>
                            )}

                            <Button
                                colorPalette="teal"
                                type="submit"
                                loading={isVerifying}
                                disabled={isVerifying}
                            >
                                チーム情報を読み込む
                            </Button>
                        </VStack>
                    </form>
                </Box>

                {/* Phase 2: 編集フォーム（認証成功後に表示） */}
                {teamData && (
                    <SubmitProgressProvider value={{ updateStep }}>
                        <FormProvider {...methods}>
                            <form
                                onSubmit={(e) => {
                                    isSubmittingClickRef.current = true;
                                    setProgressState({ stepText: "入力内容の確認中...", progress: 1 });
                                    return methods.handleSubmit(handleUpdateSubmit, handleInvalid)(e);
                                }}
                            >
                            {/* チーム概要 */}
                            <Box
                                borderWidth="1px"
                                borderRadius="lg"
                                className="max-w-3xl p-2 mx-auto my-4 bg-slate-50 dark:bg-transparent border-slate-300 dark:border-slate-700 shadow-sm dark:shadow-none"
                            >
                                <Heading
                                    size="lg"
                                    className="text-center border-b-2 border-slate-300 dark:border-slate-400 mt-2 mx-4 pb-1"
                                >
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
                                        key={teamData.teamNickName}
                                        rhfName={"teamNickName"}
                                        errorMsg={errors.teamNickName && errors.teamNickName.message}
                                        currentNickName={teamData.teamNickName}
                                        noticeText="※チーム略名を変更すると、次回ログイン時は変更後のチーム略名が必要になります"
                                    />

                                    {/* 現在のチームロゴ & ロゴ変更 */}
                                    {teamData.logoUrl && (
                                        <Field.Root className="p-2">
                                            <Field.Label className="pl-2 mb-1 text-sm">
                                                現在登録されているチームロゴ
                                            </Field.Label>
                                            <div className="pl-2 my-2">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img
                                                    src={teamData.logoUrl}
                                                    alt="現在のチームロゴ"
                                                    className="max-h-32 rounded border border-slate-300 dark:border-slate-600 object-contain"
                                                />
                                            </div>
                                        </Field.Root>
                                    )}

                                    <TeamLogoInput
                                        rhfName={"teamLogo"}
                                        errorMsg={errors.teamLogo && errors.teamLogo.message}
                                    />
                                    <Text className="pl-4 text-xs text-slate-500 dark:text-slate-400 -mt-2 mb-2">
                                        ※新しい画像を選択しない場合、現在のチームロゴがそのまま維持されます。
                                    </Text>

                                    {/* 代表者連絡先 */}
                                    <ContactInput
                                        rhfName={"contact"}
                                        errorMsg={errors.contact && errors.contact.message}
                                    />
                                </div>
                            </Box>

                            {/* 出場者 */}
                            <Box
                                borderWidth="1px"
                                borderRadius="lg"
                                className="max-w-3xl p-2 mx-auto my-4 bg-slate-50 dark:bg-transparent border-slate-300 dark:border-slate-700 shadow-sm dark:shadow-none"
                            >
                                <Heading
                                    size="lg"
                                    className="text-center border-b-2 border-slate-300 dark:border-slate-400 mt-2 mx-4 pb-1"
                                >
                                    出場者
                                </Heading>
                                <div className="mx-auto w-4/5">
                                    <PlayerInput
                                        label="出場者1 (代表者)"
                                        rhfName={"player1"}
                                        errorMsg={errors.player1 && errors.player1.message}
                                        canEmpty={false}
                                    />
                                    <PlayerInput
                                        label="出場者2"
                                        rhfName={"player2"}
                                        errorMsg={errors.player2 && errors.player2.message}
                                        canEmpty={false}
                                    />
                                    <PlayerInput
                                        label="出場者3"
                                        rhfName={"player3"}
                                        errorMsg={errors.player3 && errors.player3.message}
                                        canEmpty={false}
                                    />
                                    <PlayerInput
                                        label="出場者4"
                                        rhfName={"player4"}
                                        errorMsg={errors.player4 && errors.player4.message}
                                        canEmpty={false}
                                    />
                                    <PlayerInput
                                        label="出場者5"
                                        rhfName={"player5"}
                                        errorMsg={errors.player5 && errors.player5.message}
                                        canEmpty={false}
                                    />
                                    <PlayerInput
                                        label="出場者6"
                                        rhfName={"player6"}
                                        errorMsg={errors.player6 && errors.player6.message}
                                        canEmpty={false}
                                    />
                                    <PlayerInput
                                        label="出場者7"
                                        rhfName={"player7"}
                                        errorMsg={errors.player7 && errors.player7.message}
                                        canEmpty={false}
                                    />
                                    <PlayerInput
                                        label="出場者8 (補欠)"
                                        rhfName={"player8"}
                                        errorMsg={errors.player8 && errors.player8.message}
                                        canEmpty={true}
                                    />
                                    <PlayerInput
                                        label="出場者9 (補欠)"
                                        rhfName={"player9"}
                                        errorMsg={errors.player9 && errors.player9.message}
                                        canEmpty={true}
                                    />
                                    <PlayerInput
                                        label="出場者10 (補欠)"
                                        rhfName={"player10"}
                                        errorMsg={errors.player10 && errors.player10.message}
                                        canEmpty={true}
                                    />
                                </div>
                            </Box>

                            {/* その他ご意見ご質問 */}
                            <Box
                                borderWidth="1px"
                                borderRadius="lg"
                                className="max-w-3xl p-2 mx-auto my-4 bg-slate-50 dark:bg-transparent border-slate-300 dark:border-slate-700 shadow-sm dark:shadow-none"
                            >
                                <Heading
                                    size="lg"
                                    className="text-center border-b-2 border-slate-300 dark:border-slate-400 mt-2 mx-4 pb-1"
                                >
                                    その他ご意見ご質問
                                </Heading>
                                <div className="mx-auto w-4/5">
                                    <CommentInput
                                        rhfName={"comment"}
                                        errorMsg={errors.comment && errors.comment.message}
                                    />
                                </div>
                            </Box>

                            {/* 更新エラー表示 & 送信ボタン */}
                            <Box
                                borderWidth="0px"
                                className="max-w-3xl p-2 mx-auto mt-4 pb-8 flex flex-col items-center justify-center"
                            >
                                {updateError && (
                                    <Text
                                        color="red.400"
                                        fontWeight="bold"
                                        fontSize="sm"
                                        className="mb-3 text-center"
                                    >
                                        {updateError}
                                    </Text>
                                )}
                                <Button
                                    colorPalette="teal"
                                    size="lg"
                                    type="submit"
                                    className="mx-auto"
                                    disabled={isSubmitting}
                                    loading={isSubmitting}
                                >
                                    変更を保存する
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
                )}

                <Box className="max-w-3xl mx-auto text-center pb-12">
                    <Link href="/">
                        <Button variant="outline" className="text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-600">
                            トップページに戻る
                        </Button>
                    </Link>
                </Box>
            </Box>
        </div>
    );
}

