import { Wallet, Zap, Flame, Target, Trophy, Crown, Shield, Rocket, Gem, Heart, Sparkles, Star, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWhiteLabelTheme } from "@/hooks/useWhiteLabelTheme";

const ICON_MAP: Record<string, LucideIcon> = {
  zap: Zap,
  flame: Flame,
  target: Target,
  trophy: Trophy,
  crown: Crown,
  shield: Shield,
  rocket: Rocket,
  gem: Gem,
  heart: Heart,
  sparkles: Sparkles,
  star: Star,
};

interface HeaderProps {
  usdcBalance: number;
  wildBalance: number;
  onWalletClick: () => void;
  isConnected?: boolean;
}

export function Header({ usdcBalance, wildBalance, onWalletClick, isConnected = false }: HeaderProps) {
  const { brandName, logoUrl, logoIcon, primaryColor, pointsConfig } = useWhiteLabelTheme();
  
  const LogoIconComponent = logoIcon && logoIcon !== "none" ? ICON_MAP[logoIcon] : null;
  
  const formatBalance = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const pointsName = pointsConfig?.name?.replace("$", "") || "WILD";
  const showPoints = pointsConfig?.enabled ?? false;

  return (
    <header 
      className="h-14 shrink-0 flex items-center justify-between px-4 bg-zinc-900/80 backdrop-blur-lg border-b border-zinc-800/50 z-30" 
      style={{ backgroundColor: "var(--wl-header-bg, rgba(24, 24, 27, 0.8))" }}
    >
      <div className="flex items-center gap-2">
        {logoUrl ? (
          <img src={logoUrl} alt={brandName} className="h-6 w-auto" />
        ) : LogoIconComponent ? (
          <LogoIconComponent 
            className="h-5 w-5" 
            style={{ color: "var(--wl-header-accent, var(--wl-brand-primary, " + primaryColor + "))" }} 
          />
        ) : null}
        <span 
          className="font-black italic tracking-tighter text-lg" 
          style={{ color: "var(--wl-header-text, #ffffff)" }}
        >
          {brandName}
        </span>
      </div>
      {isConnected ? (
        <Button
          variant="ghost"
          onClick={onWalletClick}
          className="group flex items-center gap-3 bg-zinc-900/50 border border-zinc-800 px-3 py-1.5 rounded-full"
          data-testid="button-wallet"
        >
          <div className="text-[10px] font-mono text-right leading-tight text-zinc-400 group-hover:text-white">
            <div data-testid="text-usdc-balance">${formatBalance(usdcBalance)}</div>
            {showPoints && (
              <div className="text-wild-scout" data-testid="text-wild-balance">
                {formatBalance(wildBalance)} {pointsName}
              </div>
            )}
          </div>
          <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center">
            <Wallet className="w-3 h-3 text-zinc-400 group-hover:text-white" />
          </div>
        </Button>
      ) : (
        <Button
          variant="ghost"
          onClick={onWalletClick}
          className="group flex items-center gap-2 bg-wild-brand/10 border border-wild-brand/30 px-3 py-1.5 rounded-full text-wild-brand"
          data-testid="button-connect"
        >
          <span className="text-xs font-bold">Connect</span>
          <Wallet className="w-4 h-4" />
        </Button>
      )}
    </header>
  );
}
