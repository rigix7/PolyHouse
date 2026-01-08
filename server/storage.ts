import { randomUUID } from "crypto";
import type {
  Market,
  InsertMarket,
  Player,
  InsertPlayer,
  Bet,
  InsertBet,
  Trade,
  InsertTrade,
  Wallet,
  AdminSettings,
} from "@shared/schema";

export interface IStorage {
  getMarkets(): Promise<Market[]>;
  getMarket(id: string): Promise<Market | undefined>;
  createMarket(market: InsertMarket): Promise<Market>;
  deleteMarket(id: string): Promise<boolean>;

  getPlayers(): Promise<Player[]>;
  getPlayer(id: string): Promise<Player | undefined>;
  createPlayer(player: InsertPlayer): Promise<Player>;
  updatePlayer(id: string, updates: Partial<Player>): Promise<Player | undefined>;
  deletePlayer(id: string): Promise<boolean>;

  getBets(): Promise<Bet[]>;
  getBet(id: string): Promise<Bet | undefined>;
  createBet(bet: InsertBet): Promise<Bet>;

  getTrades(): Promise<Trade[]>;
  getTrade(id: string): Promise<Trade | undefined>;
  createTrade(trade: InsertTrade): Promise<Trade>;

  getWallet(): Promise<Wallet>;
  updateWallet(updates: Partial<Wallet>): Promise<Wallet>;

  getAdminSettings(): Promise<AdminSettings>;
  updateAdminSettings(updates: Partial<AdminSettings>): Promise<AdminSettings>;
}

export class MemStorage implements IStorage {
  private markets: Map<string, Market>;
  private players: Map<string, Player>;
  private bets: Map<string, Bet>;
  private trades: Map<string, Trade>;
  private wallet: Wallet;
  private adminSettings: AdminSettings;

  constructor() {
    this.markets = new Map();
    this.players = new Map();
    this.bets = new Map();
    this.trades = new Map();
    this.wallet = {
      address: "0x1234...5678",
      usdcBalance: 4240.50,
      wildBalance: 1250,
      totalValue: 5490.50,
    };
    this.adminSettings = {
      demoMode: false,
      mockDataEnabled: true,
      activeTagIds: [],
      lastUpdated: new Date().toISOString(),
    };

    this.seedData();
  }

  private seedData() {
    const sampleMarkets: InsertMarket[] = [
      {
        title: "Lakers vs Celtics",
        description: "NBA Finals Game 7",
        category: "sports",
        sport: "NBA",
        league: "Basketball",
        startTime: new Date(Date.now() + 3600000 * 4).toISOString(),
        status: "open",
        outcomes: [
          { id: "lakers", label: "Lakers", odds: 2.15, probability: 0.465 },
          { id: "draw", label: "OT", odds: 21.0, probability: 0.048 },
          { id: "celtics", label: "Celtics", odds: 1.78, probability: 0.562 },
        ],
        volume: 847500,
        liquidity: 325000,
      },
      {
        title: "Chiefs vs 49ers",
        description: "Super Bowl LXII",
        category: "sports",
        sport: "NFL",
        league: "Football",
        startTime: new Date(Date.now() + 86400000 * 2).toISOString(),
        status: "open",
        outcomes: [
          { id: "chiefs", label: "Chiefs", odds: 1.95, probability: 0.513 },
          { id: "tie", label: "Draw", odds: 31.0, probability: 0.032 },
          { id: "49ers", label: "49ers", odds: 1.91, probability: 0.524 },
        ],
        volume: 1250000,
        liquidity: 489000,
      },
      {
        title: "Real Madrid vs Man City",
        description: "Champions League Final",
        category: "sports",
        sport: "Soccer",
        league: "UCL",
        startTime: new Date(Date.now() + 86400000 * 5).toISOString(),
        status: "open",
        outcomes: [
          { id: "rm", label: "Madrid", odds: 2.40, probability: 0.417 },
          { id: "draw", label: "Draw", odds: 3.25, probability: 0.308 },
          { id: "mc", label: "Man City", odds: 2.65, probability: 0.377 },
        ],
        volume: 2150000,
        liquidity: 875000,
      },
    ];

    const samplePlayers: InsertPlayer[] = [
      {
        name: "Bronny Jr.",
        symbol: "BRON",
        team: "USC Trojans",
        sport: "Basketball",
        avatarInitials: "BJ",
        fundingTarget: 100000,
        fundingCurrent: 82000,
        fundingPercentage: 82,
        generation: 1,
        status: "offering",
      },
      {
        name: "Victor Wembanyama",
        symbol: "WEMBY",
        team: "San Antonio Spurs",
        sport: "Basketball",
        avatarInitials: "VW",
        fundingTarget: 150000,
        fundingCurrent: 45000,
        fundingPercentage: 30,
        generation: 1,
        status: "offering",
      },
      {
        name: "Caitlin Clark",
        symbol: "CCLARK",
        team: "Iowa Hawkeyes",
        sport: "Basketball",
        avatarInitials: "CC",
        fundingTarget: 80000,
        fundingCurrent: 80000,
        fundingPercentage: 100,
        generation: 1,
        status: "available",
        stats: {
          holders: 487,
          marketCap: 125000,
          change24h: 12.5,
        },
      },
      {
        name: "Kylian Mbappé",
        symbol: "KM",
        team: "Real Madrid",
        sport: "Soccer",
        avatarInitials: "KM",
        fundingTarget: 200000,
        fundingCurrent: 200000,
        fundingPercentage: 100,
        generation: 1,
        status: "available",
        stats: {
          holders: 1250,
          marketCap: 450000,
          change24h: -3.2,
        },
      },
      {
        name: "Paolo Banchero",
        symbol: "PB",
        team: "Orlando Magic",
        sport: "Basketball",
        avatarInitials: "PB",
        fundingTarget: 75000,
        fundingCurrent: 75000,
        fundingPercentage: 100,
        generation: 2,
        status: "available",
        stats: {
          holders: 312,
          marketCap: 89000,
          change24h: 5.8,
        },
      },
      {
        name: "Shohei Ohtani",
        symbol: "SHOHEI",
        team: "Los Angeles Dodgers",
        sport: "Baseball",
        avatarInitials: "SO",
        fundingTarget: 180000,
        fundingCurrent: 180000,
        fundingPercentage: 100,
        generation: 1,
        status: "available",
        stats: {
          holders: 892,
          marketCap: 320000,
          change24h: 8.1,
        },
      },
    ];

    sampleMarkets.forEach((m) => {
      const id = randomUUID();
      this.markets.set(id, { ...m, id });
    });

    samplePlayers.forEach((p) => {
      const id = randomUUID();
      this.players.set(id, { ...p, id });
    });
  }

  async getMarkets(): Promise<Market[]> {
    return Array.from(this.markets.values());
  }

  async getMarket(id: string): Promise<Market | undefined> {
    return this.markets.get(id);
  }

  async createMarket(market: InsertMarket): Promise<Market> {
    const id = randomUUID();
    const newMarket: Market = { ...market, id };
    this.markets.set(id, newMarket);
    return newMarket;
  }

  async deleteMarket(id: string): Promise<boolean> {
    return this.markets.delete(id);
  }

  async getPlayers(): Promise<Player[]> {
    return Array.from(this.players.values());
  }

  async getPlayer(id: string): Promise<Player | undefined> {
    return this.players.get(id);
  }

  async createPlayer(player: InsertPlayer): Promise<Player> {
    const id = randomUUID();
    const newPlayer: Player = { ...player, id };
    this.players.set(id, newPlayer);
    return newPlayer;
  }

  async updatePlayer(id: string, updates: Partial<Player>): Promise<Player | undefined> {
    const player = this.players.get(id);
    if (!player) return undefined;
    const updated = { ...player, ...updates };
    this.players.set(id, updated);
    return updated;
  }

  async deletePlayer(id: string): Promise<boolean> {
    return this.players.delete(id);
  }

  async getBets(): Promise<Bet[]> {
    return Array.from(this.bets.values());
  }

  async getBet(id: string): Promise<Bet | undefined> {
    return this.bets.get(id);
  }

  async createBet(bet: InsertBet): Promise<Bet> {
    const id = randomUUID();
    const newBet: Bet = {
      ...bet,
      id,
      status: "pending",
      placedAt: new Date().toISOString(),
    };
    this.bets.set(id, newBet);

    this.wallet.usdcBalance -= bet.amount;
    this.wallet.totalValue = this.wallet.usdcBalance + this.wallet.wildBalance;

    return newBet;
  }

  async getTrades(): Promise<Trade[]> {
    return Array.from(this.trades.values());
  }

  async getTrade(id: string): Promise<Trade | undefined> {
    return this.trades.get(id);
  }

  async createTrade(trade: InsertTrade): Promise<Trade> {
    const id = randomUUID();
    const newTrade: Trade = {
      ...trade,
      id,
      timestamp: new Date().toISOString(),
    };
    this.trades.set(id, newTrade);

    if (trade.type === "buy") {
      this.wallet.usdcBalance -= trade.total;
    } else {
      this.wallet.usdcBalance += trade.total;
    }
    this.wallet.totalValue = this.wallet.usdcBalance + this.wallet.wildBalance;

    return newTrade;
  }

  async getWallet(): Promise<Wallet> {
    return this.wallet;
  }

  async updateWallet(updates: Partial<Wallet>): Promise<Wallet> {
    this.wallet = { ...this.wallet, ...updates };
    return this.wallet;
  }

  async getAdminSettings(): Promise<AdminSettings> {
    return this.adminSettings;
  }

  async updateAdminSettings(updates: Partial<AdminSettings>): Promise<AdminSettings> {
    this.adminSettings = {
      ...this.adminSettings,
      ...updates,
      lastUpdated: new Date().toISOString(),
    };
    return this.adminSettings;
  }
}

export const storage = new MemStorage();
