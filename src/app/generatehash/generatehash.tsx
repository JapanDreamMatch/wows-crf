"use client";

import { useState } from "react";
import {
    Box,
    Button,
    FormControl,
    FormHelperText,
    FormLabel,
    Heading,
    HStack,
    Input,
    Text,
    VStack,
} from "@chakra-ui/react";
import Link from "next/link";
import { ARGON2_CONFIG, generateSalt, hashPassword } from "@/util/Argon2Service";

export default function GenerateHashClient() {
    const [salt, setSalt] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [showPassword, setShowPassword] = useState<boolean>(false);
    const [hash, setHash] = useState<string>("");
    const [error, setError] = useState<string>("");
    const [isGenerating, setIsGenerating] = useState<boolean>(false);
    const [copied, setCopied] = useState<boolean>(false);

    const handleGenerateRandomSalt = () => {
        setError("");
        setSalt(generateSalt());
    };

    const handleCalculateHash = async () => {
        setError("");
        setHash("");
        setCopied(false);

        if (!salt.trim()) {
            setError("パスワードソルトを入力してください");
            return;
        }
        if (!password) {
            setError("パスワードを入力してください");
            return;
        }

        setIsGenerating(true);
        try {
            const result = await hashPassword(password, salt);
            setHash(result);
        } catch (e: any) {
            setError(e?.message || "ハッシュ計算中にエラーが発生しました");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCopyHash = async () => {
        if (!hash) return;
        try {
            await navigator.clipboard.writeText(hash);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // fallback nothing
        }
    };

    return (
        <div className="text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-gray-800 min-h-screen py-8 transition-colors duration-200">
            <Box className="max-w-3xl p-4 mx-auto">
                <Box borderWidth="1px" borderRadius="lg" className="p-6 my-4 bg-white dark:bg-transparent border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-none">
                    <Heading
                        size="lg"
                        className="text-center border-b-2 border-slate-300 dark:border-slate-400 pb-2 mb-6"
                    >
                        パスワードハッシュ生成ツール (管理者用)
                    </Heading>

                    <Text className="text-sm text-slate-600 dark:text-slate-300 mb-6">
                        パスワードソルト（H2セル）とパスワードを入力すると、Argon2idハッシュ（H3セル）をブラウザ内で計算します。入力内容は外部へ送信されません。
                    </Text>

                    <VStack spacing={5} align="stretch">
                        <FormControl>
                            <FormLabel>パスワードソルト (Hex)</FormLabel>
                            <HStack>
                                <Input
                                    value={salt}
                                    onChange={(e) => setSalt(e.target.value)}
                                    placeholder="例: a1b2c3d4... (32文字の16進数)"
                                    fontFamily="monospace"
                                />
                                <Button
                                    colorScheme="gray"
                                    variant="outline"
                                    className="text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-600 shrink-0"
                                    onClick={handleGenerateRandomSalt}
                                    type="button"
                                >
                                    ランダム生成
                                </Button>
                            </HStack>
                            <FormHelperText className="text-xs text-slate-500 dark:text-slate-400">
                                ※SpreadsheetのH2セルに記載されている32文字の16進文字列（16バイトへデコードして計算されます）
                            </FormHelperText>
                        </FormControl>

                        <FormControl>
                            <FormLabel>パスワード</FormLabel>
                            <HStack>
                                <Input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="パスワードを入力"
                                />
                                <Button
                                    colorScheme="gray"
                                    variant="outline"
                                    className="text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-600 shrink-0"
                                    onClick={() => setShowPassword((prev) => !prev)}
                                    type="button"
                                >
                                    {showPassword ? "隠す" : "表示"}
                                </Button>
                            </HStack>
                        </FormControl>

                        {error && (
                            <Text color="red.400" fontWeight="bold" fontSize="sm">
                                {error}
                            </Text>
                        )}

                        <Button
                            colorScheme="teal"
                            onClick={handleCalculateHash}
                            isLoading={isGenerating}
                            disabled={isGenerating}
                            type="button"
                        >
                            ハッシュを計算
                        </Button>

                        {hash && (
                            <Box
                                borderWidth="1px"
                                borderRadius="md"
                                className="p-4 bg-slate-100 dark:bg-gray-900 border-slate-200 dark:border-slate-700 mt-4"
                            >
                                <FormLabel className="text-sm text-teal-700 dark:text-teal-300">
                                    生成されたパスワードハッシュ (H3セル)
                                </FormLabel>
                                <HStack>
                                    <Input
                                        value={hash}
                                        isReadOnly
                                        fontFamily="monospace"
                                        className="bg-white dark:bg-gray-800"
                                    />
                                    <Button
                                        colorScheme="teal"
                                        variant="outline"
                                        onClick={handleCopyHash}
                                        className="shrink-0"
                                        type="button"
                                    >
                                        {copied ? "コピー完了" : "コピー"}
                                    </Button>
                                </HStack>
                            </Box>
                        )}

                        <Box className="text-xs text-slate-500 dark:text-slate-400 pt-4 border-t border-slate-200 dark:border-slate-600">
                            <p>
                                アルゴリズム: Argon2id (iterations={ARGON2_CONFIG.iterations},{" "}
                                memorySize={ARGON2_CONFIG.memorySize}KiB, parallelism=
                                {ARGON2_CONFIG.parallelism}, hashLength={ARGON2_CONFIG.hashLength}B)
                            </p>
                        </Box>
                    </VStack>
                </Box>

                <Box className="text-center mt-6">
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

