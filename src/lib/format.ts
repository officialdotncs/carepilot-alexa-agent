// Small formatting helpers for demo timestamps.

export function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function relativeFromNow(iso: string, nowIso?: string): string {
  const now = nowIso ? new Date(nowIso).getTime() : Date.now();
  const target = new Date(iso).getTime();
  const diffMs = target - now;
  const absMin = Math.round(Math.abs(diffMs) / 60000);
  if (absMin < 1) return 'just now';
  if (absMin < 60) return diffMs > 0 ? `in ${absMin}m` : `${absMin}m ago`;
  const hrs = Math.round(absMin / 60);
  if (hrs < 24) return diffMs > 0 ? `in ${hrs}h` : `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return diffMs > 0 ? `in ${days}d` : `${days}d ago`;
}

export function formatDateTime(iso: string): string {
  return `${formatDate(iso)} · ${formatTime(iso)}`;
}
