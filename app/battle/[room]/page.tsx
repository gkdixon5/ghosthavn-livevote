export default function BattleRoom({
  params,
}: {
  params: { room: string };
}) {
  return (
    <main style={{ padding: 24 }}>
      <h1>Ghosthavn Live Vote</h1>
      <p><strong>Room code:</strong> {params.room}</p>
    </main>
  );
}
