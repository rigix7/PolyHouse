import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, RefreshCw, LayoutGrid, Columns } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { fetchGammaEvents, gammaEventToDisplayEvent, type DisplayEvent, type GammaEvent } from "@/lib/polymarket";
import type { AdminSettings } from "@shared/schema";

interface PolymarketRawEvent {
  id: string;
  title: string;
  slug: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  image?: string;
  active: boolean;
  closed: boolean;
  markets: PolymarketRawMarket[];
}

interface PolymarketRawMarket {
  id: string;
  question: string;
  conditionId: string;
  slug: string;
  outcomes: string;
  outcomePrices: string;
  volume: string;
  liquidity: string;
  active: boolean;
  closed: boolean;
  groupItemTitle?: string;
  bestAsk?: number;
  bestBid?: number;
  gameStartTime?: string;
  sportsMarketType?: string;
  clobTokenIds?: string;
  line?: number;
}

function formatVolume(vol: number): string {
  if (vol >= 1000000) return `$${(vol / 1000000).toFixed(1)}M`;
  if (vol >= 1000) return `$${(vol / 1000).toFixed(1)}K`;
  return `$${vol.toFixed(0)}`;
}

function getGameTime(event: PolymarketRawEvent): string {
  const gameStartTime = event.markets?.[0]?.gameStartTime || event.startDate;
  if (!gameStartTime) return "";
  
  const date = new Date(gameStartTime);
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  
  if (diff <= 0 && diff > -6 * 60 * 60 * 1000) {
    return "LIVE";
  }
  
  if (diff < 24 * 60 * 60 * 1000) {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function parseOutcomes(market: PolymarketRawMarket): { label: string; price: number }[] {
  try {
    const outcomes = JSON.parse(market.outcomes || "[]");
    const prices = JSON.parse(market.outcomePrices || "[]");
    return outcomes.map((label: string, i: number) => ({
      label,
      price: parseFloat(prices[i]) || 0,
    }));
  } catch {
    return [];
  }
}

function SimplifiedMarketButton({
  label,
  price,
  isSelected,
  onClick,
  variant = "default",
}: {
  label: string;
  price: number;
  isSelected: boolean;
  onClick: () => void;
  variant?: "home" | "away" | "draw" | "over" | "under" | "default";
}) {
  const pricePercent = Math.round(price * 100);
  
  const colorClasses: Record<string, string> = {
    home: isSelected 
      ? "bg-teal-600 border-teal-500" 
      : "bg-teal-900/40 border-teal-800/50 hover:bg-teal-800/50",
    away: isSelected 
      ? "bg-red-600 border-red-500" 
      : "bg-red-900/40 border-red-800/50 hover:bg-red-800/50",
    draw: isSelected 
      ? "bg-zinc-600 border-zinc-500" 
      : "bg-zinc-700/50 border-zinc-600/50 hover:bg-zinc-600/50",
    over: isSelected 
      ? "bg-blue-600 border-blue-500" 
      : "bg-blue-900/40 border-blue-800/50 hover:bg-blue-800/50",
    under: isSelected 
      ? "bg-amber-600 border-amber-500" 
      : "bg-amber-900/40 border-amber-800/50 hover:bg-amber-800/50",
    default: isSelected 
      ? "bg-zinc-600 border-zinc-500" 
      : "bg-zinc-800 border-zinc-700 hover:bg-zinc-700",
  };
  
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex flex-col items-center gap-1 px-3 py-2.5 rounded-md border text-sm transition-all ${colorClasses[variant]} text-zinc-100`}
      data-testid={`simple-btn-${label.toLowerCase().replace(/\s/g, "-")}`}
    >
      <span className="font-medium text-xs truncate max-w-full">{label}</span>
      <span className="font-mono font-bold text-white">{pricePercent}¢</span>
    </button>
  );
}

function SimplifiedMarketRow({
  market,
  onSelect,
  selectedMarketId,
}: {
  market: PolymarketRawMarket;
  onSelect: (marketId: string, outcome: string, price: number, question: string) => void;
  selectedMarketId?: string;
}) {
  const outcomes = parseOutcomes(market);
  const marketType = market.sportsMarketType || "moneyline";
  
  if (outcomes.length === 0) return null;
  
  const getVariant = (index: number, total: number, type: string): "home" | "away" | "draw" | "over" | "under" | "default" => {
    if (type.includes("totals") || type.includes("over_under")) {
      return index === 0 ? "over" : "under";
    }
    if (total === 3) {
      if (index === 0) return "home";
      if (index === 1) return "draw";
      return "away";
    }
    if (total === 2) {
      return index === 0 ? "home" : "away";
    }
    return "default";
  };
  
  return (
    <div className="space-y-2">
      <p className="text-xs text-zinc-400 leading-tight">{market.question}</p>
      <div className="flex gap-2">
        {outcomes.map((outcome, idx) => (
          <SimplifiedMarketButton
            key={outcome.label}
            label={outcome.label}
            price={outcome.price}
            isSelected={selectedMarketId === `${market.id}-${outcome.label}`}
            onClick={() => onSelect(`${market.id}-${outcome.label}`, outcome.label, outcome.price, market.question)}
            variant={getVariant(idx, outcomes.length, marketType)}
          />
        ))}
      </div>
    </div>
  );
}

function SimplifiedEventCard({
  event,
  onSelect,
  selectedMarketId,
}: {
  event: PolymarketRawEvent;
  onSelect: (marketId: string, outcome: string, price: number, question: string) => void;
  selectedMarketId?: string;
}) {
  const gameTime = getGameTime(event);
  const isLive = gameTime === "LIVE";
  
  const totalVolume = event.markets.reduce((sum, m) => sum + parseFloat(m.volume || "0"), 0);
  
  const marketsByType = useMemo(() => {
    const grouped: Record<string, PolymarketRawMarket[]> = {};
    for (const market of event.markets) {
      const type = market.sportsMarketType || "other";
      if (!grouped[type]) grouped[type] = [];
      grouped[type].push(market);
    }
    return grouped;
  }, [event.markets]);
  
  const marketTypeLabels: Record<string, string> = {
    moneyline: "Winner",
    spreads: "Spread",
    totals: "Total",
    over_under: "Over/Under",
    player_props: "Player Props",
  };
  
  return (
    <Card className="p-4 bg-zinc-900/80 border-zinc-800">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm text-zinc-100 flex-1 pr-2">{event.title}</h3>
        <div className="flex items-center gap-2 shrink-0">
          {isLive && (
            <Badge variant="destructive" className="text-xs animate-pulse">
              LIVE
            </Badge>
          )}
          {gameTime && !isLive && (
            <span className="text-xs text-zinc-500">{gameTime}</span>
          )}
        </div>
      </div>
      
      {event.description && (
        <p className="text-xs text-zinc-500 mb-3 line-clamp-2">{event.description}</p>
      )}
      
      <div className="space-y-4">
        {Object.entries(marketsByType).map(([type, markets]) => (
          <div key={type}>
            <p className="text-xs text-zinc-500 uppercase tracking-wide mb-2">
              {marketTypeLabels[type] || type.replace(/_/g, " ")}
            </p>
            <div className="space-y-3">
              {markets.slice(0, 3).map((market) => (
                <SimplifiedMarketRow
                  key={market.id}
                  market={market}
                  onSelect={onSelect}
                  selectedMarketId={selectedMarketId}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      
      {totalVolume > 0 && (
        <div className="mt-3 pt-3 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
          <span>Vol: {formatVolume(totalVolume)}</span>
          <span>{event.markets.length} market{event.markets.length !== 1 ? "s" : ""}</span>
        </div>
      )}
    </Card>
  );
}

function CurrentUIPreviewCard({
  event,
}: {
  event: PolymarketRawEvent;
}) {
  const gameTime = getGameTime(event);
  const isLive = gameTime === "LIVE";
  
  const moneylineMarkets = event.markets.filter(m => 
    m.sportsMarketType === "moneyline" || !m.sportsMarketType
  ).slice(0, 3);
  
  const spreadMarket = event.markets.find(m => m.sportsMarketType === "spreads");
  const totalMarket = event.markets.find(m => m.sportsMarketType === "totals" || m.sportsMarketType === "over_under");
  
  return (
    <Card className="p-3 bg-zinc-900/80 border-zinc-800">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-xs text-zinc-100 truncate flex-1 pr-2">{event.title}</h3>
        {isLive && (
          <Badge variant="destructive" className="text-xs animate-pulse">LIVE</Badge>
        )}
      </div>
      
      {moneylineMarkets.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs text-zinc-500 uppercase">Winner</p>
          <div className="flex gap-1.5">
            {moneylineMarkets.map((market) => {
              const outcomes = parseOutcomes(market);
              const yesPrice = outcomes[0]?.price || 0;
              return (
                <div 
                  key={market.id}
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-center"
                >
                  <p className="text-xs text-zinc-400 truncate">{outcomes[0]?.label || "Yes"}</p>
                  <p className="text-sm font-mono font-bold text-white">{Math.round(yesPrice * 100)}¢</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {(spreadMarket || totalMarket) && (
        <div className="flex gap-2 mt-2">
          {spreadMarket && (
            <div className="flex-1">
              <p className="text-xs text-zinc-500 uppercase mb-1">Spread</p>
              <div className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-center">
                <p className="text-xs text-zinc-400 truncate">{spreadMarket.groupItemTitle || "Spread"}</p>
              </div>
            </div>
          )}
          {totalMarket && (
            <div className="flex-1">
              <p className="text-xs text-zinc-500 uppercase mb-1">Total</p>
              <div className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-center">
                <p className="text-xs text-zinc-400 truncate">{totalMarket.groupItemTitle || "O/U"}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

export default function PredictComparePage() {
  const [rawEvents, setRawEvents] = useState<PolymarketRawEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMarketId, setSelectedMarketId] = useState<string>();
  const [viewMode, setViewMode] = useState<"tabs" | "sidebyside">("sidebyside");
  const [selectedBet, setSelectedBet] = useState<{
    marketId: string;
    outcome: string;
    price: number;
    question: string;
  }>();
  
  const { data: adminSettings } = useQuery<AdminSettings>({
    queryKey: ["/api/admin/settings"],
  });
  
  const fetchEvents = async () => {
    const activeTagIds = adminSettings?.activeTagIds || [];
    if (activeTagIds.length === 0) {
      setRawEvents([]);
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    try {
      const events = await fetchGammaEvents(activeTagIds);
      setRawEvents(events as unknown as PolymarketRawEvent[]);
    } catch (error) {
      console.error("Failed to fetch events:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    fetchEvents();
  }, [adminSettings?.activeTagIds]);
  
  const handleSelect = (marketId: string, outcome: string, price: number, question: string) => {
    setSelectedMarketId(marketId);
    setSelectedBet({ marketId, outcome, price, question });
  };
  
  const filteredEvents = useMemo(() => {
    const now = new Date();
    const fiveDaysFromNow = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
    const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);
    
    return rawEvents.filter((event) => {
      const gameTime = event.markets?.[0]?.gameStartTime || event.startDate;
      if (!gameTime) return true;
      
      const eventDate = new Date(gameTime);
      return eventDate >= sixHoursAgo && eventDate <= fiveDaysFromNow;
    });
  }, [rawEvents]);
  
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="sticky top-0 z-50 bg-zinc-950/95 backdrop-blur border-b border-zinc-800 px-4 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="btn-back">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <h1 className="font-bold text-lg">UI Comparison</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant={viewMode === "sidebyside" ? "default" : "outline"}
              size="sm" 
              onClick={() => setViewMode("sidebyside")}
              data-testid="btn-sidebyside"
            >
              <Columns className="w-4 h-4 mr-1" />
              Side by Side
            </Button>
            <Button 
              variant={viewMode === "tabs" ? "default" : "outline"}
              size="sm" 
              onClick={() => setViewMode("tabs")}
              data-testid="btn-tabs"
            >
              <LayoutGrid className="w-4 h-4 mr-1" />
              Tabs
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchEvents}
              disabled={isLoading}
              data-testid="btn-refresh"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto p-4">
        {viewMode === "sidebyside" ? (
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <div className="mb-3 p-2 bg-emerald-900/30 border border-emerald-800/50 rounded-lg">
                <p className="text-xs text-emerald-200 font-semibold">
                  NEW: Simplified (Polymarket Style)
                </p>
                <p className="text-xs text-emerald-300/70">
                  Uses question text directly. All markets grouped by event.
                </p>
              </div>
              
              {isLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredEvents.slice(0, 6).map((event) => (
                    <SimplifiedEventCard
                      key={event.id}
                      event={event}
                      onSelect={handleSelect}
                      selectedMarketId={selectedMarketId}
                    />
                  ))}
                </div>
              )}
            </div>
            
            <div>
              <div className="mb-3 p-2 bg-blue-900/30 border border-blue-800/50 rounded-lg">
                <p className="text-xs text-blue-200 font-semibold">
                  CURRENT: Compact Preview
                </p>
                <p className="text-xs text-blue-300/70">
                  Simplified preview of current approach. Full UI on main tab.
                </p>
              </div>
              
              {isLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredEvents.slice(0, 6).map((event) => (
                    <CurrentUIPreviewCard
                      key={event.id}
                      event={event}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <Tabs defaultValue="simple" className="w-full">
            <TabsList className="w-full mb-4">
              <TabsTrigger value="simple" className="flex-1" data-testid="tab-simple">
                Simplified (Polymarket Style)
              </TabsTrigger>
              <TabsTrigger value="current" className="flex-1" data-testid="tab-current">
                Current Preview
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="simple">
              <div className="mb-4 p-3 bg-emerald-900/30 border border-emerald-800/50 rounded-lg">
                <p className="text-sm text-emerald-200">
                  <strong>Simplified View:</strong> Uses Polymarket's question text directly. 
                  Markets are grouped by event, showing all bet types (winner, spread, total) together.
                </p>
              </div>
              
              {isLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
                </div>
              ) : filteredEvents.length === 0 ? (
                <div className="text-center py-20 text-zinc-500">
                  <p>No events found. Enable sports in the Admin panel.</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {filteredEvents.map((event) => (
                    <SimplifiedEventCard
                      key={event.id}
                      event={event}
                      onSelect={handleSelect}
                      selectedMarketId={selectedMarketId}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="current">
              <div className="mb-4 p-3 bg-blue-900/30 border border-blue-800/50 rounded-lg">
                <p className="text-sm text-blue-200">
                  <strong>Current Preview:</strong> A compact preview of the current Match Day display. 
                  See the full experience on the main Predict tab.
                </p>
              </div>
              
              {isLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
                </div>
              ) : filteredEvents.length === 0 ? (
                <div className="text-center py-20 text-zinc-500">
                  <p>No events found. Enable sports in the Admin panel.</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {filteredEvents.map((event) => (
                    <CurrentUIPreviewCard
                      key={event.id}
                      event={event}
                    />
                  ))}
                </div>
              )}
              
              <div className="text-center mt-6">
                <Link href="/">
                  <Button variant="outline" data-testid="btn-go-home">
                    View Full Predict Tab
                  </Button>
                </Link>
              </div>
            </TabsContent>
          </Tabs>
        )}
        
        {selectedBet && (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-zinc-900 border-t border-zinc-800">
            <div className="max-w-7xl mx-auto">
              <Card className="p-4 bg-zinc-800 border-zinc-700">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-zinc-400 truncate">{selectedBet.question}</p>
                    <p className="font-bold text-lg">
                      {selectedBet.outcome} @ {Math.round(selectedBet.price * 100)}¢
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setSelectedBet(undefined);
                        setSelectedMarketId(undefined);
                      }}
                      data-testid="btn-cancel-bet"
                    >
                      Cancel
                    </Button>
                    <Button 
                      className="bg-wild-brand hover:bg-wild-brand/90"
                      data-testid="btn-place-bet"
                    >
                      Place Bet
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
