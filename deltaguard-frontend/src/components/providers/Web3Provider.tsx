'use client';

import '@rainbow-me/rainbowkit/styles.css';
import { RainbowKitProvider, darkTheme, lightTheme } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { wagmiConfig } from '@/lib/web3/config';
// import { useTheme } from './ThemeProvider';

const queryClient = new QueryClient();

export function Web3Provider({ children }: { children: React.ReactNode }) {
  // const { theme } = useTheme();

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          // theme={theme === 'dark' ? darkTheme() : lightTheme()}
          showRecentTransactions={true}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}