export const metadata = {
  title: "Ghosthavn LiveVote",
  description: "Live 1v1 rap battle voting powered by Ghosthavn"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          backgroundColor: "#0b0b0b",
          color: "#ffffff",
          fontFamily: "system-ui, sans-serif"
        }}
      >
        {children}
      </body>
    </html>
  );
}
