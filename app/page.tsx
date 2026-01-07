export const metadata = {
  title: "GHOSTHAVN LIVEVOTE",
  description: "Live 1v1 rap battle voting",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          background:
            "radial-gradient(circle at top, #1b1026 0%, #050508 60%)",
          color: "#fff",
          fontFamily: "system-ui, -apple-system, BlinkMacSystemFont",
        }}
      >
        {children}
      </body>
    </html>
  );
}
