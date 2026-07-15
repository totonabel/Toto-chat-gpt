"use client";

type ConnectionBannerProps = {
  online: boolean;
  snapshotError?: Error | null;
};

export function ConnectionBanner({ online, snapshotError }: ConnectionBannerProps) {
  if (online && !snapshotError) return null;

  return (
    <div className="connection-banner" role="status">
      {online ? "Reconectando con los datos de la mesa..." : "Conexión perdida. Reconectando..."}
    </div>
  );
}
