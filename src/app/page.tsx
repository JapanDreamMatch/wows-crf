import Link from "next/link";
import { Box, Heading, SimpleGrid, Text, VStack } from "@chakra-ui/react";

const navItems = [
  {
    href: "https://www.japandreammatch.info/",
    title: "JDMポータルサイトトップページ",
    description: "大会概要・ルール・最新情報などの公式ポータルサイトへ移動します。",
    badge: "公式サイト",
    external: true,
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-6 h-6"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    ),
  },
  {
    href: "/register",
    title: "登録フォーム",
    description: "新規出場チームのエントリーおよび出場メンバー・チームロゴの登録を行います。",
    badge: "新規エントリー",
    external: false,
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-6 h-6"
        aria-hidden="true"
      >
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <line x1="19" y1="8" x2="19" y2="14" />
        <line x1="22" y1="11" x2="16" y2="11" />
      </svg>
    ),
  },
  {
    href: "/update",
    title: "出場者の変更",
    description: "登録済みチームの出場メンバー・チームロゴ・連絡先などの登録内容を変更します。",
    badge: "登録内容変更",
    external: false,
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-6 h-6"
        aria-hidden="true"
      >
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
    ),
  },
];

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-16 md:p-24 text-slate-100 bg-gray-800 w-full">
      <Box className="w-full max-w-5xl mx-auto">
        <VStack spacing={3} className="mb-12 text-center">
          <Text className="text-teal-400 font-semibold tracking-wider text-sm uppercase">
            Japan Dream Match
          </Text>
          <Heading size="xl" className="text-slate-100 font-bold tracking-tight">
            JDM 大会出場登録ポータル
          </Heading>
          <Text className="text-slate-400 text-sm md:text-base max-w-xl">
            ご希望のメニューを選択してください
          </Text>
        </VStack>

        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6} className="w-full">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              target={item.external ? "_blank" : undefined}
              rel={item.external ? "noopener noreferrer" : undefined}
              className="group block h-full focus:outline-none"
            >
              <Box
                borderWidth="1px"
                borderRadius="xl"
                className="h-full p-6 bg-gray-900/60 border-slate-700 transition-all duration-200 flex flex-col justify-between hover:border-teal-400 hover:bg-gray-700/60 hover:-translate-y-1 hover:shadow-xl hover:shadow-teal-950/30 group-focus-visible:ring-2 group-focus-visible:ring-teal-400"
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className="p-3 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20 group-hover:bg-teal-500 group-hover:text-gray-900 transition-colors duration-200">
                      {item.icon}
                    </div>
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-600 group-hover:border-teal-500/40 group-hover:text-teal-300 transition-colors duration-200">
                      {item.badge}
                    </span>
                  </div>

                  <Heading
                    as="h2"
                    size="md"
                    className="mb-3 text-slate-100 group-hover:text-teal-300 transition-colors duration-200 leading-snug"
                  >
                    {item.title}
                  </Heading>

                  <Text className="text-sm text-slate-400 leading-relaxed">
                    {item.description}
                  </Text>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-700/80 flex items-center justify-end text-xs font-semibold text-teal-400 group-hover:text-teal-300">
                  <span>{item.external ? "外部サイトを開く" : "ページへ移動"}</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-4 h-4 ml-1 transition-transform duration-200 group-hover:translate-x-1"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </Box>
            </Link>
          ))}
        </SimpleGrid>
      </Box>
    </main>
  );
}
