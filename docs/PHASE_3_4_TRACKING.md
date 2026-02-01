# Phase 3, 4 & Performance Tracking - Implementation Documentation

This document covers the implementation of Phases 3-4 and the Survivorship-Bias-Free Playbook Performance Tracking system.

---

## Table of Contents

1. [Phase 3: Confirmation Layers](#phase-3-confirmation-layers)
2. [Phase 4: Strategy Playbooks](#phase-4-strategy-playbooks)
3. [Playbook Performance Tracking](#playbook-performance-tracking)
4. [API Reference](#api-reference)
5. [Architecture](#architecture)

---

## Phase 3: Confirmation Layers

Phase 3 provides a **separate confirmation engine** that evaluates 5 signals to confirm or reject Phase 2 decisions.

> **IMPORTANT**: Phase 3 does NOT modify Phase 0-2 logic or scores.

### 5 Confirmation Signals

| Signal | Points | Criteria |
|--------|--------|----------|
| **TREND** | 3 | Price > MA50 AND Price > MA200 |
| **VOLUME** | 2 | Current volume ≥ average |
| **VOLATILITY** | 2 | ATR% ≤ 5% AND stable |
| **ALIGNMENT** | 2 | Market + Sector favorable |
| **EVENT_SAFETY** | 1 | Earnings ≥ 5 days away |

### Level Mapping

| Score | Level |
|-------|-------|
| 8-10 | `STRONG` |
| 4-7 | `WEAK` |
| 0-3 | `NONE` |

### Files

- `shared/types/phase3.ts` - Types and constants
- `server/domain/phase3/phase3Engine.ts` - Signal evaluators
- `server/domain/phase3/phase3DataAggregator.ts` - Input builder

---

## Phase 4: Strategy Playbooks

Phase 4 matches current conditions to one of 5 strategy playbooks, providing user guidance (not signals).

> **IMPORTANT**: Phase 4 does NOT force actions or modify scores.

### 5 Playbooks

#### 1. Trend Continuation
**When**: Strong uptrend with confirmation
- Strategic & Tactical both BULLISH
- Price above MA50 and MA200
- Confirmation at least WEAK

**Guidance**: Add to positions on dips, trail stops, watch for divergences.

#### 2. Pullback Entry
**When**: Healthy pullback in established uptrend
- Strategic BULLISH (trend intact)
- Price above MA200 but near/below MA50
- RSI in 30-45 range

**Guidance**: Wait for stabilization, set stops below pullback low.

#### 3. Base Breakout (Watchlist)
**When**: Consolidation/base formation near highs
- Price consolidating near MA50
- Low volatility (ATR% ≤ 3%)
- Daily trend SIDEWAYS

**Guidance**: Add to watchlist, wait for breakout with volume.

#### 4. Mean Reversion (Cautious)
**When**: Oversold bounce candidate
- RSI ≤ 30
- Extended below MA50 (>5%)
- Counter-trend opportunity

**Guidance**: Size smaller, tight stops, take profits quickly.

> **CAUTION**: Counter-trend trades have lower win rates.

#### 5. Defensive Hold
**When**: Unfavorable conditions
- Market regime RISK_OFF
- Tactical BEARISH
- No confirmation

**Guidance**: Avoid new positions, tighten stops, consider profit-taking.

### Files

- `shared/types/phase4.ts` - Types and playbook definitions
- `server/domain/phase4/phase4Engine.ts` - Eligibility checkers
- `server/domain/phase4/phase4DataAggregator.ts` - Input builder

---

## Playbook Performance Tracking

A survivorship-bias-free system for tracking playbook performance.

### Key Design Principles

> **CRITICAL**: This system is designed to PREVENT survivorship bias.

#### 1. Track Instances, Not Trades

| ❌ Wrong | ✅ Correct |
|----------|-----------|
| Log when user enters | Log when playbook is SHOWN |
| Track user's entry price | Track signal price |
| Record user's exit | Never track exits |

#### 2. Never Condition on User Actions

Every time a playbook is shown, we log it - regardless of whether the user takes action.

#### 3. Fixed Horizons Only

| Horizon | Trading Days | Purpose |
|---------|--------------|---------|
| +5 | 5 | Short-term validation |
| +20 | 20 | Medium-term trend |
| +60 | 60 | Longer-term outcome |

### Data Captured Per Instance

```typescript
interface PlaybookInstance {
  id: string;           // Unique instance ID
  symbol: string;       // e.g., "AAPL"
  playbookId: string;   // e.g., "TREND_CONTINUATION"
  timestamp: number;    // When shown
  date: string;         // YYYY-MM-DD
  priceAtSignal: number; // EOD price when shown
  marketRegime: string;  // Market context
  sectorRegime: string;  // Sector context
  confirmationLevel: string; // Phase 3 level
  matchConfidence: number;   // 0-100
}
```

### Aggregate Metrics

#### What We Show

| Metric | Description | Why |
|--------|-------------|-----|
| **Median Return** | 50th percentile | Less sensitive to outliers than mean |
| **% Positive** | Fraction > 0 | Simple hit rate (with context) |
| **Drawdown Frequency** | % with >5% drawdown | Risk awareness |
| **Dispersion (IQR)** | 75th - 25th percentile | Outcome variability |
| **Worst Return** | Minimum outcome | Downside context |

#### What We NEVER Show

| Prohibited | Reason |
|------------|--------|
| Equity curves | Implies continuous tracking |
| Best trades | Cherry-picking |
| Win-rate only | Incomplete picture |
| Symbol-level performance | Sample size issues |
| Mean return | Skewed by outliers |
| Sharpe ratio | Implies active trading |

### Files

- `shared/types/playbookTracking.ts` - Types and interfaces
- `server/domain/playbookTracking/trackingEngine.ts` - Logger, outcome computer, aggregator
- `server/domain/playbookTracking/index.ts` - Barrel export

---

## API Reference

### Phase 3: Confirmation

```
GET /api/phase3/:symbol
```

**Response:**
```json
{
  "symbol": "AAPL",
  "confirmationScore": 7,
  "confirmationLevel": "WEAK",
  "confirmations": [...],
  "blockers": [...],
  "meta": { ... }
}
```

### Phase 4: Playbooks

```
GET /api/phase4/:symbol
```

**Response:**
```json
{
  "symbol": "AAPL",
  "activePlaybook": {
    "name": "TREND_CONTINUATION",
    "title": "Trend Continuation",
    "description": "...",
    "guidance": {
      "whyThisFits": "...",
      "howToUse": ["..."],
      "riskNotes": ["..."]
    },
    "matchConfidence": 75,
    "matchedRules": ["..."]
  },
  "consideredPlaybooks": [...],
  "meta": { ... }
}
```

### Playbook Performance

```
GET /api/playbook-performance
GET /api/playbook-performance/:playbookId
```

**Response:**
```json
{
  "playbookId": "TREND_CONTINUATION",
  "playbookTitle": "Trend Continuation",
  "metrics": {
    "totalInstances": 47,
    "horizonMetrics": {
      "5": {
        "sampleSize": 42,
        "medianReturnPct": 1.2,
        "positiveOutcomePct": 64.3,
        "drawdownFrequencyPct": 23.8,
        "dispersionIQR": 4.5
      }
    }
  },
  "disclaimers": [
    "Historical tendencies, not predictions of future results.",
    "Returns are measured from playbook appearance, not user entry."
  ]
}
```

---

## Architecture

```
shared/types/
├── phase3.ts              # Phase 3 types
├── phase4.ts              # Phase 4 types + playbook definitions
├── playbookTracking.ts    # Performance tracking types
└── index.ts               # Barrel exports

server/domain/
├── phase3/
│   ├── phase3Engine.ts          # 5 signal evaluators
│   ├── phase3DataAggregator.ts  # Input builder
│   └── index.ts
├── phase4/
│   ├── phase4Engine.ts          # Eligibility checkers
│   ├── phase4DataAggregator.ts  # Input builder + instance logging
│   └── index.ts
└── playbookTracking/
    ├── trackingEngine.ts        # Logger, outcome computer, aggregator
    └── index.ts

server/
└── routes.ts                    # API endpoints
```

---

## UI Display Guidelines

When displaying performance data to users:

1. **Always show disclaimers** - Use the `PERFORMANCE_DISCLAIMERS` array
2. **Label as tendencies** - "Historical tendency" not "expected return"
3. **Show full distribution** - 25th, median, 75th percentiles
4. **Include sample size** - Users should see how many instances
5. **Show worst case** - Don't hide downside

### Example UI Presentation

```
Trend Continuation - Historical Tendencies

Based on 47 instances (Jan 2024 - Feb 2026)

5-Day Outcomes:
├─ Median Return: +1.2%
├─ Positive Outcomes: 64%
├─ Range (25th-75th): -0.8% to +3.5%
└─ Worst Case: -8.2%

⚠️ Historical tendencies, not predictions.
   Returns measured from playbook appearance.
```

---

*Documentation generated on 2026-02-01*
