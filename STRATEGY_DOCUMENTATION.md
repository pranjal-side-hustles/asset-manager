# Deep Dive Stock OS - Complete Strategy & Technical Documentation

## Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Trading Horizons](#trading-horizons)
   - [Strategic Growth Anchor (4-9 Months)](#strategic-growth-anchor-4-9-months)
   - [Tactical Sentinel (0-4 Months)](#tactical-sentinel-0-4-months)
4. [Market Context Layer](#market-context-layer)
5. [Phase 2 Intelligence Engines](#phase-2-intelligence-engines)
   - [Sector Regime Engine](#sector-regime-engine)
   - [Portfolio Constraints Engine](#portfolio-constraints-engine)
   - [Relative Ranking Engine](#relative-ranking-engine)
6. [Confidence Scoring System](#confidence-scoring-system)
7. [Data Providers & Infrastructure](#data-providers--infrastructure)
8. [Complete Scoring Reference](#complete-scoring-reference)

---

## Overview

Deep Dive Stock OS is a production-ready stock analysis application that evaluates stocks using two independent trading horizons with market-aware adjustments. The system provides:

- **Scores (0-100)** for each trading horizon
- **Trade Status Labels** (ELIGIBLE/WATCH/REJECT for Strategic; TRADE/WATCH/AVOID for Tactical)
- **Detailed Breakdowns** of positives, risks, and failure modes
- **Market Regime Awareness** that adjusts scores based on overall market conditions
- **Capital Priority Recommendations** (BUY/ACCUMULATE/PILOT/WATCH/BLOCKED)

### Engine Versions

| Engine | Version |
|--------|---------|
| Strategic Growth Anchor | 1.0.0 |
| Tactical Sentinel | 1.0.0 |

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      DATA PROVIDERS                              │
│  ┌─────────┐   ┌──────────┐   ┌─────────────┐                   │
│  │ Finnhub │   │   FMP    │   │ Marketstack │                   │
│  └────┬────┘   └────┬─────┘   └──────┬──────┘                   │
│       │             │                 │                          │
│       └─────────────┼─────────────────┘                          │
│                     ▼                                            │
│           ┌─────────────────┐                                    │
│           │ Data Aggregator │                                    │
│           │ + Normalization │                                    │
│           └────────┬────────┘                                    │
└────────────────────┼────────────────────────────────────────────┘
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    MARKET CONTEXT LAYER                          │
│  ┌──────────────┐  ┌───────────────┐  ┌────────────────┐        │
│  │ Index Trends │  │ Market Breadth│  │  VIX/Volatility│        │
│  │  (SPY,QQQ,   │  │ (% > 200DMA,  │  │  (Level,Trend) │        │
│  │   DIA,IWM)   │  │  A/D Ratio)   │  │                │        │
│  └──────────────┘  └───────────────┘  └────────────────┘        │
│                     ▼                                            │
│           ┌─────────────────┐                                    │
│           │ Regime Evaluator│ → RISK_ON / NEUTRAL / RISK_OFF    │
│           └─────────────────┘                                    │
└─────────────────────────────────────────────────────────────────┘
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                   EVALUATION ENGINES                             │
│  ┌────────────────────────┐   ┌────────────────────────┐        │
│  │  STRATEGIC GROWTH      │   │   TACTICAL SENTINEL    │        │
│  │  ANCHOR (4-9 months)   │   │   (0-4 months)         │        │
│  │                        │   │                        │        │
│  │  6 Evaluation Factors  │   │  7 Evaluation Factors  │        │
│  │  + Regime Adjustment   │   │  + Regime Adjustment   │        │
│  └────────────────────────┘   └────────────────────────┘        │
└─────────────────────────────────────────────────────────────────┘
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│               PHASE 2 INTELLIGENCE ENGINES                       │
│  ┌──────────────┐  ┌───────────────────┐  ┌───────────────┐     │
│  │Sector Regime │  │Portfolio Constraints│ │Relative Ranking│    │
│  │  Engine      │  │    Engine          │  │    Engine      │    │
│  │              │  │                    │  │                │    │
│  │ FAVORED /    │  │ ALLOW / REDUCE /   │  │ BUY/ACCUMULATE/│    │
│  │ NEUTRAL /    │  │      BLOCK         │  │ PILOT/WATCH/   │    │
│  │ AVOID        │  │                    │  │    BLOCKED     │    │
│  └──────────────┘  └───────────────────┘  └───────────────┘     │
└─────────────────────────────────────────────────────────────────┘
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                   CONFIDENCE SCORING                             │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Provider Availability + Data Freshness + Regime Known   │    │
│  │                                                          │    │
│  │    HIGH (≥80) │ MEDIUM (50-79) │ LOW (<50)              │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Trading Horizons

### Strategic Growth Anchor (4-9 Months)

**Purpose:** Evaluate stocks for medium-term investment positions focused on fundamental growth with technical confirmation.

#### Status Thresholds

| Status | Score Range | Description |
|--------|-------------|-------------|
| **ELIGIBLE** | ≥ 65 | Strong candidate for strategic position |
| **WATCH** | 40-64 | Monitor for improvement |
| **REJECT** | < 40 | Not suitable for strategic investment |

#### Market Regime Adjustment

| Regime | Score Adjustment | Effect |
|--------|------------------|--------|
| RISK_ON | 0 | No adjustment |
| NEUTRAL | -4 | Mild headwind |
| RISK_OFF | -12 | Strong headwind + downgrades ELIGIBLE → WATCH |

#### Evaluation Factors (6 Total)

> **Note:** The raw factor scores total 85 points maximum. Scores are NOT normalized to 100 before regime adjustment is applied. The final score is clamped to 0-100 after regime adjustment.

##### 1. Risk & Portfolio Guardrails (Weight: 15 points)

**Purpose:** Evaluate position sizing and concentration risks

| Input | Threshold | Score Impact |
|-------|-----------|--------------|
| Portfolio Concentration | > 25% | -5 points |
| Sector Exposure | > 30% | -5 points |

**Scoring Logic:**
```
Base Score = 15
if (portfolioConcentration > 25%) → -5
if (sectorExposure > 30%) → -5
Final Score = max(0, baseScore)
```

##### 2. Macro Alignment (Weight: 10 points)

**Purpose:** Evaluate macroeconomic conditions

| Input | Condition | Score Impact |
|-------|-----------|--------------|
| GDP Growth | > 2% | +5 points |
| GDP Growth | 0-2% | +3 points |
| GDP Growth | < 0% | +0 points |
| Interest Rate Trend | Falling | +5 points |
| Interest Rate Trend | Stable | +3 points |
| Interest Rate Trend | Rising | +1 point |

##### 3. Institutional Signals (Weight: 15 points)

**Purpose:** Track smart money positioning and activity

| Input | Condition | Score Impact |
|-------|-----------|--------------|
| Institutional Ownership | > 70% | +8 points |
| Institutional Ownership | 50-70% | +5 points |
| Institutional Ownership | < 50% | +2 points |
| Institutional Activity | Buying | +7 points |
| Institutional Activity | Neutral | +4 points |
| Institutional Activity | Selling | +0 points |

##### 4. Fundamental Acceleration (Weight: 20 points)

**Purpose:** Measure revenue and earnings momentum

| Input | Condition | Score Impact |
|-------|-----------|--------------|
| Revenue Growth | > 20% | +10 points |
| Revenue Growth | 10-20% | +6 points |
| Revenue Growth | 0-10% | +3 points |
| Revenue Growth | < 0% | +0 points |
| Earnings Acceleration | > 15% | +10 points |
| Earnings Acceleration | 5-15% | +6 points |
| Earnings Acceleration | 0-5% | +3 points |
| Earnings Acceleration | < 0% | +0 points |

##### 5. Weekly Technical Structure (Weight: 15 points)

**Purpose:** Analyze weekly chart structure and momentum

| Input | Condition | Score Impact |
|-------|-----------|--------------|
| Weekly MA Alignment | Aligned | +8 points |
| Weekly MA Alignment | Not aligned | +0 points |
| Weekly RSI | 50-70 (optimal) | +7 points |
| Weekly RSI | 30-80 (acceptable) | +4 points |
| Weekly RSI | < 30 or > 80 | +0 points |

##### 6. Time-Based Thesis Decay (Weight: 10 points)

**Purpose:** Track time remaining in investment thesis

| Holding % of Max Period | Score Impact |
|-------------------------|--------------|
| < 50% | No penalty (fresh) |
| 50-75% | -3 points (aging) |
| 75-100% | -6 points (near expiry) |
| > 100% | -10 points (expired) |

**Max Holding Period:** 180 days (configurable)

---

### Tactical Sentinel (0-4 Months)

**Purpose:** Evaluate stocks for short-term trading opportunities based on technical signals and market timing.

#### Status Thresholds

| Status | Score Range | Description |
|--------|-------------|-------------|
| **TRADE** | ≥ 70 | Active trading opportunity |
| **WATCH** | 50-69 | Monitor for entry setup |
| **AVOID** | < 50 | Not suitable for tactical entry |

#### Market Regime Adjustment

| Regime | Score Adjustment |
|--------|------------------|
| RISK_ON | +8 (tailwind bonus) |
| NEUTRAL | -3 (slight headwind) |
| RISK_OFF | -12 (strong headwind) |

#### Evaluation Factors (7 Total)

##### 1. Multi-Timeframe Technical Alignment (Weight: 20 points)

**Purpose:** Evaluate alignment across multiple timeframes

| Input | Condition | Score Impact |
|-------|-----------|--------------|
| Daily MA Alignment | Aligned | +8 points |
| Hourly MA Alignment | Aligned | +6 points |
| Price vs VWAP | Above VWAP | +6 points |

##### 2. Momentum Regime (Weight: 15 points)

**Purpose:** Measure momentum strength and direction

| Input | Condition | Score Impact |
|-------|-----------|--------------|
| Momentum Score | > 70 | +10 points |
| Momentum Score | 50-70 | +6 points |
| Momentum Score | < 50 | +2 points |
| Momentum Direction | Accelerating | +5 points |
| Momentum Direction | Stable | +3 points |
| Momentum Direction | Decelerating | +0 points |

##### 3. Liquidity & Volume Triggers (Weight: 15 points)

**Purpose:** Assess market liquidity and volume conditions

| Input | Condition | Score Impact |
|-------|-----------|--------------|
| Volume Ratio (vs avg) | > 150% | +8 points |
| Volume Ratio | 100-150% | +5 points |
| Volume Ratio | < 100% | +2 points |
| Bid-Ask Spread | < 0.05% | +7 points |
| Bid-Ask Spread | 0.05-0.10% | +4 points |
| Bid-Ask Spread | > 0.10% | +0 points |

##### 4. Sentiment & Options Context (Weight: 10 points)

**Purpose:** Gauge market sentiment from options and social data

| Input | Condition | Score Impact |
|-------|-----------|--------------|
| Put/Call Ratio | < 0.7 (bullish) | +3 points |
| Put/Call Ratio | 0.7-1.0 (neutral) | +5 points |
| Put/Call Ratio | > 1.0 (bearish) | +2 points |
| Social Sentiment | Bullish | +5 points |
| Social Sentiment | Neutral | +3 points |
| Social Sentiment | Bearish | +0 points |

##### 5. Event Proximity (Weight: 15 points)

**Purpose:** Evaluate upcoming events that may impact price

| Input | Condition | Score Impact |
|-------|-----------|--------------|
| Days to Earnings | < 5 days | -7 points |
| Days to Earnings | 5-14 days | -3 points |
| Days to Earnings | > 14 days | No penalty |
| Days to Ex-Dividend | < 3 days | -3 points |
| Upcoming News | Pending | -3 points |

##### 6. Time Stop Logic (Weight: 10 points)

**Purpose:** Track time-based exit triggers

| Trade Duration % | Score Impact |
|------------------|--------------|
| < 25% (fresh) | No penalty |
| 25-50% | -2 points |
| 50-75% | -5 points |
| > 75% (imminent exit) | -8 points |

**Max Trade Days:** 30 days (configurable)

##### 7. Opportunity Ranking (Weight: 15 points)

**Purpose:** Compare opportunity vs. alternatives

| Input | Condition | Score Impact |
|-------|-----------|--------------|
| Relative Strength | > 80 | +8 points |
| Relative Strength | 50-80 | +5 points |
| Relative Strength | < 50 | +2 points |
| Sector Rank | #1-3 | +7 points |
| Sector Rank | #4-5 | +4 points |
| Sector Rank | > #5 | +1 point |

---

## Market Context Layer

The Market Context Layer provides global market intelligence that affects all strategy engine evaluations.

### Regime Detection Algorithm

The regime is determined by calculating a **Net Score** = Risk-On Score - Risk-Off Score

#### Index Analysis (SPY, QQQ, DIA, IWM)

| Condition | Score Impact |
|-----------|--------------|
| ≥ 3/4 indices trending UP | Risk-On +25 |
| ≥ 3/4 indices trending DOWN | Risk-Off +25 |
| ≥ 3/4 indices above 200-day MA | Risk-On +20 |
| ≤ 1/4 indices above 200-day MA | Risk-Off +20 |
| SPY momentum POSITIVE | Risk-On +10 |
| SPY momentum NEGATIVE | Risk-Off +10 |

#### Breadth Analysis

| Condition | Score Impact |
|-----------|--------------|
| Strong breadth (≥60% above 200DMA, A/D ≥1.2) | Risk-On +25 |
| Weak breadth (≤40% above 200DMA or A/D <0.8) | Risk-Off +25 |
| A/D Ratio > 1.5 | Risk-On +10 |
| A/D Ratio < 0.7 | Risk-Off +10 |

#### Volatility Analysis (VIX)

| Condition | Score Impact |
|-----------|--------------|
| VIX elevated (>25) | Risk-Off +15 |
| VIX low (<15) | Risk-On +10 |
| VIX trend UP | Risk-Off +5 |
| VIX trend DOWN | Risk-On +5 |

#### Regime Determination

| Net Score | Regime | Confidence |
|-----------|--------|------------|
| ≥ +50 | RISK_ON | HIGH |
| +30 to +49 | RISK_ON | MEDIUM |
| +15 to +29 | NEUTRAL | MEDIUM |
| -14 to +14 | NEUTRAL | HIGH |
| -29 to -15 | NEUTRAL | MEDIUM |
| -49 to -30 | RISK_OFF | MEDIUM |
| ≤ -50 | RISK_OFF | HIGH |

### Index Trend Determination

```javascript
function determineTrend(price, ma200, changePercent) {
  if (!ma200) {
    if (changePercent > 0.5) return "UP";
    if (changePercent < -0.5) return "DOWN";
    return "SIDEWAYS";
  }
  
  const pctAboveMA = ((price - ma200) / ma200) * 100;
  
  if (pctAboveMA > 2 && changePercent > 0) return "UP";
  if (pctAboveMA < -2 && changePercent < 0) return "DOWN";
  return "SIDEWAYS";
}
```

### Breadth Health Determination

```javascript
function determineBreadthHealth(pctAbove200DMA, advanceDeclineRatio) {
  if (pctAbove200DMA >= 60 && advanceDeclineRatio >= 1.2) return "STRONG";
  if (pctAbove200DMA <= 40 || advanceDeclineRatio < 0.8) return "WEAK";
  return "NEUTRAL";
}
```

---

## Phase 2 Intelligence Engines

### Sector Regime Engine

**Purpose:** Evaluate sector-level conditions to inform stock selection within sectors.

#### Output Labels

| Regime | Description |
|--------|-------------|
| **FAVORED** | Sector conditions support new positions |
| **NEUTRAL** | Mixed sector conditions |
| **AVOID** | Sector headwinds present |

#### Scoring Factors

| Factor | Condition | Score Impact |
|--------|-----------|--------------|
| Relative Strength | UP | +1 |
| Relative Strength | DOWN | -1 |
| Trend Health | STRONG | +1 |
| Trend Health | WEAK | -1 |
| Volatility | HIGH | -1 |
| Volatility | LOW | +1 |
| Macro Alignment | TAILWIND | +1 |
| Macro Alignment | HEADWIND | -1 |

#### Regime Determination

| Total Score | Regime | Confidence |
|-------------|--------|------------|
| ≥ +3 | FAVORED | HIGH |
| +2 | FAVORED | MEDIUM |
| -1 to +1 | NEUTRAL | MEDIUM |
| -2 | AVOID | MEDIUM |
| ≤ -3 | AVOID | HIGH |

#### Sector ETF Mappings

| Sector | ETF Symbol |
|--------|------------|
| Technology | XLK |
| Healthcare | XLV |
| Financials | XLF |
| Consumer Discretionary | XLY |
| Communication Services | XLC |
| Industrials | XLI |
| Consumer Staples | XLP |
| Energy | XLE |
| Utilities | XLU |
| Real Estate | XLRE |
| Materials | XLB |

---

### Portfolio Constraints Engine

**Purpose:** Determine if there is risk capacity for a given position based on portfolio state.

#### Output Actions

| Action | Description |
|--------|-------------|
| **ALLOW** | Full position size permitted |
| **REDUCE** | Reduced position size recommended |
| **BLOCK** | Position not recommended |

#### Constraint Evaluation Logic

```javascript
function evaluatePortfolioConstraints(portfolio, inputs) {
  let basePositionSize = 10; // 10% of capital
  
  // Hard Block: Sector exposure cap
  if (currentSectorExposure >= 25%) → BLOCK
  
  // Hard Block: Sector regime unfavorable
  if (sectorRegime === "AVOID") → BLOCK
  
  // Hard Block: Volatility budget exhausted
  if (volatilityUsedPct >= 80%) → BLOCK
  
  // Adjustments
  if (sectorRegime === "NEUTRAL") → basePositionSize -= 3
  if (volatilityUsedPct >= 60%) → basePositionSize -= 4
  if (expectedVolatilityPct > 3%) → basePositionSize -= 3
  
  finalSize = max(2%, basePositionSize);
  
  if (finalSize < 5%) → REDUCE
  else → ALLOW
}
```

#### Position Size Modifiers

| Condition | Size Adjustment |
|-----------|-----------------|
| Sector Regime = NEUTRAL | -3% |
| Portfolio Volatility ≥ 60% | -4% |
| Expected Stock Volatility > 3% | -3% |
| Minimum Position Size | 2% |

---

### Relative Ranking Engine

**Purpose:** Among acceptable stocks, determine which deserve capital priority.

#### Capital Priority Levels

| Priority | Description | Trading Action |
|----------|-------------|----------------|
| **BUY** | Active tactical opportunity with capital available | Immediate action |
| **ACCUMULATE** | Top-ranked stock in favored sector | Build position |
| **PILOT** | Best-in-sector watch candidate | Small starter position |
| **WATCH** | Default state | Monitor only |
| **BLOCKED** | Capital blocked by portfolio or sector regime | No action |

#### Priority Determination Logic

```javascript
function determineCapitalPriority(stock, rankInSector) {
  // Priority 1: Hard blocks
  if (portfolioAction === "BLOCK" || sectorRegime === "AVOID") {
    return "BLOCKED";
  }
  
  // Priority 2: Active tactical opportunity
  if (tacticalStatus === "TRADE" && portfolioAction === "ALLOW") {
    return "BUY";
  }
  
  // Priority 3: Strategic accumulation
  if (strategicStatus === "ELIGIBLE" && 
      sectorRegime === "FAVORED" && 
      rankInSector <= 2) {
    return "ACCUMULATE";
  }
  
  // Priority 4: Pilot position
  if (strategicStatus === "WATCH" && rankInSector === 1) {
    return "PILOT";
  }
  
  // Default
  return "WATCH";
}
```

#### Sector Ranking

Stocks are ranked within their sector by strategic score (descending). Only non-REJECT stocks are ranked.

---

## Confidence Scoring System

The confidence system evaluates data quality to help users understand how reliable the evaluation is.

### Confidence Levels

| Level | Score Range | Meaning |
|-------|-------------|---------|
| **HIGH** | ≥ 80 | Full confidence in evaluation |
| **MEDIUM** | 50-79 | Some data limitations |
| **LOW** | < 50 | Significant data gaps |

### Provider Weights

| Provider | Weight |
|----------|--------|
| Finnhub-Quote | 20 |
| FMP-Price | 15 |
| Marketstack-Quote | 10 |
| FMP-Financials | 15 |
| FMP-Technicals | 15 |
| Finnhub-Sentiment | 10 |
| Finnhub-Institutional | 5 |
| Finnhub-Options | 5 |
| Marketstack-Historical | 5 |
| **Total** | **100** |

### Score Penalties

| Condition | Penalty |
|-----------|---------|
| Provider failed | (failedWeight / totalWeight) × 50 |
| Price data unavailable | -25 |
| Fundamentals unavailable | -15 |
| Technicals unavailable | -15 |
| Sentiment unavailable | -10 |
| Options unavailable | -5 |
| Data stale (> 5 min) | -5 per 5 min (max -20) |
| Market regime unknown | -10 |

---

## Data Providers & Infrastructure

### Provider Configuration

| Provider | Primary Use Cases | Rate Limit |
|----------|-------------------|------------|
| **Finnhub** | Real-time quotes, sentiment, institutional, options | 60 calls/min (free) |
| **FMP** | Historical prices, financials, technicals, 200DMA | Varies by tier |
| **Marketstack** | Historical OHLC (fallback) | HTTPS requires paid |

### Rate Limiting

The system uses a queue-based rate limiter with Promise chaining:

```javascript
// 100ms delay between Finnhub calls
// Serializes concurrent requests to prevent 429 errors
```

### Caching Strategy

| Data Type | TTL |
|-----------|-----|
| Price Data | 60 seconds |
| Fundamentals | 6 hours |
| Market Context | 5 minutes |

### Provider Health Management

- Tracks consecutive failures per provider
- Implements automatic cooldowns after repeated failures
- Monitors success/failure rates

### API Retry Logic

- Retries with exponential backoff + jitter
- Hard timeout: 10 seconds
- Rate-limit awareness (429 detection)

---

## Complete Scoring Reference

### Strategic Growth Anchor - Maximum Points by Factor

| Factor | Max Points | % of Total |
|--------|------------|------------|
| Risk & Portfolio Guardrails | 15 | 17.6% |
| Macro Alignment | 10 | 11.8% |
| Institutional Signals | 15 | 17.6% |
| Fundamental Acceleration | 20 | 23.5% |
| Weekly Technical Structure | 15 | 17.6% |
| Time-Based Thesis Decay | 10 | 11.8% |
| **Total (Raw)** | **85** | **100%** |

> **Note:** Raw scores can range from 0-85. Regime adjustments are applied after factor scoring, then the result is clamped to 0-100.

### Tactical Sentinel - Maximum Points by Factor

| Factor | Max Points | % of Total |
|--------|------------|------------|
| Multi-Timeframe Technical Alignment | 20 | 20% |
| Momentum Regime | 15 | 15% |
| Liquidity & Volume Triggers | 15 | 15% |
| Sentiment & Options Context | 10 | 10% |
| Event Proximity | 15 | 15% |
| Time Stop Logic | 10 | 10% |
| Opportunity Ranking | 15 | 15% |
| **Total** | **100** | **100%** |

### Factor Status Classification

Each factor is classified based on its score percentage:

| Score % | Status |
|---------|--------|
| ≥ 70% | PASS |
| 40-69% | CAUTION |
| < 40% | FAIL |

---

## Decision Flow Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                    STOCK EVALUATION FLOW                         │
│                                                                  │
│  1. FETCH DATA                                                   │
│     └─ Price, Fundamentals, Technicals, Sentiment, Options      │
│                                                                  │
│  2. BUILD MARKET CONTEXT                                         │
│     └─ Indices → Breadth → Volatility → Regime Detection        │
│                                                                  │
│  3. EVALUATE STRATEGIC HORIZON (4-9 months)                     │
│     └─ 6 Factors → Base Score → Regime Adjustment → Status      │
│                                                                  │
│  4. EVALUATE TACTICAL HORIZON (0-4 months)                      │
│     └─ 7 Factors → Base Score → Regime Adjustment → Status      │
│                                                                  │
│  5. SECTOR REGIME ASSESSMENT                                    │
│     └─ Relative Strength + Trend + Volatility + Macro           │
│                                                                  │
│  6. PORTFOLIO CONSTRAINTS CHECK                                  │
│     └─ Sector Exposure + Volatility Budget + Position Sizing    │
│                                                                  │
│  7. RELATIVE RANKING                                            │
│     └─ Within-Sector Ranking → Capital Priority Assignment      │
│                                                                  │
│  8. CONFIDENCE SCORING                                          │
│     └─ Provider Availability + Data Freshness → Quality Score   │
│                                                                  │
│  OUTPUT:                                                         │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Strategic: Score + Status (ELIGIBLE/WATCH/REJECT)          │ │
│  │ Tactical:  Score + Status (TRADE/WATCH/AVOID)              │ │
│  │ Sector:    Regime (FAVORED/NEUTRAL/AVOID)                  │ │
│  │ Portfolio: Action (ALLOW/REDUCE/BLOCK)                     │ │
│  │ Priority:  Capital (BUY/ACCUMULATE/PILOT/WATCH/BLOCKED)    │ │
│  │ Quality:   Confidence (HIGH/MEDIUM/LOW)                    │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Recreating the Model

To recreate this model from scratch:

1. **Set up data providers** (Finnhub, FMP, Marketstack)
2. **Implement rate limiting** (queue-based with 100ms delays for Finnhub)
3. **Build Market Context Layer** with regime detection
4. **Implement Strategic Growth Anchor** with 6 factors + weights
5. **Implement Tactical Sentinel** with 7 factors + weights
6. **Add Phase 2 engines** (Sector, Portfolio, Ranking)
7. **Implement confidence scoring** based on data availability
8. **Apply regime adjustments** to base scores
9. **Determine final status/priority** based on adjusted scores

All thresholds, weights, and logic are documented in this file for complete reproducibility.

---

*Last Updated: February 2026*
*Engine Versions: Strategic Growth 1.0.0 | Tactical Sentinel 1.0.0*
