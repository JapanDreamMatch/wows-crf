import type { Metadata } from "next";
import GenerateHashClient from "@/app/generatehash/generatehash";

export const metadata: Metadata = {
    title: "パスワードハッシュ生成 | wows-crf",
    robots: {
        index: false,
        follow: false,
    },
};

export default function GenerateHashPage() {
    return <GenerateHashClient />;
}

