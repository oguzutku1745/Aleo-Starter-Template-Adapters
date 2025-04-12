import { useState, useEffect } from 'react';
// Replace WalletContext with hooks from aleo-hooks
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
import { RecordStatus, EventType } from '@puzzlehq/types';
import { useTheme } from '../contexts/ThemeContext';
// Import Transaction class
import { Transaction } from '@demox-labs/aleo-wallet-adapter-base';

// Import wallet images
import puzzleIcon from '../assets/puzzlewallet.png';
import leoIcon from '../assets/leowallet.png';
import foxIcon from '../assets/foxwallet.svg';
import soterIcon from '../assets/soterwallet.png';

// Define types
interface Wallet {
  id: 'puzzle' | 'leo' | 'fox' | 'soter';
  name: string;
  icon: string;
}

// Extend Window interface for wallet detection
declare global {
  interface Window {
    // For Puzzle Wallet detection
    puzzleWalletClient?: any;
    
    // For Leo Wallet detection
    leoWallet?: any;
    
    // For Fox Wallet detection
    foxwallet_aleo?: any;
    
    // For Soter Wallet detection
    soterWallet?: any;
  }
}

// Collapsible Section Component
interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({ 
  title, 
  children, 
  defaultExpanded = false 
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const { isDarkMode } = useTheme();
  
  return (
    <div className="mb-6 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 bg-gray-50 dark:bg-gray-900 flex justify-between items-center"
      >
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">{title}</h3>
        <svg 
          className={`w-5 h-5 transition-transform ${isExpanded ? 'transform rotate-180' : ''}`} 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke={isDarkMode ? "currentColor" : "#374151"}
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div 
        className={`transition-all duration-300 overflow-hidden ${isExpanded ? 'max-h-[2000px]' : 'max-h-0'}`}
      >
        {isExpanded && (
          <div className="p-4">
            {children}
          </div>
        )}
      </div>
    </div>
  );
};

export function WalletDemo() {
  // State for UI
  const [selectedWallet, setSelectedWallet] = useState<'puzzle' | 'leo' | 'fox' | 'soter' | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<string>('');
  const [availableWallets, setAvailableWallets] = useState<Wallet[]>([]);
  const [lastError, setLastError] = useState<string | null>(null);
  const [connectionLogs, setConnectionLogs] = useState<{timestamp: Date, event: string, data?: any}[]>([]);
  const [walletName, setWalletName] = useState<string | null>(null);
  
  // Transaction state
  const [transactionPending, setTransactionPending] = useState<boolean>(false);
  const [transactionResult, setTransactionResult] = useState<string | null>(null);
  const [transactionProgramId, setTransactionProgramId] = useState('credits.aleo');
  const [transactionFunctionId, setTransactionFunctionId] = useState('transfer_public');
  const [transactionFee, setTransactionFee] = useState('100000');
  const [transactionAmount, setTransactionAmount] = useState('100000');
  const [receiverAddress, setReceiverAddress] = useState('aleo12jhkt3q85u5peer0mc4g3kjk6mpfp9rwp8nl89prrah09ncq0qxq9un40c');
  
  // Signature state
  const [signaturePending, setSignaturePending] = useState<boolean>(false);
  const [signatureResult, setSignatureResult] = useState<string | null>(null);
  const [signatureMessage, setSignatureMessage] = useState('Hello Aleo!');
  
  // Decrypt state
  const [decryptPending, setDecryptPending] = useState<boolean>(false);
  const [decryptResult, setDecryptResult] = useState<string | null>(null);
  const [decryptCiphertext, setDecryptCiphertext] = useState('');
  
  // Records state
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [recordsResult, setRecordsResult] = useState<string | null>(null);
  const [recordsProgramId, setRecordsProgramId] = useState('credits.aleo');
  const [recordsStatus, setRecordsStatus] = useState('spent');
  const [lastRecords, setLastRecords] = useState<any[]>([]);
  
  // Record plaintexts state
  const [recordPlaintextsLoading, setRecordPlaintextsLoading] = useState(false);
  const [recordPlaintextsResult, setRecordPlaintextsResult] = useState<string | null>(null);
  const [recordPlaintextsProgramId, setRecordPlaintextsProgramId] = useState('credits.aleo');
  const [recordPlaintextsStatus, setRecordPlaintextsStatus] = useState('spent');
  const [lastRecordPlaintexts, setLastRecordPlaintexts] = useState<any[]>([]);
  
  // Transaction history state
  const [transactionHistoryLoading, setTransactionHistoryLoading] = useState(false);
  const [transactionHistoryResult, setTransactionHistoryResult] = useState<string | null>(null);
  const [transactionHistoryProgramId, setTransactionHistoryProgramId] = useState('credits.aleo');
  const [transactionHistoryEventType, setTransactionHistoryEventType] = useState('execute');
  const [transactionHistoryFunctionId, setTransactionHistoryFunctionId] = useState('');
  const [lastTransactionHistory, setLastTransactionHistory] = useState<any[]>([]);

  // Use aleo-hooks
  const { connect, connecting: connectLoading, error: connectError } = useConnect();
  const { disconnect } = useDisconnect();
  const { publicKey: address, connected } = useAccount();
  const { executeTransaction, transactionId } = useTransaction();
  const { signMessage } = useSignMessage();
  const { decrypt, decryptedText } = useDecrypt({ 
    cipherText: decryptCiphertext,
    enabled: decryptCiphertext.length > 0 
  });
  const { records } = useRecords({ program: recordsProgramId });
  const { select } = useSelect();

  // Helper function to add logs
  const addLog = (event: string, data?: any) => {
    setConnectionLogs(prevLogs => {
      const newLog = { timestamp: new Date(), event, data };
      // Keep only the last 10 logs
      const updatedLogs = [newLog, ...prevLogs].slice(0, 10);
      return updatedLogs;
    });
  };

  // Effect for setting available wallets
  useEffect(() => {
    setAvailableWallets([
      { id: 'puzzle', name: 'Puzzle Wallet', icon: puzzleIcon },
      { id: 'leo', name: 'Leo Wallet', icon: leoIcon },
      { id: 'fox', name: 'Fox Wallet', icon: foxIcon },
      { id: 'soter', name: 'Soter Wallet', icon: soterIcon }
    ]);
  }, []);

  // Effect for connection status
  useEffect(() => {
    if (connected) {
      setConnectionStatus('Connected');
      setLastError(null);
      
      // Set wallet name based on selected wallet
      if (selectedWallet) {
        const walletInfo = availableWallets.find(w => w.id === selectedWallet);
        if (walletInfo) {
          setWalletName(walletInfo.name);
        }
      }
    } else if (connectLoading) {
      setConnectionStatus('Connecting...');
    } else if (connectError) {
      const errorMessage = typeof connectError === 'object' && connectError !== null && 'message' in connectError 
        ? (connectError as Error).message 
        : 'Unknown connection error';
      setConnectionStatus(`Error: ${errorMessage}`);
      setLastError(errorMessage);
    } else if (!connected) {
      setConnectionStatus(lastError ? `Disconnected (last error: ${lastError})` : 'Disconnected');
    }
  }, [connected, connectLoading, connectError, lastError, selectedWallet, availableWallets]);

  // Effect to reset selected wallet when disconnected
  useEffect(() => {
    if (!connected && !connectLoading && selectedWallet) {
      setTimeout(() => {
        setSelectedWallet(null);
      }, 2000);
    }
  }, [connected, connectLoading, selectedWallet]);

  // Effect to update transaction result when transaction ID changes
  useEffect(() => {
    if (transactionId) {
      setTransactionResult(`Transaction ID: ${transactionId}`);
    }
  }, [transactionId]);

  // Add an effect to detect and restore wallet information on component mount
  useEffect(() => {
    // If connected on initial load but we don't have wallet info
    if (connected && !selectedWallet) {
      // Try to detect which wallet is connected
      const detectWallet = async () => {
        try {
          // Check each wallet's pattern to identify them
          if (typeof window.puzzleWalletClient !== 'undefined') {
            setSelectedWallet('puzzle');
            setWalletName('Puzzle Wallet');
            addLog('Detected connected Puzzle Wallet after refresh');
          } else if (typeof window.leoWallet !== 'undefined') {
            setSelectedWallet('leo');
            setWalletName('Leo Wallet');
            addLog('Detected connected Leo Wallet after refresh');
          } else if (typeof window.foxwallet_aleo !== 'undefined') {
            setSelectedWallet('fox');
            setWalletName('Fox Wallet');
            addLog('Detected connected Fox Wallet after refresh');
          } else if (typeof window.soterWallet !== 'undefined') {
            setSelectedWallet('soter');
            setWalletName('Soter Wallet');
            addLog('Detected connected Soter Wallet after refresh');
          } else {
            // If we can't detect it, use a generic message but at least show connected
            setWalletName('Connected Wallet');
            addLog('Connected to wallet but could not identify type');
          }
        } catch (error) {
          console.error('Error detecting wallet type:', error);
        }
      };
      
      detectWallet();
    }
  }, [connected, selectedWallet, addLog]);

  // Handle connecting a wallet
  const handleConnectWallet = async (type: 'puzzle' | 'leo' | 'fox' | 'soter') => {
    setSelectedWallet(type);
    addLog(`Connecting to ${type} wallet...`);
    
    try {
      // Map internal wallet types to wallet adapter names
      const walletAdapterNames = {
        'puzzle': 'Puzzle Wallet',
        'leo': 'Leo Wallet',
        'fox': 'Fox Wallet',
        'soter': 'Soter Wallet'
      };
      
      // Get the adapter name
      const adapterId = walletAdapterNames[type];
      
      // First select the wallet
      select(adapterId as any);
      
      // Then connect after a small delay
      setTimeout(async () => {
        try {
          // Cast to any to bypass TypeScript checks
          await connect(adapterId as any);
          addLog(`Connected successfully to ${adapterId}`);
          
          // Set the wallet name explicitly here
          setWalletName(walletAdapterNames[type]);
        } catch (error: any) {
          setLastError(error.message || 'Unknown error connecting wallet');
          addLog(`Error connecting to ${type} wallet: ${error.message || 'Unknown error'}`);
        }
      }, 100);
    } catch (error: any) {
      setLastError(error.message || 'Unknown error selecting wallet');
      addLog(`Error selecting ${type} wallet: ${error.message || 'Unknown error'}`);
    }
  };

  // Handle disconnecting a wallet
  const handleDisconnectWallet = async () => {
    addLog("Disconnecting wallet...");
    
    try {
      await disconnect();
      setWalletName(null); // Clear the wallet name when disconnecting
      addLog("Disconnected successfully");
    } catch (error: any) {
      setLastError(error.message || "Failed to disconnect");
      addLog(`Disconnection error: ${error.message || "Unknown error"}`);
    }
  };

  // Handle transaction request
  const handleRequestTransaction = async () => {
    if (!connected || !address) {
      setLastError('Wallet not connected');
      return;
    }

    console.log("called")

    setTransactionResult(null);
    setTransactionPending(true);
    addLog(`Creating transaction for ${transactionProgramId}.${transactionFunctionId} with fee ${transactionFee}`);
    
    const chainId = walletName === "Leo Wallet" ? "testnetbeta" : "testnet";

    try {
      // Create proper AleoTransaction object using Transaction.createTransaction
      const transaction = Transaction.createTransaction(
        address,
        chainId,
        transactionProgramId,
        transactionFunctionId,
        [receiverAddress, `${transactionAmount}u64`],
        Number(transactionFee),
        false // feePrivate
      );
      
      console.log("called")

      // Execute the transaction with the proper AleoTransaction object
      await executeTransaction(transaction);
    } catch (error: any) {
      setLastError(error.message || 'Unknown error creating transaction');
      setTransactionResult(`Transaction failed: ${error.message || 'Unknown error'}`);
      addLog(`Transaction error: ${error.message || 'Unknown error'}`);
    } finally {
      setTransactionPending(false);
    }
  };

  // Handle signature request
  const handleRequestSignature = async () => {
    if (!connected || !address) {
      setLastError('Wallet not connected');
      return;
    }

    setSignatureResult(null);
    setSignaturePending(true);
    addLog(`Signing message: "${signatureMessage}"`);

    try {
      // Convert message to Uint8Array for signing
      const encoder = new TextEncoder();
      const messageBytes = encoder.encode(signatureMessage);
      
      // Sign the message
      const signatureBytes = await signMessage(messageBytes);
      
      if (signatureBytes) {
        // Convert signature to string representation
        const decoder = new TextDecoder();
        const signatureString = decoder.decode(signatureBytes);
        
        setSignatureResult(`Signature: ${signatureString}`);
      }
    } catch (error: any) {
      setLastError(error.message || 'Unknown error signing message');
      setSignatureResult(`Signature failed: ${error.message || 'Unknown error'}`);
      addLog(`Signature error: ${error.message || 'Unknown error'}`);
    } finally {
      setSignaturePending(false);
    }
  };
  
  // Handle decrypt request - simplified
  const handleRequestDecrypt = async () => {
    if (!connected || !address) {
      setLastError('Wallet not connected');
      return;
    }

    setDecryptResult(null);
    setDecryptPending(true);
    addLog(`Decrypting ciphertext`);

    try {
      // The decrypt function is already initialized with ciphertextToDecrypt
      await decrypt();
      
      if (decryptedText) {
        setDecryptResult(`Decryption successful: ${decryptedText}`);
      }
    } catch (error: any) {
      setLastError(error.message || 'Unknown error decrypting message');
      setDecryptResult(`Decryption failed: ${error.message || 'Unknown error'}`);
      addLog(`Decryption error: ${error.message || 'Unknown error'}`);
    } finally {
      setDecryptPending(false);
    }
  };

  // Handle record request - simplified
  const handleRequestRecords = async () => {
    if (!connected || !address) {
      addLog('Connect wallet first to request records');
      return;
    }

    setRecordsResult(null);
    setRecordsLoading(true);
    addLog(`Requesting records for ${recordsProgramId} with status ${recordsStatus || 'all'}`);

    try {
      const recordsData = await records;
      if (recordsData && recordsData.length > 0) {
        const status = recordsStatus || undefined; 
        // Filter records by status if specified
        const filteredRecords = status 
          ? recordsData.filter(record => record.status === status)
          : recordsData;
        
        setRecordsResult(`Found ${filteredRecords.length} records`);
        setLastRecords(filteredRecords);
        addLog(`Found ${filteredRecords.length} records for ${recordsProgramId}`);
      } else {
        setRecordsResult('No records found');
        addLog(`No records found for ${recordsProgramId}`);
      }
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error occurred';
      setRecordsResult(`Error: ${errorMessage}`);
      setLastError(errorMessage);
      addLog(`Error requesting records: ${errorMessage}`);
    } finally {
      setRecordsLoading(false);
    }
  };

  // Handle record plaintexts request
  const handleRequestRecordPlaintexts = async () => {
    if (!connected || !address) {
      addLog('Connect wallet first to request record plaintexts');
      return;
    }

    setRecordPlaintextsResult(null);
    setRecordPlaintextsLoading(true);
    addLog(`Requesting record plaintexts for ${recordPlaintextsProgramId} with status ${recordPlaintextsStatus || 'all'}`);

    try {
      // For demo purposes, we're using the records hook result
      const recordsData = await records;
      if (recordsData && recordsData.length > 0) {
        const status = recordPlaintextsStatus || undefined;
        // Filter records by status if specified
        const filteredRecords = status
          ? recordsData.filter(record => record.status === status)
          : recordsData;
        
        setRecordPlaintextsResult(`Found ${filteredRecords.length} record plaintexts`);
        setLastRecordPlaintexts(filteredRecords);
        addLog(`Found ${filteredRecords.length} record plaintexts for ${recordPlaintextsProgramId}`);
      } else {
        setRecordPlaintextsResult('No record plaintexts found');
        addLog(`No record plaintexts found for ${recordPlaintextsProgramId}`);
      }
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error occurred';
      setRecordPlaintextsResult(`Error: ${errorMessage}`);
      setLastError(errorMessage);
      addLog(`Error requesting record plaintexts: ${errorMessage}`);
    } finally {
      setRecordPlaintextsLoading(false);
    }
  };

  // Handle transaction history request
  const handleRequestTransactionHistory = async () => {
    if (!connected || !address) {
      addLog('Connect wallet first to request transaction history');
      return;
    }

    setTransactionHistoryResult(null);
    setTransactionHistoryLoading(true);
    addLog(`Requesting transaction history for ${transactionHistoryProgramId} with event type ${transactionHistoryEventType || 'all'}`);

    try {
      // For demo purposes, we'll create a mock history
      const mockHistory = [
        {
          id: '1',
          type: 'execute',
          programId: transactionHistoryProgramId,
          functionId: 'transfer_public',
          timestamp: new Date().toISOString(),
          status: 'confirmed'
        },
        {
          id: '2',
          type: 'deploy',
          programId: transactionHistoryProgramId,
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          status: 'confirmed'
        }
      ];
      
      // Filter by event type if specified
      const filteredHistory = transactionHistoryEventType
        ? mockHistory.filter(tx => tx.type === transactionHistoryEventType)
        : mockHistory;
      
      // Filter by function ID if specified
      const finalHistory = transactionHistoryFunctionId
        ? filteredHistory.filter(tx => 'functionId' in tx && tx.functionId === transactionHistoryFunctionId)
        : filteredHistory;
      
      setTransactionHistoryResult(`Found ${finalHistory.length} transactions`);
      setLastTransactionHistory(finalHistory);
      addLog(`Found ${finalHistory.length} transactions for ${transactionHistoryProgramId}`);
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error occurred';
      setTransactionHistoryResult(`Error: ${errorMessage}`);
      setLastError(errorMessage);
      addLog(`Error requesting transaction history: ${errorMessage}`);
    } finally {
      setTransactionHistoryLoading(false);
    }
  };

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-6 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm w-full">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">Wallet Integration Demo</h2>
      
      {/* Status Section - Always Expanded */}
      <CollapsibleSection title="Wallet Status" defaultExpanded={true}>
        <div className="mb-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <p className="text-gray-700 dark:text-gray-300">
              <span className="font-semibold">Status:</span> {connectionStatus}
            </p>
            <br />
            <p className="text-gray-700 dark:text-gray-300 mb-1">
            <span className="font-semibold">Is Connected:</span> {connected ? 'Yes' : 'No'}
          </p>
          <p className="text-gray-700 dark:text-gray-300 mb-1">
            <span className="font-semibold">Is Connecting:</span> {connectLoading ? 'Yes' : 'No'}
          </p>
          <p className="text-gray-700 dark:text-gray-300">
            <span className="font-semibold">Error:</span> {lastError || 'None'}
          </p>

          </div>
        </div>
        
        {connected && (
          <div className="mb-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <p className="text-gray-700 dark:text-gray-300 mb-1 break-all">
                <span className="font-semibold">Address:</span> {address || 'Not available'}
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                <span className="font-semibold">Wallet Name:</span> {walletName || 'Unknown'}
              </p>
            </div>
          </div>
        )}

        {/* Wallet Selection */}
        <div className="mb-4">
          <h4 className="text-md font-semibold text-gray-700 dark:text-gray-300 mb-2">Available Wallets</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {availableWallets.map((wallet) => (
              <button
                key={wallet.id}
                onClick={() => handleConnectWallet(wallet.id)}
                disabled={connectLoading}
                className={`p-3 rounded-lg border flex flex-col items-center justify-center transition-all ${
                  selectedWallet === wallet.id
                    ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <img 
                  src={wallet.icon} 
                  alt={wallet.name} 
                  className="w-10 h-10 mb-2" 
                />
                {wallet.name === "Fox Wallet" ? <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Fox Wallet (Mainnet Only)</span> : <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{wallet.name}</span>}
              </button>
            ))}
          </div>
        </div>

        {connected && (
          <button
            onClick={handleDisconnectWallet}
            className="w-full p-2 rounded-md font-medium bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 text-white transition-colors"
          >
            Disconnect Wallet
          </button>
        )}
      </CollapsibleSection>
      
      {/* Transaction Demo Section */}
      {connected && (
        <CollapsibleSection title="Transaction Demo">
          <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Program ID</label>
                <input
                  type="text"
                  value={transactionProgramId}
                  onChange={(e) => setTransactionProgramId(e.target.value)}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Function Name</label>
                <input
                  type="text"
                  value={transactionFunctionId}
                  onChange={(e) => setTransactionFunctionId(e.target.value)}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                />
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Recipient Address</label>
              <input
                type="text"
                value={receiverAddress}
                onChange={(e) => setReceiverAddress(e.target.value)}
                placeholder="aleo1..."
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount (without units)</label>
                <input
                  type="text"
                  value={transactionAmount}
                  onChange={(e) => setTransactionAmount(e.target.value)}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fee (microcredits)</label>
                <input
                  type="number"
                  value={transactionFee}
                  onChange={(e) => setTransactionFee(e.target.value)}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                />
              </div>
            </div>
            
            <button
              onClick={handleRequestTransaction}
              disabled={transactionPending || !connected}
              className={`w-full p-2 rounded-md font-medium ${
                transactionPending
                  ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700'
              } text-white transition-colors`}
            >
              {transactionPending ? 'Processing...' : 'Create Transaction'}
            </button>
            
            
            {transactionResult && (
              <div className={`mt-4 p-3 ${
                transactionResult.includes('failed') 
                  ? 'bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30 text-red-800 dark:text-red-300' 
                  : 'bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/30 text-green-800 dark:text-green-300'
              } rounded-md`}>
                <p className="text-sm break-all">{transactionResult}</p>
              </div>
            )}
          </div>
        </CollapsibleSection>
      )}
      
      {/* Signature Demo Section */}
      {connected && (
        <CollapsibleSection title="Signature Demo">
          <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Message to Sign</label>
              <input
                type="text"
                value={signatureMessage}
                onChange={(e) => setSignatureMessage(e.target.value)}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
              />
            </div>
            
            <button
              onClick={handleRequestSignature}
              disabled={signaturePending || !connected}
              className={`w-full p-2 rounded-md font-medium ${
                signaturePending
                  ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700'
              } text-white transition-colors`}
            >
              {signaturePending ? 'Signing...' : 'Sign Message'}
            </button>
            
            
            {signatureResult && (
              <div className={`mt-4 p-3 ${
                signatureResult.includes('failed') 
                  ? 'bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30 text-red-800 dark:text-red-300' 
                  : 'bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/30 text-green-800 dark:text-green-300'
              } rounded-md`}>
                <p className="text-sm break-all">{signatureResult}</p>
              </div>
            )}
          </div>
        </CollapsibleSection>
      )}
      
      {/* Decrypt Demo Section */}
      {connected && (
        <CollapsibleSection title="Decrypt Demo">
          <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ciphertext to Decrypt</label>
              <textarea
                value={decryptCiphertext}
                onChange={(e) => setDecryptCiphertext(e.target.value)}
                placeholder="Enter ciphertext (e.g., record...)"
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 min-h-[100px]"
              />
            </div>
            
            <button
              onClick={handleRequestDecrypt}
              disabled={decryptPending || !connected || !decryptCiphertext}
              className={`w-full p-2 rounded-md font-medium ${
                decryptPending || !decryptCiphertext
                  ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700'
              } text-white transition-colors`}
            >
              {decryptPending ? 'Decrypting...' : 'Decrypt Ciphertext'}
            </button>
            
            {decryptResult && (
              <div className={`mt-4 p-3 ${
                decryptResult.includes('failed') 
                  ? 'bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30 text-red-800 dark:text-red-300' 
                  : 'bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/30 text-green-800 dark:text-green-300'
              } rounded-md`}>
                <p className="text-sm break-all">{decryptResult}</p>
              </div>
            )}
          </div>
        </CollapsibleSection>
      )}
      
      {/* Records Demo Section */}
      {connected && (
        <CollapsibleSection title="Records Demo">
          <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Program ID</label>
                <input
                  type="text"
                  value={recordsProgramId}
                  onChange={(e) => setRecordsProgramId(e.target.value)}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Record Status (Puzzle only)</label>
                <select
                  value={recordsStatus}
                  onChange={(e) => setRecordsStatus(e.target.value as RecordStatus | '')}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                >
                  <option value="">All Records</option>
                  <option value={RecordStatus.Unspent}>Unspent</option>
                  <option value={RecordStatus.Pending}>Pending</option>
                  <option value={RecordStatus.Spent}>Spent</option>
                </select>
              </div>
            </div>
            
            <button
              onClick={handleRequestRecords}
              disabled={recordsLoading || !connected}
              className={`w-full p-2 rounded-md font-medium ${
                recordsLoading
                  ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700'
              } text-white transition-colors`}
            >
              {recordsLoading ? 'Loading Records...' : 'Request Records'}
            </button>
            
            {lastRecords && lastRecords.length > 0 && (
              <div className="mt-4">
                <h4 className="text-md font-semibold text-gray-700 dark:text-gray-300 mb-2">Found {lastRecords.length} Records</h4>
                <div className="max-h-[300px] overflow-y-auto bg-gray-100 dark:bg-gray-800 p-3 rounded-lg">
                  {lastRecords.map((record, index) => (
                    <div key={index} className="mb-3 p-2 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Record #{index + 1}</p>
                      {record.plaintext && (
                        <p className="text-sm text-gray-800 dark:text-gray-200 break-all">
                          <span className="font-semibold">Plaintext:</span> {record.plaintext}
                        </p>
                      )}
                      {typeof record === 'string' ? (
                        <p className="text-sm text-gray-800 dark:text-gray-200 break-all">{record}</p>
                      ) : (
                        <div>
                          {record.owner && (
                            <p className="text-sm text-gray-800 dark:text-gray-200 break-all">
                              <span className="font-semibold">Owner:</span> {record.owner}
                            </p>
                          )}
                          {record.spent !== undefined && (
                            <p className="text-sm text-gray-800 dark:text-gray-200">
                              <span className="font-semibold">Status:</span> {record.spent ? 'Spent' : 'Unspent'}
                            </p>
                          )}
                          {record.data && (
                            <div className="mt-1">
                              <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Data:</span>
                              <pre className="text-xs bg-gray-50 dark:bg-gray-900 p-1 rounded mt-1 overflow-x-auto">
                                {JSON.stringify(record.data, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {recordsResult && (
              <div className={`mt-4 p-3 ${
                recordsResult.includes('failed') 
                  ? 'bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30 text-red-800 dark:text-red-300' 
                  : 'bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/30 text-green-800 dark:text-green-300'
              } rounded-md`}>
                <p className="text-sm break-all">{recordsResult}</p>
              </div>
            )}
          </div>
        </CollapsibleSection>
      )}
      
      {/* Record Plaintexts Demo Section */}
      {connected && (
        <CollapsibleSection title="Record Plaintexts Demo">
          <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Program ID</label>
                <input
                  type="text"
                  value={recordPlaintextsProgramId}
                  onChange={(e) => setRecordPlaintextsProgramId(e.target.value)}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Record Status (Puzzle only)</label>
                <select
                  value={recordPlaintextsStatus}
                  onChange={(e) => setRecordPlaintextsStatus(e.target.value as RecordStatus | '')}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                >
                  <option value="">All Records</option>
                  <option value={RecordStatus.Unspent}>Unspent</option>
                  <option value={RecordStatus.Pending}>Pending</option>
                  <option value={RecordStatus.Spent}>Spent</option>
                </select>
              </div>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                <strong>Note:</strong> For Leo, Fox, and Soter wallets, this requires the <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">OnChainHistory</code> permission during connection.
              </p>
            </div>
            
            <button
              onClick={handleRequestRecordPlaintexts}
              disabled={recordPlaintextsLoading || !connected}
              className={`w-full p-2 rounded-md font-medium ${
                recordPlaintextsLoading
                  ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700'
              } text-white transition-colors`}
            >
              {recordPlaintextsLoading ? 'Loading Record Plaintexts...' : 'Request Record Plaintexts'}
            </button>
            
            {lastRecordPlaintexts && lastRecordPlaintexts.length > 0 && (
              <div className="mt-4">
                <h4 className="text-md font-semibold text-gray-700 dark:text-gray-300 mb-2">Found {lastRecordPlaintexts.length} Records with Plaintext</h4>
                <div className="max-h-[300px] overflow-y-auto bg-gray-100 dark:bg-gray-800 p-3 rounded-lg">
                  {lastRecordPlaintexts.map((record, index) => (
                    <div key={index} className="mb-3 p-2 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Record with Plaintext #{index + 1}</p>
                      {record.plaintext && (
                        <div>
                          <p className="text-sm text-gray-800 dark:text-gray-200 break-all">
                            <span className="font-semibold">Plaintext:</span> {record.plaintext}
                          </p>
                          {record.data && (
                            <div className="mt-1">
                              <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Decoded Data:</span>
                              <pre className="text-xs bg-gray-50 dark:bg-gray-900 p-1 rounded mt-1 overflow-x-auto">
                                {JSON.stringify(record.data, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                      {typeof record === 'string' ? (
                        <p className="text-sm text-gray-800 dark:text-gray-200 break-all">{record}</p>
                      ) : (
                        <div>
                          {record.owner && (
                            <p className="text-sm text-gray-800 dark:text-gray-200 break-all">
                              <span className="font-semibold">Owner:</span> {record.owner}
                            </p>
                          )}
                          {record.spent !== undefined && (
                            <p className="text-sm text-gray-800 dark:text-gray-200">
                              <span className="font-semibold">Status:</span> {record.spent ? 'Spent' : 'Unspent'}
                            </p>
                          )}
                          {record.transactionId && (
                            <p className="text-sm text-gray-800 dark:text-gray-200 break-all">
                              <span className="font-semibold">Transaction ID:</span> {record.transactionId}
                            </p>
                          )}
                          {record.programId && (
                            <p className="text-sm text-gray-800 dark:text-gray-200">
                              <span className="font-semibold">Program ID:</span> {record.programId}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {recordPlaintextsResult && (
              <div className={`mt-4 p-3 ${
                recordPlaintextsResult.includes('failed') 
                  ? 'bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30 text-red-800 dark:text-red-300' 
                  : 'bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/30 text-green-800 dark:text-green-300'
              } rounded-md`}>
                <p className="text-sm break-all">{recordPlaintextsResult}</p>
              </div>
            )}
          </div>
        </CollapsibleSection>
      )}
      
      {/* Transaction History Demo Section */}
      {connected && (
        <CollapsibleSection title="Transaction History Demo">
          <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Program ID</label>
                <input
                  type="text"
                  value={transactionHistoryProgramId}
                  onChange={(e) => setTransactionHistoryProgramId(e.target.value)}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Event Type (Puzzle only)</label>
                <select
                  value={transactionHistoryEventType}
                  onChange={(e) => setTransactionHistoryEventType(e.target.value as EventType | '')}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                >
                  <option value="">All Events</option>
                  <option value={EventType.Deploy}>Deploy</option>
                  <option value={EventType.Execute}>Execute</option>
                  <option value={EventType.Send}>Send</option>
                  <option value={EventType.Receive}>Receive</option>
                  <option value={EventType.Join}>Join</option>
                  <option value={EventType.Split}>Split</option>
                  <option value={EventType.Shield}>Shield</option>
                  <option value={EventType.Unshield}>Unshield</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Function ID (Puzzle only)</label>
                <input
                  type="text"
                  value={transactionHistoryFunctionId}
                  onChange={(e) => setTransactionHistoryFunctionId(e.target.value)}
                  placeholder="e.g., transfer_private"
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                />
              </div>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                <strong>Note:</strong> For Leo, Fox, and Soter wallets, this requires the <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">OnChainHistory</code> permission during connection.
              </p>
            </div>
            
            <button
              onClick={handleRequestTransactionHistory}
              disabled={transactionHistoryLoading || !connected}
              className={`w-full p-2 rounded-md font-medium ${
                transactionHistoryLoading
                  ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700'
              } text-white transition-colors`}
            >
              {transactionHistoryLoading ? 'Loading Transaction History...' : 'Request Transaction History'}
            </button>
            
            {lastTransactionHistory && lastTransactionHistory.length > 0 && (
              <div className="mt-4">
                <h4 className="text-md font-semibold text-gray-700 dark:text-gray-300 mb-2">Found {lastTransactionHistory.length} Transactions</h4>
                <div className="max-h-[300px] overflow-y-auto bg-gray-100 dark:bg-gray-800 p-3 rounded-lg">
                  {lastTransactionHistory.map((transaction, index) => (
                    <div key={index} className="mb-3 p-2 bg-white dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Transaction #{index + 1}</p>
                      {typeof transaction === 'string' ? (
                        <p className="text-sm text-gray-800 dark:text-gray-200 break-all">{transaction}</p>
                      ) : (
                        <div>
                          {transaction._id && (
                            <p className="text-sm text-gray-800 dark:text-gray-200 break-all">
                              <span className="font-semibold">ID:</span> {transaction._id}
                            </p>
                          )}
                          {transaction.transactionId && (
                            <p className="text-sm text-gray-800 dark:text-gray-200 break-all">
                              <span className="font-semibold">Transaction ID:</span> {transaction.transactionId}
                            </p>
                          )}
                          {transaction.type && (
                            <p className="text-sm text-gray-800 dark:text-gray-200">
                              <span className="font-semibold">Type:</span> {transaction.type}
                            </p>
                          )}
                          {transaction.status && (
                            <p className="text-sm text-gray-800 dark:text-gray-200">
                              <span className="font-semibold">Status:</span> {transaction.status}
                            </p>
                          )}
                          {transaction.programId && (
                            <p className="text-sm text-gray-800 dark:text-gray-200">
                              <span className="font-semibold">Program ID:</span> {transaction.programId}
                            </p>
                          )}
                          {transaction.functionId && (
                            <p className="text-sm text-gray-800 dark:text-gray-200">
                              <span className="font-semibold">Function ID:</span> {transaction.functionId}
                            </p>
                          )}
                          {transaction.created && (
                            <p className="text-sm text-gray-800 dark:text-gray-200">
                              <span className="font-semibold">Created:</span> {new Date(transaction.created).toLocaleString()}
                            </p>
                          )}
                          {transaction.settled && (
                            <p className="text-sm text-gray-800 dark:text-gray-200">
                              <span className="font-semibold">Settled:</span> {new Date(transaction.settled).toLocaleString()}
                            </p>
                          )}
                          {transaction.height !== undefined && (
                            <p className="text-sm text-gray-800 dark:text-gray-200">
                              <span className="font-semibold">Block Height:</span> {transaction.height}
                            </p>
                          )}
                          {transaction.inputs && transaction.inputs.length > 0 && (
                            <div className="mt-1">
                              <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Inputs:</span>
                              <pre className="text-xs bg-gray-50 dark:bg-gray-900 p-1 rounded mt-1 overflow-x-auto">
                                {JSON.stringify(transaction.inputs, null, 2)}
                              </pre>
                            </div>
                          )}
                          {transaction.error && (
                            <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                              <span className="font-semibold">Error:</span> {transaction.error}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {transactionHistoryResult && (
              <div className={`mt-4 p-3 ${
                transactionHistoryResult.includes('failed') 
                  ? 'bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30 text-red-800 dark:text-red-300' 
                  : 'bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/30 text-green-800 dark:text-green-300'
              } rounded-md`}>
                <p className="text-sm break-all">{transactionHistoryResult}</p>
              </div>
            )}
          </div>
        </CollapsibleSection>
      )}
      
      {/* Error Message */}
      {lastError && (
        <CollapsibleSection title="Error Details" defaultExpanded={true}>
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30 rounded-lg">
            <p className="text-red-700 dark:text-red-300">{lastError}</p>
          </div>
        </CollapsibleSection>
      )}
      
      {/* Connection Logs */}
      <CollapsibleSection title="Connection Logs">
        <div className="max-h-[200px] overflow-y-auto">
          {connectionLogs && connectionLogs.length > 0 ? (
            connectionLogs.map((log, index) => (
              <div key={index} className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                <span className="text-xs text-gray-500 dark:text-gray-500">[{new Date(log.timestamp).toLocaleTimeString()}]</span> {log.event}
              </div>
            ))
          ) : (
            <p className="text-gray-600 dark:text-gray-400 text-sm">No connection logs available</p>
          )}
        </div>
      </CollapsibleSection>
    </div>
  );
} 