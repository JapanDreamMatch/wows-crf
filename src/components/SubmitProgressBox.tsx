"use client";

import { Box, Progress, Text } from "@chakra-ui/react";

interface SubmitProgressBoxProps {
    stepText: string;
    progress: number;
}

export default function SubmitProgressBox({ stepText, progress }: SubmitProgressBoxProps) {
    const clampedProgress = Math.max(0, Math.min(100, Math.round(progress)));

    return (
        <Box className="w-full max-w-md mt-4 p-4 rounded-lg bg-gray-900/80 border border-slate-700 shadow-lg">
            <div className="flex items-center justify-between mb-2">
                <Text className="text-teal-300 font-bold text-sm truncate pr-2">
                    {stepText || "送信準備中..."}
                </Text>
                <Text className="text-slate-300 font-mono text-xs shrink-0">
                    {clampedProgress}%
                </Text>
            </div>
            <Progress
                value={clampedProgress}
                size="sm"
                colorScheme="teal"
                borderRadius="full"
                hasStripe
                isAnimated
                className="bg-slate-700"
            />
        </Box>
    );
}

