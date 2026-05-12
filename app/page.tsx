"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLocalSession } from "../lib/hooks/useLocalSession";

export default function Home() {
  const router = useRouter();
  const { session } = useLocalSession();

  useEffect(() => {
    if (session?.tableId) {
      router.replace(`/table/${session.tableId}`);
    }
  }, [router, session]);

  return (
    <main className="app-shell">
      <section className="hero-card">
        <p className="eyebrow">Poker Wallet</p>
        <h1>Play poker without chips.</h1>
        <p className="muted">Cards stay physical. Stacks, bets, turns and pots stay synced on your phone.</p>
        <div className="form-grid">
          {session ? <p className="muted">Restoring {session.name} at your last table...</p> : null}
          <Link className="primary-link" href="/join">
            Join a table
          </Link>
          <Link className="secondary-button" href="/create">
            Create a table
          </Link>
        </div>
      </section>
    </main>
  );
}
