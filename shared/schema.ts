import { z } from "zod";

// ============ MARKETS & BETS ============

export const marketSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  category: z.enum(["sports", "politics", "crypto", "entertainment"]),
  sport: z.string().optional(),
  league: z.string().optional(),
  startTime: z.string(),
  endTime: z.string().optional(),
  status: z.enum(["open", "closed", "settled"]),
  outcomes: z.array(z.object({
    id: z.string(),
    label: z.string(),
    odds: z.number(),
    probability: z.number(),
  })),
  volume: z.number(),
  liquidity: z.number(),
  imageUrl: z.string().optional(),
});

export type Market = z.infer<typeof marketSchema>;

export const insertMarketSchema = marketSchema.omit({ id: true });
export type InsertMarket = z.infer<typeof insertMarketSchema>;

export const betSchema = z.object({
  id: z.string(),
  marketId: z.string(),
  outcomeId: z.string(),
  amount: z.number(),
  odds: z.number(),
  potentialPayout: z.number(),
  status: z.enum(["pending", "won", "lost", "cancelled"]),
  placedAt: z.string(),
  walletAddress: z.string().optional(),
});

export type Bet = z.infer<typeof betSchema>;

export const insertBetSchema = betSchema.omit({ id: true, placedAt: true, status: true });
export type InsertBet = z.infer<typeof insertBetSchema>;

// ============ PLAYERS (SCOUT) ============

export const playerSchema = z.object({
  id: z.string(),
  name: z.string(),
  symbol: z.string(),
  team: z.string(),
  sport: z.string(),
  avatarInitials: z.string(),
  avatarUrl: z.string().optional(),
  fundingTarget: z.number(),
  fundingCurrent: z.number(),
  fundingPercentage: z.number(),
  generation: z.number(),
  status: z.enum(["offering", "available", "closed"]),
  priceHistory: z.array(z.object({
    timestamp: z.string(),
    price: z.number(),
  })).optional(),
  stats: z.object({
    holders: z.number(),
    marketCap: z.number(),
    change24h: z.number(),
  }).optional(),
});

export type Player = z.infer<typeof playerSchema>;

export const insertPlayerSchema = playerSchema.omit({ id: true });
export type InsertPlayer = z.infer<typeof insertPlayerSchema>;

// ============ TRADES ============

export const tradeSchema = z.object({
  id: z.string(),
  playerId: z.string(),
  playerName: z.string(),
  playerSymbol: z.string(),
  type: z.enum(["buy", "sell"]),
  amount: z.number(),
  price: z.number(),
  total: z.number(),
  timestamp: z.string(),
  walletAddress: z.string().optional(),
});

export type Trade = z.infer<typeof tradeSchema>;

export const insertTradeSchema = tradeSchema.omit({ id: true, timestamp: true });
export type InsertTrade = z.infer<typeof insertTradeSchema>;

// ============ USER WALLET ============

export const walletSchema = z.object({
  address: z.string(),
  usdcBalance: z.number(),
  wildBalance: z.number(),
  totalValue: z.number(),
});

export type Wallet = z.infer<typeof walletSchema>;

// Per-wallet record to track WILD points earned from betting
export const walletRecordSchema = z.object({
  address: z.string(),
  wildPoints: z.number(), // 1 WILD per $1 bet
  totalBetAmount: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type WalletRecord = z.infer<typeof walletRecordSchema>;

// ============ ADMIN SETTINGS ============

export const polymarketTagSchema = z.object({
  id: z.string(),
  label: z.string(),
  slug: z.string(),
  enabled: z.boolean(),
});

export type PolymarketTag = z.infer<typeof polymarketTagSchema>;

export const adminSettingsSchema = z.object({
  demoMode: z.boolean(),
  mockDataEnabled: z.boolean(),
  activeTagIds: z.array(z.string()),
  lastUpdated: z.string(),
});

export type AdminSettings = z.infer<typeof adminSettingsSchema>;

// ============ LEGACY USER SCHEMA (keep for compatibility) ============

export const users = {
  id: "" as string,
  username: "" as string,
  password: "" as string,
};

export const insertUserSchema = z.object({
  username: z.string(),
  password: z.string(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = { id: string; username: string; password: string };
