import type { Metadata } from "next";
import { Suspense } from "react";
import RegisterErrorPageClient from "./RegisterErrorPageClient";

export const metadata: Metadata = {
    title: "登録エラー",
};

export default function Page() {
    return (
        <Suspense fallback={<div>読み込み中...</div>}>
            <RegisterErrorPageClient />
        </Suspense>
    );
}