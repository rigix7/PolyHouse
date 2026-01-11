import { useState } from "react";
import { Shield, Lock, Loader2, TrendingUp, Calendar } from "lucide-react";
import { SubTabs } from "@/components/terminal/SubTabs";
import { MarketCard, MarketCardSkeleton } from "@/components/terminal/MarketCard";
import { EmptyState } from "@/components/terminal/EmptyState";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Market, Futures } from "@shared/schema";

type PredictSubTab = "matchday" | "futures" | "fantasy";

const subTabs = [
  { id: "matchday" as const, label: "MATCH DAY" },
  { id: "futures" as const, label: "FUTURES" },
  { id: "fantasy" as const, label: "FANTASY" },
];

interface PredictViewProps {
  markets: Market[];
  futures: Futures[];
  isLoading: boolean;
  futuresLoading: boolean;
  onPlaceBet: (marketId: string, outcomeId: string, odds: number) => void;
  selectedBet?: { marketId: string; outcomeId: string };
}

function FuturesCard({ future, onPlaceBet, selectedOutcome }: { 
  future: Futures; 
  onPlaceBet: (marketId: string, outcomeId: string, odds: number) => void;
  selectedOutcome?: string;
}) {
  const [showAll, setShowAll] = useState(false);
  const outcomes = future.marketData?.outcomes || [];
  const displayedOutcomes = showAll ? outcomes : outcomes.slice(0, 6);
  const hasMore = outcomes.length > 6;
  
  return (
    <Card className="p-4 space-y-3" data-testid={`futures-card-${future.id}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-sm">{future.title}</h3>
          {future.description && (
            <p className="text-xs text-zinc-500 line-clamp-2 mt-0.5">{future.description}</p>
          )}
        </div>
        <Badge variant="secondary" className="text-xs shrink-0">
          <Calendar className="w-3 h-3 mr-1" />
          {outcomes.length} teams
        </Badge>
      </div>
      
      {outcomes.length > 0 && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2 max-h-[400px] overflow-y-auto">
            {displayedOutcomes.map((outcome, index) => {
              const outcomeId = outcome.marketId || outcome.conditionId || `${future.id}-${index}`;
              const isSelected = selectedOutcome === outcomeId;
              const probability = outcome.probability * 100;
              
              return (
                <button
                  key={index}
                  onClick={() => onPlaceBet(future.id, outcomeId, outcome.odds)}
                  className={`flex flex-col p-2 rounded-md border transition-colors text-left ${
                    isSelected 
                      ? "border-wild-brand bg-wild-brand/10" 
                      : "border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/50"
                  }`}
                  data-testid={`futures-outcome-${future.id}-${index}`}
                >
                  <span className="text-xs truncate w-full font-medium">{outcome.label}</span>
                  <div className="flex items-center justify-between w-full mt-1">
                    <span className="text-xs text-zinc-500">{probability.toFixed(0)}%</span>
                    <span className={`font-mono text-sm font-bold ${
                      isSelected ? "text-wild-brand" : "text-wild-gold"
                    }`}>
                      {outcome.odds.toFixed(2)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
          {hasMore && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="w-full text-xs text-wild-brand hover:text-wild-brand/80 py-1"
              data-testid={`futures-toggle-${future.id}`}
            >
              {showAll ? "Show less" : `Show all ${outcomes.length} teams`}
            </button>
          )}
        </div>
      )}
      
      {future.marketData && (
        <div className="flex items-center justify-between text-xs text-zinc-500 pt-2 border-t border-zinc-800">
          <div className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            Vol: ${(future.marketData.volume / 1000).toFixed(1)}K
          </div>
          {future.endDate && (
            <span>Ends: {new Date(future.endDate).toLocaleDateString()}</span>
          )}
        </div>
      )}
    </Card>
  );
}

export function PredictView({ markets, futures, isLoading, futuresLoading, onPlaceBet, selectedBet }: PredictViewProps) {
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
          <div className="space-y-3">
            {futuresLoading ? (
              <>
                <MarketCardSkeleton />
                <MarketCardSkeleton />
              </>
            ) : futures.length > 0 ? (
              futures.map((future) => (
                <FuturesCard
                  key={future.id}
                  future={future}
                  onPlaceBet={onPlaceBet}
                  selectedOutcome={
                    selectedBet?.marketId === future.id ? selectedBet.outcomeId : undefined
                  }
                />
              ))
            ) : (
              <EmptyState
                icon={Lock}
                title="No Futures Events"
                description="Long-term events will appear here when added by admin"
              />
            )}
          </div>
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
