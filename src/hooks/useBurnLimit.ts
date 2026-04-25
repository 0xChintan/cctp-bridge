import { useEffect, useState } from 'react';
import { createPublicClient, http } from 'viem';
import { tokenMessengerV2Abi, tokenMinterV2Abi } from '../lib/abis';
import { TOKEN_MESSENGER_V2, type CctpChain } from '../lib/cctp';

interface BurnLimit {
  limit: bigint | null;
  loading: boolean;
}

// Reads TokenMessengerV2.localMinter() then TokenMinter.burnLimitsPerMessage(USDC).
// Returns 0n if there is no per-message cap configured.
export function useBurnLimit(chain: CctpChain): BurnLimit {
  const [limit, setLimit] = useState<bigint | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLimit(null);

    (async () => {
      try {
        const client = createPublicClient({ chain: chain.chain, transport: http() });
        const minter = await client.readContract({
          address: TOKEN_MESSENGER_V2,
          abi: tokenMessengerV2Abi,
          functionName: 'localMinter',
        });
        const max = (await client.readContract({
          address: minter,
          abi: tokenMinterV2Abi,
          functionName: 'burnLimitsPerMessage',
          args: [chain.usdc],
        })) as bigint;
        if (!cancelled) setLimit(max);
      } catch {
        if (!cancelled) setLimit(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [chain.key, chain.chain.id, chain.usdc]);

  return { limit, loading };
}
