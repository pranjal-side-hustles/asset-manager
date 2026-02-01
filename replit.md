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
│   ├── evaluation.ts
│   └── marketContext.ts  # Market regime, indices, breadth, sectors types
├── constants/       # Configurable thresholds for scoring
│   └── thresholds.ts

server/
├── domain/          # Business logic (no UI dependencies)
│   ├── horizons/
│   │   ├── strategicGrowth/
│   │   │   ├── evaluator.ts
│   │   │   ├── scoring.ts
│   │   │   └── rules.ts
│   │   └── tacticalSentinel/
│   │       ├── evaluator.ts
│   │       ├── scoring.ts
│   │       └── rules.ts
│   └── marketContext/    # Market regime detection
│       ├── regimeEvaluator.ts
│       └── marketContextEngine.ts
├── services/        # Data access layer
│   ├── stocks/
│   │   ├── mockData.ts
│   │   └── fetchStock.ts
│   └── market/      # Market-level data services
│       ├── fetchIndices.ts
│       ├── fetchBreadth.ts
│       ├── fetchSectors.ts
│       └── fetchVolatility.ts
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
│   ├── market/      # Market context components
│   │   └── MarketContextPanel.tsx
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
- `GET /api/market-context` - Returns global market context (regime, indices, breadth, volatility)

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

## Market Context Layer (Phase 1)

The Market Context Layer provides global market intelligence that influences all strategy engine evaluations:

### Architecture

```
shared/types/
└── marketContext.ts        # Type definitions

server/services/market/
├── fetchIndices.ts         # SPY, QQQ, DIA, IWM trends
├── fetchBreadth.ts         # Market breadth metrics
├── fetchSectors.ts         # Sector leadership
└── fetchVolatility.ts      # VIX data

server/domain/marketContext/
├── regimeEvaluator.ts      # RISK_ON/RISK_OFF/NEUTRAL detection
└── marketContextEngine.ts  # Aggregates all market data

client/src/components/market/
└── MarketContextPanel.tsx  # Dashboard UI component
```

### Market Regime Detection

The regime evaluator scores the overall market environment:

| Component | RISK_ON Points | RISK_OFF Points |
|-----------|----------------|-----------------|
| Index trends (3/4 up) | +25 | -25 (if 3/4 down) |
| Indices above 200DMA | +20 | -20 |
| S&P momentum | +10 | -10 |
| Breadth health | +25 (strong) | -25 (weak) |
| A/D ratio | +10 (>1.5) | -10 (<0.7) |
| VIX elevated | -15 | +10 (low VIX) |

**Regime Thresholds:**
- Net score ≥30 → RISK_ON
- Net score ≤-30 → RISK_OFF
- Otherwise → NEUTRAL

### Strategy Engine Adjustments

Market regime directly influences stock evaluations:

| Engine | RISK_ON | NEUTRAL | RISK_OFF |
|--------|---------|---------|----------|
| Strategic Growth | +5 | -2 | -10 |
| Tactical Sentinel | +8 | -3 | -12 |

### API Endpoint

- `GET /api/market-context` - Returns full market context snapshot
  - Query param: `?refresh=true` to force cache refresh
  - Response includes: regime, indices, breadth, sectors, volatility, meta

### Caching

- Market context: 5-minute TTL
- Cached globally across all stock evaluations
- Force refresh available via API

### Data Sources for Market Context

- **Finnhub**: Index ETF quotes (SPY, QQQ, DIA, IWM), VIX, sector ETFs
- **FMP**: 200-day moving averages, S&P 500 constituents for breadth
- **Fallback**: Estimated breadth from index performance when providers fail

## Infrastructure (Phase 0 - Hardened Core)

The application includes a production-hardened infrastructure layer:

### Directory Structure
```
server/infra/
├── logging/          # Structured logging
│   ├── logger.ts
│   └── logTypes.ts
├── network/          # API retry & fallback
│   ├── fetchWithRetry.ts
│   └── providerGuard.ts
├── scheduler/        # Data refresh management
│   ├── refreshManager.ts
│   └── ttlPolicy.ts
└── index.ts

server/domain/
├── engineMeta.ts           # Engine versioning
└── confidence/
    └── confidenceEvaluator.ts
```

### Structured Logging

Log types: `DATA_FETCH`, `PROVIDER_FAILURE`, `ENGINE_EVALUATION`, `CACHE_HIT`, `CACHE_MISS`, `CONFIDENCE_DOWNGRADE`, `SCHEDULER`, `RETRY`, `TIMEOUT`, `FALLBACK`

Each log entry includes:
- Timestamp
- Severity (INFO, WARN, ERROR)
- Symbol context
- Engine version
- Sanitized metadata (API keys redacted)

### Provider Health Management

The `providerGuard` tracks:
- Consecutive failures per provider
- Automatic cooldown after 5 consecutive failures
- Success/failure rates
- Cooldown expiration with automatic re-enabling

### API Retry & Timeout

- Max retries: 2
- Exponential backoff with jitter
- Hard timeout: 10 seconds
- Rate limit (429) aware with longer backoff

### Engine Versioning

Each evaluation includes:
```json
{
  "meta": {
    "engine": "strategicGrowth",
    "version": "1.0.0",
    "evaluatedAt": "2026-02-01T01:46:41.899Z"
  }
}
```

### Infrastructure API Endpoints

- `GET /api/infra/health` - Provider health, scheduler status, recent logs
- `GET /api/infra/logs` - Query logs by symbol, type, or get recent entries
  - Query params: `?symbol=AAPL`, `?type=ENGINE_EVALUATION`, `?count=50`

### Confidence Scoring

Confidence degrades based on:
- Provider availability (weighted by data importance)
- Data staleness
- Missing data types (price, technicals, fundamentals, sentiment, options)
- Market regime uncertainty

## Development

Run the application:
```bash
npm run dev
```

The app will be available at http://localhost:5000
