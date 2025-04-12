import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
// Import hooks from aleo-hooks
import { useConnect, useDisconnect, useAccount, useSelect } from 'aleo-hooks';
// Import Leo wallet specific items
import { DecryptPermission } from "@demox-labs/aleo-wallet-adapter-base";
// Import images with proper type declarations
import puzzleIcon from '../assets/puzzlewallet.png';
import leoIcon from '../assets/leowallet.png';
import foxIcon from '../assets/foxwallet.svg';
import soterIcon from '../assets/soterwallet.png';

interface WalletOption {
  id: string;
  name: string;
  icon: string;
  iconSrc: string;
  adapterId: string;
  detected?: boolean;
}

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

// Initial wallet options
const initialWalletOptions: WalletOption[] = [
  {
    id: 'puzzle',
    name: 'Puzzle Wallet',
    icon: '🧩',
    iconSrc: puzzleIcon,
    adapterId: 'Puzzle Wallet',
    detected: false
  },
  {
    id: 'leo',
    name: 'Leo Wallet',
    icon: '🦁',
    iconSrc: leoIcon,
    adapterId: 'Leo Wallet',
    detected: false
  },
  {
    id: 'fox',
    name: 'Fox Wallet',
    icon: '🦊',
    iconSrc: foxIcon,
    adapterId: 'Fox Wallet',
    detected: false
  },
  {
    id: 'soter',
    name: 'Soter Wallet',
    icon: '🛡️',
    iconSrc: soterIcon,
    adapterId: 'Soter Wallet',
    detected: false
  }
];

export function ConnectWallet({ 
  buttonText = "Connect Wallet", 
  modalTitle = "Connect a Wallet" 
}: {
  buttonText?: string;
  modalTitle?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [walletOptions, setWalletOptions] = useState<WalletOption[]>(initialWalletOptions);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [connectingWalletId, setConnectingWalletId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const modalRootRef = useRef<HTMLDivElement | null>(null);
  
  // Use aleo-hooks instead of context
  const { connect, connecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { publicKey: address, connected } = useAccount();
  const { select } = useSelect();
  const [walletName, setWalletName] = useState<string | null>(null);
  
  // Use refs to track the latest state values for use in intervals/timeouts
  const connectedRef = useRef(connected);
  const connectingRef = useRef(connecting);
  
  // Keep refs updated with latest values
  useEffect(() => {
    connectedRef.current = connected;
    connectingRef.current = connecting;
  }, [connected, connecting]);

  // Create portal root if needed
  useEffect(() => {
    // Create a portal root for the modal if it doesn't exist
    if (!document.getElementById('wallet-modal-root')) {
      const portalRoot = document.createElement('div');
      portalRoot.id = 'wallet-modal-root';
      document.body.appendChild(portalRoot);
      modalRootRef.current = portalRoot;
    } else {
      modalRootRef.current = document.getElementById('wallet-modal-root') as HTMLDivElement;
    }
    
    return () => {
      // Clean up if component unmounts
      if (modalRootRef.current && modalRootRef.current.parentNode === document.body) {
        document.body.removeChild(modalRootRef.current);
      }
    };
  }, []);

  // Add an effect to detect wallet type on initial connect or page refresh
  useEffect(() => {
    if (connected && !walletName) {
      const detectWalletType = () => {
        // Check for each wallet type
        if (typeof window.puzzle !== 'undefined') {
          setWalletName('Puzzle Wallet');
        } else if (typeof window.leoWallet !== 'undefined') {
          setWalletName('Leo Wallet');
        } else if (typeof window.foxwallet !== 'undefined') {
          setWalletName('Fox Wallet');
        } else if (typeof window.soter !== 'undefined' || typeof window.soterWallet !== 'undefined') {
          setWalletName('Soter Wallet');
        } else {
          // Generic fallback
          setWalletName('Connected Wallet');
        }
      };
      
      detectWalletType();
    }
  }, [connected, walletName]);

  // Function to shorten address for display
  const shortenAddress = (addr: string | null) => {
    if (!addr) return '';
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  // Check for installed wallets
  useEffect(() => {
    // Simplified wallet detection using exact identifiers
    const checkWallets = () => {
      const updatedOptions = [...initialWalletOptions];
      
      // Check for Puzzle wallet
      if (typeof window.puzzle !== 'undefined') {
        const index = updatedOptions.findIndex(w => w.id === 'puzzle');
        if (index >= 0) updatedOptions[index].detected = true;
      }
      
      // Check for Leo wallet - check only leoWallet property
      if (typeof window.leoWallet !== 'undefined') {
        const index = updatedOptions.findIndex(w => w.id === 'leo');
        if (index >= 0) updatedOptions[index].detected = true;
      }
      
      // Check for Fox wallet
      if (typeof window.foxwallet !== 'undefined') {
        const index = updatedOptions.findIndex(w => w.id === 'fox');
        if (index >= 0) updatedOptions[index].detected = true;
      }
      
      // Check for Soter wallet (checking both possible identifiers)
      if (typeof window.soter !== 'undefined' || typeof window.soterWallet !== 'undefined') {
        const index = updatedOptions.findIndex(w => w.id === 'soter');
        if (index >= 0) updatedOptions[index].detected = true;
      }
      
      setWalletOptions(updatedOptions);
    };
    
    // Check immediately and also after a short delay to ensure extensions are loaded
    checkWallets();
    const timeoutId = setTimeout(checkWallets, 500);
    
    return () => clearTimeout(timeoutId);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Clear connecting state when modal closes or connection status changes
  useEffect(() => {
    if (!isOpen) {
      setConnectingWalletId(null);
    }
    
    // When connection becomes successful, clear the connectingWalletId
    if (connected) {
      setConnectingWalletId(null);
    }
  }, [isOpen, connected]);

  // Track connection state changes
  const [previousConnectingState, setPreviousConnectingState] = useState(connecting);
  const [previousConnectedState, setPreviousConnectedState] = useState(connected);
  
  // This effect only runs when the connection state transitions
  useEffect(() => {
    // Check if connecting state changed from true to false and connected changed from false to true
    // This indicates a successful connection completion
    if (previousConnectingState && !connecting && !previousConnectedState && connected) {
      // Force close the modal when connection is successful
      setTimeout(() => {
        forceCloseModal();
      }, 500);
    }
    
    // Update previous states for the next comparison
    setPreviousConnectingState(connecting);
    setPreviousConnectedState(connected);
  }, [connecting, connected]);

  const handleOpen = () => {
    if (connected) {
      // If already connected, clicking the wallet button should toggle the dropdown menu
      setIsDropdownOpen(!isDropdownOpen);
    } else {
      setIsOpen(true);
      // Force body to not scroll when modal is open
      document.body.style.overflow = 'hidden';
    }
  };

  const handleClose = () => {
    // Don't allow closing the modal if actively connecting (but allow if connected)
    if (connecting && !connected) {
      return;
    }
    
    setIsOpen(false);
    // Restore scrolling
    document.body.style.overflow = '';
  };
  
  // A force close method that bypasses all checks
  const forceCloseModal = () => {
    setIsOpen(false);
    setConnectingWalletId(null);
    document.body.style.overflow = '';
  };

  const handleConnect = async (walletId: string) => {
    setConnectingWalletId(walletId);
    
    // Find the wallet option
    const wallet = walletOptions.find(w => w.id === walletId);
    if (!wallet) {
      setConnectingWalletId(null);
      return;
    }
    
    // Get the adapter ID
    const adapterId = wallet.adapterId;
    
    try {
      // Special handling for Leo wallet
      if (walletId === 'leo') {
        // First try direct window.leoWallet access
        if (typeof window.leoWallet !== 'undefined') {
          try {
            const accounts = await window.leoWallet.requestAccounts();
            if (accounts && accounts.length > 0) {
              // Direct connection succeeded
              setWalletName('Leo Wallet');
              
              // We still need to select and connect via the adapter for hooks integration
              select(adapterId as any);
              await connect(adapterId as any);
              
              // Close the modal after 500ms to allow UI to update
              setTimeout(() => {
                forceCloseModal();
              }, 500);
              return;
            }
          } catch (directError) {
            // Fall back to adapter approach
            console.warn("Direct Leo wallet connection failed, trying adapter approach");
          }
        }
      }
      
      // Standard adapter approach
      select(adapterId as any);
      
      // Then connect after a small delay
      setTimeout(async () => {
        try {
          await connect(adapterId as any);
          
          // Set the wallet name
          setWalletName(wallet.name);
          
          // Close the modal after 500ms to allow UI to update
          setTimeout(() => {
            forceCloseModal();
          }, 500);
        } catch (error) {
          console.error("Connection error:", error);
          setConnectingWalletId(null);
        }
      }, 100);
    } catch (error) {
      console.error("Selection error:", error);
      setConnectingWalletId(null);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
      setWalletName(null);
      setIsDropdownOpen(false);
    } catch (error) {
      console.error("Disconnect error:", error);
    }
  };

  const handleChangeWallet = () => {
    setIsDropdownOpen(false);
    setIsOpen(true);
    // Force body to not scroll when modal is open
    document.body.style.overflow = 'hidden';
  };

  // Find the wallet icon to display in the button
  const getWalletIcon = (): string | undefined => {
    if (!walletName) return undefined;
    
    // Find the matching wallet option by name
    const wallet = walletOptions.find(w => w.name === walletName);
    return wallet?.iconSrc;
  };

  // Handle copy address with feedback
  const handleCopyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
    }
  };

  // Render modal using portal
  const renderModal = () => {
    if (!isOpen) return null;
    
    return createPortal(
      <div 
        className="fixed inset-0 bg-black/50 flex justify-center items-center z-[9999]" 
        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
        onClick={(e) => {
          // Only close when clicking outside of modal content and not connecting
          if (e.target === e.currentTarget && !connecting && !connectingWalletId) {
            handleClose();
          }
        }}
      >
        <div 
          className="bg-white dark:bg-gray-800 rounded-2xl w-[90%] max-w-3xl max-h-[85vh] overflow-hidden shadow-xl flex flex-col border-2 border-gray-200 dark:border-gray-700"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex justify-between items-center px-5 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="m-0 text-lg text-gray-800 dark:text-gray-200 font-semibold flex items-center gap-2">
              {modalTitle}
              {connecting && (
                <span className="inline-flex items-center gap-1 ml-2 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                  <span className="w-2.5 h-2.5 border-2 border-gray-400 dark:border-gray-500 border-t-transparent rounded-full animate-spin"></span>
                  Connecting...
                </span>
              )}
            </h2>
            <button 
              className={`bg-transparent border-none text-xl cursor-pointer p-0 flex items-center justify-center w-7 h-7 rounded-full ${
                connecting || connectingWalletId
                  ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-gray-300'
              }`}
              onClick={handleClose}
              disabled={connecting || !!connectingWalletId}
            >
              ×
            </button>
          </div>
          
          <div className="flex h-[420px] overflow-hidden">
            <div className="w-full md:w-3/5 overflow-y-auto p-4 border-r border-gray-200 dark:border-gray-700">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">Popular</h3>
                {walletOptions.map((wallet) => (
                  <div 
                    key={wallet.id}
                    className={`flex items-center p-2.5 rounded-lg mb-1.5 cursor-pointer border border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition ${
                      connectingWalletId === wallet.id ? 'bg-blue-50 dark:bg-blue-900/20 cursor-default' : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                    onClick={() => connectingWalletId ? null : handleConnect(wallet.id)}
                  >
                    <div className="flex items-center justify-center w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-lg mr-2 overflow-hidden">
                      <img src={wallet.iconSrc} alt={wallet.name} className="w-6 h-6 object-contain" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm text-gray-800 dark:text-gray-200 font-medium">{wallet.name}</span>
                      <div className="flex items-center">
                        {wallet.detected && (
                          <span className="inline-flex items-center text-xs text-green-600 dark:text-green-400 font-medium bg-green-50 dark:bg-green-900/20 px-1.5 py-0.5 rounded-full mr-2">
                            <span className="w-1 h-1 bg-green-500 dark:bg-green-400 rounded-full mr-1"></span>
                            Detected
                          </span>
                        )}
                        {connectingWalletId === wallet.id && (
                          <span className="text-xs text-blue-600 dark:text-blue-400 font-medium flex items-center">
                            <span className="inline-block relative mr-1">
                              <span className="animate-dots delay-100">.</span>
                              <span className="animate-dots delay-200">.</span>
                              <span className="animate-dots delay-300">.</span>
                            </span>
                            Connecting
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="hidden md:block md:w-2/5 p-5 bg-gray-50 dark:bg-gray-800">
              <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-3">What is a Wallet?</h3>
              
              <div className="flex mb-3">
                <div className="flex-shrink-0 flex items-center justify-center w-9 h-9 bg-blue-100 dark:bg-blue-900/30 rounded-full text-lg mr-2.5">🏦</div>
                <div>
                  <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-0.5">A Home for your Digital Assets</h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Wallets are used to send, receive, store, and display digital assets like 
                    Aleo credits and NFTs.
                  </p>
                </div>
              </div>
              
              <div className="flex mb-4">
                <div className="flex-shrink-0 flex items-center justify-center w-9 h-9 bg-blue-100 dark:bg-blue-900/30 rounded-full text-lg mr-2.5">🔑</div>
                <div>
                  <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-0.5">A New Way to Log In</h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Instead of creating new accounts and passwords on every website, just 
                    connect your wallet.
                  </p>
                </div>
              </div>
              
              <div className="mt-4 flex flex-col gap-2">
                <a 
                  href="https://leo.app/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-block text-center py-2 px-4 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition"
                >
                  Get a Wallet
                </a>
                <a 
                  href="https://developer.aleo.org/getting_started/overview/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-block text-center text-blue-500 dark:text-blue-400 font-medium hover:text-blue-600 dark:hover:text-blue-300"
                >
                  Learn More
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>,
      modalRootRef.current as HTMLElement
    );
  };

  return (
    <div className="relative inline-block z-10" ref={dropdownRef}>
      <button 
        className={`flex items-center justify-center gap-2 rounded-xl py-2.5 px-4 text-base font-semibold transition ${
          connected 
            ? 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-blue-500' 
            : connecting
              ? 'bg-blue-600 text-white cursor-progress'
              : 'bg-blue-500 text-white hover:bg-blue-600'
        }`} 
        onClick={handleOpen} 
        disabled={connecting}
      >
        {connected ? (
          <>
            {getWalletIcon() ? (
              <img src={getWalletIcon()} alt={walletName || ''} className="w-5 h-5 mr-1" />
            ) : (
              <span className="text-lg mr-1">👛</span>
            )}
            {shortenAddress(address)}
          </>
        ) : connecting ? (
          <>
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            Connecting...
          </>
        ) : (
          buttonText
        )}
      </button>

      {connected && isDropdownOpen && (
        <div className="fixed md:absolute top-[calc(100%+8px)] right-0 md:w-72 w-[calc(100vw-32px)] bg-white dark:bg-gray-800 rounded-2xl shadow-lg z-50 border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 flex flex-col gap-3">
            <button 
              className="flex items-center justify-between py-3.5 px-4 w-full border-none bg-transparent text-left text-base cursor-pointer text-gray-800 dark:text-gray-200 transition hover:bg-gray-50 dark:hover:bg-gray-700" 
              onClick={handleCopyAddress}
            >
              <span>Copy Address</span>
              {copied && (
                <span className="text-green-500 text-sm font-medium">Copied!</span>
              )}
            </button>
            <button 
              className="flex items-center py-3.5 px-4 w-full border-none bg-transparent text-left text-base text-gray-800 dark:text-gray-200 cursor-pointer transition hover:bg-gray-50 dark:hover:bg-gray-700" 
              onClick={handleChangeWallet}
            >
              Change Wallet
            </button>
            <button 
              className="flex items-center py-3.5 px-4 w-full border-none bg-transparent text-left text-base text-red-600 cursor-pointer transition hover:bg-red-50 dark:hover:bg-red-900/20" 
              onClick={handleDisconnect}
            >
              Disconnect
            </button>
          </div>
        </div>
      )}

      {/* Render modal using portal */}
      {renderModal()}
    </div>
  );
} 