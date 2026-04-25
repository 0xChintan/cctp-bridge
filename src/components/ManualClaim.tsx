import { useState } from 'react';
import { useAccount } from 'wagmi';
import { CCTP_CHAINS, type CctpChainKey } from '../lib/cctp';
import { ChainSelect } from './ChainSelect';
import type { Hex } from 'viem';

interface Props {
  onClaim: (sourceKey: CctpChainKey, burnTx: Hex) => void;
  busy: boolean;
}

const STORAGE_KEY = 'cctp-bridge:claim-collapsed';

const TX_HASH_RE = /^0x[0-9a-fA-F]{64}$/;

export function ManualClaim({ onClaim, busy }: Props) {
  const { isConnected } = useAccount();
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) !== '0';
    } catch {
      return true;
    }
  });
  const [sourceKey, setSourceKey] = useState<CctpChainKey>('sepolia');
  const [txHash, setTxHash] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const toggle = () => {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const trimmed = txHash.trim();
  const validHash = TX_HASH_RE.test(trimmed);

  const handleSubmit = () => {
    setLocalError(null);
    if (!validHash) {
      setLocalError('Enter a valid 0x… 32-byte transaction hash.');
      return;
    }
    onClaim(sourceKey, trimmed as Hex);
  };

  const source = CCTP_CHAINS[sourceKey];

  return (
    <div className="mt-4 bg-panel border border-border rounded-xl">
      <button
        type="button"
        onClick={toggle}
        className="w-full px-4 py-2.5 flex items-center justify-between text-sm text-fg/80 hover:text-fg"
      >
        <span className="flex items-center gap-2">
          <span aria-hidden>🔁</span>
          Have a burn that didn't mint? Claim it
        </span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 12 12"
          className={`text-fg/50 transition-transform ${collapsed ? '' : 'rotate-180'}`}
        >
          <path
            d="M2 4l4 4 4-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {!collapsed && (
        <div className="px-4 pb-4 pt-1 border-t border-border space-y-3">
          <p className="text-[11px] text-fg/50 leading-relaxed">
            Paste a CCTP burn tx hash. The app will fetch the attestation from
            Circle, detect the destination chain from the message, prompt your
            wallet to switch, and submit the mint. If the message was already
            received, it'll say so.
          </p>

          <div>
            <label className="block text-xs text-fg/50 mb-1">
              Source chain (where the burn happened)
            </label>
            <ChainSelect value={sourceKey} onChange={setSourceKey} />
          </div>

          <div>
            <label className="block text-xs text-fg/50 mb-1">Burn tx hash</label>
            <input
              type="text"
              value={txHash}
              onChange={(e) => {
                setTxHash(e.target.value);
                setLocalError(null);
              }}
              placeholder="0x…"
              spellCheck={false}
              className="w-full px-3 py-2 bg-input-bg border border-border rounded-md text-fg text-xs font-mono focus:outline-none focus:border-accent"
            />
            {trimmed && !validHash && (
              <div className="mt-1 text-[11px] text-red-600 dark:text-red-400">Not a valid 0x-prefixed 32-byte hash.</div>
            )}
            {trimmed && validHash && (
              <a
                href={`${source.explorer}/tx/${trimmed}`}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-block text-[11px] text-blue-600 dark:text-blue-400 hover:underline"
              >
                View on {source.label} explorer ↗
              </a>
            )}
          </div>

          {localError && (
            <div className="p-2.5 bg-red-100 dark:bg-red-950/40 border border-red-300 dark:border-red-900 rounded text-[11px] text-red-700 dark:text-red-300">
              {localError}
            </div>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isConnected || !validHash || busy}
            className="w-full py-2 rounded-md border border-blue-400 dark:border-blue-700 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm"
          >
            {!isConnected
              ? 'Connect wallet to claim'
              : busy
                ? 'Working…'
                : 'Fetch attestation & mint'}
          </button>
        </div>
      )}
    </div>
  );
}
