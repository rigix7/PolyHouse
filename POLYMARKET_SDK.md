# Polymarket SDK - Integration Guide for AI Agents

This SDK provides a battle-tested wrapper for Polymarket's CLOB (Central Limit Order Book) and Builder Relayer APIs. It has been debugged extensively and handles the complexity of gasless betting on Polygon.

## Quick Start

```typescript
import { PolymarketSDK, type SDKConfig, type WalletAdapter } from "@/sdk";

// 1. Configure the SDK
const config: SDKConfig = {
  builderApiKey: process.env.POLYMARKET_BUILDER_API_KEY!,
  builderSecret: process.env.POLYMARKET_BUILDER_SECRET!,
  builderPassphrase: process.env.POLYMARKET_BUILDER_PASSPHRASE!,
  signingEndpoint: `${window.location.origin}/api/polymarket/sign`,
  // Optional: Enable fee collection
  feeAddress: "0xYourFeeWallet",
  feeBps: 50, // 0.5% fee
};

// 2. Create wallet adapter (example with Privy)
const walletAdapter: WalletAdapter = {
  getAddress: async () => privyWallet.address,
  signMessage: async (msg) => privyWallet.sign(msg),
  getEthersSigner: () => ethersSigner, // ethers v5 Signer
  getViemWalletClient: () => viemWalletClient,
};

// 3. Initialize and use
const sdk = new PolymarketSDK(config);
await sdk.initialize(walletAdapter);

// Place a $10 bet on YES
const result = await sdk.placeOrder({
  tokenId: "123456789...",
  side: "BUY",
  amount: 10, // $10 USDC
  negRisk: false, // or true for winner-take-all markets
});
```

## Architecture Overview

### Key Concepts

1. **Safe Wallet**: Users don't bet directly from their EOA (Externally Owned Account). Instead, we derive a Safe proxy wallet for each user. USDC is deposited to this Safe, and all bets execute from it gaslessly.

2. **Two Market Types**:
   - **CTF Markets (negRisk=false)**: Standard binary markets backed by USDC
   - **NegRisk Markets (negRisk=true)**: Winner-take-all markets (soccer 3-way moneylines, elections) backed by WrappedCollateral

3. **Builder Relayer**: Signs transactions server-side and submits them via Polymarket's relayer for gasless execution.

4. **FOK Orders**: We use Fill-or-Kill orders for instant execution - either the order fills completely or is rejected.

### File Structure

```
client/src/sdk/
├── index.ts           # Main exports
├── PolymarketSDK.ts   # SDK class with all methods
├── types.ts           # TypeScript interfaces
├── constants.ts       # Contract addresses, chain config
└── abis.ts            # Contract ABIs
```

## Core Methods

### `initialize(wallet: WalletAdapter)`

Must be called before any other method. Sets up:
- Safe wallet derivation
- API credential derivation
- RelayClient for gasless transactions
- ClobClient for order placement

### `getPositions(): Promise<Position[]>`

Fetches all current positions for the user's Safe wallet from Polymarket Data API.

```typescript
const positions = await sdk.getPositions();
for (const pos of positions) {
  console.log(`${pos.question}: ${pos.size} shares at $${pos.avgPrice}`);
}
```

### `placeOrder(params: PlaceOrderParams): Promise<OrderResult>`

Places a Fill-or-Kill market order.

```typescript
interface PlaceOrderParams {
  tokenId: string;      // Polymarket token ID for the outcome
  side: "BUY" | "SELL"; // BUY = bet on outcome, SELL = exit position
  amount: number;       // For BUY: USDC to spend. For SELL: shares to sell
  tickSize?: TickSize;  // Price precision (default: "0.01")
  negRisk?: boolean;    // true for winner-take-all markets
}
```

**Important**: The `negRisk` flag comes from the Polymarket API (`market.negRisk`). Don't compute it yourself.

### `batchRedeemPositions(positions: RedeemablePosition[])`

Redeems multiple winning positions in a single transaction (one signature).

```typescript
interface RedeemablePosition {
  conditionId: string;   // From Polymarket API
  tokenId: string;       // From Polymarket API
  outcomeLabel?: string; // "Yes" or "No" - from Polymarket API
  negRisk?: boolean;     // From Polymarket API
}
```

**Critical**: Use the `outcomeLabel` directly from Polymarket's API. The SDK uses it to build the correct redemption parameters for NegRisk markets.

### `redeemWinnings(positions: RedeemablePosition[])`

Alias for `batchRedeemPositions` - redeems winning positions after market resolution.

### `getOrderBook(tokenId: string): Promise<OrderBookData | null>`

Fetches real-time order book. No authentication required.

Returns liquidity analysis:
- `bestBid` / `bestAsk`: Current prices
- `spread` / `spreadPercent`: Market spread
- `isLowLiquidity`: Warning flag if < $100 at best ask
- `isWideSpread`: Warning flag if spread > 5%

### `deploySafe() / approveUSDC() / withdrawUSDC(amount, toAddress)`

Wallet setup and fund management operations.

## Server-Side Signing Endpoint

The SDK requires a server endpoint for Builder signature generation. This keeps your Builder API credentials secure.

```typescript
// server/routes.ts
import { buildHmacSignature, type BuilderApiKeyCreds } from "@polymarket/builder-signing-sdk";

const BUILDER_CREDENTIALS: BuilderApiKeyCreds = {
  key: process.env.POLYMARKET_BUILDER_API_KEY || "",
  secret: process.env.POLYMARKET_BUILDER_SECRET || "",
  passphrase: process.env.POLYMARKET_BUILDER_PASSPHRASE || "",
};

app.post("/api/polymarket/sign", async (req, res) => {
  try {
    const { method, requestPath, body, timestamp } = req.body;
    
    if (!BUILDER_CREDENTIALS.key || !BUILDER_CREDENTIALS.secret) {
      return res.status(503).json({ error: "Builder credentials not configured" });
    }

    const bodyStr = typeof body === "string" ? body : JSON.stringify(body);
    const signature = buildHmacSignature(
      BUILDER_CREDENTIALS.secret,
      timestamp,
      method,
      requestPath,
      bodyStr
    );

    res.json({
      signature,
      key: BUILDER_CREDENTIALS.key,
      passphrase: BUILDER_CREDENTIALS.passphrase,
      timestamp,
    });
  } catch (error) {
    res.status(500).json({ error: "Signing failed" });
  }
});
```

## Fee Collection

The SDK supports collecting integrator fees on successful BUY orders:

```typescript
const sdk = new PolymarketSDK({
  // ... other config
  feeAddress: "0xYourFeeWallet",
  feeBps: 50, // 50 basis points = 0.5%
});
```

**How it works**:
1. User places BUY order for $100
2. Order fills on Polymarket
3. SDK transfers $0.50 USDC from user's Safe to your fee wallet
4. Fee failure doesn't break the order

**Note**: Fees only apply to BUY orders because the amount parameter directly represents USDC spent. SELL orders would require fill price data for accurate calculation.

## Design Principles

### 1. Use API Data Directly

**CRITICAL**: Never compute values that the Polymarket API provides. This has caused expensive bugs.

✅ **DO**: Use `market.negRisk`, `position.outcomeLabel`, `market.conditionId` directly
❌ **DON'T**: Try to derive negRisk status from token IDs or condition IDs

### 2. Query Real Balances

For redemption, we query actual CTF token balances on-chain:
```typescript
const balance = await queryCTFBalance(safeAddress, BigInt(tokenId));
```

### 3. Error Handling

All methods return result objects with `success` boolean:
```typescript
const result = await sdk.placeOrder(params);
if (!result.success) {
  console.error("Order failed:", result.error);
}
```

## Market Types Deep Dive

### Standard CTF Markets (negRisk=false)

- Examples: "Will BTC hit $100k by Dec 2024?"
- Backed by USDC collateral
- Redemption: CTF.redeemPositions(collateral, parentId, conditionId, indexSets)

### NegRisk Markets (negRisk=true)

- Examples: Soccer 3-way moneylines, Elections with many candidates
- Backed by WrappedCollateral (WCOL)
- Multiple outcomes, winner takes all
- Redemption: NegRiskAdapter.redeemPositions(conditionId, amounts)
  - amounts = [yesAmount, noAmount] based on outcomeLabel

## Fetching Market Data

The SDK handles order placement and redemption. For market discovery, use Polymarket's APIs directly:

```typescript
// Gamma API - Market discovery
const markets = await fetch("https://gamma-api.polymarket.com/events?active=true");

// Data API - User positions
const positions = await fetch(`https://data-api.polymarket.com/positions?user=${safeAddress}`);

// CLOB API - Order book (or use sdk.getOrderBook())
const book = await fetch(`https://clob.polymarket.com/book?token_id=${tokenId}`);
```

## Environment Variables

```bash
# Server-side (keep secret!)
POLYMARKET_BUILDER_API_KEY=your_builder_key
POLYMARKET_BUILDER_SECRET=your_builder_secret
POLYMARKET_BUILDER_PASSPHRASE=your_builder_passphrase

# Client-side (optional fee config)
VITE_INTEGRATOR_FEE_ADDRESS=0xYourFeeWallet
VITE_INTEGRATOR_FEE_BPS=50
```

## Common Gotchas

1. **Geo-blocking**: Polymarket blocks trading from certain countries. The SDK will receive "no liquidity" errors.

2. **Minimum order size**: Markets have minimum order values (typically $5). Check `market.orderMinSize`.

3. **Safe not deployed**: First-time users need to call `deploySafe()` before betting.

4. **USDC approval**: Call `approveUSDC()` once after Safe deployment.

5. **Token IDs**: Each outcome has its own tokenId. For a Yes/No market, there are 2 tokens.

## Example: AI Betting Agent

```typescript
import { PolymarketSDK } from "@/sdk";

class BettingAgent {
  private sdk: PolymarketSDK;

  async analyzeMomentum(tokenId: string): Promise<"BUY" | "SELL" | "HOLD"> {
    const book = await this.sdk.getOrderBook(tokenId);
    if (!book) return "HOLD";
    
    // Your strategy logic here
    if (book.isLowLiquidity || book.isWideSpread) return "HOLD";
    
    // Example: momentum strategy
    const price = book.bestAsk;
    // ... analyze historical prices, news, etc.
    
    return "BUY";
  }

  async executeTrade(tokenId: string, signal: "BUY" | "SELL", amount: number) {
    if (signal === "HOLD") return;
    
    const result = await this.sdk.placeOrder({
      tokenId,
      side: signal,
      amount,
      negRisk: false, // Get from market data
    });

    if (result.success && result.filled) {
      console.log(`Filled order ${result.orderID}`);
    }
  }
}
```

## Testing

Before going live:
1. Use small amounts ($1-5) to verify order flow
2. Check Safe deployment works
3. Test redemption with a resolved market
4. Verify fee collection (if enabled)

## Support

This SDK was battle-tested through extensive debugging. If you encounter issues:
1. Check the console logs (SDK logs with `[SDK]` prefix)
2. Verify API credentials are correct
3. Confirm the user has USDC in their Safe
4. Check if Polymarket is geo-blocking

---

*Last updated: January 2026*
*Tested with: @polymarket/clob-client, @polymarket/builder-relayer-client*
