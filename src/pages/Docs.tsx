import { useState } from 'react';
import { CHAIN_LIST, MESSAGE_TRANSMITTER_V2, TOKEN_MESSENGER_V2 } from '../lib/cctp';
import { ChainIcon } from '../components/ChainIcon';

// =============================================================================
// Data
// =============================================================================

type Speed = 'Fast' | 'Medium' | 'Slow';

interface ChainRow {
  name: string;
  domain: number;
  finality: string;
}

// V2 supported chains (testnet + mainnet). Addresses are unified across all
// V2-deployed EVM chains, so a single address works for all of them.
const V2_CHAINS: ChainRow[] = [
  { name: 'Ethereum', domain: 0, finality: '~13–19 min finality' },
  { name: 'Avalanche', domain: 1, finality: '~8 sec finality' },
  { name: 'OP', domain: 2, finality: '~13–19 min (via ETH L1)' },
  { name: 'Arbitrum', domain: 3, finality: '~13–19 min (via ETH L1)' },
  { name: 'Base', domain: 6, finality: '~13–19 min (via ETH L1)' },
  { name: 'Polygon PoS', domain: 7, finality: '~75–120 sec' },
  { name: 'Unichain', domain: 10, finality: '~13–19 min (via ETH L1)' },
  { name: 'Linea', domain: 11, finality: '~13–19 min (via ETH L1)' },
  { name: 'Sonic', domain: 13, finality: '~10 sec' },
  { name: 'World Chain', domain: 14, finality: '~13–19 min (via ETH L1)' },
];

interface ConfirmationRow {
  chain: string;
  blocks: string;
  avgTime: string;
  speed: Speed;
}

// Standard Transfer waits for hard finality on the source chain. Fast Transfer
// short-circuits this with finalityThreshold < 1000 (~10–20 s on most chains).
const CONFIRMATIONS: ConfirmationRow[] = [
  { chain: 'Avalanche', blocks: '1', avgTime: '~8 sec', speed: 'Fast' },
  { chain: 'Sonic', blocks: '1', avgTime: '~10 sec', speed: 'Fast' },
  { chain: 'Polygon PoS', blocks: '~33', avgTime: '75–120 sec', speed: 'Medium' },
  { chain: 'Ethereum', blocks: '~65', avgTime: '13–19 min', speed: 'Slow' },
  { chain: 'OP', blocks: '~65 ETH blk', avgTime: '13–19 min', speed: 'Slow' },
  { chain: 'Arbitrum', blocks: '~65 ETH blk', avgTime: '13–19 min', speed: 'Slow' },
  { chain: 'Base', blocks: '~65 ETH blk', avgTime: '13–19 min', speed: 'Slow' },
  { chain: 'Unichain', blocks: '~65 ETH blk', avgTime: '13–19 min', speed: 'Slow' },
  { chain: 'Linea', blocks: '~65 ETH blk', avgTime: '13–19 min', speed: 'Slow' },
];

const SOURCES = {
  chains: 'https://developers.circle.com/cctp/cctp-supported-blockchains',
  domains: 'https://developers.circle.com/cctp/supported-domains',
  contracts: 'https://developers.circle.com/cctp/evm-smart-contracts',
  iris: 'https://developers.circle.com/cctp/technical-guide',
};

// =============================================================================
// Shared bits
// =============================================================================

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onCopy}
      aria-label={copied ? 'Copied' : 'Copy address'}
      className="relative inline-flex items-center justify-center w-7 h-7 rounded-md border border-border bg-input-bg text-fg/60 hover:text-fg hover:border-accent transition-colors shrink-0"
    >
      {copied ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      )}
      {copied && (
        <span className="absolute -top-7 right-0 px-1.5 py-0.5 bg-black border border-border rounded text-[10px] text-green-700 dark:text-green-300 whitespace-nowrap">
          Copied!
        </span>
      )}
    </button>
  );
}

function SourceLink({ href }: { href: string }) {
  return (
    <div className="mt-6 pt-4 border-t border-border">
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="text-sm text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
      >
        Official docs ↗
      </a>
      <div className="mt-1 text-xs text-fg/30 break-all font-mono">{href}</div>
    </div>
  );
}

function SpeedBadge({ speed }: { speed: Speed }) {
  const styles: Record<Speed, string> = {
    Fast: 'bg-green-100 dark:bg-green-950/60 border-green-300 dark:border-green-800 text-green-700 dark:text-green-300',
    Medium: 'bg-yellow-100 dark:bg-yellow-950/60 border-yellow-300 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300',
    Slow: 'bg-red-100 dark:bg-red-950/60 border-red-300 dark:border-red-900 text-red-700 dark:text-red-300',
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs border ${styles[speed]}`}>
      {speed}
    </span>
  );
}

// =============================================================================
// Tab 1 — Supported Chains
// =============================================================================

function SupportedChainsTab() {
  return (
    <div>
      <p className="text-sm text-fg/70 mb-4 leading-relaxed">
        CCTP V2 burns USDC on the source chain and mints native USDC on the destination
        — no wrapped assets, no liquidity pools. Available on EVM chains where Circle has
        deployed the unified V2 contracts.
      </p>

      <div className="mb-6 p-3 bg-blue-100 dark:bg-blue-950/30 border border-blue-300 dark:border-blue-900 rounded-lg text-sm text-blue-800 dark:text-blue-100">
        <span className="font-semibold">This bridge uses CCTP V2 testnet contracts.</span>{' '}
        V2 introduces Fast Transfer (~10–20s) alongside Standard Transfer.
      </div>

      <h3 className="text-xs uppercase tracking-widest text-fg/40 mb-3">
        V2 chains supported by this app (testnet)
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
        {CHAIN_LIST.map((c) => (
          <div key={c.key} className="p-4 bg-panel border border-border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <ChainIcon chain={c} size={20} />
                <span className="text-sm font-semibold text-fg">{c.short}</span>
              </div>
              <span className="text-[10px] text-fg/40 font-mono">D{c.domain}</span>
            </div>
            <div className="text-xs text-fg/50">{c.label}</div>
          </div>
        ))}
      </div>

      <h3 className="text-xs uppercase tracking-widest text-fg/40 mb-3">
        V2 chains by domain (mainnet & testnet share IDs)
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {V2_CHAINS.map((c) => (
          <div
            key={c.name}
            className="p-3 bg-panel border border-border rounded-lg flex flex-col items-center justify-center text-center"
          >
            <div className="text-2xl font-bold text-fg tabular-nums">{c.domain}</div>
            <div className="text-[11px] text-fg/60 mt-0.5">{c.name}</div>
          </div>
        ))}
      </div>

      <SourceLink href={SOURCES.chains} />
    </div>
  );
}

// =============================================================================
// Tab 2 — Domain IDs
// =============================================================================

function DomainIdsTab() {
  return (
    <div>
      <p className="text-sm text-fg/70 mb-5 leading-relaxed">
        A <span className="text-fg">domain</span> is Circle's chain identifier — it's
        different from the EVM chainId. You pass the destination domain as the 2nd argument
        to <code className="px-1 py-0.5 bg-input-bg rounded text-xs font-mono">depositForBurn()</code>.
        Mainnet and testnet share the same domain numbers.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
        {V2_CHAINS.map((c) => (
          <div
            key={c.name}
            className="p-4 bg-panel border border-border rounded-lg flex flex-col items-center justify-center"
          >
            <div className="text-3xl font-bold text-fg tabular-nums">{c.domain}</div>
            <div className="text-xs text-fg/60 mt-1">{c.name}</div>
          </div>
        ))}
      </div>

      <h3 className="text-xs uppercase tracking-widest text-fg/40 mb-2">
        Usage (CCTP V2)
      </h3>
      <pre className="p-4 bg-panel border border-border rounded-lg text-xs leading-relaxed overflow-x-auto mb-4">
        <code className="text-fg/85 font-mono whitespace-pre">{`tokenMessengerV2.depositForBurn(
  amount,                   // uint256
  6,                        // uint32 destinationDomain (Base)
  recipientBytes32,         // bytes32 mintRecipient
  usdcAddress,              // address burnToken
  ZERO_BYTES32,             // bytes32 destinationCaller (0 = permissionless)
  maxFee,                   // uint256 (Fast Transfer fee cap, 0 for Standard)
  1000,                     // uint32 minFinalityThreshold (1000=Fast, 2000=Standard)
);`}</code>
      </pre>

      <div className="p-3 bg-blue-100 dark:bg-blue-950/30 border border-blue-300 dark:border-blue-900 rounded-lg text-sm text-blue-700 dark:text-blue-200">
        <span className="font-semibold">Note:</span> Testnet chains share the same domain
        numbers as mainnet — Sepolia is still domain 0, Base Sepolia is still domain 6, etc.
      </div>

      <SourceLink href={SOURCES.domains} />
    </div>
  );
}

// =============================================================================
// Tab 3 — V2 Contracts
// =============================================================================

const ROLE_CARDS = [
  {
    name: 'TokenMessengerV2',
    role: 'Main entrypoint. Burns USDC on the source chain and emits a message that the destination MessageTransmitter consumes.',
    fns: ['depositForBurn()', 'depositForBurnWithHook()', 'localMinter()'],
  },
  {
    name: 'MessageTransmitterV2',
    role: 'Generic message layer. Verifies Circle attestations and executes mint on destination.',
    fns: ['receiveMessage()', 'usedNonces()', 'sendMessage()'],
  },
  {
    name: 'TokenMinter',
    role: 'Mints/burns USDC on behalf of TokenMessenger. Holds per-token max-burn-per-message limits. Never called directly.',
    fns: ['burnLimitsPerMessage()'],
  },
];

function EvmContractsTab() {
  return (
    <div>
      <h3 className="text-xs uppercase tracking-widest text-fg/40 mb-3">
        What each V2 contract does
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8">
        {ROLE_CARDS.map((c) => (
          <div key={c.name} className="p-4 bg-panel border border-border rounded-lg">
            <div className="text-sm font-semibold text-fg mb-1.5">{c.name}</div>
            <p className="text-xs text-fg/60 leading-relaxed mb-3">{c.role}</p>
            {c.fns.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {c.fns.map((f) => (
                  <span
                    key={f}
                    className="px-1.5 py-0.5 bg-input-bg border border-border rounded text-[10px] font-mono text-fg/70"
                  >
                    {f}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <h3 className="text-xs uppercase tracking-widest text-fg/40 mb-3">
        V2 Testnet — unified across all chains
      </h3>
      <div className="space-y-2 mb-8">
        <UnifiedRow label="TokenMessengerV2" address={TOKEN_MESSENGER_V2} />
        <UnifiedRow label="MessageTransmitterV2" address={MESSAGE_TRANSMITTER_V2} />
      </div>
      <p className="text-xs text-fg/50 mb-8 leading-relaxed">
        Same address on Sepolia, Base Sepolia, Arbitrum Sepolia, OP Sepolia, Avalanche
        Fuji, Polygon Amoy, Unichain Sepolia. Look up TokenMinter at runtime via{' '}
        <code className="px-1 py-0.5 bg-input-bg rounded text-[11px] font-mono">
          TokenMessengerV2.localMinter()
        </code>
        .
      </p>

      <h3 className="text-xs uppercase tracking-widest text-fg/40 mb-3">
        Address → bytes32 conversion
      </h3>
      <div className="p-4 bg-panel border border-border rounded-lg mb-3 text-sm text-fg/70 leading-relaxed">
        To convert an EVM address to{' '}
        <code className="px-1 py-0.5 bg-input-bg rounded text-xs font-mono">bytes32</code> for{' '}
        <code className="px-1 py-0.5 bg-input-bg rounded text-xs font-mono">
          mintRecipient
        </code>
        : prepend 12 zero bytes (24 zero hex chars).
        <div className="mt-2 text-xs font-mono break-all text-fg/60">
          0x1234…abcd → 0x000000000000000000000000<span className="text-fg/90">1234…abcd</span>
        </div>
      </div>
      <pre className="p-4 bg-panel border border-border rounded-lg text-xs leading-relaxed overflow-x-auto">
        <code className="text-fg/85 font-mono whitespace-pre">{`import { pad } from 'viem';

// EVM address → bytes32 padded with 12 leading zero bytes
const mintRecipient = pad('0x1234567890abcdef1234567890abcdef12345678', {
  size: 32,
});
// 0x0000000000000000000000001234567890abcdef1234567890abcdef12345678`}</code>
      </pre>

      <SourceLink href={SOURCES.contracts} />
    </div>
  );
}

function UnifiedRow({ label, address }: { label: string; address: string }) {
  return (
    <div className="p-3 bg-panel border border-border rounded-lg flex items-center gap-3">
      <div className="text-sm font-semibold text-fg shrink-0">{label}</div>
      <div className="flex-1 font-mono text-xs text-fg/80 break-all">{address}</div>
      <CopyButton text={address} />
    </div>
  );
}

// =============================================================================
// Tab 4 — Fast vs Standard
// =============================================================================

function FastStandardTab() {
  return (
    <div>
      <p className="text-sm text-fg/70 mb-5 leading-relaxed">
        CCTP V2 introduced two transfer speeds, gated by{' '}
        <code className="px-1 py-0.5 bg-input-bg rounded text-xs font-mono">
          minFinalityThreshold
        </code>
        . Fast Transfer charges a small on-chain fee in exchange for ~10–20 second
        finality. Standard Transfer is free but waits for hard finality on the source.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
        <div className="p-4 bg-panel border border-border rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <span aria-hidden>⚡</span>
            <span className="text-sm font-semibold text-fg">Fast Transfer</span>
          </div>
          <ul className="text-xs text-fg/70 space-y-1 leading-relaxed">
            <li>
              <code className="px-1 py-0.5 bg-input-bg rounded text-[11px] font-mono">
                minFinalityThreshold = 1000
              </code>
            </li>
            <li>~8–20 seconds end-to-end</li>
            <li>Fee: ~14 bps of amount (live from Circle's fee API)</li>
            <li>Pass non-zero <code className="font-mono text-[11px]">maxFee</code></li>
            <li>Iris attests at "confirmed" level (not finalized)</li>
          </ul>
        </div>

        <div className="p-4 bg-panel border border-border rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <span aria-hidden>🐢</span>
            <span className="text-sm font-semibold text-fg">Standard Transfer</span>
          </div>
          <ul className="text-xs text-fg/70 space-y-1 leading-relaxed">
            <li>
              <code className="px-1 py-0.5 bg-input-bg rounded text-[11px] font-mono">
                minFinalityThreshold = 2000
              </code>
            </li>
            <li>Waits for source-chain hard finality (see table below)</li>
            <li>Fee: free</li>
            <li><code className="font-mono text-[11px]">maxFee = 0</code></li>
            <li>Iris attests at "finalized" level</li>
          </ul>
        </div>
      </div>

      <h3 className="text-xs uppercase tracking-widest text-fg/40 mb-3">
        Standard Transfer wait times by source chain
      </h3>
      <div className="overflow-x-auto bg-panel border border-border rounded-lg mb-5">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-fg/40 border-b border-border">
              <th className="px-4 py-2.5">Chain</th>
              <th className="px-4 py-2.5">Blocks</th>
              <th className="px-4 py-2.5">Avg time</th>
              <th className="px-4 py-2.5">Speed</th>
            </tr>
          </thead>
          <tbody>
            {CONFIRMATIONS.map((r, i) => (
              <tr
                key={r.chain}
                className={i < CONFIRMATIONS.length - 1 ? 'border-b border-border/60' : ''}
              >
                <td className="px-4 py-2.5 text-fg/90">{r.chain}</td>
                <td className="px-4 py-2.5 text-fg/60 font-mono text-xs">{r.blocks}</td>
                <td className="px-4 py-2.5 text-fg/70 tabular-nums">{r.avgTime}</td>
                <td className="px-4 py-2.5">
                  <SpeedBadge speed={r.speed} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="p-4 bg-blue-100 dark:bg-blue-950/30 border border-blue-300 dark:border-blue-900 rounded-lg text-sm text-blue-800 dark:text-blue-100 leading-relaxed mb-3">
        <span className="font-semibold text-blue-700 dark:text-blue-200">Why L2s are slow on Standard:</span>{' '}
        OP-stack rollups (Arbitrum, Base, OP, Unichain, Linea) post batches to Ethereum L1
        and Circle waits for those L1 blocks to finalize before issuing the attestation.
        Use Fast Transfer if you don't want to wait.
      </div>

      <h3 className="text-xs uppercase tracking-widest text-fg/40 mb-3 mt-6">
        Iris API endpoints (free, no key)
      </h3>
      <div className="space-y-2">
        <div className="p-3 bg-panel border border-border rounded-lg">
          <div className="text-[11px] text-fg/50 mb-1">Get attestation for a burn tx</div>
          <code className="text-xs font-mono text-fg/85 break-all">
            GET https://iris-api-sandbox.circle.com/v2/messages/{'{sourceDomain}'}?transactionHash={'{burnTx}'}
          </code>
        </div>
        <div className="p-3 bg-panel border border-border rounded-lg">
          <div className="text-[11px] text-fg/50 mb-1">Live Fast Transfer fee (bps)</div>
          <code className="text-xs font-mono text-fg/85 break-all">
            GET https://iris-api-sandbox.circle.com/v2/burn/USDC/fees/{'{sourceDomain}'}/{'{destDomain}'}
          </code>
        </div>
      </div>
      <p className="mt-2 text-[11px] text-fg/40">
        Mainnet: replace <code className="font-mono">iris-api-sandbox.circle.com</code> with{' '}
        <code className="font-mono">iris-api.circle.com</code>.
      </p>

      <SourceLink href={SOURCES.iris} />
    </div>
  );
}

// =============================================================================
// Page
// =============================================================================

const TABS = [
  { id: 'chains', label: 'Supported Chains', render: () => <SupportedChainsTab /> },
  { id: 'domains', label: 'Domain IDs', render: () => <DomainIdsTab /> },
  { id: 'contracts', label: 'V2 Contracts', render: () => <EvmContractsTab /> },
  { id: 'fast', label: 'Fast vs Standard', render: () => <FastStandardTab /> },
];

export function Docs() {
  const [active, setActive] = useState(TABS[0].id);
  const current = TABS.find((t) => t.id === active) ?? TABS[0];

  return (
    <div>
      <a
        href="https://developers.circle.com/crosschain-transfers"
        target="_blank"
        rel="noreferrer"
        className="group mb-5 flex items-center gap-3 p-4 bg-blue-50 dark:bg-gradient-to-r dark:from-blue-950/60 dark:to-panel border border-blue-300 dark:border-blue-800 rounded-xl hover:border-blue-500 dark:hover:border-blue-600 transition-colors"
      >
        <span
          aria-hidden
          className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-600/20 border border-blue-400 dark:border-blue-700 text-blue-700 dark:text-blue-300 shrink-0"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14 4h6v6" />
            <path d="M10 14L20 4" />
            <path d="M19 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6" />
          </svg>
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-blue-800 dark:text-blue-100 group-hover:text-fg">
            Official Circle CCTP docs
          </div>
          <div className="text-xs text-blue-700 dark:text-blue-200/70 truncate">
            developers.circle.com/crosschain-transfers
          </div>
        </div>
        <span className="text-blue-700 dark:text-blue-300 group-hover:text-fg text-sm shrink-0">↗</span>
      </a>

      <div className="mb-6 flex flex-wrap gap-2">
        {TABS.map((t) => {
          const isActive = t.id === active;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActive(t.id)}
              className={[
                'px-4 py-2 rounded-lg text-sm font-medium border transition-colors',
                isActive
                  ? 'bg-panel border-border text-fg'
                  : 'bg-transparent border-border/60 text-fg/50 hover:text-fg/80',
              ].join(' ')}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="max-h-[calc(100vh-260px)] overflow-y-auto pr-1">{current.render()}</div>
    </div>
  );
}
