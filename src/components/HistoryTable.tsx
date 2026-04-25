import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useHistory } from '../hooks/useHistory';
import { CCTP_CHAINS } from '../lib/cctp';
import { formatUsdc } from '../lib/format';
import {
  clearHistory,
  deleteEntry,
  type HistoryEntry,
  type HistoryStatus,
} from '../lib/history';
import { ChainIcon } from './ChainIcon';

const STORAGE_KEY = 'cctp-bridge:history-collapsed';

export function HistoryTable() {
  const { address } = useAccount();
  const entries = useHistory(address);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });

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

  if (!address) return null;

  return (
    <div className="mt-4 bg-panel border border-border rounded-xl">
      <div className="px-4 py-2.5 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={toggle}
          className="flex items-center gap-2 text-sm text-fg/80 hover:text-fg"
        >
          <span aria-hidden>📜</span>
          <span>Recent transfers</span>
          <span className="text-xs text-fg/40">({entries.length})</span>
          <svg
            width="10"
            height="10"
            viewBox="0 0 12 12"
            className={`text-fg/50 ml-1 transition-transform ${collapsed ? '' : 'rotate-180'}`}
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
        {entries.length > 0 && !collapsed && (
          <button
            type="button"
            onClick={() => {
              if (confirm('Clear all transfer history for this address?')) {
                clearHistory(address);
              }
            }}
            className="text-[11px] text-fg/50 hover:text-red-600 dark:hover:text-red-400"
          >
            Clear all
          </button>
        )}
      </div>

      {!collapsed && (
        <div className="border-t border-border">
          {entries.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-fg/40">
              No transfers yet. Bridge something to see it here.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-wider text-fg/40 border-b border-border">
                    <th className="px-3 py-2 font-medium">Time</th>
                    <th className="px-3 py-2 font-medium">Route</th>
                    <th className="px-3 py-2 font-medium text-right">Amount</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Burn</th>
                    <th className="px-3 py-2 font-medium">Mint</th>
                    <th className="px-3 py-2 font-medium w-6"></th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e, i) => (
                    <Row
                      key={e.id}
                      e={e}
                      last={i === entries.length - 1}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ e, last }: { e: HistoryEntry; last: boolean }) {
  const src = CCTP_CHAINS[e.sourceKey];
  const dst = CCTP_CHAINS[e.destinationKey];
  const amount = e.amount && e.amount !== '0' ? formatUsdc(BigInt(e.amount)) : '—';

  return (
    <tr className={last ? '' : 'border-b border-border/60'}>
      <td className="px-3 py-2 text-fg/60 whitespace-nowrap">
        {formatRelative(e.startedAt)}
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center gap-1.5">
          <ChainIcon chain={src} size={16} />
          <span className="text-fg/90">{src.short}</span>
          <span className="text-fg/40">→</span>
          <ChainIcon chain={dst} size={16} />
          <span className="text-fg/90">{dst.short}</span>
        </div>
      </td>
      <td className="px-3 py-2 text-right tabular-nums text-fg/90">
        {amount === '—' ? '—' : `${amount} USDC`}
      </td>
      <td className="px-3 py-2">
        <StatusBadge status={e.status} error={e.error} />
      </td>
      <td className="px-3 py-2 font-mono">
        {e.burnTx ? (
          <a
            href={`${src.explorer}/tx/${e.burnTx}`}
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            {e.burnTx.slice(0, 8)}…
          </a>
        ) : (
          <span className="text-fg/30">—</span>
        )}
      </td>
      <td className="px-3 py-2 font-mono">
        {e.mintTx ? (
          <a
            href={`${dst.explorer}/tx/${e.mintTx}`}
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            {e.mintTx.slice(0, 8)}…
          </a>
        ) : (
          <span className="text-fg/30">—</span>
        )}
      </td>
      <td className="px-3 py-2">
        <button
          type="button"
          onClick={() => deleteEntry(e.id)}
          className="text-fg/30 hover:text-red-600 dark:hover:text-red-400 text-base leading-none"
          title="Remove from history"
        >
          ×
        </button>
      </td>
    </tr>
  );
}

function StatusBadge({ status, error }: { status: HistoryStatus; error?: string }) {
  const meta: Record<HistoryStatus, { label: string; cls: string }> = {
    pending: { label: 'Pending', cls: 'bg-yellow-100 dark:bg-yellow-950/60 border-yellow-300 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300' },
    attesting: { label: 'Attesting', cls: 'bg-blue-100 dark:bg-blue-950/60 border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300' },
    minting: { label: 'Minting', cls: 'bg-blue-100 dark:bg-blue-950/60 border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300' },
    completed: { label: 'Completed', cls: 'bg-green-100 dark:bg-green-950/60 border-green-300 dark:border-green-800 text-green-700 dark:text-green-300' },
    already_minted: {
      label: 'Already minted',
      cls: 'bg-blue-100 dark:bg-blue-950/60 border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300',
    },
    failed: { label: 'Failed', cls: 'bg-red-100 dark:bg-red-950/60 border-red-300 dark:border-red-900 text-red-700 dark:text-red-300' },
  };
  const m = meta[status];

  return (
    <div className="flex flex-col">
      <span className={`inline-block w-fit px-1.5 py-0.5 rounded text-[10px] border ${m.cls}`}>
        {m.label}
      </span>
      {status === 'failed' && error && (
        <span className="text-[10px] text-red-600 dark:text-red-600/80 dark:text-red-400/80 mt-0.5">{error}</span>
      )}
    </div>
  );
}

function formatRelative(timestamp: number): string {
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}
