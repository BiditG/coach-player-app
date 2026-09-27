const TONES: Record<string, string> = {
  COMPLETED: 'bg-emerald-50 text-emerald-700',
  READY: 'bg-emerald-50 text-emerald-700',
  FAILED: 'bg-red-50 text-red-700',
};

const DEFAULT_TONE = 'bg-amber-50 text-amber-700';

function label(status: string): string {
  return status
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-[0.01em] ${
        TONES[status] ?? DEFAULT_TONE
      }`}
    >
      {label(status)}
    </span>
  );
}
