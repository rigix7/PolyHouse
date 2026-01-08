import { useState, useEffect, createContext, useContext, type ReactNode } from "react";
import { PrivyProvider, useWallets, usePrivy } from "@privy-io/react-auth";
import { polygon } from "viem/chains";

interface WalletContextType {
  eoaAddress: string | undefined;
  isReady: boolean;
  authenticated: boolean;
  login: () => void;
  logout: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | null>(null);

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within PrivyWalletProvider");
  }
  return context;
}

function WalletContextProvider({ children }: { children: ReactNode }) {
  const { wallets, ready: walletsReady } = useWallets();
  const { authenticated, user, ready: privyReady, login, logout } = usePrivy();
  const [isReady, setIsReady] = useState(false);

  const wallet = wallets.find(w => w.address === user?.wallet?.address);
  const eoaAddress = authenticated && wallet ? wallet.address : undefined;

  useEffect(() => {
    if (privyReady && walletsReady) {
      setIsReady(true);
    }
  }, [privyReady, walletsReady]);

  useEffect(() => {
    async function ensurePolygonChain() {
      if (!wallet || !walletsReady || !authenticated) return;

      try {
        const chainId = wallet.chainId;
        if (chainId !== `eip155:${polygon.id}`) {
          await wallet.switchChain(polygon.id);
        }
      } catch (err) {
        console.error("Failed to switch chain:", err);
      }
    }
    ensurePolygonChain();
  }, [wallet, walletsReady, authenticated]);

  return (
    <WalletContext.Provider
      value={{
        eoaAddress,
        isReady,
        authenticated,
        login,
        logout,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function PrivyWalletProvider({ children }: { children: ReactNode }) {
  const privyAppId = import.meta.env.VITE_PRIVY_APP_ID;
  
  if (!privyAppId) {
    console.warn("VITE_PRIVY_APP_ID not configured - wallet features disabled");
    return (
      <WalletContext.Provider
        value={{
          eoaAddress: undefined,
          isReady: true,
          authenticated: false,
          login: () => console.warn("Privy not configured"),
          logout: async () => {},
        }}
      >
        {children}
      </WalletContext.Provider>
    );
  }

  return (
    <PrivyProvider
      appId={privyAppId}
      config={{
        defaultChain: polygon,
        supportedChains: [polygon],
        appearance: {
          theme: "dark",
          accentColor: "#f43f5e",
        },
        embeddedWallets: {
          ethereum: {
            createOnLogin: "users-without-wallets",
          },
        },
      }}
    >
      <WalletContextProvider>{children}</WalletContextProvider>
    </PrivyProvider>
  );
}
