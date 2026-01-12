# Wildcard Sports Prediction Terminal

## Overview
Wildcard is a sports prediction terminal application featuring a HUD-style dark interface. It provides gasless betting capabilities using the Polymarket Builder Relayer pattern, player scouting with funding curves, and real-time trading.

## Current State
- **MVP Complete**: All core tabs (Predict, Scout, Trade, Dashboard) functional
- **Database**: PostgreSQL with Drizzle ORM for persistent storage
- **Theme**: Zinc-950 dark mode with neon accents

## Project Architecture

### Frontend (client/)
- **Framework**: React with TypeScript
- **Routing**: Wouter
- **State Management**: TanStack React Query
- **Styling**: Tailwind CSS with custom design system

### Backend (server/)
- **Framework**: Express.js
- **Storage**: PostgreSQL with Drizzle ORM (DatabaseStorage class)
- **API**: RESTful endpoints at /api/*

### Shared (shared/)
- **Schema**: Zod schemas for type validation
- **Types**: TypeScript types derived from schemas

## Key Features
1. **Predict Tab**: Live betting markets with 3-way odds
2. **Scout Tab**: Player launchpad with funding progress bars
3. **Trade Tab**: Player token trading interface
4. **Dashboard**: Wallet balances and betting history
5. **Admin CMS**: /admin route for managing demo data

## Design System
- See `design_guidelines.md` for complete design specifications
- Colors: wild-brand (rose), wild-scout (emerald), wild-trade (blue), wild-gold (amber)
- Fonts: Inter (sans), JetBrains Mono (mono)

## API Endpoints
- GET/POST /api/markets
- GET/POST /api/players
- POST /api/players/fund
- GET/POST /api/bets
- GET/POST /api/trades
- GET /api/wallet
- POST /api/polymarket/sign (stub)

## Sport Config Editor
The Admin panel includes a comprehensive Sport + Market Type Configuration system:
- **Dynamic Market Type Discovery**: Scans up to 50 events per sport to find ALL available market types (moneyline, spreads, totals, player props, etc.)
- **Sample API Data**: Fetches real sample market data for the selected sport+marketType combination
- **Field Mapping**: Configure which API fields map to title, button labels, bet slip
- **Line Display**: Configure how spread/total lines are displayed
- **Outcome Strategy**: Configure how outcome labels are formatted
- **Composite Unique Key**: Uses (sportSlug, marketType) composite key to prevent duplicate configs

Key API Endpoints:
- GET /api/admin/sport-market-types/:seriesId - Discovers all market types for a sport
- GET /api/admin/sport-sample-v2/:seriesId/:marketType - Gets sample market data
- GET/POST/DELETE /api/admin/sport-market-configs - CRUD for configurations

## Recent Changes
- Initial MVP implementation (January 2026)
- Created terminal-style UI components
- Built Admin CMS for data management
- Migrated to PostgreSQL database with Drizzle ORM (January 10, 2026)
- Auto-seeds 3 markets and 6 players on startup if database is empty
- Fixed NBA events not showing by adding gameStartTime fallback to event.startDate (January 12, 2026)
- Fixed Price Ticker sync with Match Day view using 5-day filter
- Added getShortOutcomeLabel() helper for concise futures outcome display
- Enlarged EventCard with more padding and description display
- Enhanced Sport Config Editor with comprehensive market type discovery (January 12, 2026)
  - Scans 50 events per sport instead of 20 for better market type coverage
  - Added v2 sample endpoint with 30-event search and full raw market data
  - UI shows market type count, labels, and configured status
