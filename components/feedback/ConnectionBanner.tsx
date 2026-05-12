"use client";

type ConnectionBannerProps = {
  online: boolean;
  snapshotError?: Error | null;
};

export function ConnectionBanner({ online, snapshotError }: ConnectionBannerProps) {
  if (online && !snapshotError) return null;

  return (
    <div className="connection-banner" role="status">
      {online ? "Reconnecting to table data..." : "Connection lost. Reconnecting..."}
    </div>
  );
}
