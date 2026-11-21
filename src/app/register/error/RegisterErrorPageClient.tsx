"use client";
import { useEffect, useState } from "react";
import { Box, Heading, Text, Button } from "@chakra-ui/react";
import { useRouter } from "next/navigation";

const DEFAULT_REGISTER_ERROR_MESSAGE = "登録処理中にエラーが発生しました";
const REGISTER_ERROR_STORAGE_KEY = "wows-crf-register-error";

export default function RegisterErrorPageClient() {
    const [msg, setMsg] = useState<string>(DEFAULT_REGISTER_ERROR_MESSAGE);
    const router = useRouter();

    useEffect(() => {
        try {
            const stored = sessionStorage.getItem(REGISTER_ERROR_STORAGE_KEY);
            if (stored && stored.trim()) {
                setMsg(stored);
            }
            sessionStorage.removeItem(REGISTER_ERROR_STORAGE_KEY);
        } catch {
            // sessionStorage 利用不可時は規定メッセージを維持
        }
    }, []);

    return (
        <div className="text-slate-900 dark:text-slate-100 bg-slate-200 dark:bg-gray-800 min-h-screen py-4 transition-colors duration-200">
            <Box m={4} className="max-w-full">
                <Box className="max-w-3xl p-2 mx-auto my-4 text-center">
                    <Heading size="lg" className="mb-4">エラーが発生しました</Heading>
                    <Text color="red.400" className="mb-6">{msg}</Text>
                    <Button colorPalette="teal" onClick={() => router.push("/register")}>
                        フォームに戻る
                    </Button>
                </Box>
            </Box>
        </div>
    );
}
