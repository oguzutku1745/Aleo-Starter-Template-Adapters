# Snark Collective - Aleo Wallet Integration Template with Adapters

A modern, responsive React application template for integrating Aleo wallets into your dApp, using the adapter pattern and hooks-based approach. This template provides a complete foundation for building decentralized applications on the Aleo blockchain with a focus on user experience and developer productivity.

This repository uses the **adapter pattern** with React hooks instead of the context-based approach:

## Features

- **Hook-Based Integration**: Uses `aleo-hooks` for wallet interactions instead of a centralized context
- **Composable API**: Each wallet functionality is exposed through dedicated hooks
- **Simplified State Management**: No context provider wrappers needed for wallet functionality
- **Multi-Wallet Support**: Integrate with multiple Aleo wallets including Puzzle, Leo, Fox, and Soter
Note: Fox Wallet only supports Mainnet
- **Wallet-Specific Transaction Handling**: Optimized transaction execution based on wallet type
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

## 🔄 Wallet-Specific Transaction Handling

This template implements specialized transaction handling for different Aleo wallets, ensuring optimal compatibility and user experience.

### Transaction Execution Strategy

The application detects the connected wallet type and uses the appropriate transaction format and execution method:

```tsx
// Transaction execution based on wallet type
const handleExecuteTransaction = async () => {
  if (!connected) {
    setLastError('Wallet not connected');
    return;
  }

  // Get current wallet information
  const currentWalletName = walletName;
  
  // For Leo Wallet
  if (currentWalletName === 'Leo Wallet' && window.leoWallet && 
      typeof window.leoWallet.requestTransaction === 'function') {
    // Create transaction with Leo Wallet format
    const transaction = LeoTransaction.createTransaction(
      address!, 
      walletConfig.chainId,
      programId,
      functionName,
      inputs,
      fee,
      false // feePrivate
    );
    
    // Execute directly through window.leoWallet API
    const txId = await window.leoWallet.requestTransaction(transaction);
    return txId;
  } 
  
  // For Puzzle Wallet
  else if (currentWalletName === 'Puzzle Wallet') {
    // Use Puzzle SDK's requestCreateEvent method
    const createEventResponse = await requestCreateEvent({
      type: EventType.Execute,
      programId: programId,
      functionId: functionName,
      fee: fee / 100_000, // Convert microcredits to credits
      inputs: inputs
    });
    
    return createEventResponse.eventId;
  }
  
  // For other wallets (Fox, Soter, etc.)
  else {
    // Use the generic Transaction format
    const transaction = Transaction.createTransaction(
      address!,
      chainId,
      programId,
      functionName,
      inputs,
      fee,
      false // feePrivate
    );
    
    // Execute through the wallet adapter's executeTransaction hook
    return await executeTransaction(transaction);
  }
};
```

### Key Differences Between Wallet Transaction Implementations

1. **Leo Wallet**:
   - Uses `LeoTransaction.createTransaction` format
   - Executes via direct `window.leoWallet.requestTransaction` call when available
   - Transaction ID is retrieved from the wallet's response

2. **Puzzle Wallet**:
   - Uses Puzzle SDK's `requestCreateEvent` method
   - Requires fee in credits (not microcredits)
   - Returns an event ID instead of a transaction ID

3. **Other Wallets (Fox, Soter)**:
   - Use the generic `Transaction.createTransaction` format
   - Execute via the `executeTransaction` hook
   - Handle fee in microcredits

### Transaction Parameters Explained

| Parameter | Description | Format Example |
|-----------|-------------|----------------|
| address   | The user's Aleo account address | `"aleo1abc..."` |
| chainId   | Network identifier | `"testnet3"`, `"testnetbeta"` |
| programId | The Aleo program to execute | `"credits.aleo"` |
| functionId| The function to call within the program | `"transfer_public"` |
| inputs    | The function arguments | `["aleo1xyz...", "1000000u64"]` |
| fee       | Transaction fee (in microcredits, except for Puzzle) | `10000` |
| feePrivate| Whether to use a private fee | `false` |

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
- [Puzzle SDK Documentation](https://docs.puzzle.online/)

## 🤝 Contributing

Contributions are welcome! If you'd like to contribute, please fork the repository and create a pull request.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- [Aleo](https://aleo.org/) for building on the Aleo blockchain
- [React](https://reactjs.org/) for the amazing frontend library
- [Tailwind CSS](https://tailwindcss.com/) for the utility-first CSS framework
- [Vite](https://vitejs.dev/) for the fast build tool
- [Puzzle](https://puzzle.online/) for their SDK
- [Leo Wallet](https://leo.app/) for their wallet API

---

Built with ❤️ by the Snark Collective team