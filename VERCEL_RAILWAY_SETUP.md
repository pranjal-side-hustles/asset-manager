# Vercel + Railway Deployment Guide

This document explains how to deploy the frontend on **Vercel** and the backend on **Railway**.

## Architecture Overview

```
┌─────────────────┐          ┌──────────────────┐
│                 │          │                  │
│  Vercel (CDN)   │ ◄───────►│  Railway (Node)  │
│  Frontend       │  API     │  Backend         │
│  (SPA + Rewrites)           │  (Express)       │
│                 │          │                  │
└─────────────────┘          └──────────────────┘
```

- **Vercel**: Hosts the React frontend and static assets
- **Railway**: Runs the Node.js Express backend with all API endpoints
- **Communication**: Vercel rewrites `/api/*` requests to the Railway API URL

## Setup Instructions

### 1. Get Your Railway API URL

1. Deploy your app on [Railway.app](https://railway.app)
2. Go to your project → Deployments
3. Click on the latest deployment to view details
4. Copy the **public URL** (e.g., `https://your-app-production.up.railway.app`)

### 2. Configure Vercel Environment Variables

1. Go to your Vercel project → **Settings** → **Environment Variables**
2. Add these variables for **Production**:

| Name | Value | Description |
|------|-------|-------------|
| `VITE_API_URL` | `https://your-railway-url.up.railway.app` | Your Railway backend URL (no trailing slash) |
| `FINNHUB_API_KEY` | Your key | Get from [finnhub.io](https://finnhub.io/) |
| `MARKETSTACK_API_KEY` | Your key | Get from [marketstack.com](https://marketstack.com/) |

**Important:** Do NOT include a trailing slash in `VITE_API_URL`

3. Click **Save** and **Redeploy** your project

### 3. Configure Railway Environment Variables

1. Go to your Railway project → **Variables**
2. Add these variables:

| Name | Value | Description |
|------|-------|-------------|
| `FINNHUB_API_KEY` | Your key | Same as Vercel |
| `MARKETSTACK_API_KEY` | Your key | Same as Vercel |
| `PORT` | `3000` | Default port (Railway usually sets this automatically) |
| `NODE_ENV` | `production` | Environment mode |

3. Changes apply automatically; Railway will redeploy

### 4. Test the Connection

1. Open your Vercel URL in a browser
2. Open **Developer Tools** → **Network** tab
3. Look for requests to `/api/dashboard`
4. Check the request URL - it should show your Railway domain
5. Response should include stock data

## Troubleshooting

### Issue: "Failed to Load Data" or Blank Dashboard

**Symptoms:**
- Dashboard page loads but no stock data appears
- Network tab shows `/api/dashboard` returning 404 or 502

**Solutions:**

1. **Verify VITE_API_URL is set correctly in Vercel**
   ```bash
   # In Vercel dashboard:
   # Settings → Environment Variables
   # Look for VITE_API_URL = https://your-railway-url.up.railway.app
   # (without trailing slash)
   ```

2. **Check that Railway is running**
   ```bash
   # In Railway dashboard:
   # Click your deployment → Logs
   # Look for "serving on port 3000" message
   ```

3. **Verify Railway health endpoint**
   ```bash
   # Run in terminal:
   curl https://your-railway-url.up.railway.app/api/infra/health
   
   # Should return JSON with status: "healthy"
   ```

4. **Check CORS issues**
   - Open browser DevTools → Console
   - Look for CORS errors
   - The backend should allow requests from your Vercel domain
   - This is usually automatic for same-origin requests after rewriting

5. **Verify API keys are set in Railway**
   ```bash
   # In Railway dashboard:
   # Variables tab should show:
   # - FINNHUB_API_KEY
   # - MARKETSTACK_API_KEY  
   # - FMP_API_KEY
   ```

### Issue: 502 Bad Gateway or Timeout

**Symptoms:**
- Network requests to `/api/*` return 502 or timeout
- Railway deployment shows "crashed" or "unhealthy"

**Solutions:**

1. **Check Railway logs for errors**
   ```bash
   # In Railway dashboard:
   # Deployments → View Details → Logs tab
   # Look for build or runtime errors
   ```

2. **Verify database connection (if applicable)**
   - If using PostgreSQL, ensure `DATABASE_URL` is set in Railway
   - Connection string format: `postgresql://user:pass@host:port/db`

3. **Check memory usage**
   - Railway free tier has limits
   - If memory exceeded, upgrade to paid plan

### Issue: API requests going to wrong domain

**Symptoms:**
- Network tab shows requests going to Vercel's own `/api/*` instead of Railway
- "Cannot POST /api/..." errors

**Solutions:**

1. **Verify vercel.json is correct**
   ```json
   {
     "rewrites": [
       {
         "source": "/api/:path*",
         "destination": "${VITE_API_URL}/api/:path*"
       },
       { "source": "/:path*", "destination": "/index.html" }
     ]
   }
   ```

2. **Redeploy Vercel after updating vercel.json**
   - Vercel needs to rebuild with new rewrite rules
   - Go to Deployments → ⋮ → Redeploy

3. **Check client-side code uses VITE_API_URL**
   - In `client/src/lib/queryClient.ts`, verify:
   ```typescript
   const apiUrl = import.meta.env.VITE_API_URL || "";
   ```

## Environment Variable Checklist

### Vercel (Settings → Environment Variables)

```
✓ VITE_API_URL = https://your-railway-url.up.railway.app
✓ FINNHUB_API_KEY = your_key
✓ MARKETSTACK_API_KEY = your_key
```

### Railway (Variables)

```
✓ FINNHUB_API_KEY = your_key
✓ MARKETSTACK_API_KEY = your_key
✓ PORT = 3000 (or auto-set by Railway)
✓ NODE_ENV = production
```

## Common Issues Summary

| Issue | Cause | Solution |
|-------|-------|----------|
| Blank dashboard | `VITE_API_URL` not set | Set in Vercel env vars and redeploy |
| 404 on `/api/*` | Railway app not running | Check Railway logs and deployment status |
| 502 Bad Gateway | Railway crashed or timeout | Check Railway memory/logs, verify API keys |
| CORS errors | Frontend and backend mismatch | Verify `VITE_API_URL` matches Railway domain |
| Wrong API calls | `vercel.json` not redeployed | Push changes and force redeploy in Vercel |

## Verifying the Setup

```bash
# 1. Test Railway API directly (replace URL with your Railway domain)
curl https://your-railway-url.up.railway.app/api/infra/health

# Should respond with:
# {"status":"healthy", "timestamp":"...", ...}

# 2. Test Vercel rewrite (replace with your Vercel domain)
curl https://your-vercel-app.vercel.app/api/infra/health

# Should also respond with health check, showing rewrites work

# 3. Check browser network tab in DevTools
# When loading the dashboard, /api/dashboard requests should:
# - Show up in Network tab
# - Have Request URL pointing to Railway domain
# - Return 200 status with stock data
```

## Local Development

For local development with both services:

```bash
# Terminal 1: Start Railway-like backend locally
export FINNHUB_API_KEY=your_key
export MARKETSTACK_API_KEY=your_key
npm run dev

# Terminal 2: Frontend points to localhost backend
export VITE_API_URL=http://localhost:5000
npm run dev --prefix client

# Frontend will be at http://localhost:5173
# Backend at http://localhost:5000
```

## Next Steps

1. **Monitor deployments**: Set up notifications in Vercel and Railway
2. **Set up logging**: Check Railway logs regularly for errors
3. **Optimize performance**: Consider caching strategies for API responses
4. **Scale as needed**: Upgrade Railway plan if hitting resource limits
