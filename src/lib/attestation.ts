import { IRIS_API } from './cctp';
import type { Hex } from 'viem';

export interface IrisMessage {
  message: Hex;
  attestation: Hex;
  status: 'pending_confirmations' | 'complete' | string;
  eventNonce?: string;
  cctpVersion?: number;
}

interface IrisResponse {
  messages?: IrisMessage[];
}

// V2 endpoint takes (sourceDomain, txHash) and returns all messages emitted in that tx.
// https://developers.circle.com/cctp/technical-guide#attestation-service-api
export async function fetchAttestation(
  sourceDomain: number,
  txHash: Hex,
): Promise<IrisMessage | null> {
  const url = `${IRIS_API}/v2/messages/${sourceDomain}?transactionHash=${txHash}`;
  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`Iris ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as IrisResponse;
  const msg = data.messages?.[0];
  return msg ?? null;
}

export async function pollAttestation(
  sourceDomain: number,
  txHash: Hex,
  opts: { intervalMs?: number; signal?: AbortSignal; onTick?: (m: IrisMessage | null) => void } = {},
): Promise<IrisMessage> {
  const interval = opts.intervalMs ?? 5000;
  while (!opts.signal?.aborted) {
    const m = await fetchAttestation(sourceDomain, txHash);
    opts.onTick?.(m);
    if (m && m.status === 'complete' && m.attestation && m.attestation !== '0x') {
      return m;
    }
    await new Promise((r) => setTimeout(r, interval));
  }
  throw new Error('Attestation polling aborted');
}
