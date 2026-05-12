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
        <h1>Virtual chips for live poker nights.</h1>
        <p className="muted">
          Create or join an in-person poker table. Cards stay physical; stacks,
          blinds, turns, pots, all-ins and payouts are tracked in real time.
        </p>

        <div className="form-grid">
          {session ? (
            <p className="muted">
              Restoring {session.name} at your last table...
            </p>
          ) : null}

          <a className="primary-link" href="/join">
            Join a table
          </a>

          <a className="secondary-button" href="/create">
            Create a table
          </a>
        </div>
      </section>
    </main>
  );
}
