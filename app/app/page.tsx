export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        gap: "1.5rem"
      }}
    >
      <h1 style={{ fontSize: "2.5rem", letterSpacing: "0.05em" }}>
        GHOSTHAVN LIVEVOTE
      </h1>

      <p style={{ maxWidth: 420, opacity: 0.8 }}>
        Live 1v1 rap battle voting.<br />
        No judges. No bias. Crowd decides.
      </p>

      <button
        style={{
          padding: "12px 24px",
          background: "#ffffff",
          color: "#000000",
          border: "none",
          borderRadius: 6,
          fontSize: "1rem",
          cursor: "pointer"
        }}
      >
        Enter Battle
      </button>
    </main>
  );
}
