import type { Metadata } from "next";
import Link from "next/link";
import {Box, Button, Heading, Text, VStack} from "@chakra-ui/react";

export const metadata: Metadata = {
    title: "登録完了",
};

export default function Home() {
    return (
        <div className="text-slate-900 dark:text-slate-100 bg-slate-200 dark:bg-gray-800 min-h-screen py-4 transition-colors duration-200">
            <Box m={4} className="max-w-full">
                <Box className="max-w-3xl p-2 mx-auto my-4 text-center">
                    <Heading size="lg" className="mb-4">送信に成功しました</Heading>
                    <Text className="mb-4">
                        チーム変更はこちらからお願いします
                    </Text>
                    <VStack gap={4}>
                        <Link href="/update">
                            <Button colorPalette="blue">
                                出場者の変更
                            </Button>
                        </Link>
                        <Link href="/">
                            <Button colorPalette="teal">
                                トップページに戻る
                            </Button>
                        </Link>
                    </VStack>
                </Box>
            </Box>
        </div>
    );
}
