import type { Metadata } from "next";
import GenerateHashClient from "@/app/generatehash/generatehash";

export const metadata: Metadata = {
    title: "パスワードハッシュ生成",
    robots: {
        index: false,
        follow: false,
    },
};

export default function GenerateHashPage() {
    return <GenerateHashClient />;
}

