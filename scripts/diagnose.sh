#!/bin/bash
# Diagnose Vercel + Railway API connection issues

echo "🔍 Diagnostic Script for Vercel + Railway API Issues"
echo "===================================================="
echo ""

# Get your Railway URL
read -p "Enter your Railway app URL (e.g., https://app.up.railway.app): " RAILWAY_URL

if [ -z "$RAILWAY_URL" ]; then
    echo "❌ Railway URL is required"
    exit 1
fi

# Remove trailing slash if present
RAILWAY_URL="${RAILWAY_URL%/}"

echo ""
echo "Testing Railway backend at: $RAILWAY_URL"
echo ""

# Test 1: Health check
echo "1️⃣ Testing health endpoint..."
HEALTH=$(curl -s "$RAILWAY_URL/api/infra/health" -o /dev/null -w "%{http_code}")
if [ "$HEALTH" = "200" ]; then
    echo "   ✅ Health check: PASS (200)"
else
    echo "   ❌ Health check: FAIL (HTTP $HEALTH)"
fi

# Test 2: Market context
echo "2️⃣ Testing market context endpoint..."
MARKET=$(curl -s "$RAILWAY_URL/api/market-context" -o /dev/null -w "%{http_code}")
if [ "$MARKET" = "200" ]; then
    echo "   ✅ Market context: PASS (200)"
elif [ "$MARKET" = "500" ]; then
    echo "   ⚠️  Market context: FAIL (500 - Check if API keys are set in Railway)"
    echo ""
    echo "   To fix this:"
    echo "   1. Go to Railway → Project → Variables"
    echo "   2. Add these variables:"
    echo "      - FINNHUB_API_KEY=your_key"
    echo "      - MARKETSTACK_API_KEY=your_key"  
    echo "      - FMP_API_KEY=your_key"
    echo "   3. Railway will auto-redeploy"
else
    echo "   ❌ Market context: FAIL (HTTP $MARKET)"
fi

# Test 3: Dashboard
echo "3️⃣ Testing dashboard endpoint..."
DASHBOARD=$(curl -s "$RAILWAY_URL/api/dashboard" -o /dev/null -w "%{http_code}")
if [ "$DASHBOARD" = "200" ]; then
    echo "   ✅ Dashboard: PASS (200)"
else
    echo "   ⚠️  Dashboard: FAIL (HTTP $DASHBOARD)"
fi

echo ""
echo "4️⃣ Checking API response times (first call may be slower)..."
START=$(date +%s%N)
RESPONSE=$(curl -s "$RAILWAY_URL/api/infra/health")
END=$(date +%s%N)
TIME=$(( (END - START) / 1000000 ))
echo "   Response time: ${TIME}ms"
echo "   Response (first 200 chars): $(echo $RESPONSE | head -c 200)"

echo ""
echo "===================================================="
echo "📋 Summary:"
echo ""
echo "If health check passed but dashboard/market context failed:"
echo "  → Issue: API keys not set in Railway"
echo "  → Fix: Set FINNHUB_API_KEY, MARKETSTACK_API_KEY, FMP_API_KEY in Railway Variables"
echo ""
echo "If all tests pass but Vercel dashboard is still blank:"
echo "  → Issue: VITE_API_URL not set in Vercel"
echo "  → Fix: Set VITE_API_URL=$RAILWAY_URL in Vercel Environment Variables (Production)"
echo "  → Then redeploy in Vercel"
echo ""
echo "If response time is very slow (>10s):"
echo "  → Issue: Cold start or Railway instance warming up"
echo "  → Solution: Give it a minute and try again"
