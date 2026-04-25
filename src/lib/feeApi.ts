import { IRIS_API, FINALITY_FAST } from './cctp';

interface FeeEntry {
  finalityThreshold: number;
  minimumFee: number; // basis points (1 bp = 0.01%)
}

interface FeeResponse {
  data?: FeeEntry[];
}

// Hardcoded fallback if Circle's fee API is unreachable: 14 bps for Fast (matches
// what Circle's reference UI assumes), 0 bps for Standard.
const FALLBACK_BPS: Record<number, number> = {
  [FINALITY_FAST]: 14,
};

const BUFFER_NUMERATOR = 12n;
const BUFFER_DENOMINATOR = 10n;

export async function fetchFeeBps(
  sourceDomain: number,
  destinationDomain: number,
  finalityThreshold: number,
): Promise<number> {
  const url = `${IRIS_API}/v2/burn/USDC/fees/${sourceDomain}/${destinationDomain}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`fee api ${res.status}`);
    const json = (await res.json()) as FeeResponse;
    const entry = json.data?.find((d) => d.finalityThreshold === finalityThreshold);
    if (entry && Number.isFinite(entry.minimumFee)) return entry.minimumFee;
  } catch {
    /* fall through to fallback */
  }
  return FALLBACK_BPS[finalityThreshold] ?? 0;
}

// maxFee = amount × bps/10000 × 1.2 buffer.
export async function computeMaxFee(
  amount: bigint,
  sourceDomain: number,
  destinationDomain: number,
  finalityThreshold: number,
): Promise<bigint> {
  const bps = await fetchFeeBps(sourceDomain, destinationDomain, finalityThreshold);
  if (bps <= 0) return 0n;
  const raw = (amount * BigInt(bps)) / 10_000n;
  return (raw * BUFFER_NUMERATOR) / BUFFER_DENOMINATOR;
}

// Useful for the UI before the user clicks Bridge — same math, no buffer.
export async function previewFee(
  amount: bigint,
  sourceDomain: number,
  destinationDomain: number,
  finalityThreshold: number,
): Promise<bigint> {
  const bps = await fetchFeeBps(sourceDomain, destinationDomain, finalityThreshold);
  if (bps <= 0) return 0n;
  return (amount * BigInt(bps)) / 10_000n;
}
