import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PrivyProvider } from "@privy-io/react-auth";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home";
import AdminPage from "@/pages/admin";

const PRIVY_APP_ID = import.meta.env.VITE_PRIVY_APP_ID || "";

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/admin" component={AdminPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  if (!PRIVY_APP_ID) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        appearance: {
          theme: "dark",
          accentColor: "#F43F5E",
          logo: undefined,
        },
        loginMethods: ["email", "wallet"],
        defaultChain: {
          id: 137,
          name: "Polygon",
          network: "matic",
          nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
          rpcUrls: {
            default: { http: ["https://polygon-rpc.com"] },
          },
          blockExplorers: {
            default: { name: "PolygonScan", url: "https://polygonscan.com" },
          },
        },
        supportedChains: [
          {
            id: 137,
            name: "Polygon",
            network: "matic",
            nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
            rpcUrls: {
              default: { http: ["https://polygon-rpc.com"] },
            },
            blockExplorers: {
              default: { name: "PolygonScan", url: "https://polygonscan.com" },
            },
          },
        ],
      }}
    >
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}

export default App;
