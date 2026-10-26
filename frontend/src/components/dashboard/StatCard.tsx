interface Props {
  label: string;
  value: number | string;
}

export function StatCard({ label, value }: Props) {
  return (
    <div className="stat-card">
      <p className="stat-card__label">{label.toUpperCase()}</p>
      <p className="stat-card__value">{value}</p>
    </div>
  );
}
