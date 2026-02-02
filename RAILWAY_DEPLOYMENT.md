# Railway.app Deployment Guide

This document describes how to deploy the Asset Manager application on Railway.app.

## Prerequisites

- A Railway.app account (https://railway.app)
- Your repository connected to Railway
- API keys for data providers (see `.env.example`)

## Quick Start

1. **Connect your GitHub repository to Railway**
   - Go to Railway Dashboard → New Project
   - Select "Deploy from GitHub repo"
   - Choose this repository

2. **Configure Environment Variables**
   - In Railway Dashboard, go to your Project → Variables
   - Add all required environment variables from `.env.example`:
     - `FINNHUB_API_KEY` - Required for stock data
     - `MARKETSTACK_API_KEY` - Required for historical data
     - `FMP_API_KEY` - Required for fundamentals
     - `DATABASE_URL` - If using database (optional)
     - `PORT` - Optional, defaults to 5000 (Railway sets this automatically)

3. **Deploy**
   - Railway automatically deploys when you push to your configured branch
   - Deployment uses the `railway.toml` configuration and `Dockerfile`

## Configuration Details

### railway.toml
- **Builder**: Uses `dockerfile` for consistent, reproducible builds
- **Start Command**: `node dist/index.cjs` - Runs the compiled server
- **Health Check**: `/api/infra/health` - Railway uses this to verify the app is running
- **Restart Policy**: Automatically restarts failed containers

### Dockerfile
- **Multi-stage build**: Reduces final image size by ~70%
- **Build stage**: Installs all dependencies (including dev) and builds the application
- **Runtime stage**: Contains only production dependencies and built code
- **Port**: Listens on port 3000 (configurable via `PORT` environment variable)
- **Entry point**: Runs the compiled Node.js server directly for fast startup

## Environment Variables

### Required for Data Providers
```bash
FINNHUB_API_KEY=your_key_here
MARKETSTACK_API_KEY=your_key_here
```

### Optional
```bash
PORT=5000                    # Default: 5000 (Railway usually sets this)
NODE_ENV=production          # Default: production
DATABASE_URL=postgresql://...  # If using PostgreSQL
```

## Troubleshooting

### Deployment Fails with Build Errors
1. Check Railway build logs in the Dashboard
2. Ensure `npm run build` works locally
3. Verify all dependencies are in `package.json`

### Application Crashes After Deploy
1. Check Railway runtime logs
2. Ensure all required environment variables are set
3. Verify the health check endpoint (`/api/infra/health`) is working
4. Check database connection if using PostgreSQL

### Health Check Failures
- The application uses `/api/infra/health` as the health check endpoint
- If this endpoint is not responding, Railway will continuously restart the app
- Verify the server is listening on the correct port
- Check application logs for errors

### Port Issues
- Railway automatically sets the `PORT` environment variable
- The application listens on `0.0.0.0:PORT` to accept connections from Railway
- If you need a specific port, configure it in Railway's variables (though Railway manages this)

## Performance Notes

- **Docker Build**: Uses multi-stage builds to minimize image size
- **Startup Time**: Direct Node.js execution (no npm overhead) for fastest cold starts
- **Dependencies**: Only production dependencies are included in the final image

## What Happens During Deployment

1. Railway pulls your repository
2. Builds Docker image using the `Dockerfile`
3. **Build Stage**: 
   - Installs Node 22.21.1
   - Installs all npm dependencies
   - Compiles TypeScript and bundles the application
   - Removes dev dependencies
4. **Runtime Stage**:
   - Starts with Node 22.21.1 base image
   - Copies production files and dependencies
   - Exposes port 3000
5. Railway starts the container with environment variables
6. Application listens and responds to requests
7. Railway monitors health checks every 30 seconds

## Differences from Replit Deployment

| Aspect | Replit | Railway |
|--------|--------|---------|
| **Build** | Replit.nix configuration | Dockerfile |
| **Start** | `npm run dev` or build artifact | Direct Node.js execution |
| **Port** | 5000 (default) | Environment variable (usually 80 → 3000) |
| **Persistence** | Replit filesystem | Docker volumes (ephemeral) |
| **Database** | PostgreSQL module | Must provide `DATABASE_URL` |

## Next Steps

1. Get API keys from:
   - https://finnhub.io (free tier available)
   - https://marketstack.com (free tier available)

2. Deploy to Railway and monitor the build/runtime logs

3. Test the application at your Railway domain

## Additional Resources

- [Railway Documentation](https://docs.railway.app)
- [Railway Docker Deployment](https://docs.railway.app/guides/dockerfiles)
- [Railway Environment Variables](https://docs.railway.app/guides/variables)
