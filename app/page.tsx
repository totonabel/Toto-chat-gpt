"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLocalSession } from "../lib/hooks/useLocalSession";

export default function HomePage() {
  const router = useRouter();
  const { session } = useLocalSession();

  useEffect(() => {
    if (session?.tableId) {
      router.push(`/table/${session.tableId}`);
    }
  }, [router, session]);

  return (
    <main className="page-shell">
      <section className="hero-card">
        <p className="eyebrow">Poker Wallet</p>
        <h1>Fichas virtuales para tus noches de póker.</h1>
        <p className="muted">
          Creá o unite a una mesa de póker presencial. Las cartas siguen siendo
          físicas; las fichas, ciegas, turnos, pozos, all-ins y pagos se
          registran en tiempo real.
        </p>

        <div className="form-grid">
          {session ? (
            <p className="muted">
              Restaurando a {session.name} en tu última mesa...
            </p>
          ) : null}

          <a className="primary-link" href="/join">
            Unirse a una mesa
          </a>

          <a className="secondary-button" href="/create">
            Crear una mesa
          </a>
        </div>
      </section>
    </main>
  );
}
