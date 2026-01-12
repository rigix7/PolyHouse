import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PrivyWalletProvider } from "@/providers/PrivyProvider";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home";
import AdminPage from "@/pages/admin";
import PredictComparePage from "@/pages/predict-compare";

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/admin" component={AdminPage} />
      <Route path="/compare" component={PredictComparePage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <PrivyWalletProvider>
          <Toaster />
          <Router />
        </PrivyWalletProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
