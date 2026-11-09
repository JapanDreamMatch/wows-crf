import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import {ChakraProvider} from "@chakra-ui/react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "JDM 大会出場登録ポータル",
    template: "%s | JDM 大会出場登録ポータル",
  },
  description: "Japan Dream Match (JDM) 大会出場チーム登録・出場者変更ポータル",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="jp" className="bg-gray-800">
      <body className={`${inter.className} !bg-gray-800 !text-slate-100`}>
      <ChakraProvider>
        {children}
      </ChakraProvider>
      </body>
    </html>
  );
}
