import { useState, useEffect, useCallback } from "react";
import { getUSDCBalance } from "@/lib/polygon";

// Check if Privy is available by looking at environment
const hasPrivyAppId = !!import.meta.env.VITE_PRIVY_APP_ID;

interface UseWalletResult {
  isConnected: boolean;
  address: string;
  usdcBalance: number;
  login: () => void;
  logout: () => void;
  refetchBalance: () => Promise<void>;
}

export function useWallet(): UseWalletResult {
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState("");
  const [usdcBalance, setUsdcBalance] = useState(0);

  // Dynamic import of Privy hooks when available
  const [privyState, setPrivyState] = useState<{
    authenticated: boolean;
    walletAddress: string;
    login?: () => void;
    logout?: () => void;
  }>({
    authenticated: false,
    walletAddress: "",
  });

  useEffect(() => {
    if (!hasPrivyAppId) return;

    // Dynamically load Privy state
    const loadPrivy = async () => {
      try {
        const privyModule = await import("@privy-io/react-auth");
        // Note: We can't use hooks here, so we'll rely on the App-level provider
        // This hook should be used inside a component that's already wrapped with PrivyProvider
      } catch (e) {
        console.log("Privy not available");
      }
    };
    loadPrivy();
  }, []);

  // Fetch USDC balance when address changes
  const fetchBalance = useCallback(async () => {
    if (address) {
      const balance = await getUSDCBalance(address);
      setUsdcBalance(balance);
    } else {
      setUsdcBalance(0);
    }
  }, [address]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  // Sync with Privy state
  useEffect(() => {
    setIsConnected(privyState.authenticated);
    setAddress(privyState.walletAddress);
  }, [privyState]);

  const login = useCallback(() => {
    if (privyState.login) {
      privyState.login();
    }
  }, [privyState]);

  const logout = useCallback(() => {
    if (privyState.logout) {
      privyState.logout();
    }
    setIsConnected(false);
    setAddress("");
    setUsdcBalance(0);
  }, [privyState]);

  return {
    isConnected,
    address,
    usdcBalance,
    login,
    logout,
    refetchBalance: fetchBalance,
  };
}
