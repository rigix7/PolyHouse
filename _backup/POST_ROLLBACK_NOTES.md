# Post-Rollback Notes: Betting "Invalid Signature" Bug

**Created:** January 17, 2026  
**Working Commit:** `4d05274` (Jan 14, 2026 - "Update API credentials and improve hook logic for betting")  
**Current HEAD:** `cffabc7` (broken)

## Summary

Betting functionality broke sometime after commit `4d05274`. Orders fail with "invalid signature" error from Polymarket CLOB API. After extensive debugging, we could not identify the exact root cause. **Rollback to 4d05274 is recommended** to restore working betting.

---

## The Bug

### Symptoms
- Order submission fails with 400 "invalid signature" error
- Error occurs in `ClobClient.createAndPostOrder()` 
- All order fields appear correct (maker, signer, signatureType, tokenId, etc.)

### Error Details
```json
{
  "status": 400,
  "error": "invalid signature",
  "order": {
    "salt": "...",
    "maker": "0x7291..." (Safe address - CORRECT),
    "signer": "0x98dE..." (EOA address - CORRECT),
    "signatureType": 2 (Safe proxy - CORRECT),
    "owner": "6773a731-81f3-..." (API key UUID - SUSPICIOUS)
  }
}
```

### Key Observation
The `owner` field in the order payload contains the **API key UUID** instead of an address. This is set by the SDK's `orderToJson()` function which uses `this.creds.key` as the owner.

---

## Debugging Investigation

### What We Checked

1. **SDK Code Analysis**
   - Traced through `@polymarket/clob-client` v4.22.8
   - Found `orderToJson()` in `client.js` line 496 uses `this.creds?.key || ""` as owner
   - This behavior is the same in our code AND the official Polymarket example

2. **Official Polymarket Example Comparison**
   - Compared against `github.com/Polymarket/privy-safe-builder-example`
   - Our hooks (`useClobClient`, `useClobOrder`, `useUserApiCredentials`, `useTradingSession`) are **IDENTICAL**
   - They use the same SDK version (4.22.8)
   - Their code works, ours doesn't

3. **Session/Credential Management**
   - Added `credentialsDerivedFor` tracking field
   - Implemented session clear versioning (now at v3)
   - Removed auto-restore from database
   - Still fails with fresh credentials

4. **SDK Version Check**
   - v5.x exists (up to 5.2.1) with breaking changes (ESM, no crypto)
   - User reports v5 was tried earlier and didn't work with our Vite setup
   - Official example stays on 4.22.8

### What We Ruled Out

- ❌ Stale credentials (fresh derivation still fails)
- ❌ Wrong Safe address (matches derived address)
- ❌ Wrong EOA signer (matches Privy wallet)
- ❌ Wrong signatureType (correctly set to 2)
- ❌ SDK version mismatch (same as working example)
- ❌ Code differences (our hooks match official example exactly)

### Unresolved Questions

1. **Why does official example work with same code/SDK?**
   - Possibly different wallet state, timing, or environment
   
2. **Why did it work at 4d05274 but not now?**
   - Something in commits after 4d05274 may have subtle side effects
   - Privy wallet initialization timing?
   - React hook dependency order?

3. **Is the owner field actually the problem?**
   - Error says "invalid signature" not "invalid owner"
   - The signature itself may be incorrect due to wallet state

---

## Features Added Since 4d05274

These features were added AFTER the working commit and should be carefully re-applied:

### 1. Dual Filtering System (Match Day / Futures)
- **Files:** `PredictView.tsx`, `SubTabs.tsx`, `admin.tsx`, `routes.ts`, `schema.ts`
- Dynamic league extraction from Polymarket event data
- Admin-managed futures categories stored in database
- **Safe to restore:** Yes, UI-only changes

### 2. Live Prices via WebSocket
- **Files:** `useLivePrices.ts` (NEW), market display components
- Uses `@nevuamarkets/poly-websockets` package
- Real-time best_ask price updates
- **Safe to restore:** Yes, read-only feature

### 3. Order Books Integration
- **Files:** `useOrderBooks.ts` (NEW), `OrderBookContext.tsx` (NEW)
- Fetches order book data for markets
- **Safe to restore:** Yes, read-only feature

### 4. Enhanced BetSlip UI
- **Files:** `BetSlip.tsx`, `Toast.tsx`
- Success/error inline panels
- Loading states with spinner
- **Safe to restore:** Yes, but CHECK order submission logic

### 5. Dashboard Activity Tab
- **Files:** `DashboardView.tsx`
- Fetches trade history from Polymarket Data API
- Shows BOUGHT/SOLD/CLAIMED badges
- **Safe to restore:** Yes, read-only feature

### 6. Session Management Changes
- **Files:** `useTradingSession.ts`, `session.ts`
- Added `credentialsDerivedFor` tracking
- Session clear versioning
- Removed auto-restore
- **⚠️ CAUTION:** These are the files we modified trying to fix the bug

---

## Files in This Backup

The `_backup/` folder contains all current UI code:

```
_backup/
├── README.md                    # Backup overview
├── POST_ROLLBACK_NOTES.md       # This file
├── client/
│   └── src/
│       ├── pages/               # home.tsx, admin.tsx
│       ├── components/          # All UI components
│       ├── hooks/               # All hooks (CAREFUL with Clob/Session ones)
│       ├── providers/           # Privy, Wallet providers
│       ├── lib/                 # Utilities
│       └── utils/               # Session, approvals
├── server/
│   ├── routes.ts                # API routes
│   └── storage.ts               # Storage interface
└── shared/
    └── schema.ts                # Database schema
```

---

## Recommended Actions for Next Agent

### Step 1: Rollback
```bash
# Rollback to working commit
git checkout 4d05274 -- .

# Or use Replit's rollback UI
```

### Step 2: Verify Betting Works
1. Log in with Privy
2. Activate trading session (deploy Safe, get credentials, set approvals)
3. Place a small bet ($5 limit order)
4. **Confirm order succeeds** before proceeding

### Step 3: Carefully Re-apply Features
**Order of restoration (safest first):**

1. **Schema changes** - Add new tables (futures_categories, etc.)
2. **Server routes** - Add admin endpoints
3. **UI components** - Terminal components, views
4. **Read-only hooks** - useLivePrices, useOrderBooks
5. **Pages** - home.tsx, admin.tsx

**DO NOT restore immediately:**
- `useTradingSession.ts` - Compare carefully with working version
- `useClobClient.ts` - Check for subtle changes
- `useClobOrder.ts` - Verify order logic unchanged
- `session.ts` - Our session versioning changes

### Step 4: Test After Each Restoration
After restoring each group, test betting again to catch any regressions early.

---

## Potential Root Causes to Investigate

If betting still fails after rollback, consider:

1. **Privy Wallet State**
   - Console shows "Wallet proxy not initialized" and "Privy iframe failed to load"
   - Wallet may need full page refresh to initialize properly

2. **Credential Corruption**
   - Clear all localStorage: `localStorage.clear()`
   - Clear all session data and re-derive credentials

3. **Network/Environment Issues**
   - Geo-blocking (Singapore, UK, etc. are blocked)
   - VPN state changes

4. **Polymarket API Changes**
   - Their API validation may have changed
   - Check their Discord/status page for outages

---

## Commits Between Working and Current

```
4d05274 -> Working (betting success)
6706a4f -> Untested
... many commits related to:
    - Futures filtering
    - Session management changes
    - Credential derivation fixes (these may have broken things)
... -> cffabc7 (current, broken)
```

The session management and credential-related commits are the most likely culprits.

---

## Contact/Resources

- **Polymarket CLOB Docs:** https://docs.polymarket.com/developers/CLOB/
- **Official Privy+Safe Example:** https://github.com/Polymarket/privy-safe-builder-example
- **SDK Issues:** https://github.com/Polymarket/clob-client/issues

Good luck! 🍀
