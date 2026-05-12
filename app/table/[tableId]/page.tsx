"use client";

import { useEffect } from "react";
import { FirebaseErrorState } from "../../../components/feedback/FirebaseErrorState";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "../../../lib/hooks/useAuth";
import { useMyPlayer } from "../../../lib/hooks/useMyPlayer";
import { useTable } from "../../../lib/hooks/useTable";

export default function TableRoleRouterPage() {
  const { tableId } = useParams<{ tableId: string }>();
  const router = useRouter();
  const { user, loading: authLoading, error: authError } = useAuth();
  const { table, loading: tableLoading, error: tableError } = useTable(tableId);
  const { player, loading: playerLoading } = useMyPlayer(tableId, user?.uid ?? null);

  useEffect(() => {
    if (authLoading || tableLoading || playerLoading || !user || !table || !player || table.status === "finished") return;
    router.replace(`/table/${tableId}/${player.isLeader ? "leader" : "player"}`);
  }, [authLoading, player, playerLoading, router, table, tableId, tableLoading, user]);

  if (table?.status === "finished") {
    return <main className="loading-state">This table is finished.</main>;
  }

  if (authError || (!tableLoading && !table)) {
    return <FirebaseErrorState title="Table not found" message={authError?.message ?? tableError?.message ?? "The table may have been deleted or the code is invalid."} />;
  }

  return <main className="loading-state">Restoring your table...</main>;
}
