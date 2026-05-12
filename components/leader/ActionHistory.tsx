"use client";

import { useActions } from "../../lib/hooks/useActions";

type ActionHistoryProps = {
  tableId: string;
};

export function ActionHistory({ tableId }: ActionHistoryProps) {
  const { actions, loading, error } = useActions(tableId, 80);

  return (
    <section className="leader-card">
      <div className="leader-section-title">
        <div>
          <p className="eyebrow">History</p>
          <h2>Action log</h2>
        </div>
        <span className="status-chip">live</span>
      </div>
      {loading ? <p className="muted">Loading actions...</p> : null}
      {error ? <div className="error-card">{error.message}</div> : null}
      <div className="action-history-list">
        {actions.map((action) => (
          <article key={action.id} className="history-row">
            <div>
              <strong>{action.type}</strong>
              <p className="muted">
                {action.playerName} · hand {action.handNumber} · {action.round}
              </p>
            </div>
            {action.amount !== null ? <span className="status-chip">${action.amount}</span> : null}
          </article>
        ))}
      </div>
    </section>
  );
}
