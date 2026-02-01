# Quick Setup: Vercel + Railway

## Problem
Frontend on Vercel couldn't access API on Railway backend. The issue was that requests were trying to hit Vercel's own `/api/*` endpoints instead of forwarding to Railway.

## Solution
This has been fixed! Here's what was done:

### ✅ Changes Made

1. **vercel.json** - Updated rewrite rule
   - Now uses `VITE_API_URL` to proxy all `/api/*` requests to Railway
   - Format: `"destination": "${VITE_API_URL}/api/:path*"`

2. **client/src/lib/queryClient.ts** - Updated query function
   - Now reads `VITE_API_URL` from environment
   - Automatically uses Railway URL when set

3. **Documentation** - Created setup guide
   - New `VERCEL_RAILWAY_SETUP.md` with complete instructions
   - Troubleshooting section for common issues

## What You Need to Do Now

### 1️⃣ Get Your Railway URL
- Go to [Railway.app](https://railway.app)
- Open your project → Deployments
- Copy your public URL (e.g., `https://your-app-production.up.railway.app`)

### 2️⃣ Set Vercel Environment Variables
1. Go to Vercel → Project Settings → Environment Variables
2. Add for **Production**:
   ```
   VITE_API_URL=https://your-app-production.up.railway.app
   FINNHUB_API_KEY=your_key
   MARKETSTACK_API_KEY=your_key
   FMP_API_KEY=your_key
   ```
3. Click Save
4. Go to Deployments → Click latest → ⋮ → Redeploy

### 3️⃣ Verify Railway Variables
1. Go to Railway → Project → Variables
2. Ensure these are set:
   ```
   FINNHUB_API_KEY=your_key
   MARKETSTACK_API_KEY=your_key
   FMP_API_KEY=your_key
   PORT=3000
   NODE_ENV=production
   ```

### 4️⃣ Test It
1. Open your Vercel URL
2. Open DevTools → Network tab
3. Look for `/api/dashboard` request
4. It should show the Railway domain in the URL
5. Response should have stock data

## Quick Verification Commands

```bash
# Test Railway API directly
curl https://your-railway-url.up.railway.app/api/infra/health

# Test Vercel rewrite
curl https://your-vercel-app.vercel.app/api/infra/health

# Both should return JSON with status: "healthy"
```

## Common Mistakes

❌ **Don't:**
- Include trailing slash in VITE_API_URL: `https://your-app.up.railway.app/`
- Forget to redeploy Vercel after changing env vars
- Mix up variable names (VITE_API_URL for Vercel only, not Railway)

✅ **Do:**
- Use exact format: `https://your-app-production.up.railway.app` (no slash at end)
- Redeploy in Vercel after setting env vars
- Set API keys in BOTH Vercel AND Railway

## Still Having Issues?

Check the full troubleshooting guide in `VERCEL_RAILWAY_SETUP.md`:
- Section: "Troubleshooting"
- Includes solutions for 404, 502, CORS, and wrong API calls

## Files Changed

- `vercel.json` - Rewrite rule with VITE_API_URL
- `client/src/lib/queryClient.ts` - Use VITE_API_URL in API requests
- `.env.example` - Documented VITE_API_URL variable
- `VERCEL_RAILWAY_SETUP.md` - Complete setup and troubleshooting guide (NEW)
- `VERCEL_RAILWAY_QUICK_SETUP.md` - This file (NEW)

## Next Steps

1. Push your changes to deploy
2. Set `VITE_API_URL` in Vercel environment variables
3. Redeploy on Vercel
4. Test the dashboard loads with stock data
5. If issues, check `VERCEL_RAILWAY_SETUP.md` troubleshooting section
