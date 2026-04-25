// Map raw errors from viem / wallets / fetch into a single short, human label.
// Raw error is logged to the console for debugging; UI only ever shows the label.
export function humanizeError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  const msg = raw.toLowerCase();

  if (
    msg.includes('user rejected') ||
    msg.includes('user denied') ||
    msg.includes('action_rejected') ||
    msg.includes('userrejected')
  ) {
    return 'Cancelled in wallet';
  }
  if (msg.includes('insufficient funds')) {
    return 'Not enough gas — top up native token';
  }
  if (msg.includes('nonce already used') || msg.includes('already used')) {
    return 'Already minted on destination';
  }
  if (msg.includes('iris') || msg.includes('attestation')) {
    return 'Attestation service unavailable — try again';
  }
  if (msg.includes('switching') || msg.includes('chain mismatch')) {
    return "Couldn't switch network in your wallet";
  }
  if (msg.includes('timed out') || msg.includes('timeout')) {
    return 'Network timeout — try again';
  }
  if (msg.includes('execution reverted')) {
    return 'Transaction reverted on-chain';
  }
  if (msg.includes('failed to fetch') || msg.includes('network')) {
    return 'Network error — check connection';
  }
  if (msg.includes('disconnected') || msg.includes('not connected')) {
    return 'Wallet disconnected';
  }
  return 'Something went wrong';
}
