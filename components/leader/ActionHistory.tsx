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
          <p className="eyebrow">Historial</p>
          <h2>Registro de acciones</h2>
        </div>
        <span className="status-chip">en vivo</span>
      </div>
      {loading ? <p className="muted">Cargando acciones...</p> : null}
      {error ? <div className="error-card">{error.message}</div> : null}
      <div className="action-history-list">
        {actions.map((action) => (
          <article key={action.id} className="history-row">
            <div>
              <strong>{action.type}</strong>
              <p className="muted">
                {action.playerName} · mano {action.handNumber} · {action.round}
              </p>
            </div>
            {action.amount !== null ? <span className="status-chip">${action.amount}</span> : null}
          </article>
        ))}
      </div>
    </section>
  );
}
