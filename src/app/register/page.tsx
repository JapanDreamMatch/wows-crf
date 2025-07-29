"use client";

import RegisterForm from "@/app/register/components/RegisterForm/RegisterForm";
import {Box, Heading} from "@chakra-ui/react";
import {JdmDiscordLink} from "@/components/JdmDiscordLink";
import { useEffect, useState } from "react";
import axios from "axios";

export default function ContestantRegister(){
    const [status, setStatus] = useState<"loading" | "yes" | "no">("loading");

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
        return () => { isMounted = false; };
    }, []);

    if (status === "loading") {
        return (
            <div className="text-slate-100 bg-gray-800">
                <Box m={4} className="max-w-full">
                    <Box className="max-w-3xl p-2 mx-auto my-4 text-center">
                        読み込み中
                    </Box>
                </Box>
            </div>
        );
    }

    if (status === "no") {
        return (
            <div className="text-slate-100 bg-gray-800">
                <Box m={4} className="max-w-full">
                    <Box className="max-w-3xl p-2 mx-auto my-4 text-center">
                        現在は募集期間ではありません
                    </Box>
                </Box>
            </div>
        );
    }

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

                {/* 送信フォームの中身 */}
                <RegisterForm/>

            </Box>
        </div>
    )
}