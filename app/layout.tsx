import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "GHOSTHAVN LIVEVOTE",
  description: "Live 1v1 rap battle voting powered by Ghosthavn",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
