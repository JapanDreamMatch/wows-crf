"use client";
import { useSearchParams } from "next/navigation";
import { Box, Heading, Text, Button } from "@chakra-ui/react";
import { useRouter } from "next/navigation";

export default function RegisterErrorPageClient() {
    const searchParams = useSearchParams();
    const msg = searchParams.get("msg") || "不明なエラーが発生しました";
    const router = useRouter();

    return (
        <div className="text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-gray-800 min-h-screen py-4 transition-colors duration-200">
            <Box m={4} className="max-w-full">
                <Box className="max-w-3xl p-2 mx-auto my-4 text-center">
                    <Heading size="lg" className="mb-4">エラーが発生しました</Heading>
                    <Text color="red.400" className="mb-6">{msg}</Text>
                    <Button colorScheme="teal" onClick={() => router.push("/register")}>
                        フォームに戻る
                    </Button>
                </Box>
            </Box>
        </div>
    );
}