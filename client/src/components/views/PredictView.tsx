import { useState } from "react";
import { Shield, Lock, Loader2 } from "lucide-react";
import { SubTabs } from "@/components/terminal/SubTabs";
import { MarketCard, MarketCardSkeleton } from "@/components/terminal/MarketCard";
import { EmptyState } from "@/components/terminal/EmptyState";
import type { Market } from "@shared/schema";

type PredictSubTab = "matchday" | "futures" | "fantasy";

const subTabs = [
  { id: "matchday" as const, label: "MATCH DAY" },
  { id: "futures" as const, label: "FUTURES" },
  { id: "fantasy" as const, label: "FANTASY" },
];

interface PredictViewProps {
  markets: Market[];
  isLoading: boolean;
  onPlaceBet: (marketId: string, outcomeId: string, odds: number) => void;
  selectedBet?: { marketId: string; outcomeId: string };
}

export function PredictView({ markets, isLoading, onPlaceBet, selectedBet }: PredictViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<PredictSubTab>("matchday");

  const matchDayMarkets = markets.filter(m => m.status === "open");

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <SubTabs tabs={subTabs} activeTab={activeSubTab} onTabChange={setActiveSubTab} />
      
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {activeSubTab === "matchday" && (
          <div className="space-y-3">
            {isLoading ? (
              <>
                <MarketCardSkeleton />
                <MarketCardSkeleton />
                <div className="opacity-50">
                  <MarketCardSkeleton />
                </div>
              </>
            ) : matchDayMarkets.length > 0 ? (
              matchDayMarkets.map((market) => (
                <MarketCard
                  key={market.id}
                  market={market}
                  onPlaceBet={onPlaceBet}
                  selectedOutcome={
                    selectedBet?.marketId === market.id ? selectedBet.outcomeId : undefined
                  }
                />
              ))
            ) : (
              <EmptyState
                icon={Loader2}
                title="Loading Markets"
                description="Fetching live prediction markets..."
              />
            )}
          </div>
        )}

        {activeSubTab === "futures" && (
          <EmptyState
            icon={Lock}
            title="Season Futures"
            description="Loading Market Data..."
          />
        )}

        {activeSubTab === "fantasy" && (
          <EmptyState
            icon={Shield}
            title="Fantasy Squads"
            description="Coming Q3 2026"
          />
        )}
      </div>
    </div>
  );
}
