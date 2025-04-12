# Snark Collective - Aleo Wallet Integration Template with Adapters

A modern, responsive React application template for integrating Aleo wallets into your dApp, using the adapter pattern and hooks-based approach. This template provides a complete foundation for building decentralized applications on the Aleo blockchain with a focus on user experience and developer productivity.

This repository uses the **adapter pattern** with React hooks instead of the context-based approach:

## Features

- **Hook-Based Integration**: Uses `aleo-hooks` for wallet interactions instead of a centralized context
- **Composable API**: Each wallet functionality is exposed through dedicated hooks
- **Simplified State Management**: No context provider wrappers needed for wallet functionality
- **Multi-Wallet Support**: Integrate with multiple Aleo wallets including Puzzle, Leo, Fox, and Soter
Note: Fox Wallet only supports Mainnet
- **Theme-Aware Design**: Dynamically changes logos and UI elements based on light/dark mode
- **Modern UI/UX**: Responsive design built with Tailwind CSS
- **Dark Mode**: Built-in dark mode support
- **TypeScript**: Full TypeScript support for better developer experience
- **Vite**
- **React**

## 📋 Prerequisites

- Node.js (v16+)
- npm or yarn
- An Aleo wallet (Puzzle, Leo, Fox, or Soter)

## 🛠️ Getting Started

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/Aleo-Starter-Template-Adapters.git
   cd Aleo-Starter-Template-Adapters
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn
   ```

3. Start the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

4. Open your browser and navigate to `http://localhost:5173`

## 🧩 Project Structure

```
Aleo-Starter-Template-Adapters/
├── public/              # Static assets
├── src/
│   ├── assets/          # Images and other assets
│   │   ├── logo.png           # Logo for dark mode
│   │   ├── logodark.png       # Logo for light mode
│   │   └── ... (wallet icons)
│   ├── components/      # UI components
│   │   ├── ConnectWallet.tsx  # Wallet connection component using hooks
│   │   ├── Header.tsx         # Application header with theme-aware logos
│   │   ├── Footer.tsx         # Application footer
│   │   ├── Layout.tsx         # Main layout wrapper
│   │   ├── ThemeToggle.tsx    # Dark/light mode toggle
│   │   └── WalletDemo.tsx     # Demo of wallet integration with hooks
│   ├── contexts/        # React contexts
│   │   └── ThemeContext.tsx   # Theme state management
│   ├── main.tsx         # Application entry point with wallet adapters
│   └── index.css        # Global styles
├── index.html           # HTML template
├── package.json         # Dependencies and scripts
├── tsconfig.json        # TypeScript configuration
└── vite.config.ts       # Vite configuration
```

## 💼 Adapter Pattern & Hooks

This template uses the adapter pattern through the `aleo-hooks` and `aleo-adapters` packages to provide a more modern and flexible approach to wallet integration:

### Wallet Provider Setup

```tsx
// Example from main.tsx
import { WalletProvider, WalletAdapterNetwork, DecryptPermission } from "aleo-hooks";
import {
  PuzzleWalletAdapter,
  LeoWalletAdapter,
  FoxWalletAdapter,
  SoterWalletAdapter
} from 'aleo-adapters';

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
              appIconUrl: 'data:image/png;base64...'
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
              network={WalletAdapterNetwork.Testnet}
              decryptPermission={DecryptPermission.OnChainHistory}
              programs={['credits.aleo']}
              autoConnect
      >
        <Layout>
          {/* App content */}
        </Layout>
      </WalletProvider>
    </ThemeProvider>
  );
}
```

### Using Wallet Hooks

Instead of accessing a wallet context, you use dedicated hooks to access specific wallet functionality:

```tsx
// Example usage in a component
import {
  useConnect,
  useDisconnect,
  useAccount,
  useTransaction,
  useSignMessage,
  useDecrypt,
  useRecords,
  useSelect
} from 'aleo-hooks';
import { Transaction } from '@demox-labs/aleo-wallet-adapter-base';

function MyComponent() {
  // Connection hooks
  const { connect, connecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { publicKey: address, connected } = useAccount();
  const { select } = useSelect();
  
  // Functionality hooks
  const { executeTransaction, transactionId } = useTransaction();
  const { signMessage } = useSignMessage();
  const { decrypt, decryptedText } = useDecrypt({ cipherText: "your-ciphertext" });
  const { records } = useRecords({ program: 'credits.aleo' });
  
  // Example transaction
  const handleTransaction = async () => {
    if (connected && address) {
      // Create transaction object
      const transaction = Transaction.createTransaction(
        address,
        'testnet', // chainId
        'credits.aleo', // programId
        'transfer_public', // functionId
        ['aleo1abc...', '1000000u64'], // inputs
        10000, // fee
        false // feePrivate
      );
      
      // Execute the transaction
      await executeTransaction(transaction);
    }
  };
  
  // Connect to wallet
  const connectWallet = async (walletName) => {
    // First select wallet
    select(walletName);
    
    // Then connect
    await connect(walletName);
  };
}
```

### Benefits of Hooks-Based Approach

1. **Composable**: Only import and use the hooks you need
2. **Testable**: Easier to test components that use hooks
3. **Type-Safe**: Full TypeScript support with better type inference
4. **Focused**: Each hook handles one specific concern
5. **Performance**: Better code-splitting and tree-shaking possibilities

## Available Hooks

- `useConnect` - Manage wallet connection
- `useDisconnect` - Disconnect from wallet
- `useAccount` - Access wallet account information
- `useSelect` - Select specific wallet adapter
- `useTransaction` - Create and execute transactions
- `useSignMessage` - Sign messages
- `useDecrypt` - Decrypt ciphertexts
- `useRecords` - Retrieve records from the blockchain

## 📚 Documentation

For more detailed documentation on the Aleo blockchain and wallet integration, visit:

- [Aleo Developer Documentation](https://developer.aleo.org/)
- [Aleo Adapters Documentation](https://github.com/arcane-finance-defi/aleo-wallet-adapters)
- [Demox Labs Adapter Documentation](https://github.com/demox-labs/aleo-wallet-adapter)

## 🤝 Contributing

Contributions are welcome! If you'd like to contribute, please fork the repository and create a pull request.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- [Aleo](https://aleo.org/) for building on the Aleo blockchain
- [React](https://reactjs.org/) for the amazing frontend library
- [Tailwind CSS](https://tailwindcss.com/) for the utility-first CSS framework
- [Vite](https://vitejs.dev/) for the fast build tool

---

Built with ❤️ by the Snark Collective team