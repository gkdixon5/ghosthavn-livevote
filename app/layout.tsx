export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ background: "#0b0b0f", fontFamily: "system-ui" }}>
        {children}
      </body>
    </html>
  );
}
