export function computeChange(
  current: number,
  previous: number | null
): { status: 'no-change' | 'changed' | 'not-scanned'; diff: number | null; label: string } {
  if (previous === null) return { status: 'not-scanned', diff: null, label: 'New baseline' }
  const diff = current - previous
  if (diff === 0) return { status: 'no-change', diff: 0, label: 'No change' }
  return {
    status: 'changed',
    diff,
    label: diff < 0 ? `▼ ${Math.abs(diff)} fewer items` : `▲ ${diff} more items`,
  }
}
