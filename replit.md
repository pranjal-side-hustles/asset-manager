# Deep Dive Stock OS

## Overview

Deep Dive Stock OS is a production-ready web application designed for professional-grade stock analysis. Its primary purpose is to evaluate stocks using two independent trading horizons: the Strategic Growth Anchor (4-9 month investment horizon) and the Tactical Sentinel (0-4 month trading horizon). The application provides a comprehensive evaluation for each stock, including a score (0-100), trade status, and detailed breakdowns of positives, risks, and potential failure modes. The project aims to provide users with deep insights into stock performance and market context, with a vision to expand into advanced features like portfolio management and real-time alerts.

## User Preferences

I prefer concise and clear explanations.
I value an iterative development approach.
I expect the agent to ask for confirmation before implementing major changes or making significant architectural decisions.
I prefer detailed logging for all data fetches, evaluations, and caching mechanisms to ensure transparency and aid in debugging.
Ensure all UI components have clear, semantic color schemes that directly reflect the underlying data and evaluation status.
Focus on building a robust and fault-tolerant system, especially concerning external data dependencies, by implementing comprehensive retry, fallback, and caching strategies.
Do not make changes to the `shared/types/` folder without explicit instruction, as these define core data structures used across the frontend and backend.

## System Architecture

The application is built with a modern web stack: **React + TypeScript + Vite** for the frontend, **Tailwind CSS** for styling with semantic color tokens, **Express.js** for the backend, and **TanStack Query** for state management.

### UI/UX Decisions
- **Color Semantics**: A consistent color scheme is used to convey evaluation status:
    - **Green (`stock-eligible`)**: Trade Eligible / Strong Positive
    - **Orange/Yellow (`stock-watch`)**: Caution / Watch
    - **Red (`stock-reject`)**: Avoid / High Risk
- **Explainability Features**:
    - **Regime Context Labels**: Status badges display contextual labels based on market regime and trade status (e.g., "Regime Tailwind," "Despite Risk-Off").
    - **WhyExplainer Component**: Collapsible panels provide "Key Strengths," "Main Risk," and "Market Impact" for each evaluation.
    - **ConfidenceIndicator**: A badge with a tooltip indicates data quality (HIGH, MEDIUM, LOW) based on provider availability.
    - **RegimeExplainer**: An expandable panel detailing index summary, breadth summary, volatility summary, and trading implications.

### Technical Implementations
- **Evaluation Engines**:
    - **Strategic Growth Anchor (4-9 months)**: Evaluates risk, market/volatility regime, macro alignment, institutional signals, fundamental acceleration, weekly technical structure, and time-based thesis decay.
    - **Tactical Sentinel (0-4 months)**: Evaluates multi-timeframe technical alignment, momentum regime, liquidity/volume triggers, sentiment, options context, event proximity, time stop logic, and opportunity ranking.
- **Market Context Layer**: Provides global market intelligence affecting strategy engine evaluations. It detects market regimes (RISK_ON, RISK_OFF, NEUTRAL) based on index trends, breadth, and volatility, and adjusts stock scores accordingly.
- **Data Normalization & Aggregation**: Raw data from multiple providers is normalized into canonical types and aggregated into a `StockSnapshot` object before being passed to domain evaluators.
- **Caching Strategy**: Utilizes an in-memory cache with TTL per data type (e.g., price data: 60s, fundamentals: 6h).
- **Provider Health Management**: Tracks consecutive failures per provider, implements automatic cooldowns, and monitors success/failure rates.
- **API Retry & Timeout**: Implements retries with exponential backoff and jitter, with a hard timeout of 10 seconds and rate-limit awareness.
- **Structured Logging**: Comprehensive logging for all critical operations (data fetch, evaluation, cache, provider failures) with detailed metadata.
- **Confidence Scoring**: Dynamically assesses data confidence based on provider availability, data staleness, missing data types, and market regime uncertainty.
- **Sector Regime Engine**: A standalone read-only engine that evaluates sector-level conditions (FAVORED, NEUTRAL, AVOID) based on relative strength, trend health, volatility, and macro alignment. This engine is designed for future integration but does not currently affect stock scores.

### System Design Choices
- **Modular Monolith**: The project structure is organized into `shared`, `server`, and `client` directories, promoting clear separation of concerns. The `server/domain` layer encapsulates core business logic, independent of UI or data access specifics.
- **API Endpoints**:
    - `GET /api/dashboard`: Summaries of all tracked stocks.
    - `GET /api/stocks/:symbol`: Detailed evaluation for a specific stock.
    - `GET /api/market-context`: Global market context, including regime.
    - `GET /api/infra/health`: Provider health, scheduler status, recent logs.
    - `GET /api/infra/logs`: Queryable infrastructure logs.
- **Extensibility**: The architecture is designed to easily integrate more trading horizons, options strategies, portfolio dashboards, and real-time data sources.

## External Dependencies

The application integrates with several third-party financial data providers:

-   **FinancialModelingPrep (FMP)**: Provides price quotes, company profiles, financial statements, moving averages, and historical prices for technical indicators.
-   **Finnhub**: Serves as the primary source for real-time price quotes, analyst sentiment, insider activity, institutional ownership, and options data (open interest, put/call ratio).
-   **Marketstack**: Used for historical OHLC (Open, High, Low, Close) price series, primarily as a fallback data source.

**API Key Requirements**:
-   **Finnhub**: Requires a free tier API key.
-   **FMP**: Requires a valid API key from their current (non-legacy) tier.
-   **Marketstack**: Requires an HTTPS-enabled (paid tier) API key for production use; the free tier is limited to HTTP.

## Phase 2 Engines (Read-Only Intelligence)

### Sector Regime Engine

Evaluates sector-level market conditions:

```
shared/types/sectorRegime.ts      # Types
shared/constants/sectors.ts       # ETF mappings
server/domain/sectorRegime/       # evaluateSectorRegime()
```

Labels: FAVORED | NEUTRAL | AVOID

### Portfolio Constraints Engine

Answers: "Is there risk capacity for this position?"

```
shared/types/portfolio.ts                    # Types
server/domain/portfolio/portfolioConstraintEngine.ts  # evaluatePortfolioConstraints()
```

Actions: ALLOW | REDUCE | BLOCK

Both engines are callable independently and NOT integrated into scoring yet.