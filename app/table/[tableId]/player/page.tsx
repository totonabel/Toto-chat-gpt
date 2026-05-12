"use client";

import { useEffect, useMemo, useState } from "react";
import { FirebaseErrorState } from "../../../../components/feedback/FirebaseErrorState";
import { useParams } from "next/navigation";
import { ConnectionBanner } from "../../../../components/feedback/ConnectionBanner";
import { ToastViewport } from "../../../../components/feedback/ToastViewport";
import { DebugPanel } from "../../../../components/debug/DebugPanel";
import { ActionBar } from "../../../../components/actions/ActionBar";
import { ChipSelector } from "../../../../components/chips/ChipSelector";
import { PreparedRaise } from "../../../../components/chips/PreparedRaise";
import { PokerTable } from "../../../../components/table/PokerTable";
import { updatePlayerConnection } from "../../../../lib/firebase/player";
import { useAuth } from "../../../../lib/hooks/useAuth";
import { useMyPlayer } from "../../../../lib/hooks/useMyPlayer";
import { usePlayers } from "../../../../lib/hooks/usePlayers";
import { usePots } from "../../../../lib/hooks/usePots";
import { useTable } from "../../../../lib/hooks/useTable";
import { useLocalSession } from "../../../../lib/hooks/useLocalSession";
import { useOnlineStatus } from "../../../../lib/hooks/useOnlineStatus";
import { useToasts } from "../../../../lib/hooks/useToasts";

const formatMoney = (amount: number) => `$${amount}`;

export default function PlayerTablePage() {
  const params = useParams<{ tableId: string }>();
  const tableId = params.tableId;
  const { user, loading: authLoading, error: authError } = useAuth();
  const { table, loading: tableLoading, error: tableError } = useTable(tableId);
  const { players, loading: playersLoading } = usePlayers(tableId);
  const { pots } = usePots(tableId);
  const { player: myPlayer, loading: myPlayerLoading } = useMyPlayer(tableId, user?.uid ?? null);
  const [preparedRaise, setPreparedRaise] = useState(0);
  const [wasMyTurn, setWasMyTurn] = useState(false);
  const [lastStatus, setLastStatus] = useState<string | null>(null);
  const online = useOnlineStatus();
  const { persistSession } = useLocalSession();
  const { toasts, pushToast, dismissToast } = useToasts();

  const potTotal = useMemo(() => {
    const potsTotal = pots.reduce((total, pot) => total + pot.amount, 0);
    return potsTotal > 0 ? potsTotal : table?.potTotal ?? 0;
  }, [pots, table?.potTotal]);

  const amountToCall = Math.max(0, (table?.highestBet ?? 0) - (myPlayer?.currentBet ?? 0));
  const currentTurnPlayer = players.find((player) => player.seatNumber === table?.currentTurnSeat);
  const isMyTurn = Boolean(myPlayer?.seatNumber !== null && myPlayer?.seatNumber === table?.currentTurnSeat);

  const statusText = useMemo(() => {
    if (table?.status === "finished") return "Table finished";
    if (!myPlayer) return "Joining table...";
    if (myPlayer.status === "allIn") return "You are all-in";
    if (myPlayer.status === "folded") return "You folded";
    if (myPlayer.status === "broke") return "You are broke";
    if (myPlayer.status === "waitingNextHand") return "Waiting next hand";
    if (!myPlayer.connected) return "Reconnecting...";
    if (isMyTurn) return "Your turn";
    if (currentTurnPlayer) return `Waiting for ${currentTurnPlayer.name}`;
    return table?.status === "waiting" ? "Waiting for next hand" : "Waiting for table update";
  }, [currentTurnPlayer, isMyTurn, myPlayer, table?.status]);

  const chipDisabled = !isMyTurn || !myPlayer || table?.status === "finished" || ["folded", "allIn", "broke", "waitingNextHand"].includes(myPlayer.status);

  useEffect(() => {
    if (!user || !myPlayer) return;
    persistSession({
      tableId,
      playerId: user.uid,
      name: myPlayer.name,
      seatNumber: myPlayer.seatNumber,
      isLeader: myPlayer.isLeader,
    });
  }, [myPlayer, persistSession, tableId, user]);

  useEffect(() => {
    if (!user) return;
    void updatePlayerConnection(tableId, user.uid, online);
  }, [online, tableId, user]);

  useEffect(() => {
    if (!isMyTurn || wasMyTurn) {
      setWasMyTurn(isMyTurn);
      return;
    }
    pushToast("Your turn", "success");
    navigator.vibrate?.(35);
    setWasMyTurn(true);
  }, [isMyTurn, pushToast, wasMyTurn]);

  useEffect(() => {
    if (!myPlayer || lastStatus === myPlayer.status) return;
    if (myPlayer.status === "waitingNextHand") pushToast("Waiting next hand", "warning");
    if (myPlayer.status === "allIn") pushToast("You are all-in", "success");
    if (myPlayer.status === "folded") pushToast("You folded", "warning");
    if (myPlayer.status === "broke") pushToast("You are broke", "error");
    setLastStatus(myPlayer.status);
  }, [lastStatus, myPlayer, pushToast]);

  useEffect(() => {
    pushToast(online ? "Reconnected" : "Connection lost", online ? "success" : "error");
  }, [online, pushToast]);

  if (authLoading || tableLoading || playersLoading || myPlayerLoading) {
    return <main className="loading-state">Loading your table...</main>;
  }

  if (authError || !table || !user) {
    return <FirebaseErrorState title="Could not load table" message={authError?.message ?? tableError?.message ?? "Check your Firebase configuration or network connection."} />;
  }

  return (
    <main className={`player-page ${isMyTurn ? "my-turn" : ""}`}>
      <ConnectionBanner online={online} snapshotError={tableError} />
      <header className="player-header" aria-label="Player status">
        <div className="stat-card">
          <span className="muted">Pot total</span>
          <strong>{formatMoney(potTotal)}</strong>
        </div>
        <div className="stat-card">
          <span className="muted">My stack</span>
          <strong>{formatMoney(myPlayer?.stack ?? 0)}</strong>
        </div>
        <div className="stat-card">
          <span className="muted">Amount to call</span>
          <strong>{formatMoney(amountToCall)}</strong>
        </div>
        <div className="stat-card">
          <span className="muted">Highest bet</span>
          <strong>{formatMoney(table.highestBet)}</strong>
        </div>
        <div className="status-pill">{statusText}</div>
      </header>

      <section className="table-stage">
        <PokerTable table={table} players={players} potTotal={potTotal} />
        <ChipSelector disabled={chipDisabled} onAdd={(value) => setPreparedRaise((amount) => amount + value)} values={table.chipValues.length ? table.chipValues : undefined} />
        <PreparedRaise amount={preparedRaise} onClear={() => setPreparedRaise(0)} />
      </section>

      <ActionBar
        tableId={tableId}
        uid={user.uid}
        table={table}
        players={players}
        myPlayer={myPlayer}
        pots={pots}
        preparedRaise={preparedRaise}
        onClearPreparedRaise={() => setPreparedRaise(0)}
        onToast={pushToast}
      />
      <DebugPanel table={table} players={players} pots={pots} snapshotLabel="player" />
      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
    </main>
  );
}
