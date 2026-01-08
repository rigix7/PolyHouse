import { TrendingUp, TrendingDown, Award, Activity, Wallet, History } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Wallet as WalletType, Bet, Trade } from "@shared/schema";

interface DashboardViewProps {
  wallet: WalletType | null;
  bets: Bet[];
  trades: Trade[];
  isLoading: boolean;
}

export function DashboardView({ wallet, bets, trades, isLoading }: DashboardViewProps) {
  const formatBalance = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const wonBets = bets.filter((b) => b.status === "won");
  const pendingBets = bets.filter((b) => b.status === "pending");
  const totalPnL = bets.reduce((acc, bet) => {
    if (bet.status === "won") return acc + (bet.potentialPayout - bet.amount);
    if (bet.status === "lost") return acc - bet.amount;
    return acc;
  }, 0);

  if (isLoading) {
    return (
      <div className="flex flex-col h-full animate-fade-in p-3 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-zinc-900 border border-zinc-800 p-4 rounded-md">
              <div className="w-8 h-8 bg-zinc-850 rounded animate-pulse-skeleton mb-3" />
              <div className="w-16 h-3 bg-zinc-850 rounded animate-pulse-skeleton mb-2" />
              <div className="w-24 h-6 bg-zinc-850 rounded animate-pulse-skeleton" />
            </div>
          ))}
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-md space-y-3">
          <div className="w-32 h-4 bg-zinc-850 rounded animate-pulse-skeleton" />
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-zinc-850 rounded animate-pulse-skeleton" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full animate-fade-in overflow-y-auto">
      <div className="shrink-0 bg-zinc-950 border-b border-zinc-800 p-3 z-20">
        <h2 className="text-xs font-bold text-zinc-400 tracking-wider">DASHBOARD</h2>
      </div>

      <div className="p-3 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-md">
            <div className="w-8 h-8 rounded-full bg-wild-gold/20 flex items-center justify-center mb-3">
              <Wallet className="w-4 h-4 text-wild-gold" />
            </div>
            <div className="text-[10px] font-mono text-zinc-500 uppercase mb-1">Total Value</div>
            <div className="text-xl font-black font-mono text-white" data-testid="text-total-value">
              ${formatBalance(wallet?.totalValue || 0)}
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-md">
            <div className="w-8 h-8 rounded-full bg-wild-trade/20 flex items-center justify-center mb-3">
              <Activity className="w-4 h-4 text-wild-trade" />
            </div>
            <div className="text-[10px] font-mono text-zinc-500 uppercase mb-1">P&L</div>
            <div
              className={cn(
                "text-xl font-black font-mono flex items-center gap-1",
                totalPnL >= 0 ? "text-wild-scout" : "text-wild-brand"
              )}
              data-testid="text-pnl"
            >
              {totalPnL >= 0 ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              ${formatBalance(Math.abs(totalPnL))}
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-md">
            <div className="w-8 h-8 rounded-full bg-wild-scout/20 flex items-center justify-center mb-3">
              <Award className="w-4 h-4 text-wild-scout" />
            </div>
            <div className="text-[10px] font-mono text-zinc-500 uppercase mb-1">Won / Total</div>
            <div className="text-xl font-black font-mono text-white" data-testid="text-win-ratio">
              {wonBets.length} / {bets.length}
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-md">
            <div className="w-8 h-8 rounded-full bg-wild-brand/20 flex items-center justify-center mb-3">
              <History className="w-4 h-4 text-wild-brand" />
            </div>
            <div className="text-[10px] font-mono text-zinc-500 uppercase mb-1">Pending</div>
            <div className="text-xl font-black font-mono text-white" data-testid="text-pending">
              {pendingBets.length}
            </div>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-md overflow-hidden">
          <div className="p-3 border-b border-zinc-800">
            <h3 className="text-xs font-bold text-zinc-400 tracking-wider">BALANCES</h3>
          </div>
          <div className="divide-y divide-zinc-800/50">
            <div className="flex justify-between items-center p-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-[10px] font-bold text-white">
                  $
                </div>
                <div>
                  <div className="text-sm font-medium text-white">USDC</div>
                  <div className="text-[10px] text-zinc-500 font-mono">Polygon</div>
                </div>
              </div>
              <span className="font-mono font-bold text-white" data-testid="text-dash-usdc">
                ${formatBalance(wallet?.usdcBalance || 0)}
              </span>
            </div>
            <div className="flex justify-between items-center p-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-wild-scout flex items-center justify-center text-[10px] font-bold text-zinc-950">
                  W
                </div>
                <div>
                  <div className="text-sm font-medium text-white">WILD</div>
                  <div className="text-[10px] text-zinc-500 font-mono">Wildcard Token</div>
                </div>
              </div>
              <span className="font-mono font-bold text-white" data-testid="text-dash-wild">
                {formatBalance(wallet?.wildBalance || 0)}
              </span>
            </div>
          </div>
        </div>

        {bets.length > 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-md overflow-hidden">
            <div className="p-3 border-b border-zinc-800">
              <h3 className="text-xs font-bold text-zinc-400 tracking-wider">RECENT BETS</h3>
            </div>
            <div className="divide-y divide-zinc-800/50">
              {bets.slice(0, 5).map((bet) => (
                <div
                  key={bet.id}
                  className="flex justify-between items-center p-3"
                  data-testid={`bet-${bet.id}`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "px-1.5 py-0.5 rounded text-[9px] font-bold",
                        bet.status === "won"
                          ? "bg-wild-scout/20 text-wild-scout"
                          : bet.status === "lost"
                          ? "bg-wild-brand/20 text-wild-brand"
                          : "bg-wild-gold/20 text-wild-gold"
                      )}
                    >
                      {bet.status.toUpperCase()}
                    </span>
                    <span className="text-xs text-white">@{bet.odds.toFixed(2)}</span>
                  </div>
                  <div className="text-right font-mono">
                    <div className="text-xs text-white">${bet.amount.toFixed(2)}</div>
                    <div className="text-[10px] text-zinc-500">
                      {formatTime(bet.placedAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {bets.length === 0 && trades.length === 0 && (
          <div className="text-center py-8 opacity-60">
            <Activity className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
            <h3 className="font-bold text-zinc-500">No Activity Yet</h3>
            <p className="text-xs text-zinc-600 mt-2">
              Start predicting to see your stats here
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
