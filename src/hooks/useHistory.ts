import { useEffect, useState } from 'react';
import type { Address } from 'viem';
import { listHistory, onHistoryChange, type HistoryEntry } from '../lib/history';

export function useHistory(address?: Address): HistoryEntry[] {
  const [entries, setEntries] = useState<HistoryEntry[]>(() => listHistory(address));

  useEffect(() => {
    setEntries(listHistory(address));
    const off = onHistoryChange(() => setEntries(listHistory(address)));
    return off;
  }, [address]);

  return entries;
}
