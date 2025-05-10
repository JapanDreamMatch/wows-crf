import Link from "next/link";
import {Button} from "@chakra-ui/react";

export default function Home() {
  return (
      <main className="flex min-h-screen flex-col items-center justify-between p-24 text-slate-100 bg-gray-800 w-full">
          <div className="text-slate-100 bg-gray-800 w-full text-center h-1/5">

              <p className="my-1.5">送信に成功しました。</p>

              <Link href="/register" className="">
                  <Button variant="outlined" className="border border-slate-400 ... hover:bg-slate-600 w-1/2">
                      登録フォーム
                  </Button>
              </Link>

          </div>

      </main>
  );
}
