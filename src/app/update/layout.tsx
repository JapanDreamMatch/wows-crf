import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "出場者の変更",
};

export default function UpdateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

