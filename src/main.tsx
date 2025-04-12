import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { Layout } from "./components/Layout";
import { useMemo } from "react";
import { WalletProvider, WalletAdapterNetwork, DecryptPermission } from "aleo-hooks";
import { WalletAdapterNetwork as LeoWalletNetwork } from "@demox-labs/aleo-wallet-adapter-base";

import {
  PuzzleWalletAdapter,
  FoxWalletAdapter,
  SoterWalletAdapter
} from 'aleo-adapters';

import { LeoWalletAdapter } from "@demox-labs/aleo-wallet-adapter-leo";

import { ThemeProvider } from "./contexts/ThemeContext";
import { WalletDemo } from "./components/WalletDemo";

function App() {
  const wallets = useMemo(
      () => [
          new LeoWalletAdapter({
              appName: 'Aleo app',
          }),
          new PuzzleWalletAdapter({
              programIdPermissions: {
                [WalletAdapterNetwork.Testnet]: ['credits.aleo']
              },
              appName: 'Aleo app',
              appDescription: 'A privacy-focused DeFi app',
              appIconUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='
          }),
          new FoxWalletAdapter({
              appName: 'Aleo app',
          }),
          new SoterWalletAdapter({
              appName: 'Aleo app',
          })
      ],
      [],
  );

  return (
    <ThemeProvider>
      <WalletProvider
              wallets={wallets}
              network={LeoWalletNetwork.TestnetBeta as any}
              decryptPermission={DecryptPermission.OnChainHistory}
              programs={['credits.aleo']}
              autoConnect
      >
        <Layout>
          <div className="flex flex-col items-center justify-center w-full py-12">
            <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 mb-8">Snark Collective</h1>
            
            {/* Wallet Integration Demo */}
            <div className="max-w-4xl w-full mb-12">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">Aleo Wallet Integration</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                This section demonstrates how to use our custom wallet integration with multiple Aleo wallets.
                The implementation provides a unified interface for connecting to Puzzle, Leo, Fox, and Soter wallets.
              </p>
              <WalletDemo />
            </div>
          </div>
        </Layout>
      </WalletProvider>
    </ThemeProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App /> 
  </React.StrictMode>,
);
