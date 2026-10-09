type EmptyStateProps = {
  title: string;
  description: string;
  action?: React.ReactNode;
};

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div>
        <h3 className="empty-state__title">{title}</h3>
        <p className="empty-state__desc">{description}</p>
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  );
}
