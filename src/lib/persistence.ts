import type { Address, Hex } from 'viem';
import type { CctpChainKey } from './cctp';

const KEY = 'cctp-bridge:pending';
const SCHEMA_VERSION = 1;

// We persist after the burn tx is confirmed. Iris is idempotent, so we don't
// need to store the attestation itself — just enough to re-poll on resume.
export interface PendingTransfer {
  v: number;
  address: Address;
  sourceKey: CctpChainKey;
  destinationKey: CctpChainKey;
  burnTx: Hex;
  amount: string; // bigint serialized as decimal string
  speed: 'fast' | 'standard';
  startedAt: number;
}

function isPending(raw: unknown): raw is PendingTransfer {
  if (!raw || typeof raw !== 'object') return false;
  const p = raw as Record<string, unknown>;
  return (
    p.v === SCHEMA_VERSION &&
    typeof p.address === 'string' &&
    typeof p.sourceKey === 'string' &&
    typeof p.destinationKey === 'string' &&
    typeof p.burnTx === 'string' &&
    typeof p.amount === 'string' &&
    (p.speed === 'fast' || p.speed === 'standard') &&
    typeof p.startedAt === 'number'
  );
}

export function savePending(p: Omit<PendingTransfer, 'v'>): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ v: SCHEMA_VERSION, ...p }));
  } catch {
    /* quota exceeded / storage unavailable — silently drop */
  }
}

export function loadPending(): PendingTransfer | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isPending(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function clearPending(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
