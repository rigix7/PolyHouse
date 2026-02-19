// Polymarket API URLs
export const RELAYER_URL = "https://relayer-v2.polymarket.com/";
export const CLOB_API_URL = "https://clob.polymarket.com";

// RPC - use your own Polygon RPC for better reliability
export const POLYGON_RPC_URL =
  import.meta.env.VITE_POLYGON_RPC_URL || "https://polygon-rpc.com";

// Backup RPC URLs for automatic failover when primary is down
const POLYGON_BACKUP_RPCS = [
  "https://rpc.ankr.com/polygon",
  "https://polygon.llamarpc.com",
  "https://polygon-bor-rpc.publicnode.com",
];

// Shared transport with automatic fallback - tries each RPC in order until one succeeds
import { fallback, http } from "viem";
export const polygonTransport = fallback([
  http(POLYGON_RPC_URL),
  ...POLYGON_BACKUP_RPCS.map((url) => http(url)),
]);

// Remote signing endpoint - points to your server
export const REMOTE_SIGNING_URL = () =>
  typeof window !== "undefined"
    ? `${window.location.origin}/api/polymarket/sign`
    : "/api/polymarket/sign";

// Chain configuration
export const POLYGON_CHAIN_ID = 137;

// Session storage key prefix
export const SESSION_STORAGE_KEY = "polymarket_trading_session";
