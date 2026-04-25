import {
  sepolia,
  baseSepolia,
  arbitrumSepolia,
  avalancheFuji,
  optimismSepolia,
  polygonAmoy,
  unichainSepolia,
} from 'wagmi/chains';
import type { Chain } from 'viem';

// CCTP V2 testnet contracts — addresses are unified across EVM testnets.
// Source: https://developers.circle.com/cctp/evm-smart-contracts
export const TOKEN_MESSENGER_V2 = '0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA' as const;
export const MESSAGE_TRANSMITTER_V2 = '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275' as const;

export const IRIS_API = 'https://iris-api-sandbox.circle.com';

export type CctpChainKey =
  | 'sepolia'
  | 'avalancheFuji'
  | 'opSepolia'
  | 'arbitrumSepolia'
  | 'baseSepolia'
  | 'polygonAmoy'
  | 'unichainSepolia';

export interface CctpChain {
  key: CctpChainKey;
  chain: Chain;
  label: string;
  short: string;
  domain: number;
  usdc: `0x${string}`;
  explorer: string;
  /** Brand color for the fallback letter avatar. */
  color: string;
  /** Two-letter abbreviation for the fallback avatar. */
  abbr: string;
  /** DefiLlama chain-icon CDN slug. */
  iconSlug: string;
  /** Native-gas faucet URL for this testnet. */
  gasFaucet: string;
  /** Native gas symbol (ETH, AVAX, POL…). */
  gasSymbol: string;
}

export const USDC_FAUCET = 'https://faucet.circle.com';

export const CCTP_CHAINS: Record<CctpChainKey, CctpChain> = {
  sepolia: {
    key: 'sepolia',
    chain: sepolia,
    label: 'Ethereum Sepolia',
    short: 'Sepolia',
    domain: 0,
    usdc: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    explorer: 'https://sepolia.etherscan.io',
    color: '#627EEA',
    abbr: 'ETH',
    iconSlug: 'ethereum',
    gasFaucet: 'https://www.alchemy.com/faucets/ethereum-sepolia',
    gasSymbol: 'ETH',
  },
  avalancheFuji: {
    key: 'avalancheFuji',
    chain: avalancheFuji,
    label: 'Avalanche Fuji',
    short: 'Fuji',
    domain: 1,
    usdc: '0x5425890298aed601595a70AB815c96711a31Bc65',
    explorer: 'https://testnet.snowtrace.io',
    color: '#E84142',
    abbr: 'AVAX',
    iconSlug: 'avalanche',
    gasFaucet: 'https://core.app/tools/testnet-faucet',
    gasSymbol: 'AVAX',
  },
  opSepolia: {
    key: 'opSepolia',
    chain: optimismSepolia,
    label: 'OP Sepolia',
    short: 'OP',
    domain: 2,
    usdc: '0x5fd84259d66Cd46123540766Be93DFE6D43130D7',
    explorer: 'https://sepolia-optimism.etherscan.io',
    color: '#FF0420',
    abbr: 'OP',
    iconSlug: 'optimism',
    gasFaucet: 'https://www.alchemy.com/faucets/optimism-sepolia',
    gasSymbol: 'ETH',
  },
  arbitrumSepolia: {
    key: 'arbitrumSepolia',
    chain: arbitrumSepolia,
    label: 'Arbitrum Sepolia',
    short: 'Arb Sepolia',
    domain: 3,
    usdc: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
    explorer: 'https://sepolia.arbiscan.io',
    color: '#28A0F0',
    abbr: 'ARB',
    iconSlug: 'arbitrum',
    gasFaucet: 'https://www.alchemy.com/faucets/arbitrum-sepolia',
    gasSymbol: 'ETH',
  },
  baseSepolia: {
    key: 'baseSepolia',
    chain: baseSepolia,
    label: 'Base Sepolia',
    short: 'Base Sepolia',
    domain: 6,
    usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    explorer: 'https://sepolia.basescan.org',
    color: '#0052FF',
    abbr: 'BASE',
    iconSlug: 'base',
    gasFaucet: 'https://www.alchemy.com/faucets/base-sepolia',
    gasSymbol: 'ETH',
  },
  polygonAmoy: {
    key: 'polygonAmoy',
    chain: polygonAmoy,
    label: 'Polygon Amoy',
    short: 'Amoy',
    domain: 7,
    usdc: '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582',
    explorer: 'https://amoy.polygonscan.com',
    color: '#8247E5',
    abbr: 'POL',
    iconSlug: 'polygon',
    gasFaucet: 'https://faucet.polygon.technology',
    gasSymbol: 'POL',
  },
  unichainSepolia: {
    key: 'unichainSepolia',
    chain: unichainSepolia,
    label: 'Unichain Sepolia',
    short: 'Unichain',
    domain: 10,
    usdc: '0x31d0220469e10c4E71834a79b1f276d740d3768F',
    explorer: 'https://sepolia.uniscan.xyz',
    color: '#FF007A',
    abbr: 'UNI',
    iconSlug: 'unichain',
    gasFaucet: 'https://www.alchemy.com/faucets/unichain-sepolia',
    gasSymbol: 'ETH',
  },
};

export const CHAIN_LIST: CctpChain[] = Object.values(CCTP_CHAINS);

export function getChainByKey(key: CctpChainKey): CctpChain {
  return CCTP_CHAINS[key];
}

export function getChainById(id: number): CctpChain | undefined {
  return CHAIN_LIST.find((c) => c.chain.id === id);
}

// CCTP V2 finality thresholds.
// Below 1000 = Fast (confirmed); 2000 = Standard (finalized).
export const FINALITY_FAST = 1000;
export const FINALITY_STANDARD = 2000;

// CCTP V2 message layout (first 12 bytes):
//   bytes 0..3   version (uint32)
//   bytes 4..7   sourceDomain (uint32)
//   bytes 8..11  destinationDomain (uint32)
// We need destinationDomain to know which chain to mint on when the user
// claims a burn manually (they only know the source + tx hash).
export function decodeDestinationDomain(messageHex: string): number {
  const hex = messageHex.startsWith('0x') ? messageHex.slice(2) : messageHex;
  if (hex.length < 24) throw new Error('Message too short to decode destinationDomain');
  return parseInt(hex.slice(16, 24), 16);
}
