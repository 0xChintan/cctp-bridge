import { useCallback, useEffect, useRef, useState } from 'react';
import { useAccount, usePublicClient, useWalletClient, useSwitchChain } from 'wagmi';
import { createPublicClient, http } from 'viem';
import { erc20Abi, messageTransmitterV2Abi, tokenMessengerV2Abi } from '../lib/abis';
import {
  TOKEN_MESSENGER_V2,
  MESSAGE_TRANSMITTER_V2,
  FINALITY_FAST,
  FINALITY_STANDARD,
  CCTP_CHAINS,
  CHAIN_LIST,
  decodeDestinationDomain,
  type CctpChain,
} from '../lib/cctp';
import { addressToBytes32 } from '../lib/format';
import { pollAttestation, type IrisMessage } from '../lib/attestation';
import { computeMaxFee } from '../lib/feeApi';
import {
  clearPending,
  loadPending,
  savePending,
  type PendingTransfer,
} from '../lib/persistence';
import { addEntry, findEntryIdByBurnTx, generateId, updateEntry } from '../lib/history';
import { humanizeError } from '../lib/errorMessages';
import type { Address, Hex, PublicClient } from 'viem';

export type Step = 'idle' | 'approve' | 'burn' | 'attest' | 'mint' | 'done' | 'error';

export interface BridgeState {
  step: Step;
  approveTx?: Hex;
  burnTx?: Hex;
  mintTx?: Hex;
  attestation?: IrisMessage;
  error?: string;
  alreadyMinted?: boolean;
}

export interface BridgeArgs {
  source: CctpChain;
  destination: CctpChain;
  amount: bigint;
  speed: 'fast' | 'standard';
}

const ZERO_BYTES32 = ('0x' + '0'.repeat(64)) as Hex;

export function useBridge() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { switchChainAsync } = useSwitchChain();
  const [state, setState] = useState<BridgeState>({ step: 'idle' });
  const [pending, setPending] = useState<PendingTransfer | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  // Tracks the history-table row currently being updated. Set when we add a row
  // (on burn-broadcast for run/resume, on claim start) and cleared on done/fail.
  const historyIdRef = useRef<string | null>(null);

  // Keep `pending` in sync with whatever is in storage for the current account.
  useEffect(() => {
    const p = loadPending();
    if (!address) {
      setPending(null);
      return;
    }
    if (p && p.address.toLowerCase() === address.toLowerCase()) {
      setPending(p);
    } else {
      setPending(null);
    }
  }, [address]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setState({ step: 'idle' });
  }, []);

  const discard = useCallback(() => {
    clearPending();
    setPending(null);
    reset();
  }, [reset]);

  // Drive the post-burn portion of the flow. Used both by `run` (after burn
  // is broadcast) and `resume` (replaying a persisted burn that may still be
  // unconfirmed if the user refreshed mid-flight).
  const completeFromBurn = useCallback(
    async (params: {
      burnTx: Hex;
      source: CctpChain;
      destination: CctpChain;
      amount: bigint;
      speed: 'fast' | 'standard';
      account: Address;
      controller: AbortController;
    }) => {
      const { burnTx, source, destination, account, speed, controller } = params;

      // Make sure the burn tx is mined before we start polling Iris — Iris
      // returns nothing for an unconfirmed tx. Clear any transient state from
      // a prior failed attempt so a retry doesn't carry over a stale error.
      setState((s) => ({
        ...s,
        step: 'burn',
        burnTx,
        mintTx: undefined,
        attestation: undefined,
        error: undefined,
        alreadyMinted: undefined,
      }));
      const sourcePublicClient = await getPublicClientForChain(publicClient, source);
      await sourcePublicClient.waitForTransactionReceipt({ hash: burnTx });

      setState((s) => ({ ...s, step: 'attest', burnTx }));
      if (historyIdRef.current) {
        updateEntry(historyIdRef.current, { status: 'attesting', error: undefined });
      }

      const attestation = await pollAttestation(source.domain, burnTx, {
        signal: controller.signal,
        intervalMs: speed === 'fast' ? 3000 : 5000,
      });

      setState((s) => ({ ...s, step: 'mint', attestation }));
      if (historyIdRef.current) {
        updateEntry(historyIdRef.current, { status: 'minting' });
      }

      if (!walletClient) throw new Error('Wallet disconnected');
      if (walletClient.chain.id !== destination.chain.id) {
        await switchChainAsync({ chainId: destination.chain.id });
      }
      const destPublicClient = await getPublicClientForChain(publicClient, destination);

      const alreadyMinted = await isMessageAlreadyReceived(
        destPublicClient,
        attestation.message,
        attestation.attestation,
        account,
      );
      if (alreadyMinted) {
        setState((s) => ({ ...s, step: 'done', alreadyMinted: true }));
        if (historyIdRef.current) {
          updateEntry(historyIdRef.current, {
            status: 'already_minted',
            completedAt: Date.now(),
          });
          historyIdRef.current = null;
        }
        clearPending();
        setPending(null);
        return;
      }

      const mintTx = await retryWriteContract(() =>
        walletClient.writeContract({
          address: MESSAGE_TRANSMITTER_V2,
          abi: messageTransmitterV2Abi,
          functionName: 'receiveMessage',
          args: [attestation.message, attestation.attestation],
          chain: destination.chain,
          account,
        }),
      );
      await destPublicClient.waitForTransactionReceipt({ hash: mintTx });

      setState((s) => ({ ...s, step: 'done', mintTx }));
      if (historyIdRef.current) {
        updateEntry(historyIdRef.current, {
          status: 'completed',
          mintTx,
          completedAt: Date.now(),
        });
        historyIdRef.current = null;
      }
      clearPending();
      setPending(null);
    },
    [walletClient, switchChainAsync, publicClient],
  );

  const run = useCallback(
    async ({ source, destination, amount, speed }: BridgeArgs) => {
      if (!address || !walletClient || !publicClient) {
        setState({ step: 'error', error: 'Connect a wallet first' });
        return;
      }
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        if (walletClient.chain.id !== source.chain.id) {
          await switchChainAsync({ chainId: source.chain.id });
        }
        const sourcePublicClient = await getPublicClientForChain(publicClient, source);

        const allowance = (await sourcePublicClient.readContract({
          address: source.usdc,
          abi: erc20Abi,
          functionName: 'allowance',
          args: [address, TOKEN_MESSENGER_V2],
        })) as bigint;

        let approveTx: Hex | undefined;
        if (allowance < amount) {
          setState({ step: 'approve' });
          approveTx = await walletClient.writeContract({
            address: source.usdc,
            abi: erc20Abi,
            functionName: 'approve',
            args: [TOKEN_MESSENGER_V2, amount],
            chain: source.chain,
            account: address,
          });
          await sourcePublicClient.waitForTransactionReceipt({ hash: approveTx });
        }

        setState((s) => ({ ...s, step: 'burn', approveTx }));
        const minFinalityThreshold = speed === 'fast' ? FINALITY_FAST : FINALITY_STANDARD;
        const maxFee =
          speed === 'fast'
            ? await computeMaxFee(amount, source.domain, destination.domain, minFinalityThreshold)
            : 0n;

        const burnTx = await walletClient.writeContract({
          address: TOKEN_MESSENGER_V2,
          abi: tokenMessengerV2Abi,
          functionName: 'depositForBurn',
          args: [
            amount,
            destination.domain,
            addressToBytes32(address),
            source.usdc,
            ZERO_BYTES32,
            maxFee,
            minFinalityThreshold,
          ],
          chain: source.chain,
          account: address,
        });

        // Persist the moment the wallet hands us a tx hash — even before
        // confirmation. A refresh while the burn is still in mempool can now resume.
        const persisted: Omit<PendingTransfer, 'v'> = {
          address,
          sourceKey: source.key,
          destinationKey: destination.key,
          burnTx,
          amount: amount.toString(),
          speed,
          startedAt: Date.now(),
        };
        savePending(persisted);
        setPending({ v: 1, ...persisted });

        // Record this transfer in history. Updates flow through completeFromBurn.
        const historyId = generateId();
        historyIdRef.current = historyId;
        addEntry({
          id: historyId,
          address,
          sourceKey: source.key,
          destinationKey: destination.key,
          amount: amount.toString(),
          speed,
          burnTx,
          status: 'pending',
          startedAt: Date.now(),
        });

        await completeFromBurn({
          burnTx,
          source,
          destination,
          amount,
          speed,
          account: address,
          controller,
        });
      } catch (err) {
        console.error('[bridge] run failed:', err);
        const short = humanizeError(err);
        setState((s) => ({ ...s, step: 'error', error: short }));
        if (historyIdRef.current) {
          updateEntry(historyIdRef.current, { status: 'failed', error: short });
          historyIdRef.current = null;
        }
      }
    },
    [address, publicClient, walletClient, switchChainAsync, completeFromBurn],
  );

  const resume = useCallback(async () => {
    const p = loadPending();
    if (!p) return;
    if (!address || !walletClient || !publicClient) {
      setState({ step: 'error', error: 'Connect a wallet to resume' });
      return;
    }
    if (p.address.toLowerCase() !== address.toLowerCase()) {
      setState({
        step: 'error',
        error: 'Pending bridge belongs to a different address. Discard or switch wallet.',
      });
      return;
    }

    const source = CCTP_CHAINS[p.sourceKey];
    const destination = CCTP_CHAINS[p.destinationKey];
    if (!source || !destination) {
      clearPending();
      setPending(null);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    // Find the existing history row for this burn tx (so we update, not duplicate).
    if (!historyIdRef.current) {
      historyIdRef.current = findEntryIdByBurnTx(address, p.burnTx);
    }

    try {
      await completeFromBurn({
        burnTx: p.burnTx,
        source,
        destination,
        amount: BigInt(p.amount),
        speed: p.speed,
        account: address,
        controller,
      });
    } catch (err) {
      console.error('[bridge] resume failed:', err);
      const short = humanizeError(err);
      setState((s) => ({ ...s, step: 'error', error: short }));
      if (historyIdRef.current) {
        updateEntry(historyIdRef.current, { status: 'failed', error: short });
      }
    }
  }, [address, publicClient, walletClient, completeFromBurn]);

  // Manually claim a past burn the user pastes in. The user only knows the
  // burn tx hash and which chain they burned on; we discover the destination
  // by decoding the message Iris hands back. This covers the case where the
  // pending record was lost (different browser, cleared storage, another tool).
  const claim = useCallback(
    async (source: CctpChain, burnTx: Hex) => {
      if (!address || !walletClient || !publicClient) {
        setState({ step: 'error', error: 'Connect a wallet first' });
        return;
      }
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      // Adopt an existing history row for this burnTx if one exists, otherwise
      // we'll create a new one once we know the destination.
      const existingHistoryId = findEntryIdByBurnTx(address, burnTx);
      historyIdRef.current = existingHistoryId;

      try {
        setState({ step: 'attest', burnTx });

        const attestation = await pollAttestation(source.domain, burnTx, {
          signal: controller.signal,
          intervalMs: 5000,
        });

        const destDomain = decodeDestinationDomain(attestation.message);
        const destination = CHAIN_LIST.find((c) => c.domain === destDomain);
        if (!destination) {
          throw new Error(
            `Destination domain ${destDomain} is not configured in this app.`,
          );
        }

        // First-time claim → create history row now that we know dst.
        if (!historyIdRef.current) {
          const id = generateId();
          historyIdRef.current = id;
          addEntry({
            id,
            address,
            sourceKey: source.key,
            destinationKey: destination.key,
            amount: '0', // unknown without reading the message body
            speed: 'fast',
            burnTx,
            status: 'attesting',
            startedAt: Date.now(),
          });
        }

        // Persist so a refresh during mint still resumes.
        const persisted: Omit<PendingTransfer, 'v'> = {
          address,
          sourceKey: source.key,
          destinationKey: destination.key,
          burnTx,
          amount: '0',
          speed: 'fast',
          startedAt: Date.now(),
        };
        savePending(persisted);
        setPending({ v: 1, ...persisted });

        setState((s) => ({ ...s, step: 'mint', attestation, error: undefined }));
        if (historyIdRef.current) {
          updateEntry(historyIdRef.current, { status: 'minting', error: undefined });
        }

        if (walletClient.chain.id !== destination.chain.id) {
          await switchChainAsync({ chainId: destination.chain.id });
        }
        const destPublicClient = await getPublicClientForChain(publicClient, destination);

        const alreadyMinted = await isMessageAlreadyReceived(
          destPublicClient,
          attestation.message,
          attestation.attestation,
          address,
        );
        if (alreadyMinted) {
          setState((s) => ({ ...s, step: 'done', alreadyMinted: true }));
          if (historyIdRef.current) {
            updateEntry(historyIdRef.current, {
              status: 'already_minted',
              completedAt: Date.now(),
            });
            historyIdRef.current = null;
          }
          clearPending();
          setPending(null);
          return;
        }

        const mintTx = await retryWriteContract(() =>
          walletClient.writeContract({
            address: MESSAGE_TRANSMITTER_V2,
            abi: messageTransmitterV2Abi,
            functionName: 'receiveMessage',
            args: [attestation.message, attestation.attestation],
            chain: destination.chain,
            account: address,
          }),
        );
        await destPublicClient.waitForTransactionReceipt({ hash: mintTx });

        setState((s) => ({ ...s, step: 'done', mintTx }));
        if (historyIdRef.current) {
          updateEntry(historyIdRef.current, {
            status: 'completed',
            mintTx,
            completedAt: Date.now(),
          });
          historyIdRef.current = null;
        }
        clearPending();
        setPending(null);
      } catch (err) {
        console.error('[bridge] claim failed:', err);
        const short = humanizeError(err);
        setState((s) => ({ ...s, step: 'error', error: short }));
        if (historyIdRef.current) {
          updateEntry(historyIdRef.current, { status: 'failed', error: short });
        }
      }
    },
    [address, publicClient, walletClient, switchChainAsync],
  );

  return { state, run, reset, pending, resume, discard, claim };
}

async function getPublicClientForChain(
  defaultClient: ReturnType<typeof usePublicClient>,
  chain: CctpChain,
): Promise<PublicClient> {
  if (defaultClient && defaultClient.chain?.id === chain.chain.id) {
    return defaultClient as PublicClient;
  }
  return createPublicClient({ chain: chain.chain, transport: http() });
}

async function isMessageAlreadyReceived(
  client: PublicClient,
  message: Hex,
  attestation: Hex,
  account: Hex,
): Promise<boolean> {
  try {
    await client.simulateContract({
      address: MESSAGE_TRANSMITTER_V2,
      abi: messageTransmitterV2Abi,
      functionName: 'receiveMessage',
      args: [message, attestation],
      account,
    });
    return false;
  } catch (err) {
    const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
    if (msg.includes('nonce already used') || msg.includes('already used')) return true;
    return false;
  }
}

async function retryWriteContract(fn: () => Promise<Hex>): Promise<Hex> {
  let lastErr: unknown;
  for (let i = 0; i < 3; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const message = (err instanceof Error ? err.message : String(err)).toLowerCase();
      if (message.includes('user rejected') || message.includes('user denied')) throw err;
      await new Promise((r) => setTimeout(r, 2000 * (i + 1)));
    }
  }
  throw lastErr;
}
