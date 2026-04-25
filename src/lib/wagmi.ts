import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import {
  sepolia,
  baseSepolia,
  arbitrumSepolia,
  avalancheFuji,
  optimismSepolia,
  polygonAmoy,
  unichainSepolia,
} from 'wagmi/chains';
import { http } from 'wagmi';

const projectId =
  import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'YOUR_WALLETCONNECT_PROJECT_ID';

export const wagmiConfig = getDefaultConfig({
  appName: 'CCTP Bridge',
  projectId,
  chains: [
    sepolia,
    avalancheFuji,
    optimismSepolia,
    arbitrumSepolia,
    baseSepolia,
    polygonAmoy,
    unichainSepolia,
  ],
  transports: {
    [sepolia.id]: http(),
    [avalancheFuji.id]: http(),
    [optimismSepolia.id]: http(),
    [arbitrumSepolia.id]: http(),
    [baseSepolia.id]: http(),
    [polygonAmoy.id]: http(),
    [unichainSepolia.id]: http(),
  },
  ssr: false,
});
