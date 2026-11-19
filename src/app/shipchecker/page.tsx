import { Suspense } from "react";
import ShipCheckerClient from "@/app/shipchecker/components/ShipCheckerClient";

export default function ShipCheckerPage() {
    return (
        <Suspense
            fallback={
                <main className="min-h-screen bg-slate-200 dark:bg-gray-800 px-4 py-6 text-slate-900 dark:text-slate-100 transition-colors duration-200">
                    <div className="mx-auto max-w-5xl rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 p-6 shadow-sm dark:shadow-none">
                        読み込み中... / Loading...
                    </div>
                </main>
            }
        >
            <ShipCheckerClient />
        </Suspense>
    );
}
