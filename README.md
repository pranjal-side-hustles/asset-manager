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

**If you see "Failed to Load Data" or "Market data unavailable"**  
The app now returns a friendly warning instead of a hard error when API keys are missing or the data fetch fails. Add `FINNHUB_API_KEY`, `MARKETSTACK_API_KEY`, and `FMP_API_KEY` in Vercel → Settings → Environment Variables, then redeploy. If the first load times out (Vercel serverless 10s limit), retry; the dashboard may still load with a warning.

---

## 🚂 Railway: Deploy

This repo is set up to deploy on [Railway](https://railway.app) with **zero extra config** beyond environment variables.

### Deploy steps

1. **Create a project**  
   [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo** (or **Empty project** and connect the repo later).

2. **Add the repo**  
   If you started from GitHub: select this repository. Railway will use the root `railway.toml` for build and start:
   - **Build:** `npm run build` (Vite client → `dist/public`, server bundle → `dist/index.cjs`)
   - **Start:** `node dist/index.cjs` (single process; Railway sets `PORT`)

3. **Set environment variables**  
   In the Railway project: **Variables** (or service **Variables**), add the same keys as in [.env.example](.env.example):
   - `FINNHUB_API_KEY` – [finnhub.io](https://finnhub.io/)
   - `MARKETSTACK_API_KEY` – [marketstack.com](https://marketstack.com/)
   - `FMP_API_KEY` – [financialmodelingprep.com](https://financialmodelingprep.com/)
   - `DATABASE_URL` – only if you use the DB (e.g. Neon/Supabase)

4. **Deploy**  
   Push to the connected branch or trigger a deploy from the dashboard. Railway will run `npm run build` then `node dist/index.cjs`. The app will be available at the generated URL (e.g. `https://your-app.up.railway.app`).

### Health check

`railway.toml` sets `healthcheckPath = "/api/infra/health"` so Railway can confirm the app is up. The root `/` and all API routes are served by the same Node process (no serverless; same as Replit/local).

---

## 🔧 Troubleshooting: Vercel & Railway

**Why the app might not work on Vercel or Railway**

1. **Build fails: “tsx: command not found” or “Cannot find module 'vite'”**  
   The build script (`npm run build`) uses **tsx**, **vite**, and **esbuild**, which are in **devDependencies**. If the platform runs `npm install` with `NODE_ENV=production`, devDependencies are skipped and the build fails.
   - **Vercel:** `vercel.json` now sets `installCommand: "npm install --include=dev"` so devDependencies are installed before the build.
   - **Railway:** `railway.toml` uses `buildCommand: "npm install --include=dev && npm run build"` so devDependencies are installed before the build.  
   If you overrode the install/build commands in the dashboard, restore the repo defaults or keep `--include=dev` in the install step.

2. **Vercel: Blank page or “download file” instead of opening the app**  
   - Ensure **outputDirectory** is `dist/public` (set in `vercel.json`).  
   - Ensure **rewrites** are present: `/api/*` stays as-is; other paths go to `/index.html` for the SPA. Static files (e.g. `/assets/*`) are served from `dist/public` before rewrites.

3. **Vercel: API routes return 500 or timeout**  
   The `/api/*` handler runs the Express app in a serverless function. First request can be slow (cold start). Add env vars (e.g. `FINNHUB_API_KEY`, `MARKETSTACK_API_KEY`, `FMP_API_KEY`) in Vercel → Settings → Environment Variables and redeploy.

4. **Railway: App doesn’t start or health check fails**  
   - Start command must be `node dist/index.cjs` (set in `railway.toml`).  
   - Railway sets `PORT`; the app uses `process.env.PORT`.  
   - Health check hits `/api/infra/health`; ensure the service is listening and env vars are set.

5. **Both: Missing API keys**  
   Without `FINNHUB_API_KEY`, `MARKETSTACK_API_KEY`, and `FMP_API_KEY`, the app may build and run but data calls will fail or fall back to mocks. Add these in the platform’s environment variables (and optionally `DATABASE_URL` if you use the DB).

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

