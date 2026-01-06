export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0b0b0b",
        color: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 420,
          width: "100%",
          padding: "2rem",
          borderRadius: "12px",
          background: "#121212",
          textAlign: "center",
        }}
      >
        <h1>GHOSTHAVN LIVEVOTE</h1>
        <p>Live 1v1 rap battle voting</p>

        <button style={{ width: "100%", padding: "1rem", marginBottom: "1rem" }}>
          🔥 Vote Rapper A
        </button>

        <button style={{ width: "100%", padding: "1rem" }}>
          ⚡ Vote Rapper B
        </button>

        <p style={{ marginTop: "1rem", opacity: 0.6 }}>
          Powered by Ghosthavn
        </p>
      </div>
    </main>
  );
}
