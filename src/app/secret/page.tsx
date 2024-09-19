
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
        <p>TEST_SECRET: {process.env.TEST_SECRET ?? "undefined"}</p>
    </main>
  );
}
