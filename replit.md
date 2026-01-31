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

## Development

Run the application:
```bash
npm run dev
```

The app will be available at http://localhost:5000
