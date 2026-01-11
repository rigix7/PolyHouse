import { useState, useEffect } from "react";
import { Shield, Lock, Loader2, TrendingUp, Calendar, Radio, Clock } from "lucide-react";
import { SubTabs } from "@/components/terminal/SubTabs";
import { MarketCardSkeleton } from "@/components/terminal/MarketCard";
import { EmptyState } from "@/components/terminal/EmptyState";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Market, Futures, AdminSettings } from "@shared/schema";
import type { DisplayEvent, ParsedMarket } from "@/lib/polymarket";

type PredictSubTab = "matchday" | "futures" | "fantasy";

const subTabs = [
  { id: "matchday" as const, label: "MATCH DAY" },
  { id: "futures" as const, label: "FUTURES" },
  { id: "fantasy" as const, label: "FANTASY" },
];

interface PredictViewProps {
  markets: Market[];
  displayEvents: DisplayEvent[];
  futures: Futures[];
  isLoading: boolean;
  futuresLoading: boolean;
  onPlaceBet: (marketId: string, outcomeId: string, odds: number) => void;
  selectedBet?: { marketId: string; outcomeId: string };
  adminSettings?: AdminSettings;
}

function formatVolume(vol: number): string {
  if (vol >= 1000000) return `$${(vol / 1000000).toFixed(1)}M`;
  if (vol >= 1000) return `$${(vol / 1000).toFixed(1)}K`;
  return `$${vol.toFixed(0)}`;
}

function getCountdown(dateString: string): { text: string; isLive: boolean } {
  const now = new Date();
  const eventTime = new Date(dateString);
  const diff = eventTime.getTime() - now.getTime();
  
  const sixHoursMs = 6 * 60 * 60 * 1000;
  if (diff <= 0 && diff > -sixHoursMs) {
    return { text: "LIVE", isLive: true };
  }
  
  if (diff <= -sixHoursMs) {
    return { text: "ENDED", isLive: false };
  }
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours < 1) {
    return { text: `${minutes}m`, isLive: false };
  }
  if (hours < 24) {
    return { text: `${hours}h ${minutes}m`, isLive: false };
  }
  
  const days = Math.floor(hours / 24);
  return { text: `${days}d ${hours % 24}h`, isLive: false };
}

function isWithin5Days(dateString: string): boolean {
  const now = new Date();
  const eventTime = new Date(dateString);
  const diff = eventTime.getTime() - now.getTime();
  
  const fiveDaysMs = 5 * 24 * 60 * 60 * 1000;
  const sixHoursAgoMs = -6 * 60 * 60 * 1000;
  
  return diff >= sixHoursAgoMs && diff <= fiveDaysMs;
}

// Price ticker using DisplayEvents
function PriceTicker({ events }: { events: DisplayEvent[] }) {
  const [offset, setOffset] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setOffset((prev) => (prev + 1) % 100);
    }, 50);
    return () => clearInterval(interval);
  }, []);
  
  if (events.length === 0) return null;
  
  // Extract ticker items from all events' moneyline markets
  const tickerItems: { title: string; price: number }[] = [];
  
  for (const event of events.slice(0, 8)) {
    const moneylineGroup = event.marketGroups.find(g => g.type === "moneyline");
    if (!moneylineGroup) continue;
    
    for (const market of moneylineGroup.markets.slice(0, 3)) {
      // Use groupItemTitle and bestAsk
      const yesPrice = market.bestAsk || market.outcomes[0]?.price || 0;
      tickerItems.push({
        title: `${event.league}: ${market.groupItemTitle}`,
        price: Math.round(yesPrice * 100),
      });
    }
  }
  
  if (tickerItems.length === 0) return null;
  
  return (
    <div className="bg-zinc-900/80 border-b border-zinc-800 overflow-hidden">
      <div 
        className="flex whitespace-nowrap py-2 px-3 gap-8"
        style={{ transform: `translateX(-${offset}%)`, transition: 'transform 0.05s linear' }}
      >
        {[...tickerItems, ...tickerItems].map((item, idx) => (
          <div key={idx} className="flex items-center gap-2 text-xs">
            <span className="text-zinc-400">{item.title}</span>
            <span className="text-wild-gold font-mono font-bold">{item.price}¢</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LeagueFilters({ 
  leagues, 
  selectedLeagues, 
  onToggle 
}: { 
  leagues: string[]; 
  selectedLeagues: Set<string>; 
  onToggle: (league: string) => void;
}) {
  if (leagues.length === 0) return null;
  
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 px-1">
      <Button
        size="sm"
        variant={selectedLeagues.size === 0 ? "default" : "outline"}
        onClick={() => onToggle("ALL")}
        className="shrink-0 text-xs h-7"
        data-testid="filter-all"
      >
        All
      </Button>
      {leagues.map((league) => (
        <Button
          key={league}
          size="sm"
          variant={selectedLeagues.has(league) ? "default" : "outline"}
          onClick={() => onToggle(league)}
          className="shrink-0 text-xs h-7"
          data-testid={`filter-${league.toLowerCase()}`}
        >
          {league}
        </Button>
      ))}
    </div>
  );
}

// New EventCard component using DisplayEvent
function EventCard({ 
  event, 
  onSelectMarket,
  selectedMarketId 
}: { 
  event: DisplayEvent;
  onSelectMarket: (market: ParsedMarket, eventTitle: string, marketType: string) => void;
  selectedMarketId?: string;
}) {
  const countdown = getCountdown(event.gameStartTime);
  
  return (
    <Card className="p-3 space-y-3" data-testid={`event-card-${event.id}`}>
      {/* Event Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-sm truncate">{event.title}</h3>
          <div className="flex items-center gap-2 text-xs text-zinc-500 mt-0.5">
            <span>{event.league}</span>
            <span>•</span>
            <span>{formatVolume(event.volume)} vol</span>
          </div>
        </div>
        <Badge 
          variant={countdown.isLive ? "destructive" : "secondary"} 
          className={`text-xs shrink-0 ${countdown.isLive ? "animate-pulse" : ""}`}
        >
          {countdown.isLive ? (
            <Radio className="w-3 h-3 mr-1" />
          ) : (
            <Clock className="w-3 h-3 mr-1" />
          )}
          {countdown.text}
        </Badge>
      </div>
      
      {/* Market Groups */}
      {event.marketGroups.map((group) => (
        <div key={group.type} className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
              {group.label}
            </span>
            <span className="text-xs text-zinc-600">
              {formatVolume(group.volume)}
            </span>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {group.markets.map((market) => {
              const isSelected = selectedMarketId === market.id;
              const priceInCents = Math.round(market.bestAsk * 100);
              
              // For display, use a shortened version of groupItemTitle
              let displayLabel = market.groupItemTitle;
              // Remove "FC", "vs.", dates, and long team names
              displayLabel = displayLabel
                .replace(/\s+FC$/i, "")
                .replace(/\s+\(.*?\)$/i, "")
                .replace(/Draw \(.*?\)/i, "Draw");
              
              // Truncate if still too long
              if (displayLabel.length > 20) {
                displayLabel = displayLabel.slice(0, 18) + "...";
              }
              
              return (
                <button
                  key={market.id}
                  onClick={() => onSelectMarket(market, event.title, group.type)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm transition-all ${
                    isSelected 
                      ? "border-wild-brand bg-wild-brand/20 text-white" 
                      : "border-zinc-700 bg-zinc-800/50 hover:border-zinc-600 hover:bg-zinc-800 text-zinc-200"
                  }`}
                  data-testid={`market-${market.id}`}
                >
                  <span className="font-medium">{displayLabel}</span>
                  <span className={`font-mono font-bold ${isSelected ? "text-wild-brand" : "text-wild-gold"}`}>
                    {priceInCents}¢
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </Card>
  );
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

export function PredictView({ 
  markets, 
  displayEvents,
  futures, 
  isLoading, 
  futuresLoading, 
  onPlaceBet, 
  selectedBet, 
  adminSettings 
}: PredictViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<PredictSubTab>("matchday");
  const [selectedLeagues, setSelectedLeagues] = useState<Set<string>>(new Set());

  // Filter and categorize events
  const filteredEvents = displayEvents.filter(event => {
    if (!isWithin5Days(event.gameStartTime)) return false;
    if (event.status === "ended") return false;
    if (selectedLeagues.size === 0) return true;
    return selectedLeagues.has(event.league);
  });
  
  const liveEvents = filteredEvents.filter(e => e.status === "live");
  const upcomingEvents = filteredEvents
    .filter(e => e.status === "upcoming")
    .sort((a, b) => new Date(a.gameStartTime).getTime() - new Date(b.gameStartTime).getTime());
  
  const availableLeagues = Array.from(
    new Set(displayEvents.map(e => e.league))
  ).sort();
  
  const handleLeagueToggle = (league: string) => {
    if (league === "ALL") {
      setSelectedLeagues(new Set());
      return;
    }
    
    setSelectedLeagues(prev => {
      const newSet = new Set(prev);
      if (newSet.has(league)) {
        newSet.delete(league);
      } else {
        newSet.add(league);
      }
      return newSet;
    });
  };

  const handleSelectMarket = (market: ParsedMarket, eventTitle: string, marketType: string) => {
    // Calculate odds from bestAsk price
    const price = market.bestAsk || market.outcomes[0]?.price || 0.5;
    const odds = price > 0 ? 1 / price : 2;
    
    // Pass to parent with market info
    onPlaceBet(market.id, market.conditionId, odds);
  };

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <PriceTicker events={displayEvents} />
      <SubTabs tabs={subTabs} activeTab={activeSubTab} onTabChange={setActiveSubTab} />
      
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {activeSubTab === "matchday" && (
          <div className="space-y-3">
            <LeagueFilters 
              leagues={availableLeagues}
              selectedLeagues={selectedLeagues}
              onToggle={handleLeagueToggle}
            />
            
            {isLoading ? (
              <>
                <MarketCardSkeleton />
                <MarketCardSkeleton />
                <div className="opacity-50">
                  <MarketCardSkeleton />
                </div>
              </>
            ) : (
              <>
                {liveEvents.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-bold text-red-400">
                      <Radio className="w-4 h-4 animate-pulse" />
                      LIVE NOW ({liveEvents.length})
                    </div>
                    {liveEvents.map((event) => (
                      <EventCard
                        key={event.id}
                        event={event}
                        onSelectMarket={handleSelectMarket}
                        selectedMarketId={selectedBet?.marketId}
                      />
                    ))}
                  </div>
                )}
                
                {upcomingEvents.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-bold text-zinc-400">
                      <Clock className="w-4 h-4" />
                      UPCOMING ({upcomingEvents.length})
                    </div>
                    {upcomingEvents.map((event) => (
                      <EventCard
                        key={event.id}
                        event={event}
                        onSelectMarket={handleSelectMarket}
                        selectedMarketId={selectedBet?.marketId}
                      />
                    ))}
                  </div>
                )}
                
                {liveEvents.length === 0 && upcomingEvents.length === 0 && (
                  <EmptyState
                    icon={Calendar}
                    title="No Events in 5-Day Window"
                    description="Select leagues in the admin panel to see upcoming games"
                  />
                )}
              </>
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
