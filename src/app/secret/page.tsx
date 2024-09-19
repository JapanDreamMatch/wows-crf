export default function Home() {
    return (
        <main className="">
            <p>TEST_SECRET: {process.env.NEXT_PUBLIC_TEST_SECRET || "値が設定されていません"}</p>
        </main>
    );
}