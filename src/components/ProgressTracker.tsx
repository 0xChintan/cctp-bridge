import type { Step } from '../hooks/useBridge';
import type { CctpChain } from '../lib/cctp';

interface Props {
  step: Step;
  source: CctpChain;
  destination: CctpChain;
  approveTx?: `0x${string}`;
  burnTx?: `0x${string}`;
  mintTx?: `0x${string}`;
  error?: string;
}

const ORDER: Step[] = ['approve', 'burn', 'attest', 'mint', 'done'];
const LABELS: Record<Exclude<Step, 'idle' | 'error'>, string> = {
  approve: 'Approve USDC',
  burn: 'Burn on source',
  attest: 'Wait for attestation',
  mint: 'Mint on destination',
  done: 'Complete',
};

export function ProgressTracker({ step, source, destination, approveTx, burnTx, mintTx, error }: Props) {
  if (step === 'idle') return null;

  const currentIdx = step === 'error' ? -1 : ORDER.indexOf(step);

  return (
    <div>
      <div className="space-y-2.5">
        {(Object.keys(LABELS) as Array<keyof typeof LABELS>).map((key, idx) => {
          const isCurrent = step === key;
          const isComplete = currentIdx > idx || step === 'done';
          const status =
            step === 'error' && isCurrent
              ? 'error'
              : isCurrent
                ? 'current'
                : isComplete
                  ? 'done'
                  : 'pending';

          let dot = 'bg-fg/10';
          if (status === 'done') dot = 'bg-green-500';
          if (status === 'current') dot = 'bg-blue-500 animate-pulse';
          if (status === 'error') dot = 'bg-red-500';

          let tx: `0x${string}` | undefined;
          let explorer = source.explorer;
          if (key === 'approve') tx = approveTx;
          if (key === 'burn') tx = burnTx;
          if (key === 'mint') {
            tx = mintTx;
            explorer = destination.explorer;
          }

          return (
            <div key={key} className="flex items-center gap-2 text-xs">
              <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
              <span className={status === 'pending' ? 'text-fg/40' : 'text-fg/90'}>
                {LABELS[key]}
              </span>
              {tx && (
                <a
                  href={`${explorer}/tx/${tx}`}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-auto text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-mono"
                >
                  {tx.slice(0, 8)}…
                </a>
              )}
            </div>
          );
        })}
      </div>
      {error && (
        <div className="mt-3 p-2.5 bg-red-100 dark:bg-red-950/40 border border-red-300 dark:border-red-900 rounded text-[11px] text-red-700 dark:text-red-300 break-words leading-relaxed">
          {error}
        </div>
      )}
    </div>
  );
}
