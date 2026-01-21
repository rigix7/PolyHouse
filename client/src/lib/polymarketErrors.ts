export type PolymarketErrorCategory = 
  | "geo_blocked"
  | "cloudflare_blocked"
  | "unauthorized"
  | "insufficient_balance"
  | "no_liquidity"
  | "price_out_of_range"
  | "order_rejected"
  | "wallet_not_ready"
  | "network_error"
  | "unknown";

export interface CategorizedError {
  category: PolymarketErrorCategory;
  userMessage: string;
  technicalDetails: string;
  actionable: string;
  severity: "warning" | "error" | "info";
}

const ERROR_PATTERNS: Array<{
  patterns: RegExp[];
  category: PolymarketErrorCategory;
  userMessage: string;
  actionable: string;
  severity: "warning" | "error" | "info";
}> = [
  {
    patterns: [/geo.?block/i, /trading not available/i, /not available in your region/i, /blocked.*region/i],
    category: "geo_blocked",
    userMessage: "Trading is not available in your region",
    actionable: "Polymarket restricts trading in certain countries. You can still view markets.",
    severity: "error",
  },
  {
    patterns: [/turnstile/i, /600010/i, /cloudflare/i, /challenge failed/i, /security check/i],
    category: "cloudflare_blocked",
    userMessage: "Security check failed",
    actionable: "Try refreshing the page, disabling browser extensions, or switching networks. VPNs may trigger this.",
    severity: "warning",
  },
  {
    patterns: [/401/i, /unauthorized/i, /invalid api key/i, /session expired/i, /authentication/i],
    category: "unauthorized",
    userMessage: "Session expired",
    actionable: "Please disconnect and reconnect your wallet to refresh your session.",
    severity: "error",
  },
  {
    patterns: [/not enough balance/i, /insufficient/i, /allowance/i, /balance too low/i],
    category: "insufficient_balance",
    userMessage: "Insufficient balance",
    actionable: "You don't have enough USDC to place this bet. Try a smaller amount or add funds.",
    severity: "error",
  },
  {
    patterns: [/no liquidity/i, /fill.*fail/i, /fok.*fail/i, /order.*not.*fill/i, /no.*available/i, /unable to get valid market price/i],
    category: "no_liquidity",
    userMessage: "Not enough liquidity",
    actionable: "There aren't enough orders on the market to fill your bet. Try a smaller amount.",
    severity: "warning",
  },
  {
    patterns: [/price.*range/i, /min.*0\.01.*max.*0\.99/i, /invalid price/i],
    category: "price_out_of_range",
    userMessage: "Price out of range",
    actionable: "Market prices must be between 1¢ and 99¢. The market may have moved.",
    severity: "warning",
  },
  {
    patterns: [/order.*rejected/i, /rejected/i, /post.*only/i],
    category: "order_rejected",
    userMessage: "Order rejected",
    actionable: "The market couldn't accept your order. Try again in a moment.",
    severity: "warning",
  },
  {
    patterns: [/wallet.*not.*ready/i, /wallet.*proxy.*not.*initialized/i, /signer.*undefined/i, /wallet not connected/i, /cannot read properties of undefined/i],
    category: "wallet_not_ready",
    userMessage: "Wallet not ready",
    actionable: "Please wait for your wallet to fully connect, or try logging out and back in.",
    severity: "warning",
  },
  {
    patterns: [/network/i, /timeout/i, /econnrefused/i, /fetch.*fail/i, /connection/i],
    category: "network_error",
    userMessage: "Connection issue",
    actionable: "Check your internet connection and try again.",
    severity: "warning",
  },
];

export function categorizeError(error: unknown): CategorizedError {
  let errorString = "";
  
  if (error instanceof Error) {
    errorString = error.message;
  } else if (typeof error === "string") {
    errorString = error;
  } else if (error && typeof error === "object") {
    const errObj = error as Record<string, unknown>;
    errorString = String(errObj.message || errObj.error || errObj.reason || JSON.stringify(error));
  }
  
  const lowerError = errorString.toLowerCase();
  
  for (const pattern of ERROR_PATTERNS) {
    for (const regex of pattern.patterns) {
      if (regex.test(lowerError)) {
        return {
          category: pattern.category,
          userMessage: pattern.userMessage,
          technicalDetails: errorString,
          actionable: pattern.actionable,
          severity: pattern.severity,
        };
      }
    }
  }
  
  return {
    category: "unknown",
    userMessage: "Something went wrong",
    technicalDetails: errorString || "Unknown error",
    actionable: "Please try again. If the problem persists, refresh the page.",
    severity: "error",
  };
}

export function formatErrorForUser(error: unknown): string {
  const categorized = categorizeError(error);
  return categorized.userMessage;
}

export function getErrorGuidance(error: unknown): string {
  const categorized = categorizeError(error);
  return categorized.actionable;
}

export interface GeoblockStatus {
  blocked: boolean;
  ip?: string;
  country?: string;
  region?: string;
  checked: boolean;
  error?: string;
}

export async function checkGeoblock(): Promise<GeoblockStatus> {
  try {
    const response = await fetch("https://polymarket.com/api/geoblock", {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
    });
    
    if (!response.ok) {
      console.warn("[Geoblock] Failed to check geoblock status:", response.status);
      return { blocked: false, checked: true, error: `HTTP ${response.status}` };
    }
    
    const data = await response.json();
    console.log("[Geoblock] Status:", data);
    
    return {
      blocked: data.blocked === true,
      ip: data.ip,
      country: data.country,
      region: data.region,
      checked: true,
    };
  } catch (err) {
    console.error("[Geoblock] Error checking status:", err);
    return { 
      blocked: false, 
      checked: true, 
      error: err instanceof Error ? err.message : "Unknown error" 
    };
  }
}
