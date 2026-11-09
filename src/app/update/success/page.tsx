import type { Metadata } from "next";
import Link from "next/link";
import { Box, Button, Heading, VStack } from "@chakra-ui/react";

export const metadata: Metadata = {
    title: "変更完了",
};

export default function UpdateSuccessPage() {
    return (
        <div className="text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-gray-800 min-h-screen py-4 transition-colors duration-200">
            <Box m={4} className="max-w-full">
                <Box className="max-w-3xl p-2 mx-auto my-4 text-center">
                    <Heading size="lg" className="mb-4">
                        出場者情報の変更が完了しました
                    </Heading>
                    <VStack gap={4}>
                        <Link href="/update">
                            <Button colorPalette="blue">出場者の変更画面に戻る</Button>
                        </Link>
                        <Link href="/">
                            <Button colorPalette="teal">トップページに戻る</Button>
                        </Link>
                    </VStack>
                </Box>
            </Box>
        </div>
    );
}

