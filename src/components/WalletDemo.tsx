import { useState, useEffect } from 'react';
import {
  useConnect,
  useAccount,
  useTransaction,
  useSignMessage,
  useDecrypt,
  useRecords,
  Transaction
} from 'aleo-hooks';
import { RecordStatus, EventType } from '@puzzlehq/types';
import { useTheme } from '../contexts/ThemeContext';
import { requestCreateEvent } from "@puzzlehq/sdk"

import { Transaction as LeoTransaction } from '@demox-labs/aleo-wallet-adapter-base';

// Import wallet images
import puzzleIcon from '../assets/puzzlewallet.png';
import leoIcon from '../assets/leowallet.png';
import foxIcon from '../assets/foxwallet.svg';
import soterIcon from '../assets/soterwallet.png';

// Wallet configurations
const WALLET_CONFIG = {
  puzzle: {
    id: 'puzzle',
    name: 'Puzzle Wallet',
    icon: puzzleIcon,
    adapterId: 'Puzzle Wallet',
    windowProperty: 'puzzle',
    chainId: 'testnet3'
  },
  leoWallet: {
    id: 'leoWallet',
    name: 'Leo Wallet',
    icon: leoIcon,
    adapterId: 'Leo Wallet',
    windowProperty: 'leoWallet',
    chainId: 'testnetbeta'
  },
  foxwallet: {
    id: 'foxwallet',
    name: 'Fox Wallet',
    icon: foxIcon,
    adapterId: 'Fox Wallet',
    windowProperty: 'foxwallet',
    chainId: 'testnet3'
  },
  soter: {
    id: 'soter',  
    name: 'Soter Wallet',
    icon: soterIcon,
    adapterId: 'Soter Wallet',
    windowProperty: 'soter',
    chainId: 'testnet3'
  }
};

// Extend Window interface for wallet detection
declare global {
  interface Window {
    puzzle?: any;
    leoWallet?: any;
    foxwallet?: any;
    soter?: any;
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
  const [selectedWallet, setSelectedWallet] = useState<'puzzle' | 'leoWallet' | 'foxwallet' | 'soter' | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<string>('');
  const [lastError, setLastError] = useState<string | null>(null);
  const [connectionLogs, setConnectionLogs] = useState<{timestamp: Date, event: string, data?: any}[]>([]);
  const [walletName, setWalletName] = useState<string | null>(null);
  const [previousWalletName, setPreviousWalletName] = useState<string | null>(null);
  
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
  const { connecting: connectLoading, error: connectError } = useConnect();
  const { publicKey: address, connected } = useAccount();
  const { executeTransaction, transactionId } = useTransaction();
  const { signMessage } = useSignMessage();
  const { decrypt, decryptedText } = useDecrypt({ 
    cipherText: decryptCiphertext,
    enabled: decryptCiphertext.length > 0 
  });
  const { records } = useRecords({ program: recordsProgramId });

  // Handle wallet changes to simulate a hot reload
  useEffect(() => {
    if (walletName && walletName !== previousWalletName) {
      setPreviousWalletName(walletName);
      
      // Reset transaction states on wallet change
      const timeout = setTimeout(() => {
        setTransactionPending(false);
        setTransactionResult(null);
        addLog(`Wallet changed to ${walletName}`);
      }, 500);
      
      return () => clearTimeout(timeout);
    }
  }, [walletName, previousWalletName]);

  // Helper function to add logs
  const addLog = (event: string, data?: any) => {
    setConnectionLogs(prevLogs => {
      const newLog = { timestamp: new Date(), event, data };
      // Keep only the last 10 logs
      const updatedLogs = [newLog, ...prevLogs].slice(0, 10);
      return updatedLogs;
    });
  };

  // Effect for connection status
  useEffect(() => {
    if (connected) {
      setConnectionStatus('Connected');
      setLastError(null);
    } else if (connectLoading) {
      setConnectionStatus('Connecting...');
    } else if (connectError) {
      const errorMessage = typeof connectError === 'object' && connectError !== null && 'message' in connectError 
        ? (connectError as Error).message 
        : 'Unknown connection error';
      setConnectionStatus(`Error: ${errorMessage}`);
      setLastError(errorMessage);
    } else {
      setConnectionStatus(lastError ? `Disconnected (last error: ${lastError})` : 'Disconnected');
    }
  }, [connected, connectLoading, connectError, lastError]);

  // Add effect to sync with the ConnectWallet component via custom event
  useEffect(() => {
    // Listen for wallet connected events from ConnectWallet component
    const handleWalletConnectedEvent = (event: any) => {
      const { walletId, walletName: connectedWalletName } = event.detail;
      
      // Update our local state to match the connected wallet
      setSelectedWallet(walletId as any);
      setWalletName(connectedWalletName);
      
      // Log the sync
      addLog(`Synced with wallet selection: ${connectedWalletName}`);
    };
    
    // Listen for wallet disconnected events
    const handleWalletDisconnectedEvent = () => {
      // Clear wallet state
      setWalletName(null);
      setSelectedWallet(null);
      
      // Log the sync
      addLog(`Synced wallet disconnection`);
    };
    
    // Add event listeners
    window.addEventListener('walletConnected', handleWalletConnectedEvent);
    window.addEventListener('walletDisconnected', handleWalletDisconnectedEvent);
    
    // Cleanup
    return () => {
      window.removeEventListener('walletConnected', handleWalletConnectedEvent);
      window.removeEventListener('walletDisconnected', handleWalletDisconnectedEvent);
    };
  }, []);

  // Effect to reset selected wallet when disconnected
  useEffect(() => {
    if (!connected && !connectLoading && selectedWallet) {
      setSelectedWallet(null);
    }
  }, [connected, connectLoading, selectedWallet]);

  // Effect to update transaction result when transaction ID changes
  useEffect(() => {
    if (transactionId) {
      setTransactionResult(`Transaction ID: ${transactionId}`);
    }
  }, [transactionId]);

  // Add an effect to detect wallet changes even when already connected
  // This helps synchronize with the ConnectWallet component
  useEffect(() => {
    if (connected) {
      // Directly use the current wallet adapter state from the useAccount hook
      // This is much simpler than trying to detect it ourselves
    }
  }, [connected]);

  // Handle transaction request
  const handleExecuteTransaction = async () => {
    if (!connected) {
      setLastError('Wallet not connected');
      addLog('Transaction failed', 'Wallet not connected');
      return;
    }

    setTransactionPending(true);
    setTransactionResult(null);
    addLog('Requesting transaction execution', {
      program: transactionProgramId,
      function: transactionFunctionId,
      fee: transactionFee
    });

    try {
      const currentWalletName = walletName;
      
      if (!currentWalletName) {
        throw new Error("Wallet name not set, cannot determine wallet type");
      }
      
      // Get wallet configuration
      const walletConfig = selectedWallet 
        ? WALLET_CONFIG[selectedWallet] 
        : Object.values(WALLET_CONFIG).find(w => w.name === currentWalletName);
      
      if (!walletConfig) {
        throw new Error(`Unknown wallet configuration: ${currentWalletName}`);
      }
      
      // Small delay to ensure wallet is ready
      await new Promise(resolve => setTimeout(resolve, 300));
      
      if (!executeTransaction) {
        setLastError("Transaction function not initialized yet. Please try again.");
        return;
      }
      
      let txId;
      
      // For Leo Wallet, try direct wallet access first
      if (currentWalletName === 'Leo Wallet' && window.leoWallet && 
          typeof window.leoWallet.requestTransaction === 'function') {
        try {
          const transaction = LeoTransaction.createTransaction(
            address!, 
            walletConfig.chainId,
            transactionProgramId,
            transactionFunctionId,
            [receiverAddress, `${transactionAmount}u64`],
            parseInt(transactionFee),
            false
          );
          
          txId = await window.leoWallet.requestTransaction(transaction);
          if (txId) {
            console.log(txId)
            setTransactionResult(`Transaction submitted: ${txId.transactionId}`);
            addLog('Transaction submitted', { transactionId: txId.transactionId });
            setTransactionPending(false);
            return;
          }
        } catch (error) {
          console.log(error)
        }
      } else if (currentWalletName === 'Puzzle Wallet') {

        console.log("Puzzle Wallet");
              // Create transaction with appropriate format based on wallet type
      const inputs = [receiverAddress, `${transactionAmount}u64`];
      const fee = 0.1;
      console.log(fee)

        const createEventResponse = await requestCreateEvent({
          type: EventType.Execute,
          programId: transactionProgramId,
          functionId: transactionFunctionId,
          fee: fee,
          inputs: inputs
        });


        console.log(createEventResponse);
        const txId = createEventResponse.eventId;
        setTransactionResult(`Transaction submitted: ${txId}`);
        addLog('Transaction submitted', { transactionId: txId });
        setTransactionPending(false);
        return;
      }
      
      // Create transaction with appropriate format based on wallet type
      const inputs = [receiverAddress, `${transactionAmount}u64`];
      const fee = parseInt(transactionFee);
      
      // Generic transaction handler for other wallet types
      const transaction = Transaction.createTransaction(
        address!,
        walletConfig.chainId,
        transactionProgramId,
        transactionFunctionId,
        inputs,
        fee,
        false
      );
      txId = await executeTransaction(transaction);
      
      setTransactionResult(`Transaction submitted: ${txId}`);
      addLog('Transaction submitted', { transactionId: txId });
    } catch (error: any) {
      console.error('Transaction error:', error);
      const errorMessage = error.message || 'Unknown transaction error';
      setLastError(errorMessage);
      setTransactionResult(`Error: ${errorMessage}`);
      addLog('Transaction failed', errorMessage);
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
    <div className="container p-4 mx-auto max-w-3xl">
      <CollapsibleSection title="Wallet Connection" defaultExpanded={true}>
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
          
          {address && (
            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <p className="text-gray-700 dark:text-gray-300 mb-1 break-all">
                <span className="font-semibold">Address:</span> {address || 'Not available'}
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                <span className="font-semibold">Wallet Name:</span> {walletName || 'Unknown'}
              </p>
            </div>
          )}
        </div>
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
              onClick={handleExecuteTransaction}
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