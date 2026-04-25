import React from 'react';
import ReactDOM from 'react-dom/client';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider, darkTheme, lightTheme } from '@rainbow-me/rainbowkit';

import App from './App';
import { wagmiConfig } from './lib/wagmi';
import { initTheme, useTheme } from './hooks/useTheme';
import './index.css';

initTheme();
const queryClient = new QueryClient();

function ThemedRainbowKit({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  const rkTheme =
    theme === 'dark'
      ? darkTheme({ accentColor: '#3b82f6', borderRadius: 'medium' })
      : lightTheme({ accentColor: '#3b82f6', borderRadius: 'medium' });
  return <RainbowKitProvider theme={rkTheme}>{children}</RainbowKitProvider>;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ThemedRainbowKit>
          <App />
        </ThemedRainbowKit>
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>,
);
