import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { PrivyProvider as PrivyProviderBase, usePrivy, useWallets } from "@privy-io/react-auth";
import { polygon } from "viem/chains";

interface WalletContextType {
  eoaAddress: string | undefined;
  isReady: boolean;
  authenticated: boolean;
  login: () => void;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const WalletContext = createContext<WalletContextType>({
  eoaAddress: undefined,
  isReady: false,
  authenticated: false,
  login: () => {},
  logout: async () => {},
  isLoading: true,
});

export function useWallet() {
  return useContext(WalletContext);
}

function WalletContextProvider({ children }: { children: ReactNode }) {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();
  const [isLoading, setIsLoading] = useState(true);

  const wallet = wallets.find(w => w.address === user?.wallet?.address);
  const eoaAddress = authenticated && wallet ? wallet.address : undefined;

  useEffect(() => {
    if (ready && walletsReady) {
      setIsLoading(false);
    }
  }, [ready, walletsReady]);

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
        isReady: ready && walletsReady,
        authenticated,
        login,
        logout,
        isLoading,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function PrivyWalletProvider({ children }: { children: ReactNode }) {
  const privyAppId = import.meta.env.VITE_PRIVY_APP_ID;

  if (!privyAppId) {
    console.warn("VITE_PRIVY_APP_ID not configured");
    return (
      <WalletContext.Provider
        value={{
          eoaAddress: undefined,
          isReady: true,
          authenticated: false,
          login: () => console.warn("Privy not configured"),
          logout: async () => {},
          isLoading: false,
        }}
      >
        {children}
      </WalletContext.Provider>
    );
  }

  return (
    <PrivyProviderBase
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
    </PrivyProviderBase>
  );
}
