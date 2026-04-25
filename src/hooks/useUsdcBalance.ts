import { useReadContract } from 'wagmi';
import { erc20Abi } from '../lib/abis';
import type { CctpChain } from '../lib/cctp';

export function useUsdcBalance(chain: CctpChain, address?: `0x${string}`) {
  return useReadContract({
    chainId: chain.chain.id,
    address: chain.usdc,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: Boolean(address),
      refetchInterval: 15_000,
    },
  });
}
