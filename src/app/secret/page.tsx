
export default function Home() {
  return (
    <main className="">
        <p>TEST_SECRET: {process.env.TEST_SECRET ?? "undefined"}</p>
    </main>
  );
}
