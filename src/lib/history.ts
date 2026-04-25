import type { Address, Hex } from 'viem';
import type { CctpChainKey } from './cctp';

const KEY = 'cctp-bridge:history';
const VERSION = 1;
const MAX_ENTRIES = 50;
const CHANGE_EVENT = 'cctp-bridge:history-changed';

export type HistoryStatus =
  | 'pending'      // burn broadcast, waiting confirmation / attestation
  | 'attesting'    // waiting for Iris
  | 'minting'      // mint tx in flight
  | 'completed'    // minted successfully
  | 'already_minted' // mint short-circuited because nonce was already used
  | 'failed';

export interface HistoryEntry {
  v: number;
  id: string;
  address: Address;
  sourceKey: CctpChainKey;
  destinationKey: CctpChainKey;
  amount: string; // bigint as decimal string; "0" for manual claims
  speed: 'fast' | 'standard';
  burnTx?: Hex;
  mintTx?: Hex;
  status: HistoryStatus;
  /** Already-humanized short error label. */
  error?: string;
  startedAt: number;
  completedAt?: number;
}

function load(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((e) => e && e.v === VERSION);
  } catch {
    return [];
  }
}

function save(entries: HistoryEntry[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    /* ignore quota errors */
  }
}

export function listHistory(address?: Address): HistoryEntry[] {
  if (!address) return [];
  return load()
    .filter((e) => e.address.toLowerCase() === address.toLowerCase())
    .sort((a, b) => b.startedAt - a.startedAt);
}

export function addEntry(entry: Omit<HistoryEntry, 'v'>): void {
  const all = load();
  all.unshift({ v: VERSION, ...entry });
  save(all);
}

export function updateEntry(
  id: string,
  partial: Partial<Omit<HistoryEntry, 'v' | 'id'>>,
): void {
  const all = load();
  const idx = all.findIndex((e) => e.id === id);
  if (idx < 0) return;
  all[idx] = { ...all[idx], ...partial };
  save(all);
}

export function deleteEntry(id: string): void {
  save(load().filter((e) => e.id !== id));
}

export function clearHistory(address?: Address): void {
  if (!address) {
    save([]);
    return;
  }
  save(load().filter((e) => e.address.toLowerCase() !== address.toLowerCase()));
}

export function onHistoryChange(handler: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, handler);
  return () => window.removeEventListener(CHANGE_EVENT, handler);
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Find the id of an existing history row for (address, burnTx), if any. */
export function findEntryIdByBurnTx(address: Address, burnTx: Hex): string | null {
  const matches = listHistory(address).filter((e) => e.burnTx === burnTx);
  return matches[0]?.id ?? null;
}
