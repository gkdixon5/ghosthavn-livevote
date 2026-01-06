export default function Page() {
  return (
    <main style={styles.main}>
      <div style={styles.card}>
        <h1 style={styles.h1}>GHOSTHAVN LIVEVOTE</h1>
        <p style={styles.sub}>Live 1v1 rap battle voting</p>

        <div style={styles.battle}>
          <button style={styles.btn} onClick={() => alert("Vote A")}>
            🔥 Vote Rapper A
          </button>

          <button style={styles.btn} onClick={() => alert("Vote B")}>
            ⚡ Vote Rapper B
          </button>
        </div>

        <p style={styles.footer}>Powered by Ghosthavn</p>
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  main: {
    minHeight: "100vh",
    background: "#0b0b12",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    fontFamily: "system-ui, sans-serif",
  },
  card: {
    background: "#111827",
    padding: 24,
    borderRadius: 16,
    width: "100%",
    maxWidth: 420,
    textAlign: "center",
    boxShadow: "0 20px 60px rgba(0,0,0,.6)",
  },
  h1: {
    marginBottom: 8,
    fontSize: 28,
    letterSpacing: 1,
  },
  sub: {
    opacity: 0.7,
    marginBottom: 20,
  },
  battle: {
    display: "grid",
    gap: 12,
  },
  btn: {
    padding: "14px 16px",
    fontSize: 16,
    fontWeight: 700,
    borderRadius: 12,
    border: "none",
    cursor: "pointer",
    background: "#6366f1",
    color: "#fff",
  },
  footer: {
    marginTop: 20,
    fontSize: 12,
    opacity: 0.6,
  },
};
