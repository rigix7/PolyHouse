import { apiRequest } from "./queryClient";

const GAMMA_API_BASE = "https://gamma-api.polymarket.com";

export interface GammaTag {
  id: string;
  label: string;
  slug: string;
}

export interface GammaOutcome {
  price: string;
  outcome: string;
}

export interface GammaMarket {
  id: string;
  question: string;
  conditionId: string;
  slug: string;
  outcomePrices: string;
  outcomes: string;
  volume: string;
  liquidity: string;
  active: boolean;
  closed: boolean;
}

export interface GammaEvent {
  id: string;
  title: string;
  slug: string;
  description: string;
  startDate: string;
  endDate: string;
  image: string;
  icon: string;
  active: boolean;
  closed: boolean;
  markets: GammaMarket[];
  tags: GammaTag[];
}

export async function fetchGammaTags(): Promise<GammaTag[]> {
  try {
    const response = await fetch(`${GAMMA_API_BASE}/tags`);
    if (!response.ok) {
      throw new Error(`Failed to fetch tags: ${response.status}`);
    }
    const tags = await response.json();
    return tags.filter((tag: GammaTag) => 
      ["sports", "nba", "nfl", "mlb", "nhl", "soccer", "football", "basketball", "tennis", "mma", "boxing", "golf", "esports"].some(
        keyword => tag.label?.toLowerCase().includes(keyword) || tag.slug?.toLowerCase().includes(keyword)
      )
    );
  } catch (error) {
    console.error("Error fetching Gamma tags:", error);
    return [];
  }
}

export async function fetchGammaEvents(tagIds: string[]): Promise<GammaEvent[]> {
  if (!tagIds.length) return [];
  
  try {
    const allEvents: GammaEvent[] = [];
    
    for (const tagId of tagIds) {
      const response = await fetch(
        `${GAMMA_API_BASE}/events?tag_id=${tagId}&active=true&closed=false&limit=10`
      );
      
      if (response.ok) {
        const events: GammaEvent[] = await response.json();
        const validEvents = events.filter(event => {
          if (!event.markets?.length) return false;
          const market = event.markets[0];
          try {
            const prices = JSON.parse(market.outcomePrices || "[]");
            return prices.length > 0;
          } catch {
            return false;
          }
        });
        allEvents.push(...validEvents);
      }
    }
    
    const uniqueEvents = allEvents.filter((event, index, self) =>
      index === self.findIndex(e => e.id === event.id)
    );
    
    return uniqueEvents;
  } catch (error) {
    console.error("Error fetching Gamma events:", error);
    return [];
  }
}

export function parseMarketOutcomes(market: GammaMarket): { id: string; label: string; odds: number; probability: number }[] {
  try {
    const prices = JSON.parse(market.outcomePrices || "[]");
    const outcomes = JSON.parse(market.outcomes || "[]");
    
    return outcomes.map((outcome: string, index: number) => {
      const probability = parseFloat(prices[index] || "0");
      const odds = probability > 0 ? 1 / probability : 99;
      return {
        id: `${market.id}-${index}`,
        label: outcome,
        odds: Math.round(odds * 100) / 100,
        probability: Math.round(probability * 1000) / 1000,
      };
    });
  } catch {
    return [];
  }
}

export function gammaEventToMarket(event: GammaEvent): {
  id: string;
  title: string;
  description: string;
  category: string;
  sport: string;
  league: string;
  startTime: string;
  status: string;
  outcomes: { id: string; label: string; odds: number; probability: number }[];
  volume: number;
  liquidity: number;
  polymarketId: string;
  conditionId: string;
} | null {
  if (!event.markets?.length) return null;
  
  const market = event.markets[0];
  const outcomes = parseMarketOutcomes(market);
  
  if (outcomes.length === 0) return null;
  
  const sportTag = event.tags?.find(tag => 
    ["nba", "nfl", "mlb", "nhl", "soccer", "football", "basketball", "tennis", "mma", "boxing", "golf", "esports"].some(
      sport => tag.slug?.toLowerCase().includes(sport) || tag.label?.toLowerCase().includes(sport)
    )
  );
  
  return {
    id: event.id,
    title: event.title,
    description: event.description || market.question,
    category: "sports",
    sport: sportTag?.label || "Sports",
    league: sportTag?.slug?.toUpperCase() || "LIVE",
    startTime: event.startDate || new Date().toISOString(),
    status: event.active && !event.closed ? "open" : "closed",
    outcomes,
    volume: parseFloat(market.volume || "0"),
    liquidity: parseFloat(market.liquidity || "0"),
    polymarketId: market.id,
    conditionId: market.conditionId,
  };
}

export async function signPolymarketRequest(method: string, path: string, body?: unknown) {
  return apiRequest<{
    headers: Record<string, string>;
    note?: string;
  }>("POST", "/api/polymarket/sign", { method, path, body });
}
