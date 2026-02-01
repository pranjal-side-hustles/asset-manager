# Asset-Manager: Deep Dive Stock OS

A professional-grade stock analysis platform with dual-horizon evaluation, market context awareness, and intelligent capital allocation recommendations.

![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)
![React](https://img.shields.io/badge/React-18.x-61DAFB)
![Express](https://img.shields.io/badge/Express-5.x-000000)
![Vite](https://img.shields.io/badge/Vite-7.x-646CFF)

## 🚀 Features

- **Dual-Horizon Evaluation**: Strategic Growth (4-9 months) + Tactical Sentinel (0-4 months)
- **Market Context Awareness**: Real-time regime detection (RISK_ON / NEUTRAL / RISK_OFF)
- **Multi-Provider Data Aggregation**: Finnhub, FMP, Marketstack
- **Confidence Scoring**: Data quality assessment
- **Phase 2 Engines**: Sector Regime, Portfolio Constraints, Relative Ranking
- **Professional Dashboard**: React-based UI with TailwindCSS

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** >= 20.x ([Download](https://nodejs.org/))
- **npm** >= 10.x (comes with Node.js)
- **PostgreSQL** database (or use [Neon](https://neon.tech/) / [Supabase](https://supabase.com/) for hosted)
- **Git** ([Download](https://git-scm.com/))

---

## 🔑 API Keys Required

You'll need free API keys from the following providers:

| Provider | Sign Up Link | Free Tier |
|----------|--------------|-----------|
| **Finnhub** | [finnhub.io](https://finnhub.io/) | 60 calls/min |
| **Financial Modeling Prep** | [financialmodelingprep.com](https://financialmodelingprep.com/) | 250 calls/day |
| **Marketstack** | [marketstack.com](https://marketstack.com/) | 100 calls/month |

---

## 🛠️ Installation

### Step 1: Clone the Repository

```bash
git clone https://github.com/pranjal-side-hustles/asset-manager.git
cd asset-manager
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Set Up Environment Variables

Create a `.env` file in the root directory:

```bash
touch .env
```

Add the following environment variables:

```env
# ===========================================
# API Keys (Required)
# ===========================================

# Finnhub - Real-time quotes, sentiment, options
# Get your key at: https://finnhub.io/
FINNHUB_API_KEY=your_finnhub_api_key_here

# Financial Modeling Prep - Prices, fundamentals, technicals
# Get your key at: https://financialmodelingprep.com/
FMP_API_KEY=your_fmp_api_key_here

# Marketstack - Historical OHLC data (fallback)
# Get your key at: https://marketstack.com/
MARKETSTACK_API_KEY=your_marketstack_api_key_here

# ===========================================
# Database (Required)
# ===========================================

# PostgreSQL connection string
# Format: postgresql://user:password@host:port/database
# For Neon: postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/dbname?sslmode=require
DATABASE_URL=postgresql://localhost:5432/asset_manager

# ===========================================
# Server Configuration (Optional)
# ===========================================

# Server port (default: 5000)
PORT=5000

# Environment mode
NODE_ENV=development
```

### Step 4: Set Up the Database

Push the database schema:

```bash
npm run db:push
```

### Step 5: Start Development Server

```bash
npm run dev
```

The application will be available at:
- **Frontend**: http://localhost:5000
- **API**: http://localhost:5000/api

---

## ▲ Vercel: Environment Variables (Secrets)

For the app to load live data on Vercel, add these **Environment Variables** in the dashboard:

1. Open your project on [Vercel](https://vercel.com) → **Settings** → **Environment Variables**.
2. Add each variable below. Use **Production**, **Preview**, and **Development** as needed.

| Name | Description | Where to get it |
|------|-------------|-----------------|
| `FINNHUB_API_KEY` | Finnhub API key (quotes, sentiment, search, volatility, sectors) | [finnhub.io](https://finnhub.io/) – free tier: 60 calls/min |
| `MARKETSTACK_API_KEY` | Marketstack API key (historical OHLC, quote fallback) | [marketstack.com](https://marketstack.com/) – free tier: 100 calls/month |
| `FMP_API_KEY` | Financial Modeling Prep (prices, fundamentals, technicals) | [financialmodelingprep.com](https://financialmodelingprep.com/) – free tier: 250 calls/day |
| `DATABASE_URL` | PostgreSQL connection string (if using DB) | Your Neon/Supabase/Postgres URL |

**Optional:** `TWELVE_DATA_API_KEY` from [twelvedata.com](https://twelvedata.com/) if you use that provider.

After saving, **redeploy** the project (Deployments → ⋮ → Redeploy) so the new variables are applied.

---

## 📦 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server (frontend + backend) |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run check` | TypeScript type checking |
| `npm run db:push` | Push schema changes to database |
| `npm run db:studio` | Open Drizzle Studio (database GUI) |

---

## 🗂️ Project Structure

```
asset-manager/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # UI components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom React hooks
│   │   └── lib/           # Utilities
│   └── public/            # Static assets
│
├── server/                 # Express backend
│   ├── domain/            # Business logic engines
│   ├── services/          # Data services & providers
│   └── infra/             # Infrastructure utilities
│
├── shared/                 # Shared types & constants
│   ├── types/             # TypeScript interfaces
│   └── constants/         # Configuration constants
│
└── attached_assets/        # Reference documentation
```

---

## 🌐 API Endpoints

### Dashboard

```http
GET /api/dashboard
```

Returns all tracked stocks with evaluations.

### Single Stock

```http
GET /api/stocks/:symbol
```

Returns detailed evaluation for a specific stock.

### Stock Search

```http
GET /api/stocks/search?q=:query
```

Search for stock symbols.

### Market Context

```http
GET /api/market-context
```

Returns current market regime and indices.

### Infrastructure Health

```http
GET /api/infra/health
```

Returns provider health status.

---

## 🔧 Configuration

### Customizing Stock Universe

The default tracked stocks are defined in the stock service. To modify:

1. Navigate to `server/services/stocks/stockService.ts`
2. Update the `TRACKED_SYMBOLS` array

### Adjusting Cache TTLs

Cache durations are configured in `server/infra/scheduler/ttlPolicy.ts`:

```typescript
export const TTL_CONFIG = {
  price: 60,           // seconds
  technicals: 300,     // 5 minutes
  fundamentals: 21600, // 6 hours
  sentiment: 1800,     // 30 minutes
  options: 900,        // 15 minutes
  historical: 3600,    // 1 hour
  snapshot: 120,       // 2 minutes
  marketContext: 300,  // 5 minutes
};
```

### Modifying Evaluation Thresholds

Thresholds are defined in `shared/constants/thresholds.ts`.

---

## 🧪 Testing

> ⚠️ **Note**: Test suite is not yet implemented. See [GAPS_AND_IMPROVEMENTS.md](./GAPS_AND_IMPROVEMENTS.md) for planned testing strategy.

---

## 📊 Evaluation System

### Strategic Growth Anchor (4-9 months)

| Score | Status | Action |
|-------|--------|--------|
| ≥ 65 | ELIGIBLE | Ready for position entry |
| 40-64 | WATCH | Monitor for improvement |
| < 40 | REJECT | Do not enter |

### Tactical Sentinel (0-4 months)

| Score | Status | Action |
|-------|--------|--------|
| ≥ 70 | TRADE | Active trading candidate |
| 50-69 | WATCH | Monitor for setup |
| < 50 | AVOID | No trade |

### Market Regimes

| Regime | Condition | Impact |
|--------|-----------|--------|
| RISK_ON | Score ≥ 60 | Favorable for risk assets |
| NEUTRAL | Score 40-59 | Mixed signals |
| RISK_OFF | Score < 40 | Defensive posture |

---

## 🚧 Known Limitations

- **Hardcoded Stock Universe**: Only 9 stocks tracked by default
- **No Authentication**: Multi-user support not implemented
- **Mock Portfolio Data**: Portfolio constraints use placeholder values
- **No Real-Time Streaming**: WebSocket support not active
- **No Test Coverage**: Automated tests not yet written

---

## 🛣️ Roadmap

See [overview.md](./overview.md) for detailed architecture and [STRATEGY_DOCUMENTATION.md](./STRATEGY_DOCUMENTATION.md) for evaluation methodology.

### Planned Features

- [ ] User authentication & watchlists
- [ ] Real portfolio integration (brokerage APIs)
- [ ] WebSocket real-time updates
- [ ] Alerting system
- [ ] Backtesting engine
- [ ] Mobile app

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is private and not licensed for public use.

---

## 🙏 Acknowledgments

- [Finnhub](https://finnhub.io/) for market data
- [Financial Modeling Prep](https://financialmodelingprep.com/) for fundamentals
- [Marketstack](https://marketstack.com/) for historical data
- [Shadcn/UI](https://ui.shadcn.com/) for UI components
- [TanStack Query](https://tanstack.com/query) for data fetching

---

## 📞 Support

For questions or issues, please open a GitHub issue.

---

