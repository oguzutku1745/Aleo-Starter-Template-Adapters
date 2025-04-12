import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as PuzzleSDK from '@puzzlehq/sdk';
import {
  DecryptPermission,
  WalletAdapterNetwork as DemoxWalletAdapterNetwork,
  Transaction
} from '@demox-labs/aleo-wallet-adapter-base';
import {
  FoxWalletAdapter,
  SoterWalletAdapter
} from 'aleo-adapters';
import { LeoWalletAdapter } from '@demox-labs/aleo-wallet-adapter-leo';
import { EventType, RecordStatus } from '@puzzlehq/types';

// Extend Window interface for Leo and Aleo wallets
declare global {
  interface Window {
    leoWallet?: any;
    aleo?: any;
  }
}

// Define types for debugging
interface ConnectionLog {
  timestamp: Date;
  event: string;
  data?: any;
}

// Define transaction parameters
interface TransactionParams {
  programId: string;
  functionName: string;
  inputs: any[];
  fee: number;
}

// Define transaction result
interface TransactionResult {
  transactionId?: string;
  error?: string;
}

// Define signature parameters
interface SignatureParams {
  message: string;
}

// Define signature result
interface SignatureResult {
  signature?: string;
  error?: string;
}

// Define decrypt parameters
interface DecryptParams {
  ciphertexts: string[];
}

// Define decrypt result
interface DecryptResult {
  plaintexts?: string[];
  error?: string;
}

// Define record parameters
interface RecordParams {
  programId: string;
  status?: RecordStatus;
}

// Define record result
interface RecordResult {
  records?: any[];
  error?: string;
}

// Define record plaintexts parameters (same as record parameters for consistency)
interface RecordPlaintextsParams {
  programId: string;
  status?: RecordStatus;
}

// Define record plaintexts result
interface RecordPlaintextsResult {
  recordsWithPlaintext?: any[];
  error?: string;
}

// Define transaction history parameters
interface TransactionHistoryParams {
  programId: string;
  eventType?: EventType;
  functionId?: string;
}

// Define transaction history result
interface TransactionHistoryResult {
  transactions?: any[];
  error?: string;
}

// Define wallet context type
interface WalletContextType {
  connected: boolean;
  connecting: boolean;
  address: string | null;
  walletName: string | null;
  connectionLogs: ConnectionLog[];
  errorMessage: string | null;
  connectWallet: (type: 'puzzle' | 'leo' | 'fox' | 'soter') => Promise<void>;
  disconnectWallet: () => Promise<void>;
  createTransaction: (params: TransactionParams) => Promise<TransactionResult>;
  signMessage: (params: SignatureParams) => Promise<SignatureResult>;
  decryptMessage: (params: DecryptParams) => Promise<DecryptResult>;
  getRecords: (params: RecordParams) => Promise<RecordResult>;
  getRecordPlaintexts: (params: RecordPlaintextsParams) => Promise<RecordPlaintextsResult>;
  getTransactionHistory: (params: TransactionHistoryParams) => Promise<TransactionHistoryResult>;
  transactionPending: boolean;
  lastTransactionId: string | null;
  signaturePending: boolean;
  lastSignature: string | null;
  decryptPending: boolean;
  lastDecryptedTexts: string[] | null;
  recordsLoading: boolean;
  lastRecords: any[] | null;
  recordPlaintextsLoading: boolean;
  lastRecordPlaintexts: any[] | null;
  transactionHistoryLoading: boolean;
  lastTransactionHistory: any[] | null;
}

// Create context with default values
const WalletContext = createContext<WalletContextType>({
  connected: false,
  connecting: false,
  address: null,
  walletName: null,
  connectionLogs: [],
  errorMessage: null,
  connectWallet: async () => {},
  disconnectWallet: async () => {},
  createTransaction: async () => ({ error: 'Wallet not connected' }),
  signMessage: async () => ({ error: 'Wallet not connected' }),
  decryptMessage: async () => ({ error: 'Wallet not connected' }),
  getRecords: async () => ({ error: 'Wallet not connected' }),
  getRecordPlaintexts: async () => ({ error: 'Wallet not connected' }),
  getTransactionHistory: async () => ({ error: 'Wallet not connected' }),
  transactionPending: false,
  lastTransactionId: null,
  signaturePending: false,
  lastSignature: null,
  decryptPending: false,
  lastDecryptedTexts: null,
  recordsLoading: false,
  lastRecords: null,
  recordPlaintextsLoading: false,
  lastRecordPlaintexts: null,
  transactionHistoryLoading: false,
  lastTransactionHistory: null
});

// Initialize wallet adapters
const foxAdapter = new FoxWalletAdapter({ 
  appName: "Snark Collective" 
});

const soterAdapter = new SoterWalletAdapter({ 
  appName: "Snark Collective" 
});

// Create the provider component
export function WalletProvider({ children }: { children: ReactNode }) {
  // State variables
  const [connectionLogs, setConnectionLogs] = useState<ConnectionLog[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [walletName, setWalletName] = useState<string | null>(null);
  const [usingPuzzle, setUsingPuzzle] = useState(false);
  const [leoWalletAdapter, setLeoWalletAdapter] = useState<LeoWalletAdapter | null>(null);
  const [foxWalletAdapter, setFoxWalletAdapter] = useState<FoxWalletAdapter | null>(null);
  const [soterWalletAdapter, setSoterWalletAdapter] = useState<SoterWalletAdapter | null>(null);
  const [transactionPending, setTransactionPending] = useState(false);
  const [lastTransactionId, setLastTransactionId] = useState<string | null>(null);
  const [signaturePending, setSignaturePending] = useState(false);
  const [lastSignature, setLastSignature] = useState<string | null>(null);
  const [decryptPending, setDecryptPending] = useState(false);
  const [lastDecryptedTexts, setLastDecryptedTexts] = useState<string[] | null>(null);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [lastRecords, setLastRecords] = useState<any[] | null>(null);
  const [recordPlaintextsLoading, setRecordPlaintextsLoading] = useState(false);
  const [lastRecordPlaintexts, setLastRecordPlaintexts] = useState<any[] | null>(null);
  const [transactionHistoryLoading, setTransactionHistoryLoading] = useState(false);
  const [lastTransactionHistory, setLastTransactionHistory] = useState<any[] | null>(null);

  // Add connection log
  const addLog = (event: string, data?: any) => {
    setConnectionLogs(prevLogs => {
      const newLog = { timestamp: new Date(), event, data };
      // Keep only the last 10 logs
      const updatedLogs = [newLog, ...prevLogs].slice(0, 10);
      return updatedLogs;
    });
  };

  // Reset state function
  const resetState = () => {
    setAddress(null);
    setConnected(false);
    setWalletName(null);
    setUsingPuzzle(false);
    setLeoWalletAdapter(null);
    setFoxWalletAdapter(null);
    setSoterWalletAdapter(null);
    setLastTransactionId(null);
    setLastSignature(null);
    setLastDecryptedTexts(null);
    setLastRecords(null);
    setLastRecordPlaintexts(null);
    setLastTransactionHistory(null);
  };

  // Handle connection errors
  const handleConnectionError = (error: any, walletDisplayName: string) => {
    console.error(`${walletDisplayName} connection error:`, error);
    setErrorMessage(`${walletDisplayName} error: ${error?.message || "Unknown error"}`);
    addLog(`${walletDisplayName} connection error: ${error?.message || "Unknown error"}`);
  };

  // Handle operation errors (generalized error handler for all wallet operations)
  const handleOperationError = (error: any, operationType: string) => {
    const errorMsg = error?.message || `Unknown error during ${operationType}`;
    setErrorMessage(`${operationType} error: ${errorMsg}`);
    addLog(`${operationType} error: ${errorMsg}`);
    return { error: errorMsg };
  };

  // Initial connection check for Puzzle wallet with multiple retry attempts
  useEffect(() => {
    let attemptCount = 0;
    const maxAttempts = 3;
    const finalCheckDelay = 2000; // ms
    
    const checkConnection = async (attempt?: number) => {
      try {
        if (attempt) {
          addLog(`Connection attempt ${attempt}/${maxAttempts}`);
        }
        
        const accountResponse = await PuzzleSDK.getAccount();
        if (accountResponse && accountResponse.account && accountResponse.account.address) {
          setAddress(accountResponse.account.address);
          setConnected(true);
          setWalletName('Puzzle Wallet');
          setUsingPuzzle(true);
          addLog('Connection detected!', accountResponse);
          return true;
        }
        return false;
      } catch (error: any) {
        if (attempt) {
          addLog(`Connection attempt ${attempt} failed: ${error.message || 'Unknown error'}`);
        }
        return false;
      }
    };
    
    const attemptConnection = async () => {
      if (await checkConnection()) return;
      
      // Connection not found on first try, make multiple attempts
      const attemptWithRetry = async () => {
        attemptCount++;
        await checkConnection(attemptCount);
        
        if (attemptCount < maxAttempts) {
          setTimeout(attemptWithRetry, 1000);
        } else {
          // After all attempts, wait a bit longer and try one final time
          addLog('All connection attempts appeared to fail. Checking one last time after delay...');
          setTimeout(async () => {
            const connected = await checkConnection();
            if (connected) {
              addLog('Connection detected after delay!');
            }
          }, finalCheckDelay);
        }
      };
      
      attemptWithRetry();
    };
    
    attemptConnection();
  }, []);

  // Connect to Puzzle using SDK
  const connectPuzzleSDK = async () => {
    try {
      setErrorMessage(null);
      setConnecting(true);
      setUsingPuzzle(true);
      
      addLog('Connecting to Puzzle using SDK...');
      
      // First check if already connected
      try {
        const existingAccount = await PuzzleSDK.getAccount();
        if (existingAccount && existingAccount.account && existingAccount.account.address) {
          setAddress(existingAccount.account.address);
          setConnected(true);
          setWalletName('Puzzle Wallet');
          addLog('Already connected to Puzzle', existingAccount);
          return;
        }
      } catch (e) {
        // Not connected, continue with connect flow
        addLog('No existing connection, proceeding with connect');
      }
      
      // Make multiple connection attempts
      let attemptCount = 0;
      const maxAttempts = 3;
      
      const attemptConnect = async (): Promise<boolean> => {
        attemptCount++;
        addLog(`Connection attempt ${attemptCount}/${maxAttempts}`);
        
        try {
          const result = await PuzzleSDK.connect({
            dAppInfo: {
              name: "Snark Collective",
              description: "Snark Collective App",
            },
            permissions: {
              programIds: {[PuzzleSDK.Network.AleoTestnet]: ['credits.aleo']}
            }
          });
          
          if (result && result.connection) {
            const accountResponse = await PuzzleSDK.getAccount();
            if (accountResponse && accountResponse.account && accountResponse.account.address) {
              setAddress(accountResponse.account.address);
              setConnected(true);
              setWalletName('Puzzle Wallet');
              addLog('Connected successfully to Puzzle', accountResponse);
              return true;
            }
          }
          return false;
        } catch (error: any) {
          addLog(`Connection attempt ${attemptCount} failed: ${error.message || 'Unknown error'}`);
          return false;
        }
      };
      
      // Try connection with retries
      let connected = await attemptConnect();
      while (!connected && attemptCount < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        connected = await attemptConnect();
      }
      
      // Final check after a delay if all attempts appeared to fail
      if (!connected) {
        addLog('All connection attempts appeared to fail. Checking one last time after delay...');
        setTimeout(async () => {
          try {
            const accountResponse = await PuzzleSDK.getAccount();
            if (accountResponse && accountResponse.account && accountResponse.account.address) {
              setAddress(accountResponse.account.address);
              setConnected(true);
              setWalletName('Puzzle Wallet');
              addLog('Connection detected after delay!', accountResponse);
            }
          } catch (e) {
            // Still not connected
          }
        }, 2000);
      }
      
    } catch (error: any) {
      handleConnectionError(error, "Puzzle Wallet");
    } finally {
      setConnecting(false);
    }
  };

  // Connect to Leo wallet
  const connectLeoWallet = async () => {
    try {
      setErrorMessage(null);
      setConnecting(true);
      addLog("Connecting to Leo Wallet...");
      
      // Try to directly access the Leo wallet extension
      if (typeof window.leoWallet !== 'undefined') {
        addLog("Leo wallet extension detected, attempting direct connection...");
        try {
          const accounts = await window.leoWallet.requestAccounts();
          if (accounts && accounts.length > 0) {
            const address = accounts[0];
            setAddress(address);
            setConnected(true);
            setWalletName('Leo Wallet');
            setUsingPuzzle(false);
            addLog(`Connected to Leo wallet directly: ${address}`);
            return;
          }
        } catch (directError: any) {
          addLog(`Direct Leo wallet error: ${directError?.message || "Unknown error"}`);
        }
      } else {
        addLog("Leo wallet extension not detected in window.leoWallet");
      }
      
      // Fall back to adapter approach
      try {
        // Create a fresh adapter instance with official parameters
        const leoWallet = new LeoWalletAdapter({
          appName: "Snark Collective",
          isMobile: false,
        });
        
        addLog("Attempting Leo wallet connection with adapter...");
        
        // Connect with OnChainHistory permission to support record plaintexts
        await leoWallet.connect(
          DecryptPermission.OnChainHistory,
          DemoxWalletAdapterNetwork.TestnetBeta,
          ["credits.aleo"]
        );
        
        if (leoWallet.publicKey) {
          const address = leoWallet.publicKey;
          setAddress(address);
          setConnected(true);
          setWalletName('Leo Wallet');
          setUsingPuzzle(false);
          setLeoWalletAdapter(leoWallet);
          addLog(`Connected successfully to Leo wallet: ${address}`);
        } else {
          throw new Error("Could not get Leo wallet public key");
        }
      } catch (error: any) {
        handleConnectionError(error, "Leo Wallet");
        
        // More detailed error for the user
        if (error.message && (error.message.includes("not detected") || 
            error.message.includes("INVALID_PARAMS"))) {
          addLog("Make sure Leo wallet is installed and unlocked. Visit https://leo.app/ to install.");
        }
      }
    } finally {
      setConnecting(false);
    }
  };

  // Connect to Fox or Soter wallet 
  const connectOtherWallet = async (walletName: 'fox' | 'soter') => {
    try {
      setErrorMessage(null);
      setConnecting(true);
      
      const adapter = walletName === 'fox' ? foxAdapter : soterAdapter;
      const displayName = walletName === 'fox' ? 'Fox Wallet' : 'Soter Wallet';
      
      addLog(`Connecting to ${displayName}...`);
      
      try {
        // Connect directly to the adapter with OnChainHistory permission to support record plaintexts
        await adapter.connect(
          DecryptPermission.OnChainHistory,
          DemoxWalletAdapterNetwork.Testnet
        );
        
        // Check for success
        if (adapter.publicKey) {
          const walletAddress = adapter.publicKey;
          setAddress(walletAddress);
          setConnected(true);
          setWalletName(displayName);
          setUsingPuzzle(false);
          
          // Store the adapter instance in state for transaction use
          if (walletName === 'fox') {
            setFoxWalletAdapter(adapter as FoxWalletAdapter);
          } else {
            setSoterWalletAdapter(adapter as SoterWalletAdapter);
          }
          
          addLog(`Connected directly to ${displayName}: ${walletAddress}`);
        } else {
          throw new Error(`Could not get ${displayName} public key`);
        }
      } catch (error: any) {
        handleConnectionError(error, displayName);
      }
    } finally {
      setConnecting(false);
    }
  };

  // Disconnect from wallet
  const disconnectWallet = async () => {
    try {
      setErrorMessage(null);
      addLog("Disconnecting from wallet...");
      
      if (usingPuzzle) {
        try {
          await PuzzleSDK.disconnect();
        } catch (e) {
          // Ignore disconnect errors and continue
        }
      }
      
      // Reset all state
      resetState();
      addLog("Disconnected successfully");
    } catch (error: any) {
      console.error("Disconnection error:", error);
      setErrorMessage(error?.message || "Failed to disconnect");
      addLog(`Disconnection error: ${error?.message || "Unknown error"}`);
    }
  };

  // Main connect wallet method
  const connectWallet = async (type: 'puzzle' | 'leo' | 'fox' | 'soter') => {
    switch (type) {
      case 'puzzle':
        await connectPuzzleSDK();
        break;
      case 'leo':
        await connectLeoWallet();
        break;
      case 'fox':
        await connectOtherWallet('fox');
        break;
      case 'soter':
        await connectOtherWallet('soter');
        break;
    }
  };

  // Create transaction method that works with all wallet types
  const createTransaction = async (params: TransactionParams): Promise<TransactionResult> => {
    const { programId, functionName, inputs, fee } = params;

    if (!connected || !address) {
      return { error: 'Wallet not connected' };
    }

    setTransactionPending(true);
    setErrorMessage(null);
    addLog(`Creating transaction for ${programId}.${functionName} with fee ${fee} and inputs ${JSON.stringify(inputs)}`);

    try {
      // Handle transaction based on wallet type
      if (usingPuzzle) {
        // Use Puzzle SDK for transaction
        addLog(`Creating Puzzle transaction with inputs: ${JSON.stringify(inputs)}`);

        const createEventResponse = await PuzzleSDK.requestCreateEvent({
          type: EventType.Execute,
          programId: programId,
          functionId: functionName,
          fee: fee,
          inputs: inputs
        });

        if (createEventResponse.error) {
          setErrorMessage(`Transaction error: ${createEventResponse.error}`);
          addLog(`Puzzle transaction error: ${createEventResponse.error}`);
          return { error: createEventResponse.error };
        }

        const txId = createEventResponse.eventId;
        setLastTransactionId(txId || null);
        addLog(`Puzzle transaction created successfully with ID: ${txId}`);
        return { transactionId: txId };
      } else if ((walletName === 'Leo Wallet' && leoWalletAdapter) || 
                 (walletName === 'Fox Wallet' && foxWalletAdapter) || 
                 (walletName === 'Soter Wallet' && soterWalletAdapter)) {
        // Common pattern for all wallet adapters
        const adapter = walletName === 'Leo Wallet' ? leoWalletAdapter : 
                       walletName === 'Fox Wallet' ? foxWalletAdapter : 
                       soterWalletAdapter;
        
        // Select the correct network enum
        const network = walletName === 'Leo Wallet' ? 
                      DemoxWalletAdapterNetwork.TestnetBeta : 
                      DemoxWalletAdapterNetwork.Testnet;
        
        addLog(`Creating ${walletName} transaction with inputs: ${JSON.stringify(inputs)}`);

        const transaction = Transaction.createTransaction(
          address,
          network,
          programId,
          functionName,
          inputs,
          fee,
          false
        );

        const txId = await adapter!.requestTransaction(transaction);
        setLastTransactionId(txId);
        addLog(`${walletName} transaction created successfully with ID: ${txId}`);
        return { transactionId: txId };
      } else {
        const errorMsg = 'Transaction creation not supported for this wallet type';
        setErrorMessage(errorMsg);
        addLog(errorMsg);
        return { error: errorMsg };
      }
    } catch (error: any) {
      return handleOperationError(error, 'Transaction');
    } finally {
      setTransactionPending(false);
    }
  };

  // Sign message method that works with all wallet types
  const signMessage = async (params: SignatureParams): Promise<SignatureResult> => {
    const { message } = params;

    if (!connected || !address) {
      return { error: 'Wallet not connected' };
    }

    setSignaturePending(true);
    setErrorMessage(null);
    addLog(`Signing message: "${message}"`);

    try {
      // Handle signature based on wallet type
      if (usingPuzzle) {
        // Use Puzzle SDK for signature
        addLog(`Requesting signature from Puzzle wallet`);

        const signatureResponse = await PuzzleSDK.requestSignature({
          message: message
        });

        if (!signatureResponse || !signatureResponse.signature) {
          const errorMessage = "Error during signature creation";
          setErrorMessage(`Signature error: ${errorMessage}`);
          addLog(`Puzzle signature error: ${errorMessage}`);
          return { error: errorMessage };
        }

        const signature = signatureResponse.signature;
        setLastSignature(signature);
        addLog(`Puzzle signature created successfully: ${signature}`);
        return { signature };
      } else if ((walletName === 'Leo Wallet' && leoWalletAdapter) || 
                 (walletName === 'Fox Wallet' && foxWalletAdapter) || 
                 (walletName === 'Soter Wallet' && soterWalletAdapter)) {
        // Common pattern for all wallet adapters
        const adapter = walletName === 'Leo Wallet' ? leoWalletAdapter : 
                       walletName === 'Fox Wallet' ? foxWalletAdapter : 
                       soterWalletAdapter;
        
        addLog(`Requesting signature from ${walletName}`);

        const bytes = new TextEncoder().encode(message);
        const signatureBytes = await adapter!.signMessage(bytes);
        const signature = new TextDecoder().decode(signatureBytes);
        
        setLastSignature(signature);
        addLog(`${walletName} signature created successfully: ${signature}`);
        return { signature };
      } else {
        const errorMsg = 'Message signing not supported for this wallet type';
        setErrorMessage(errorMsg);
        addLog(errorMsg);
        return { error: errorMsg };
      }
    } catch (error: any) {
      return handleOperationError(error, 'Signature');
    } finally {
      setSignaturePending(false);
    }
  };

  // Decrypt message method that works with all wallet types
  const decryptMessage = async (params: DecryptParams): Promise<DecryptResult> => {
    const { ciphertexts } = params;

    if (!connected || !address) {
      return { error: 'Wallet not connected' };
    }

    if (!ciphertexts || ciphertexts.length === 0) {
      return { error: 'No ciphertexts provided' };
    }

    setDecryptPending(true);
    setErrorMessage(null);
    addLog(`Decrypting ${ciphertexts.length} ciphertext(s)`);

    try {
      // Handle decryption based on wallet type
      if (usingPuzzle) {
        // Use Puzzle SDK for decryption
        addLog(`Requesting decryption from Puzzle wallet`);

        const decryptResponse = await PuzzleSDK.decrypt({
          ciphertexts: ciphertexts
        });

        if (!decryptResponse || !decryptResponse.plaintexts) {
          const errorMessage = "Error during decryption";
          setErrorMessage(`Decryption error: ${errorMessage}`);
          addLog(`Puzzle decryption error: ${errorMessage}`);
          return { error: errorMessage };
        }

        const plaintexts = decryptResponse.plaintexts;
        setLastDecryptedTexts(plaintexts);
        addLog(`Puzzle decryption successful for ${plaintexts.length} ciphertext(s)`);
        return { plaintexts };
      } else if ((walletName === 'Leo Wallet' && leoWalletAdapter) || 
                 (walletName === 'Fox Wallet' && foxWalletAdapter) || 
                 (walletName === 'Soter Wallet' && soterWalletAdapter)) {
        // Use adapter for decryption (common pattern for all adapters)
        const adapter = walletName === 'Leo Wallet' ? leoWalletAdapter : 
                        walletName === 'Fox Wallet' ? foxWalletAdapter : 
                        soterWalletAdapter;
        
        addLog(`Requesting decryption from ${walletName}`);
        
        const plaintexts: string[] = [];
        
        // Adapters only decrypt one ciphertext at a time
        for (const ciphertext of ciphertexts) {
          try {
            const plaintext = await adapter!.decrypt(ciphertext);
            plaintexts.push(plaintext);
          } catch (error: any) {
            addLog(`Error decrypting ciphertext with ${walletName}: ${error.message || 'Unknown error'}`);
            throw error;
          }
        }
        
        setLastDecryptedTexts(plaintexts);
        addLog(`${walletName} decryption successful for ${plaintexts.length} ciphertext(s)`);
        return { plaintexts };
      } else {
        const errorMsg = 'Decryption not supported for this wallet type';
        setErrorMessage(errorMsg);
        addLog(errorMsg);
        return { error: errorMsg };
      }
    } catch (error: any) {
      return handleOperationError(error, 'Decryption');
    } finally {
      setDecryptPending(false);
    }
  };

  // Get records method that works with all wallet types
  const getRecords = async (params: RecordParams): Promise<RecordResult> => {
    const { programId, status } = params;

    if (!connected || !address) {
      return { error: 'Wallet not connected' };
    }

    setRecordsLoading(true);
    setErrorMessage(null);
    addLog(`Requesting records for program ${programId}`);

    try {
      // Handle record request based on wallet type
      if (usingPuzzle) {
        // Use Puzzle SDK for record request
        addLog(`Requesting records from Puzzle wallet for program ${programId}`);

        const filter: any = {
          programIds: [programId]
        };

        if (status) {
          filter.status = status;
        }

        const recordsResponse = await PuzzleSDK.getRecords({
          filter: filter,
          address: address
        });

        if (!recordsResponse || !recordsResponse.records) {
          const errorMessage = "Error fetching records";
          setErrorMessage(`Records error: ${errorMessage}`);
          addLog(`Puzzle records error: ${errorMessage}`);
          return { error: errorMessage };
        }

        const records = recordsResponse.records;
        setLastRecords(records);
        addLog(`Puzzle records fetched successfully: ${records.length} records found`);
        return { records };
      } else if (walletName === 'Leo Wallet' && leoWalletAdapter) {
        // Use Leo wallet adapter for record request
        addLog(`Requesting records from Leo wallet for program ${programId}`);

        try {
          const records = await leoWalletAdapter.requestRecords(programId);
          setLastRecords(records);
          addLog(`Leo wallet records fetched successfully: ${records.length} records found`);
          return { records };
        } catch (error: any) {
          addLog(`Error fetching records with Leo wallet: ${error.message || 'Unknown error'}`);
          throw error;
        }
      } else if (walletName === 'Fox Wallet' && foxWalletAdapter) {
        // Use Fox wallet adapter for record request
        addLog(`Requesting records from Fox wallet for program ${programId}`);

        try {
          const records = await foxWalletAdapter.requestRecords(programId);
          setLastRecords(records);
          addLog(`Fox wallet records fetched successfully: ${records.length} records found`);
          return { records };
        } catch (error: any) {
          addLog(`Error fetching records with Fox wallet: ${error.message || 'Unknown error'}`);
          throw error;
        }
      } else if (walletName === 'Soter Wallet' && soterWalletAdapter) {
        // Use Soter wallet adapter for record request
        addLog(`Requesting records from Soter wallet for program ${programId}`);

        try {
          const records = await soterWalletAdapter.requestRecords(programId);
          setLastRecords(records);
          addLog(`Soter wallet records fetched successfully: ${records.length} records found`);
          return { records };
        } catch (error: any) {
          addLog(`Error fetching records with Soter wallet: ${error.message || 'Unknown error'}`);
          throw error;
        }
      } else {
        const errorMsg = 'Record request not supported for this wallet type';
        setErrorMessage(errorMsg);
        addLog(errorMsg);
        return { error: errorMsg };
      }
    } catch (error: any) {
      const errorMsg = error?.message || 'Unknown error fetching records';
      setErrorMessage(`Records error: ${errorMsg}`);
      addLog(`Record request error: ${errorMsg}`);
      return { error: errorMsg };
    } finally {
      setRecordsLoading(false);
    }
  };

  // Get record plaintexts method that works with all wallet types
  const getRecordPlaintexts = async (params: RecordPlaintextsParams): Promise<RecordPlaintextsResult> => {
    const { programId, status } = params;

    if (!connected || !address) {
      return { error: 'Wallet not connected' };
    }

    setRecordPlaintextsLoading(true);
    setErrorMessage(null);
    addLog(`Requesting record plaintexts for program ${programId}`);

    try {
      // Handle record plaintexts request based on wallet type
      if (usingPuzzle) {
        // Use Puzzle SDK for record request - for Puzzle, we use the same getRecords method
        // since it already includes plaintext information
        addLog(`Requesting record plaintexts from Puzzle wallet for program ${programId}`);

        const filter: any = {
          programIds: [programId]
        };

        if (status) {
          filter.status = status;
        }

        const recordsResponse = await PuzzleSDK.getRecords({
          filter: filter,
          address: address
        });

        if (!recordsResponse || !recordsResponse.records) {
          const errorMessage = "Error fetching record plaintexts";
          setErrorMessage(`Record plaintexts error: ${errorMessage}`);
          addLog(`Puzzle record plaintexts error: ${errorMessage}`);
          return { error: errorMessage };
        }

        // We already have the records with plaintext in Puzzle's response
        const recordsWithPlaintext = recordsResponse.records;
        setLastRecordPlaintexts(recordsWithPlaintext);
        addLog(`Puzzle record plaintexts fetched successfully: ${recordsWithPlaintext.length} records found`);
        return { recordsWithPlaintext };
      } else if (walletName === 'Leo Wallet' && leoWalletAdapter) {
        // Use Leo wallet adapter for record plaintexts request
        addLog(`Requesting record plaintexts from Leo wallet for program ${programId}`);

        try {
          // Leo wallet has a dedicated method for plaintext records
          const recordsWithPlaintext = await leoWalletAdapter.requestRecordPlaintexts(programId);
          setLastRecordPlaintexts(recordsWithPlaintext);
          addLog(`Leo wallet record plaintexts fetched successfully: ${recordsWithPlaintext.length} records found`);
          return { recordsWithPlaintext };
        } catch (error: any) {
          addLog(`Error fetching record plaintexts with Leo wallet: ${error.message || 'Unknown error'}`);
          throw error;
        }
      } else if (walletName === 'Fox Wallet' && foxWalletAdapter) {
        // Use Fox wallet adapter for record plaintexts request
        addLog(`Requesting record plaintexts from Fox wallet for program ${programId}`);

        try {
          // Fox wallet has a dedicated method for plaintext records
          const recordsWithPlaintext = await foxWalletAdapter.requestRecordPlaintexts(programId);
          setLastRecordPlaintexts(recordsWithPlaintext);
          addLog(`Fox wallet record plaintexts fetched successfully: ${recordsWithPlaintext.length} records found`);
          return { recordsWithPlaintext };
        } catch (error: any) {
          addLog(`Error fetching record plaintexts with Fox wallet: ${error.message || 'Unknown error'}`);
          throw error;
        }
      } else if (walletName === 'Soter Wallet' && soterWalletAdapter) {
        // Use Soter wallet adapter for record plaintexts request
        addLog(`Requesting record plaintexts from Soter wallet for program ${programId}`);

        try {
          // Soter wallet has a dedicated method for plaintext records
          const recordsWithPlaintext = await soterWalletAdapter.requestRecordPlaintexts(programId);
          setLastRecordPlaintexts(recordsWithPlaintext);
          addLog(`Soter wallet record plaintexts fetched successfully: ${recordsWithPlaintext.length} records found`);
          return { recordsWithPlaintext };
        } catch (error: any) {
          addLog(`Error fetching record plaintexts with Soter wallet: ${error.message || 'Unknown error'}`);
          throw error;
        }
      } else {
        const errorMsg = 'Record plaintexts request not supported for this wallet type';
        setErrorMessage(errorMsg);
        addLog(errorMsg);
        return { error: errorMsg };
      }
    } catch (error: any) {
      const errorMsg = error?.message || 'Unknown error fetching record plaintexts';
      setErrorMessage(`Record plaintexts error: ${errorMsg}`);
      addLog(`Record plaintexts request error: ${errorMsg}`);
      return { error: errorMsg };
    } finally {
      setRecordPlaintextsLoading(false);
    }
  };

  // Get transaction history method that works with all wallet types
  const getTransactionHistory = async (params: TransactionHistoryParams): Promise<TransactionHistoryResult> => {
    const { programId, eventType, functionId } = params;

    if (!connected || !address) {
      return { error: 'Wallet not connected' };
    }

    setTransactionHistoryLoading(true);
    setErrorMessage(null);
    addLog(`Requesting transaction history for program ${programId}`);

    try {
      // Handle transaction history request based on wallet type
      if (usingPuzzle) {
        // Use Puzzle SDK for transaction history request
        addLog(`Requesting events from Puzzle wallet for program ${programId}`);

        const filter: any = {};
        
        if (programId) {
          filter.programId = programId;
        }
        
        if (eventType) {
          filter.type = eventType;
        }
        
        if (functionId) {
          filter.functionId = functionId;
        }

        const eventsResponse = await PuzzleSDK.getEvents({
          filter: filter
        });

        if (!eventsResponse || !eventsResponse.events) {
          const errorMessage = "Error fetching events";
          setErrorMessage(`Events error: ${errorMessage}`);
          addLog(`Puzzle events error: ${errorMessage}`);
          return { error: errorMessage };
        }

        const transactions = eventsResponse.events;
        setLastTransactionHistory(transactions);
        addLog(`Puzzle events fetched successfully: ${transactions.length} events found`);
        return { transactions };
      } else if (walletName === 'Leo Wallet' && leoWalletAdapter) {
        // Use Leo wallet adapter for transaction history request
        addLog(`Requesting transaction history from Leo wallet for program ${programId}`);

        try {
          // Leo wallet has a dedicated method for transaction history
          const transactions = await leoWalletAdapter.requestTransactionHistory(programId);
          setLastTransactionHistory(transactions);
          addLog(`Leo wallet transaction history fetched successfully: ${transactions.length} transactions found`);
          return { transactions };
        } catch (error: any) {
          addLog(`Error fetching transaction history with Leo wallet: ${error.message || 'Unknown error'}`);
          throw error;
        }
      } else if (walletName === 'Fox Wallet' && foxWalletAdapter) {
        // Use Fox wallet adapter for transaction history request
        addLog(`Requesting transaction history from Fox wallet for program ${programId}`);

        try {
          // Fox wallet has a dedicated method for transaction history
          const transactions = await foxWalletAdapter.requestTransactionHistory(programId);
          setLastTransactionHistory(transactions);
          addLog(`Fox wallet transaction history fetched successfully: ${transactions.length} transactions found`);
          return { transactions };
        } catch (error: any) {
          addLog(`Error fetching transaction history with Fox wallet: ${error.message || 'Unknown error'}`);
          throw error;
        }
      } else if (walletName === 'Soter Wallet' && soterWalletAdapter) {
        // Use Soter wallet adapter for transaction history request
        addLog(`Requesting transaction history from Soter wallet for program ${programId}`);

        try {
          // Soter wallet has a dedicated method for transaction history
          const transactions = await soterWalletAdapter.requestTransactionHistory(programId);
          setLastTransactionHistory(transactions);
          addLog(`Soter wallet transaction history fetched successfully: ${transactions.length} transactions found`);
          return { transactions };
        } catch (error: any) {
          addLog(`Error fetching transaction history with Soter wallet: ${error.message || 'Unknown error'}`);
          throw error;
        }
      } else {
        const errorMsg = 'Transaction history request not supported for this wallet type';
        setErrorMessage(errorMsg);
        addLog(errorMsg);
        return { error: errorMsg };
      }
    } catch (error: any) {
      const errorMsg = error?.message || 'Unknown error fetching transaction history';
      setErrorMessage(`Transaction history error: ${errorMsg}`);
      addLog(`Transaction history request error: ${errorMsg}`);
      return { error: errorMsg };
    } finally {
      setTransactionHistoryLoading(false);
    }
  };

  // Provide context value
  const contextValue: WalletContextType = {
    connected,
    connecting,
    address,
    walletName,
    connectionLogs,
    errorMessage,
    connectWallet,
    disconnectWallet,
    createTransaction,
    signMessage,
    decryptMessage,
    getRecords,
    getRecordPlaintexts,
    getTransactionHistory,
    transactionPending,
    lastTransactionId,
    signaturePending,
    lastSignature,
    decryptPending,
    lastDecryptedTexts,
    recordsLoading,
    lastRecords,
    recordPlaintextsLoading,
    lastRecordPlaintexts,
    transactionHistoryLoading,
    lastTransactionHistory
  };

  return (
    <WalletContext.Provider value={contextValue}>
      {children}
    </WalletContext.Provider>
  );
}

// Custom hook for using the wallet context
export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
} 