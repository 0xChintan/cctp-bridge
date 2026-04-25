import { useEffect, useMemo, useState } from 'react';
import { useAccount } from 'wagmi';
import { CCTP_CHAINS, FINALITY_FAST, type CctpChainKey } from '../lib/cctp';
import { useBridge } from '../hooks/useBridge';
import { useUsdcBalance } from '../hooks/useUsdcBalance';
import { useBurnLimit } from '../hooks/useBurnLimit';
import { previewFee } from '../lib/feeApi';
import { formatUsdc, parseUsdc } from '../lib/format';
import { ChainSelect } from './ChainSelect';
import { ProgressTracker } from './ProgressTracker';
import { HelpPanel } from './HelpPanel';
import { ManualClaim } from './ManualClaim';
import { HistoryTable } from './HistoryTable';

type Speed = 'fast' | 'standard';

export function Bridge() {
  const { address, isConnected } = useAccount();
  const [from, setFrom] = useState<CctpChainKey>('sepolia');
  const [to, setTo] = useState<CctpChainKey>('baseSepolia');
  const [amount, setAmount] = useState('');
  const [speed, setSpeed] = useState<Speed>('fast');
  const [liveFee, setLiveFee] = useState<bigint | null>(null);
  const [feeLoading, setFeeLoading] = useState(false);

  const source = CCTP_CHAINS[from];
  const destination = CCTP_CHAINS[to];

  const { data: balance } = useUsdcBalance(source, address);
  const { limit: burnLimit } = useBurnLimit(source);
  const { state, run, reset, pending, resume, discard, claim } = useBridge();

  const amountWei = useMemo(() => {
    try {
      return parseUsdc(amount);
    } catch {
      return 0n;
    }
  }, [amount]);

  useEffect(() => {
    if (speed !== 'fast' || amountWei <= 0n) {
      setLiveFee(null);
      return;
    }
    let cancelled = false;
    setFeeLoading(true);
    const t = setTimeout(async () => {
      const f = await previewFee(amountWei, source.domain, destination.domain, FINALITY_FAST);
      if (!cancelled) {
        setLiveFee(f);
        setFeeLoading(false);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
      setFeeLoading(false);
    };
  }, [amountWei, speed, source.domain, destination.domain]);

  const inFlight =
    state.step !== 'idle' && state.step !== 'done' && state.step !== 'error';

  const fee = speed === 'fast' ? liveFee ?? 0n : 0n;
  const youReceive = amountWei > fee ? amountWei - fee : 0n;
  const exceedsBurnLimit =
    burnLimit != null && burnLimit > 0n && amountWei > burnLimit;

  const handleFlip = () => {
    setFrom(to);
    setTo(from);
  };
  const handleFromChange = (k: CctpChainKey) => {
    if (k === to) setTo(from);
    setFrom(k);
  };
  const handleToChange = (k: CctpChainKey) => {
    if (k === from) setFrom(to);
    setTo(k);
  };
  const handleBridge = () => {
    if (!isConnected || amountWei <= 0n || exceedsBurnLimit) return;
    run({ source, destination, amount: amountWei, speed });
  };
  const handleMax = () => {
    if (!balance) return;
    const cap = burnLimit && burnLimit > 0n && burnLimit < balance ? burnLimit : balance;
    setAmount(formatUsdc(cap));
  };

  const isError = state.step === 'error';
  const canResumeAfterError = isError && pending != null;

  const buttonLabel = (() => {
    if (state.step === 'approve') return 'Approving USDC…';
    if (state.step === 'burn') return 'Burning on source…';
    if (state.step === 'attest') return 'Waiting for attestation…';
    if (state.step === 'mint') return 'Minting on destination…';
    if (state.step === 'done') return 'Bridge again';
    if (canResumeAfterError) return 'Retry from last step';
    if (isError) return 'Start over';
    if (!isConnected) return 'Connect wallet to bridge';
    if (amountWei <= 0n) return 'Enter an amount';
    if (balance != null && amountWei > balance) return 'Insufficient USDC';
    if (exceedsBurnLimit) return 'Exceeds CCTP burn limit';
    return 'Bridge';
  })();

  const buttonDisabled = (() => {
    if (state.step === 'done') return false;
    if (isError) {
      // Need a wallet to retry a resume; "Start over" is always clickable.
      return canResumeAfterError && !isConnected;
    }
    if (!isConnected) return true;
    if (inFlight) return true;
    if (amountWei <= 0n) return true;
    if (exceedsBurnLimit) return true;
    if (balance != null && amountWei > balance) return true;
    return false;
  })();

  const onClickButton = () => {
    if (state.step === 'done') {
      reset();
      return;
    }
    if (isError) {
      // If we have a pending burn, jump straight back into the resume flow
      // instead of forcing the user through a "reset → resume banner" two-step.
      if (canResumeAfterError) {
        resume();
      } else {
        reset();
      }
      return;
    }
    handleBridge();
  };

  const feeDisplay = (() => {
    if (speed === 'standard') return 'Free';
    if (amountWei <= 0n) return '—';
    if (feeLoading) return 'Fetching…';
    if (liveFee == null) return '—';
    return `${formatUsdc(liveFee)} USDC`;
  })();

  const showResumeBanner = pending != null && state.step === 'idle';
  const hasStatus = state.step !== 'idle';

  return (
    <div className="max-w-3xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr),280px] gap-4 items-start">
        {/* Form */}
        <div className="p-4 bg-panel border border-border rounded-xl">
          <h2 className="text-base font-semibold text-fg mb-4">USDC Bridge</h2>

          <label className="block text-xs text-fg/50 mb-1">From</label>
          <ChainSelect value={from} exclude={to} onChange={handleFromChange} />

          <div className="flex justify-center my-1.5">
            <button
              type="button"
              onClick={handleFlip}
              className="w-7 h-7 bg-input-bg border border-border rounded-md text-fg/70 hover:text-fg hover:border-accent transition-colors flex items-center justify-center text-sm"
              aria-label="Swap chains"
            >
              ⇅
            </button>
          </div>

          <label className="block text-xs text-fg/50 mb-1">To</label>
          <ChainSelect value={to} exclude={from} onChange={handleToChange} />

          <div className="flex justify-between items-end mt-4 mb-1">
            <label className="text-xs text-fg/50">Amount</label>
            <span className="text-xs text-fg/50">
              Balance: {balance != null ? formatUsdc(balance) : '—'} USDC
            </span>
          </div>
          <div className="flex gap-1.5">
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
              placeholder="0.00"
              disabled={inFlight}
              className="flex-1 px-3 py-2 bg-input-bg border border-border rounded-md text-fg text-base focus:outline-none focus:border-accent disabled:opacity-50"
            />
            <button
              type="button"
              onClick={handleMax}
              disabled={!balance}
              className="px-2.5 bg-input-bg border border-border rounded-md text-xs text-fg/70 hover:text-fg disabled:opacity-40"
            >
              MAX
            </button>
            <span className="px-2.5 flex items-center bg-input-bg border border-border rounded-md text-xs text-fg/70">
              USDC
            </span>
          </div>
          {burnLimit != null && burnLimit > 0n && (
            <div className="mt-1 text-[11px] text-fg/40">
              Max per transfer:{' '}
              <span className={exceedsBurnLimit ? 'text-red-600 dark:text-red-400' : 'text-fg/60'}>
                {formatUsdc(burnLimit)} USDC
              </span>
            </div>
          )}

          <div className="mt-4">
            <label className="block text-xs text-fg/50 mb-1.5">Transfer Speed</label>
            <div className="grid grid-cols-2 gap-1.5">
              <SpeedOption
                active={speed === 'fast'}
                icon="⚡"
                title="Fast"
                sub="~8–20s"
                meta="Small fee"
                onClick={() => setSpeed('fast')}
              />
              <SpeedOption
                active={speed === 'standard'}
                icon="🐢"
                title="Standard"
                sub="~15–19m"
                meta="Free"
                onClick={() => setSpeed('standard')}
              />
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-border space-y-1.5 text-xs">
            <Row label="Protocol" value="CCTP V2" />
            <Row
              label="You receive"
              value={youReceive > 0n ? `${formatUsdc(youReceive)} USDC` : '—'}
            />
            <Row label="Gas (est.)" value={`${source.short} gas`} />
            <Row label="Bridge fee" value={feeDisplay} />
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={onClickButton}
              disabled={buttonDisabled}
              className={[
                'flex-1 py-2.5 rounded-md border text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
                canResumeAfterError
                  ? 'border-blue-400 dark:border-blue-700 bg-blue-600 hover:bg-blue-500 text-white'
                  : 'border-border bg-input-bg hover:bg-input-bg/90 text-fg',
              ].join(' ')}
            >
              {buttonLabel}
            </button>
            {canResumeAfterError && (
              <button
                type="button"
                onClick={discard}
                className="px-3 py-2.5 rounded-md border border-border text-fg/70 hover:text-fg hover:bg-input-bg text-sm"
                title="Forget this transfer and start fresh"
              >
                Discard
              </button>
            )}
          </div>
        </div>

        {/* Status / Progress panel */}
        <div className="p-4 bg-panel border border-border rounded-xl lg:sticky lg:top-4">
          <h3 className="text-xs uppercase tracking-widest text-fg/40 mb-3">Status</h3>

          {!hasStatus && (
            <div className="text-xs text-fg/40 leading-relaxed">
              Configure a transfer and hit <span className="text-fg/60">Bridge</span> to see
              live progress here.
            </div>
          )}

          {hasStatus && (
            <ProgressTracker
              step={state.step}
              source={source}
              destination={destination}
              approveTx={state.approveTx}
              burnTx={state.burnTx}
              mintTx={state.mintTx}
              error={state.error}
            />
          )}

          {state.step === 'done' && state.alreadyMinted && (
            <div className="mt-3 p-2.5 bg-blue-100 dark:bg-blue-950/40 border border-blue-300 dark:border-blue-900 rounded text-xs text-blue-700 dark:text-blue-200 leading-relaxed">
              ℹ️ Already minted on {destination.label} from another tool.
            </div>
          )}

          {state.step === 'done' && !state.alreadyMinted && (
            <div className="mt-3 p-2.5 bg-green-100 dark:bg-green-950/40 border border-green-300 dark:border-green-900 rounded text-xs text-green-700 dark:text-green-300 leading-relaxed">
              ✅ Bridged {formatUsdc(amountWei)} USDC to {destination.label}.
            </div>
          )}
        </div>
      </div>

      {showResumeBanner && pending && (
        <div className="mt-4 p-4 bg-blue-100 dark:bg-blue-950/40 border border-blue-300 dark:border-blue-900 rounded-xl">
          <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
            <div>
              <div className="text-sm font-semibold text-blue-700 dark:text-blue-200 mb-0.5">
                Pending bridge — resume when ready
              </div>
              <div className="text-xs text-blue-800/80 dark:text-blue-100/80">
                {pending.amount !== '0'
                  ? `${formatUsdc(BigInt(pending.amount))} USDC · `
                  : ''}
                {CCTP_CHAINS[pending.sourceKey].short} →{' '}
                {CCTP_CHAINS[pending.destinationKey].short} ·{' '}
                {pending.speed === 'fast' ? 'Fast' : 'Standard'}
              </div>
              <div className="text-[11px] text-blue-700/50 dark:text-blue-100/50 mt-0.5">
                Started {formatRelative(pending.startedAt)} · burn{' '}
                <a
                  href={`${CCTP_CHAINS[pending.sourceKey].explorer}/tx/${pending.burnTx}`}
                  target="_blank"
                  rel="noreferrer"
                  className="underline hover:text-blue-700 dark:hover:text-blue-300 font-mono"
                >
                  {pending.burnTx.slice(0, 10)}…
                </a>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={resume}
                disabled={!isConnected || inFlight}
                className="px-4 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium"
              >
                {!isConnected ? 'Connect wallet' : inFlight ? 'Busy…' : 'Resume'}
              </button>
              <button
                type="button"
                onClick={discard}
                className="px-3 py-1.5 rounded-md border border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-200 hover:bg-blue-50 dark:hover:bg-blue-950 text-sm"
              >
                Discard
              </button>
            </div>
          </div>
          <div className="text-[11px] text-blue-700/50 dark:text-blue-100/40 leading-relaxed">
            You can start a fresh transfer above and come back to resume this one later — it'll
            stay here until you Resume or Discard.
          </div>
        </div>
      )}

      <HistoryTable />
      <HelpPanel source={source} destination={destination} speed={speed} />
      <ManualClaim
        busy={inFlight}
        onClaim={(sourceKey, burnTx) => claim(CCTP_CHAINS[sourceKey], burnTx)}
      />
    </div>
  );
}

function formatRelative(timestamp: number): string {
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-fg/70">
      <span>{label}</span>
      <span className="text-fg">{value}</span>
    </div>
  );
}

function SpeedOption({
  active,
  icon,
  title,
  sub,
  meta,
  onClick,
}: {
  active: boolean;
  icon: string;
  title: string;
  sub: string;
  meta: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'p-2 rounded-md border text-left transition-colors',
        active
          ? 'bg-blue-100 dark:bg-blue-950/50 border-blue-400 dark:border-blue-700 text-white dark:text-fg'
          : 'bg-input-bg/70 border-border text-fg/70 hover:border-fg/30',
      ].join(' ')}
    >
      <div className="text-xs font-medium mb-0.5">
        <span className="mr-1">{icon}</span>
        {title}
      </div>
      <div className="text-[11px] text-fg/60">{sub}</div>
      <div className={`text-[11px] ${active ? 'text-blue-700 dark:text-blue-300' : 'text-fg/50'}`}>{meta}</div>
    </button>
  );
}
