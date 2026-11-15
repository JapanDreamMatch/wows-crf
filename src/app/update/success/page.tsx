import type { Metadata } from "next";
import Link from "next/link";
import { Box, Button, Heading, Text, VStack } from "@chakra-ui/react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "変更完了",
};

interface UpdateSuccessPageProps {
    searchParams: Promise<{
        nickChanged?: string | string[];
        newNickName?: string | string[];
    }>;
}

export default async function UpdateSuccessPage({ searchParams }: UpdateSuccessPageProps) {
    const resolvedParams = await searchParams;
    const nickChanged = resolvedParams.nickChanged === "1";
    const newNickName =
        typeof resolvedParams.newNickName === "string"
            ? resolvedParams.newNickName.trim()
            : "";

    return (
        <div className="text-slate-900 dark:text-slate-100 bg-slate-200 dark:bg-gray-800 min-h-screen py-4 transition-colors duration-200">
            <Box m={4} className="max-w-full">
                <Box className="max-w-3xl p-2 mx-auto my-4 text-center">
                    <Heading size="lg" className="mb-4">
                        出場者情報の変更が完了しました
                    </Heading>

                    {nickChanged && (
                        <Box
                            borderWidth="1px"
                            borderRadius="md"
                            className="max-w-xl mx-auto my-6 p-4 text-left bg-amber-50 dark:bg-amber-950/40 border-amber-400 dark:border-amber-600"
                        >
                            <Text fontWeight="bold" className="mb-1 text-amber-800 dark:text-amber-200">
                                ※ チーム略名が変更されました
                            </Text>
                            <Text fontSize="sm" className="text-amber-900 dark:text-amber-100">
                                次回、出場者情報の変更ページへログインする際は、
                                {newNickName ? (
                                    <>
                                        変更後の新しいチーム略名「<strong>{newNickName}</strong>」をご入力ください。
                                    </>
                                ) : (
                                    <>変更後の新しいチーム略名をご入力ください。</>
                                )}
                            </Text>
                        </Box>
                    )}

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

