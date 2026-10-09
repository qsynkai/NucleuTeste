export function CalendarLoadingSkeleton() {
  return (
    <div aria-hidden style={{ display: "grid", gap: "0.75rem" }}>
      <div className="skeleton" style={{ height: 40, width: 320 }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "0.5rem" }}>
        {Array.from({ length: 7 }).map((_, index) => (
          <div key={`cal-head-${index}`} className="skeleton" style={{ height: 24 }} />
        ))}
        {Array.from({ length: 21 }).map((_, index) => (
          <div key={`cal-sk-${index}`} className="skeleton" style={{ height: 72 }} />
        ))}
      </div>
    </div>
  );
}
