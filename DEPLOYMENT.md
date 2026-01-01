# Deployment Guide

This guide covers deploying the Dinner Bell application with separate frontend (Vercel) and backend (Railway/Render) deployments.

## Architecture

```
Frontend (Vercel)          Backend (Railway/Render)
   React + Vite      →         Express + Puppeteer
   Static Files                Recipe Parser API
```

## Why Split Deployment?

The backend uses **Puppeteer** which requires:
- Large Chromium binary (~170-300MB)
- Longer execution times (up to 45 seconds)
- Full Node.js runtime environment

Vercel's serverless functions have:
- 50MB size limit (Hobby) / 250MB (Pro) - **too small for Puppeteer**
- 10-60 second timeout limits

**Solution**: Deploy backend to Railway/Render (supports Docker + long-running processes)

---

## Backend Deployment (Choose One)

### Option A: Railway (Recommended)

**1. Install Railway CLI**
```bash
npm install -g @railway/cli
```

**2. Login to Railway**
```bash
railway login
```

**3. Create New Project**
```bash
railway init
```

**4. Set Environment Variables**
```bash
railway variables set NODE_ENV=production
railway variables set PORT=3001
railway variables set ALLOWED_ORIGINS=https://your-vercel-app.vercel.app
```

**5. Deploy**
```bash
railway up
```

**6. Get Your Backend URL**
```bash
railway domain
# Example output: https://dinner-bell-api.railway.app
```

---

### Option B: Render

**1. Create `render.yaml` (already included)**

**2. Connect GitHub Repository**
- Go to [render.com](https://render.com)
- Click "New +" → "Web Service"
- Connect your GitHub repository
- Render will auto-detect the `render.yaml` file

**3. Set Environment Variables**
In Render dashboard:
- `NODE_ENV` = `production`
- `PORT` = `3001`
- `ALLOWED_ORIGINS` = `https://your-vercel-app.vercel.app`

**4. Deploy**
- Click "Create Web Service"
- Render will build and deploy automatically

**5. Get Your Backend URL**
- Example: `https://dinner-bell-api.onrender.com`

---

## Frontend Deployment (Vercel)

**1. Install Vercel CLI** (optional)
```bash
npm install -g vercel
```

**2. Update Environment Variable**

Create `.env.production` in your project root:
```bash
VITE_API_URL=https://your-backend-url.railway.app
# or
VITE_API_URL=https://your-backend-url.onrender.com
```

**3. Deploy via Vercel Dashboard**

- Go to [vercel.com](https://vercel.com)
- Import your GitHub repository
- Add environment variable:
  - Name: `VITE_API_URL`
  - Value: Your Railway/Render backend URL
- Deploy!

**4. Deploy via CLI**
```bash
vercel --prod
```

---

## Update CORS After Deployment

Once your Vercel frontend is deployed, update your backend CORS settings:

### Railway:
```bash
railway variables set ALLOWED_ORIGINS=https://your-app.vercel.app
railway up
```

### Render:
- Go to Render dashboard → Your service → Environment
- Update `ALLOWED_ORIGINS` to your Vercel URL
- Save (auto-redeploys)

---

## Local Development

**1. Copy environment template**
```bash
cp .env.example .env.local
```

**2. Start backend**
```bash
npm run dev:server
```

**3. Start frontend (in new terminal)**
```bash
npm run dev
```

Backend runs on `http://localhost:3001`
Frontend runs on `http://localhost:5173`

---

## Mobile Support

✅ **Works out of the box** once backend is deployed to Railway/Render

The mobile browser will make requests to your deployed backend URL (e.g., `https://dinner-bell-api.railway.app`), not localhost.

---

## Performance Optimization

The recipe parser now uses a **two-tier strategy**:

1. **Axios fetch first** (fast, ~1-3 seconds)
   - Works for 80%+ of recipe sites
   - Uses schema.org JSON-LD data
   - Lightweight, no browser needed

2. **Puppeteer fallback** (slower, ~10-45 seconds)
   - Only when axios fails or data is incomplete
   - Handles JavaScript-heavy sites
   - Bypasses anti-bot protection

This means most requests are fast and cheap!

---

## Troubleshooting

### CORS Errors
- Ensure `ALLOWED_ORIGINS` in backend includes your frontend URL
- Check that frontend `VITE_API_URL` points to correct backend

### Puppeteer Crashes
- Railway/Render should auto-restart (configured in `railway.toml`/`render.yaml`)
- Check logs: `railway logs` or Render dashboard

### "Failed to parse recipe"
- Some sites have strong anti-bot protection
- Try the axios-first approach (already implemented)
- For persistent issues, consider using a headless browser service like Browserless.io

---

## Cost Estimates

### Railway
- **Free Tier**: $5 credit/month (~500 hours)
- **Hobby**: $5/month for 500 hours

### Render
- **Free Tier**: 750 hours/month (1 instance)
- Sleeps after 15 min inactivity (cold starts ~30s)

### Vercel
- **Free Tier**: 100GB bandwidth, unlimited deployments

**Total**: $0-5/month for hobby projects

---

## Next Steps

1. Deploy backend to Railway or Render
2. Deploy frontend to Vercel
3. Update CORS configuration
4. Test on mobile device
5. Monitor performance and adjust as needed

For questions or issues, check the logs:
- Railway: `railway logs`
- Render: Dashboard → Logs tab
- Vercel: Dashboard → Deployments → Function Logs
