# API Rate Limiting & Quota Guide

## Your API Key Limits

| Provider | Plan | Limit | Status |
|----------|------|-------|--------|
| **Finnhub** | Free | 60 calls/minute | ⚠️ Tight during high frequency requests |
| **Marketstack** | Free | 100 calls/month | ⚠️ Very restrictive |

## Why Dashboard Might Be Blank

### 1. **API Keys Not Set in Railway** (Most Common)
If your Railway Variables don't have the API keys, all data fetches fail.

**Check:**
```bash
# Visit your Railway app
curl https://your-railway-app.up.railway.app/api/infra/health

# If it returns error about missing API keys, the keys aren't set
```

**Fix:**
1. Go to Railway → Project → Variables
2. Add these two variables:
   - `FINNHUB_API_KEY=your_key_here`
   - `MARKETSTACK_API_KEY=your_key_here`
3. Railway auto-redeploys

### 2. **VITE_API_URL Not Set in Vercel**
The frontend doesn't know where to send API requests.

**Check:**
1. Open browser DevTools → Network tab
2. Look for `/api/dashboard` request
3. Check the Request URL:
   - ❌ Wrong: `https://your-vercel-app.vercel.app/api/dashboard` (returns HTML error)
   - ✅ Right: `https://your-railway-app.up.railway.app/api/dashboard` (returns JSON)

**Fix:**
1. Go to Vercel → Settings → Environment Variables (Production)
2. Add: `VITE_API_URL=https://your-railway-app.up.railway.app`
3. Redeploy

### 3. **Rate Limit Hit During Dashboard Load**
When loading the dashboard, these calls are made:

```
GET /api/dashboard
  ├─ Fetch all tracked stocks
  ├─ Evaluate each stock (multiple Finnhub calls per stock)
  ├─ Fetch market context (indices, breadth, volatility)
  └─ Aggregate results

Total: ~20-50 API calls depending on number of stocks
```

If any call hits Finnhub's 60 calls/minute limit, the entire dashboard fails.

**Symptoms:**
- Works first time, then fails on refresh
- "Market data unavailable" message appears
- Blank dashboard with retry button

**Solution:**
1. **Wait a minute** between dashboard refreshes (respects Finnhub 60/min limit)
2. **Upgrade API keys** to higher tiers:
   - Finnhub Pro: 600+ calls/min (~$50/mo)
   - Marketstack Pro: Unlimited (~€25/mo)

### 4. **Marketstack Quota Exceeded**
Marketstack's 100 calls/month limit runs out very quickly with multiple requests.

**Check:**
- Go to marketstack.com → Account Dashboard
- View API calls used this month

**Solutions:**
1. Wait until next month (resets monthly)
2. Upgrade to paid plan
3. Temporarily disable Marketstack in code (use other providers only)

## How Rate Limiting Works in Your App

The backend has built-in protections:

### Per-Provider Rate Limiting
```typescript
// Finnhub: 100ms delay between calls = max 600/min
const MIN_DELAY_MS = 100;

// This serializes all Finnhub requests sequentially
// Prevents burst requests that would exceed limits
```

### Provider Health Tracking
```typescript
// If a provider fails 3 times in a row, it's paused for 5 minutes
// Prevents hammering a rate-limited API
```

### Fallback Mechanism
```typescript
// If Finnhub is rate limited:
// 1. Try Marketstack
// 2. Return cached data
// 3. Return default/placeholder data
```

### Caching Strategy
```typescript
Price data: 60 seconds
Fundamentals: 6 hours
Market context: 5 minutes

// Prevents re-fetching same data repeatedly
```

## Optimization Tips

### 1. Monitor API Usage
```bash
# Check provider health in Railway logs
curl https://your-railway-app.up.railway.app/api/infra/health | jq .providers

# Shows which providers are available/rate-limited/failed
```

### 2. Adjust Request Delays
If you're hitting rate limits, increase the delay in `server/services/providers/finnhub/rateLimiter.ts`:

```typescript
// Current: 100ms = max 600 calls/min
// Change to: 200ms = max 300 calls/min (safer)
const MIN_DELAY_MS = 200;
```

### 3. Upgrade Critical APIs
Most important for free tier:
1. **Finnhub** - Used for sentiment, options, technical analysis
2. **Marketstack** - Used for historical data (can use alternatives)

### 4. Reduce Tracked Stocks
If you're tracking many stocks, each dashboard load multiplies API calls. Consider:
- Reducing number of stocks from ~20 to ~10
- Increasing cache TTL (prevents re-evaluation)
- Using longer refresh intervals

## Common Error Messages

### "Market data unavailable – check API keys"
- API keys not set in Railway Variables
- OR both providers are down/rate-limited

**Fix:** Set API keys in Railway Variables

### "Failed to Load Data"
- Network error or timeout
- 500 error from backend
- One of the APIs not responding

**Check:** Look at browser DevTools → Network tab
- If response is HTML instead of JSON → API key issue
- If status is 504/timeout → API call took too long

### "Unexpected token '<', "<!DOCTYPE""
- Frontend received HTML instead of JSON
- Server returned error page instead of data

**Causes:**
- VITE_API_URL not set (requests go to Vercel which returns error page)
- Railway app crashed (returns error page)
- Invalid API key format

**Fix:**
1. Verify VITE_API_URL in Vercel (use DevTools Network tab to check)
2. Check Railway logs for crashes
3. Verify API key format is correct (no extra spaces)

## Testing Rate Limits

### Test Finnhub Rate Limit
```bash
# Make 65 calls to Finnhub in 60 seconds
for i in {1..65}; do
  curl -s "https://finnhub.io/api/v1/quote?symbol=AAPL&token=YOUR_KEY" \
    | jq .c
  sleep 1
done

# Last few calls should fail with 429 Too Many Requests
```

### Check Remaining Quota
```bash
# Each provider returns quota info in response headers
curl -i "https://api.marketstack.com/v1/..." 2>&1 | grep -i quota

# Marketstack shows: X-RateLimit-Remaining
```

## Escalation Path

If you continue to hit rate limits:

1. **Free Tier (Current)**
   - Finnhub: 60 calls/min
   - Marketstack: 100 calls/month
   
2. **Upgrade to Starter ($50-100/month)**
   - Finnhub Pro: 600+ calls/min
   - Marketstack Pro: 25,000+ calls/month

3. **Production Setup ($200+/month)**
   - Use multiple API providers (redundancy)
   - Higher rate limits
   - SLA/support

## Next Steps

1. **Run the diagnostic script** to identify the issue:
   ```bash
   bash scripts/diagnose.sh
   ```

2. **Verify API keys are set** in Railway Variables

3. **Check VITE_API_URL** is set in Vercel (Production only)

4. **Monitor logs** in Railway Dashboard → Logs

5. **Test health endpoint** before assuming rate limiting:
   ```bash
   curl https://your-railway-app.up.railway.app/api/infra/health
   ```

6. **Upgrade APIs** if you continue hitting limits with this setup
