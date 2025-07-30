"use client";

import RegisterForm from "@/app/register/components/RegisterForm/RegisterForm";
import {Box, Button, Heading} from "@chakra-ui/react";
import {JdmDiscordLink} from "@/components/JdmDiscordLink";
import {useEffect, useState} from "react";
import axios from "axios";
import Link from "next/link";

export default function ContestantRegister() {
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
                if (res.data?.canRegister === "YES") {
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

    if (status === "loading") {
        return (
            <div className="text-slate-100 bg-gray-800">
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
                                    letterSpacing: "0.1em"
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
            <div className="text-slate-100 bg-gray-800 min-h-screen">
                <Box m={4} className="max-w-full">
                    <Box className="max-w-3xl p-2 mx-auto my-4 text-center">
                        <Heading size="lg" className="mb-4">現在は募集期間ではありません</Heading>
                        <Link href="/" className="">
                            <Button colorScheme="teal">
                                トップに戻る
                            </Button>
                        </Link>
                    </Box>
                </Box>
            </div>
        );
    }

    return (
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

                {/* 送信フォームの中身 */}
                <RegisterForm/>

            </Box>
        </div>
    )
}