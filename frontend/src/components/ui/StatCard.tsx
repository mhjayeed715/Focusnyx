export function StatCard({
  label,
  value,
  hint
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <article className="card">
      <p style={{ margin: 0, color: "#5d6a66", fontSize: 14 }}>{label}</p>
      <p style={{ margin: "8px 0", fontSize: 24, fontWeight: 700 }}>{value}</p>
      {hint ? <p style={{ margin: 0, fontSize: 13 }}>{hint}</p> : null}
    </article>
  );
}
