import { useEffect, useRef, useState } from 'react';
import { CCTP_CHAINS, CHAIN_LIST, type CctpChainKey } from '../lib/cctp';
import { ChainIcon } from './ChainIcon';

interface Props {
  value: CctpChainKey;
  exclude?: CctpChainKey;
  onChange: (key: CctpChainKey) => void;
}

export function ChainSelect({ value, exclude, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = CCTP_CHAINS[value];

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const options = CHAIN_LIST.filter((c) => c.key !== exclude);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full px-3 py-2 bg-input-bg border border-border rounded-md text-fg text-sm flex items-center gap-2 hover:border-accent transition-colors focus:outline-none focus:border-accent"
      >
        <ChainIcon chain={current} size={20} />
        <span className="flex-1 text-left truncate">{current.label}</span>
        <span className="text-[10px] text-fg/40 font-mono shrink-0">
          Domain {current.domain}
        </span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 12 12"
          className={`text-fg/50 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-20 left-0 right-0 mt-1 max-h-72 overflow-y-auto bg-panel border border-border rounded-md shadow-2xl">
          {options.map((c) => {
            const isActive = c.key === value;
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => {
                  onChange(c.key);
                  setOpen(false);
                }}
                className={[
                  'w-full px-3 py-2 flex items-center gap-2 text-sm text-left hover:bg-fg/5 transition-colors',
                  isActive ? 'bg-fg/[0.03] text-fg' : 'text-fg/85',
                ].join(' ')}
              >
                <ChainIcon chain={c} size={20} />
                <span className="flex-1 truncate">{c.label}</span>
                <span className="text-[10px] text-fg/40 font-mono shrink-0">
                  D{c.domain}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
