"use client";

import { useRouter } from "next/navigation";
import { clearLocalSession } from "../../lib/session/localSession";
import type { FirebaseTable } from "../../lib/firebase/schema";

const statusLabels: Record<FirebaseTable["status"], string> = {
  waiting: "Esperando",
  inHand: "Mano en curso",
  showdown: "Showdown",
  finished: "Finalizada",
};

export function PostGameView({ table }: { table: FirebaseTable & { id: string } }) {
  const router = useRouter();

  const leaveTable = () => {
    clearLocalSession();
    router.push("/");
  };

  return (
    <main className="loading-state postgame-view">
      <section className="leader-card">
        <p className="eyebrow">Fin de la partida</p>
        <h1>{table.name}</h1>
        <p className="muted">La mesa quedó finalizada. Gracias por jugar.</p>
        <div className="hand-meta-grid">
          <span>Estado: {statusLabels[table.status]}</span>
          <span>Mano: {table.handNumber}</span>
          <span>Ronda: {table.currentRound}</span>
          <span>Código: {table.code}</span>
        </div>
        <button className="primary-button" type="button" onClick={leaveTable} style={{ marginTop: "18px" }}>
          Salir de la mesa
        </button>
      </section>
    </main>
  );
}
