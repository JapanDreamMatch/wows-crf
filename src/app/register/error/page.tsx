import { Suspense } from "react";
import RegisterErrorPageClient from "./RegisterErrorPageClient";

export default function Page() {
    return (
        <Suspense fallback={<div>読み込み中...</div>}>
            <RegisterErrorPageClient />
        </Suspense>
    );
}