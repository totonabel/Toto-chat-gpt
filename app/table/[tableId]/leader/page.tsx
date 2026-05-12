"use client";

import { useEffect } from "react";
import { FirebaseErrorState } from "../../../../components/feedback/FirebaseErrorState";
import { useParams, useRouter } from "next/navigation";
import { ConnectionBanner } from "../../../../components/feedback/ConnectionBanner";
import { ToastViewport } from "../../../../components/feedback/ToastViewport";
import { DebugPanel } from "../../../../components/debug/DebugPanel";
import { LeaderDashboard } from "../../../../components/leader/LeaderDashboard";
import { updatePlayerConnection } from "../../../../lib/firebase/player";
import { useAuth } from "../../../../lib/hooks/useAuth";
import { useMyPlayer } from "../../../../lib/hooks/useMyPlayer";
import { usePlayers } from "../../../../lib/hooks/usePlayers";
import { usePots } from "../../../../lib/hooks/usePots";
import { useTable } from "../../../../lib/hooks/useTable";
import { useLocalSession } from "../../../../lib/hooks/useLocalSession";
import { useOnlineStatus } from "../../../../lib/hooks/useOnlineStatus";
import { useToasts } from "../../../../lib/hooks/useToasts";

export default function LeaderPage() {
  const { tableId } = useParams<{ tableId: string }>();
  const router = useRouter();
  const { user, loading: authLoading, error: authError } = useAuth();
  const { table, loading: tableLoading, error: tableError } = useTable(tableId);
  const { players, loading: playersLoading } = usePlayers(tableId);
  const { pots } = usePots(tableId);
  const { player: myPlayer, loading: myPlayerLoading } = useMyPlayer(tableId, user?.uid ?? null);
  const online = useOnlineStatus();
  const { persistSession } = useLocalSession();
  const { toasts, pushToast, dismissToast } = useToasts();


  useEffect(() => {
    if (!user || !myPlayer) return;
    persistSession({ tableId, playerId: user.uid, name: myPlayer.name, seatNumber: myPlayer.seatNumber, isLeader: myPlayer.isLeader });
  }, [myPlayer, persistSession, tableId, user]);

  useEffect(() => {
    if (!user) return;
    void updatePlayerConnection(tableId, user.uid, online);
  }, [online, tableId, user]);

  useEffect(() => {
    pushToast(online ? "Reconnected" : "Connection lost", online ? "success" : "error");
  }, [online, pushToast]);

  useEffect(() => {
    if (!authLoading && !myPlayerLoading && user && myPlayer && !myPlayer.isLeader) {
      router.push(`/table/${tableId}/player`);
    }
  }, [authLoading, myPlayer, myPlayerLoading, router, tableId, user]);

  if (authLoading || tableLoading || playersLoading || myPlayerLoading) {
    return <main className="loading-state">Loading leader dashboard...</main>;
  }

  if (authError || !table || !user || !myPlayer) {
    return <FirebaseErrorState title="Could not load leader dashboard" message={authError?.message ?? tableError?.message ?? "Check your Firebase configuration or network connection."} />;
  }

  if (!myPlayer.isLeader) {
    return <main className="loading-state">Redirecting to player view...</main>;
  }

  return (
    <>
      <ConnectionBanner online={online} snapshotError={tableError} />
      <LeaderDashboard tableId={tableId} leaderUid={user.uid} table={table} players={players} pots={pots} />
      <DebugPanel table={table} players={players} pots={pots} snapshotLabel="leader" />
      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
