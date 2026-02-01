# Deep Dive Stock OS

A production-ready stock analysis web application that evaluates stocks using two independent trading horizons.

## Overview

Deep Dive Stock OS provides professional-grade stock analysis through:
- **Strategic Growth Anchor** (4-9 month investment horizon)
- **Tactical Sentinel** (0-4 month trading horizon)

Each horizon engine produces a score (0-100), trade status, and detailed breakdown of positives, risks, and failure modes.

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS with semantic color tokens
- **Backend**: Express.js
- **State Management**: TanStack Query

## Project Structure

```
shared/
├── types/           # TypeScript interfaces for stocks, horizons, evaluations
│   ├── stock.ts
│   ├── horizon.ts
│   └── evaluation.ts
├── constants/       # Configurable thresholds for scoring
│   └── thresholds.ts

server/
├── domain/          # Business logic (no UI dependencies)
│   └── horizons/
│       ├── strategicGrowth/
│       │   ├── evaluator.ts
│       │   ├── scoring.ts
│       │   └── rules.ts
│       └── tacticalSentinel/
│           ├── evaluator.ts
│           ├── scoring.ts
│           └── rules.ts
├── services/        # Data access layer
│   └── stocks/
│       ├── mockData.ts
│       └── fetchStock.ts
├── routes.ts        # API endpoints

client/src/
├── components/
│   ├── stock/       # Stock-specific components
│   │   ├── StatusBadge.tsx
│   │   ├── ScoreCircle.tsx
│   │   ├── EvaluationSection.tsx
│   │   ├── HorizonPanel.tsx
│   │   ├── StockHeader.tsx
│   │   └── StockCard.tsx
│   └── layout/      # Layout components
│       ├── Header.tsx
│       └── MainLayout.tsx
├── pages/
│   ├── Dashboard.tsx
│   └── StockDeepDive.tsx
```

## Routes

- `/` - Dashboard showing all tracked stocks with evaluation summaries
- `/stocks/:symbol` - Deep dive page with full evaluation for a specific stock

## API Endpoints

- `GET /api/dashboard` - Returns all stocks with evaluation scores
- `GET /api/stocks/:symbol` - Returns detailed evaluation for a stock

## Color Semantics

Consistent semantic colors are used throughout:
- **Green** (`stock-eligible`): Trade Eligible / Strong Positive
- **Orange/Yellow** (`stock-watch`): Caution / Watch
- **Red** (`stock-reject`): Avoid / High Risk

## Evaluation Engines

### Strategic Growth Anchor (4-9 months)
Evaluates:
- Risk & Portfolio Guardrails
- Market & Volatility Regime
- Macro Alignment
- Institutional Signals
- Fundamental Acceleration
- Weekly Technical Structure
- Time-Based Thesis Decay

### Tactical Sentinel (0-4 months)
Evaluates:
- Multi-Timeframe Technical Alignment
- Momentum Regime
- Liquidity & Volume Triggers
- Sentiment & Options Context
- Event Proximity
- Time Stop Logic
- Opportunity Ranking

## Future Roadmap

Architecture supports easy addition of:
- More trading horizons
- Options strategies
- Portfolio-level dashboards
- Alerts & notifications
- Backtesting modules
- Real-time data API integration

## Real-Time Data Integration

The application fetches real market data from multiple financial data providers:

### Data Provider Responsibilities

| Provider | Data Types |
|----------|-----------|
| **FinancialModelingPrep (FMP)** | Price quotes, company profiles, financial statements, moving averages, historical prices for technical indicators |
| **Finnhub** | Analyst sentiment, insider activity, institutional ownership, options data (open interest, put/call ratio) |
| **Marketstack** | Historical OHLC price series |

### Architecture

```
server/services/
├── providers/           # Raw API fetch functions (one folder per provider)
│   ├── fmp/
│   ├── finnhub/
│   └── marketstack/
├── normalization/       # Convert provider responses to canonical types
│   ├── normalizePrice.ts
│   ├── normalizeFinancials.ts
│   ├── normalizeTechnicals.ts
│   └── normalizeSentiment.ts
└── aggregation/         # Combine and cache data from all providers
    ├── getStockSnapshot.ts
    └── cache.ts
```

### How Normalization Works

1. Each provider has dedicated fetch functions that return raw API data
2. Normalizers convert raw responses into canonical `StockSnapshot` types
3. The aggregator calls all providers in parallel, handles failures gracefully
4. Domain evaluators receive only normalized `StockSnapshot` objects

### Adding a New Provider

1. Create a new folder under `server/services/providers/{provider-name}/`
2. Implement fetch functions for the data types the provider offers
3. Add normalizer functions in `server/services/normalization/`
4. Update `getStockSnapshot.ts` to include the new provider calls
5. No domain logic changes required

### Caching Strategy

- In-memory cache with TTL per data type
- Price data: 60 seconds
- Technical indicators: 5 minutes
- Fundamentals: 6 hours
- Sentiment: 30 minutes
- Full snapshot: 2 minutes

### Data Confidence Levels

The UI displays a confidence badge based on provider availability:
- **HIGH**: 80%+ of providers responded successfully
- **MEDIUM**: 50-80% of providers responded
- **LOW**: <50% of providers responded

### Provider Priority for Price Data

Price quotes are fetched in this order of priority:
1. **Finnhub** (primary) - Real-time quotes via `/quote` endpoint
2. **FMP** (secondary) - Fallback if Finnhub fails
3. **Marketstack** (tertiary) - EOD latest data as last resort
4. **Mock data** - Used only if all providers fail

### API Key Requirements

**Finnhub** (Primary for quotes)
- Free tier key works for real-time quotes, sentiment, and institutional data
- Sign up at: https://finnhub.io/

**FMP (FinancialModelingPrep)**
- Requires a valid API key from their current (non-legacy) tier
- Keys created before August 31, 2025 may show "Legacy Endpoint" errors
- Sign up at: https://site.financialmodelingprep.com/developer/docs

**Marketstack**
- Requires HTTPS (paid tier) for production use
- Free tier limited to HTTP access only
- Sign up at: https://marketstack.com/

### Fallback Behavior

When providers fail, the app falls back to mock data with:
- Data confidence displayed as "LOW"
- Warning message: "Using fallback mock data - live data providers unavailable"
- All evaluation engines continue to work with mock data

## Development

Run the application:
```bash
npm run dev
```

The app will be available at http://localhost:5000
