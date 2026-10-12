import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/gass/providers";
export const metadata: Metadata = {
  title: { default: "GASS · Dinas Kesehatan", template: "%s · GASS" },
  description:
    "Gerakan Aksi Sehat Setara — Monitoring kinerja dan keuangan Dinas Kesehatan",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
