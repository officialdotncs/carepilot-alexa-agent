import { Icon } from '@/components/Icon';
import type { DataSource } from '@/types';

// Distinguishes seeded demo data from data the user/agent created during
// the session. Rendered next to task titles and history rows.
export function SourceBadge({ source }: { source: DataSource }) {
  if (source === 'sample') {
    return (
      <span className="cp-chip bg-ink-600/40 text-slate-400 border border-white/5">
        <Icon name="fileText" size={11} />
        Sample
      </span>
    );
  }
  return (
    <span className="cp-chip bg-teal-500/10 text-teal-300 border border-teal-400/20">
      <Icon name="user" size={11} />
      You
    </span>
  );
}
