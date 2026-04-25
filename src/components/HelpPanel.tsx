import { useState } from 'react';
import { USDC_FAUCET, type CctpChain } from '../lib/cctp';

interface Props {
  source: CctpChain;
  destination: CctpChain;
  speed: 'fast' | 'standard';
}

const STORAGE_KEY = 'cctp-bridge:help-collapsed';

export function HelpPanel({ source, destination, speed }: Props) {
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

  const standardWait =
    source.key === 'sepolia' ? '13–19 min' : source.key === 'polygonAmoy' ? '~2 min' : '~30 sec';

  return (
    <div className="mt-4 bg-panel border border-border rounded-xl">
      <button
        type="button"
        onClick={toggle}
        className="w-full px-4 py-2.5 flex items-center justify-between text-sm text-fg/80 hover:text-fg"
      >
        <span className="flex items-center gap-2">
          <span aria-hidden>💡</span>
          Need help getting started?
        </span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 12 12"
          className={`text-fg/50 transition-transform ${collapsed ? '' : 'rotate-180'}`}
        >
          <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      {!collapsed && (
        <div className="px-4 pb-4 pt-1 border-t border-border space-y-4 text-xs">
          <Section title="Before you click Bridge">
            <ul className="space-y-1.5 text-fg/70">
              <FaucetItem
                label={`${source.gasSymbol} for gas on ${source.label}`}
                href={source.gasFaucet}
                why="Pays for the burn tx"
              />
              <FaucetItem
                label={`Testnet USDC on ${source.label}`}
                href={USDC_FAUCET}
                why={`Pick "${source.label}" in the dropdown`}
              />
              <FaucetItem
                label={`${destination.gasSymbol} for gas on ${destination.label}`}
                href={destination.gasFaucet}
                why="Pays for the mint tx — don't skip"
              />
            </ul>
          </Section>

          <Section title="What to expect (≈ time)">
            <ol className="space-y-1 list-decimal list-inside text-fg/70">
              <li>Approve USDC (sign in wallet) — ~12 s</li>
              <li>Burn on {source.short} (sign in wallet) — ~12 s</li>
              <li>
                Wait for attestation —{' '}
                {speed === 'fast' ? '~8–20 s' : standardWait}
              </li>
              <li>Wallet prompts you to switch to {destination.short}</li>
              <li>Mint on {destination.short} (sign in wallet) — ~2 s</li>
              <li>✅ Bridged</li>
            </ol>
          </Section>

          <Section title="If something fails">
            <ul className="space-y-1 text-fg/70">
              <li>
                <span className="text-fg/90">"Insufficient funds for gas" on mint</span> →
                grab {destination.gasSymbol} from{' '}
                <a
                  href={destination.gasFaucet}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {destination.label} faucet
                </a>
                .
              </li>
              <li>
                <span className="text-fg/90">Burn tx reverts</span> → check the
                "Max per transfer" line under Amount; if hidden, the read failed,
                retry.
              </li>
              <li>
                <span className="text-fg/90">Attestation hangs &gt; 2 min</span> in
                Fast mode → Iris sandbox can be slow.{' '}
                <span className="text-fg/60">
                  Refresh the page — the resume banner will pick up where you stopped.
                </span>
              </li>
            </ul>
          </Section>

          <div className="pt-2 border-t border-border text-[11px] text-fg/40">
            Tip: pick <span className="text-fg/60">Fast</span> for iteration. Standard
            from {source.short} waits {standardWait} for hard finality.
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h4 className="text-[11px] uppercase tracking-widest text-fg/40 mb-1.5">
        {title}
      </h4>
      {children}
    </section>
  );
}

function FaucetItem({ label, href, why }: { label: string; href: string; why: string }) {
  return (
    <li className="flex items-baseline gap-2 flex-wrap">
      <span className="w-1 h-1 rounded-full bg-fg/40 mt-1.5 shrink-0" />
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="text-blue-600 dark:text-blue-400 hover:underline"
      >
        {label}
      </a>
      <span className="text-fg/40 text-[11px]">— {why}</span>
    </li>
  );
}
