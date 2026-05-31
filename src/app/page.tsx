import Link from "next/link";
import {Button, VStack} from "@chakra-ui/react";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24 text-slate-100 bg-gray-800 w-full">
        <div className="text-slate-100 bg-gray-800 w-full text-center h-1/5">

            <VStack className="">
                <Link href="https://www.japandreammatch.info/" className="w-1/2">
                    <Button variant="outlined" className="border border-slate-400 ... hover:bg-slate-600">
                        JDMポータルサイトトップページ
                    </Button>
                </Link>

                <Link href="/register" className="w-1/2">
                    <Button variant="outlined" className="border border-slate-400 ... hover:bg-slate-600">
                        登録フォーム
                    </Button>
                </Link>

                <Link href="/shipchecker" className="w-1/2">
                    <Button variant="outlined" className="border border-slate-400 ... hover:bg-slate-600">
                        艦艇チェック
                    </Button>
                </Link>
            </VStack>

        </div>

    </main>
  );
}
