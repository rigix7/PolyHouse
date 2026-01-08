import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Plus, Trash2, RefreshCw, Check, X } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { fetchGammaTags, type GammaTag } from "@/lib/polymarket";
import type { Market, Player, InsertMarket, InsertPlayer, AdminSettings } from "@shared/schema";

const playerFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  symbol: z.string().min(1, "Symbol is required").max(6, "Max 6 characters"),
  team: z.string().min(1, "Team is required"),
  sport: z.string().min(1, "Sport is required"),
  fundingTarget: z.number().min(1000, "Minimum 1,000"),
  fundingCurrent: z.number().min(0),
  status: z.enum(["offering", "available", "closed"]),
});

type PlayerFormData = z.infer<typeof playerFormSchema>;

export default function AdminPage() {
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState<"polymarket" | "markets" | "players">("polymarket");
  const [gammaTags, setGammaTags] = useState<GammaTag[]>([]);
  const [loadingTags, setLoadingTags] = useState(false);
  const [showPlayerForm, setShowPlayerForm] = useState(false);

  const playerForm = useForm<PlayerFormData>({
    resolver: zodResolver(playerFormSchema),
    defaultValues: {
      name: "",
      symbol: "",
      team: "",
      sport: "Basketball",
      fundingTarget: 100000,
      fundingCurrent: 0,
      status: "offering",
    },
  });

  const { data: markets = [], isLoading: marketsLoading } = useQuery<Market[]>({
    queryKey: ["/api/markets"],
  });

  const { data: players = [], isLoading: playersLoading } = useQuery<Player[]>({
    queryKey: ["/api/players"],
  });

  const { data: adminSettings } = useQuery<AdminSettings>({
    queryKey: ["/api/admin/settings"],
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (updates: Partial<AdminSettings>) => {
      return apiRequest("PATCH", "/api/admin/settings", updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      toast({ title: "Settings saved" });
    },
  });

  const loadGammaTags = async () => {
    setLoadingTags(true);
    try {
      const tags = await fetchGammaTags();
      setGammaTags(tags);
    } catch (error) {
      toast({ title: "Failed to load tags", variant: "destructive" });
    } finally {
      setLoadingTags(false);
    }
  };

  useEffect(() => {
    if (activeSection === "polymarket" && gammaTags.length === 0) {
      loadGammaTags();
    }
  }, [activeSection]);

  const handleTagToggle = (tagId: string, checked: boolean) => {
    const currentTags = adminSettings?.activeTagIds || [];
    const newTags = checked
      ? [...currentTags, tagId]
      : currentTags.filter(id => id !== tagId);
    updateSettingsMutation.mutate({ activeTagIds: newTags });
  };

  const createMarketMutation = useMutation({
    mutationFn: async (market: InsertMarket) => {
      return apiRequest("POST", "/api/markets", market);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/markets"] });
      toast({ title: "Market created successfully" });
    },
  });

  const deleteMarketMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/markets/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/markets"] });
      toast({ title: "Market deleted" });
    },
  });

  const createPlayerMutation = useMutation({
    mutationFn: async (player: InsertPlayer) => {
      return apiRequest("POST", "/api/players", player);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/players"] });
      toast({ title: "Player created successfully" });
      setShowPlayerForm(false);
      playerForm.reset();
    },
  });

  const deletePlayerMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/players/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/players"] });
      toast({ title: "Player deleted" });
    },
  });

  const handleCreateSampleMarket = () => {
    const sampleMarket: InsertMarket = {
      title: `Lakers vs Warriors`,
      description: "NBA Regular Season",
      category: "sports",
      sport: "NBA",
      league: "Basketball",
      startTime: new Date(Date.now() + 86400000).toISOString(),
      status: "open",
      outcomes: [
        { id: "1", label: "Lakers", odds: 2.1, probability: 0.48 },
        { id: "2", label: "Draw", odds: 15.0, probability: 0.07 },
        { id: "3", label: "Warriors", odds: 1.85, probability: 0.54 },
      ],
      volume: Math.floor(Math.random() * 500000) + 100000,
      liquidity: Math.floor(Math.random() * 200000) + 50000,
    };
    createMarketMutation.mutate(sampleMarket);
  };

  const onSubmitPlayer = (data: PlayerFormData) => {
    const fundingPercentage = Math.round((data.fundingCurrent / data.fundingTarget) * 100);
    const avatarInitials = data.name
      .split(" ")
      .map(n => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

    const newPlayer: InsertPlayer = {
      name: data.name,
      symbol: data.symbol.toUpperCase(),
      team: data.team,
      sport: data.sport,
      avatarInitials,
      fundingTarget: data.fundingTarget,
      fundingCurrent: data.fundingCurrent,
      fundingPercentage,
      generation: 1,
      status: data.status,
      stats: data.status === "available" ? {
        holders: Math.floor(Math.random() * 500) + 50,
        marketCap: data.fundingTarget,
        change24h: 0,
      } : undefined,
    };
    createPlayerMutation.mutate(newPlayer);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-black">Admin CMS</h1>
        </div>

        <div className="flex gap-2 mb-6 flex-wrap">
          <Button
            variant={activeSection === "polymarket" ? "default" : "secondary"}
            onClick={() => setActiveSection("polymarket")}
            data-testid="button-section-polymarket"
          >
            Polymarket Tags
          </Button>
          <Button
            variant={activeSection === "markets" ? "default" : "secondary"}
            onClick={() => setActiveSection("markets")}
            data-testid="button-section-markets"
          >
            Demo Markets ({markets.length})
          </Button>
          <Button
            variant={activeSection === "players" ? "default" : "secondary"}
            onClick={() => setActiveSection("players")}
            data-testid="button-section-players"
          >
            Demo Players ({players.length})
          </Button>
        </div>

        {activeSection === "polymarket" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center gap-2 flex-wrap">
              <div>
                <h2 className="text-lg font-bold">Polymarket Sports Tags</h2>
                <p className="text-sm text-zinc-500">
                  Select which sports/leagues appear in the Predict tab (live events)
                </p>
              </div>
              <Button
                variant="outline"
                onClick={loadGammaTags}
                disabled={loadingTags}
                data-testid="button-refresh-tags"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loadingTags ? "animate-spin" : ""}`} />
                Refresh Tags
              </Button>
            </div>

            {loadingTags ? (
              <div className="text-zinc-500">Loading tags from Polymarket...</div>
            ) : gammaTags.length === 0 ? (
              <Card className="p-8 text-center text-zinc-500">
                No sports tags found. Click "Refresh Tags" to load from Polymarket.
              </Card>
            ) : (
              <div className="grid gap-2">
                {gammaTags.map((tag) => {
                  const isActive = adminSettings?.activeTagIds?.includes(tag.id) || false;
                  return (
                    <Card
                      key={tag.id}
                      className={`p-4 flex justify-between items-center cursor-pointer transition-colors ${
                        isActive ? "border-wild-brand/50 bg-wild-brand/5" : ""
                      }`}
                      onClick={() => handleTagToggle(tag.id, !isActive)}
                      data-testid={`tag-${tag.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={isActive}
                          onCheckedChange={(checked) => handleTagToggle(tag.id, checked as boolean)}
                          data-testid={`checkbox-tag-${tag.id}`}
                        />
                        <div>
                          <div className="font-bold">{tag.label}</div>
                          <div className="text-sm text-zinc-500">
                            ID: {tag.id} | Slug: {tag.slug}
                          </div>
                        </div>
                      </div>
                      {isActive && (
                        <Check className="w-5 h-5 text-wild-brand" />
                      )}
                    </Card>
                  );
                })}
              </div>
            )}

            {(adminSettings?.activeTagIds?.length || 0) > 0 && (
              <div className="mt-4 p-4 bg-zinc-900 rounded-md">
                <div className="text-sm text-zinc-400 mb-2">Active Tags ({adminSettings?.activeTagIds?.length}):</div>
                <div className="flex flex-wrap gap-2">
                  {adminSettings?.activeTagIds?.map(id => {
                    const tag = gammaTags.find(t => t.id === id);
                    return (
                      <span key={id} className="px-2 py-1 bg-wild-brand/20 text-wild-brand rounded text-sm">
                        {tag?.label || id}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {activeSection === "markets" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center gap-2 flex-wrap">
              <div>
                <h2 className="text-lg font-bold">Demo Markets</h2>
                <p className="text-sm text-zinc-500">
                  Manually added markets (shown when no Polymarket tags selected)
                </p>
              </div>
              <Button
                onClick={handleCreateSampleMarket}
                disabled={createMarketMutation.isPending}
                data-testid="button-create-market"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Sample Market
              </Button>
            </div>

            {marketsLoading ? (
              <div className="text-zinc-500">Loading...</div>
            ) : markets.length === 0 ? (
              <Card className="p-8 text-center text-zinc-500">
                No markets yet. Click "Add Sample Market" to create one.
              </Card>
            ) : (
              <div className="space-y-2">
                {markets.map((market) => (
                  <Card
                    key={market.id}
                    className="p-4 flex justify-between items-center gap-2"
                    data-testid={`admin-market-${market.id}`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-bold truncate">{market.title}</div>
                      <div className="text-sm text-zinc-500">
                        {market.sport} | Vol: ${(market.volume / 1000).toFixed(1)}K
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => deleteMarketMutation.mutate(market.id)}
                      disabled={deleteMarketMutation.isPending}
                      data-testid={`button-delete-market-${market.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {activeSection === "players" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold">Demo Players</h2>
              <Button
                onClick={() => setShowPlayerForm(!showPlayerForm)}
                data-testid="button-toggle-player-form"
              >
                {showPlayerForm ? (
                  <>
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Player
                  </>
                )}
              </Button>
            </div>

            {showPlayerForm && (
              <Card className="p-4 space-y-4">
                <h3 className="font-bold text-zinc-300">Create New Player</h3>
                <form onSubmit={playerForm.handleSubmit(onSubmitPlayer)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Player Name</Label>
                      <Input
                        id="name"
                        placeholder="e.g. LeBron James"
                        {...playerForm.register("name")}
                        data-testid="input-player-name"
                      />
                      {playerForm.formState.errors.name && (
                        <p className="text-xs text-red-500">{playerForm.formState.errors.name.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="symbol">Symbol (Token)</Label>
                      <Input
                        id="symbol"
                        placeholder="e.g. LBJ"
                        maxLength={6}
                        {...playerForm.register("symbol")}
                        data-testid="input-player-symbol"
                      />
                      {playerForm.formState.errors.symbol && (
                        <p className="text-xs text-red-500">{playerForm.formState.errors.symbol.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="team">Team</Label>
                      <Input
                        id="team"
                        placeholder="e.g. Los Angeles Lakers"
                        {...playerForm.register("team")}
                        data-testid="input-player-team"
                      />
                      {playerForm.formState.errors.team && (
                        <p className="text-xs text-red-500">{playerForm.formState.errors.team.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sport">Sport</Label>
                      <Select
                        value={playerForm.watch("sport")}
                        onValueChange={(value) => playerForm.setValue("sport", value)}
                      >
                        <SelectTrigger data-testid="select-player-sport">
                          <SelectValue placeholder="Select sport" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Basketball">Basketball</SelectItem>
                          <SelectItem value="Football">Football</SelectItem>
                          <SelectItem value="Soccer">Soccer</SelectItem>
                          <SelectItem value="Baseball">Baseball</SelectItem>
                          <SelectItem value="Hockey">Hockey</SelectItem>
                          <SelectItem value="Tennis">Tennis</SelectItem>
                          <SelectItem value="Golf">Golf</SelectItem>
                          <SelectItem value="MMA">MMA</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fundingTarget">Funding Target ($)</Label>
                      <Input
                        id="fundingTarget"
                        type="number"
                        {...playerForm.register("fundingTarget", { valueAsNumber: true })}
                        data-testid="input-funding-target"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fundingCurrent">Current Funding ($)</Label>
                      <Input
                        id="fundingCurrent"
                        type="number"
                        {...playerForm.register("fundingCurrent", { valueAsNumber: true })}
                        data-testid="input-funding-current"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select
                        value={playerForm.watch("status")}
                        onValueChange={(value: "offering" | "available" | "closed") => 
                          playerForm.setValue("status", value)
                        }
                      >
                        <SelectTrigger data-testid="select-player-status">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="offering">Offering (Funding)</SelectItem>
                          <SelectItem value="available">Available (Trading)</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={createPlayerMutation.isPending}
                    className="w-full"
                    data-testid="button-submit-player"
                  >
                    {createPlayerMutation.isPending ? "Creating..." : "Create Player"}
                  </Button>
                </form>
              </Card>
            )}

            {playersLoading ? (
              <div className="text-zinc-500">Loading...</div>
            ) : players.length === 0 ? (
              <Card className="p-8 text-center text-zinc-500">
                No players yet. Click "Add Player" to create one.
              </Card>
            ) : (
              <div className="space-y-2">
                {players.map((player) => (
                  <Card
                    key={player.id}
                    className="p-4 flex justify-between items-center gap-2"
                    data-testid={`admin-player-${player.id}`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-bold truncate">{player.name}</div>
                      <div className="text-sm text-zinc-500">
                        ${player.symbol} | {player.team} | {player.sport} | {player.status}
                      </div>
                      <div className="text-xs text-zinc-600">
                        Funding: ${player.fundingCurrent.toLocaleString()} / ${player.fundingTarget.toLocaleString()} ({player.fundingPercentage}%)
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => deletePlayerMutation.mutate(player.id)}
                      disabled={deletePlayerMutation.isPending}
                      data-testid={`button-delete-player-${player.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
