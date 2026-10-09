export function DashboardSkeleton() {
  return (
    <div aria-hidden>
      <div className="skeleton" style={{ height: 150 }} />

      <div className="metrics">
        <div className="skeleton" style={{ height: 150 }} />
        <div className="skeleton" style={{ height: 150 }} />
      </div>

      <div className="dash-grid">
        <div className="skeleton" style={{ height: 320 }} />
        <div className="skeleton" style={{ height: 320 }} />
      </div>
    </div>
  );
}
