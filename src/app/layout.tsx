import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import ThemeToggle from "@/components/ThemeToggle";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "JDM 大会出場登録ポータル",
    template: "%s | JDM 大会出場登録ポータル",
  },
  description: "Japan Dream Match (JDM) 大会出場チーム登録・出場者変更ポータル",
};

const themeInitScript = `
(function() {
  try {
    var s = localStorage.getItem('wows-crf-theme');
    var m = (s === 'light' || s === 'dark') ? s : 'dark';
    var d = document.documentElement;
    d.classList.remove('dark', 'light');
    d.classList.add(m);
    d.style.colorScheme = m;
    var meta = document.querySelector('meta[name="color-scheme"]');
    if (meta) meta.setAttribute('content', m);
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="jp" className="dark bg-slate-50 dark:bg-gray-800" suppressHydrationWarning>
      <head>
        <meta name="color-scheme" content="light dark" />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={`${inter.className} !bg-slate-50 dark:!bg-gray-800 !text-slate-900 dark:!text-slate-100 transition-colors duration-200`}>
        <ThemeProvider>
          {children}
          <ThemeToggle />
        </ThemeProvider>
      </body>
    </html>
  );
}
