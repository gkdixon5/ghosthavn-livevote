export default function Home() {
  return (
    <main style={{ padding: "2rem", color: "white", background: "black", minHeight: "100vh" }}>
      <h1>GHOSTHAVN LIVEVOTE</h1>
      <p>Live 1v1 rap battle voting</p>
      <p>Powered by Ghosthavn</p>

      <div style={{ marginTop: "2rem" }}>
        <button style={{ marginRight: "1rem", padding: "1rem" }}>
          🔥 Vote Rapper A
        </button>
        <button style={{ padding: "1rem" }}>
          ⚡ Vote Rapper B
        </button>
      </div>
    </main>
  );
}
