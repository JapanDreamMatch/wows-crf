import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "大会出場登録フォーム",
};

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

