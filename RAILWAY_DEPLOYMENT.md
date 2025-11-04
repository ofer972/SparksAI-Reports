# Railway Deployment Guide

This guide will help you deploy the SparksAI Reports application to Railway.

## Prerequisites

1. A Railway account (sign up at https://railway.app)
2. Your GitHub repository connected to Railway (or use Railway CLI)

## Step 1: Create a New Railway Project

1. Go to https://railway.app/dashboard
2. Click "New Project"
3. Select "Deploy from GitHub repo" (recommended) or "Empty Project"
4. If using GitHub, select your repository

## Step 2: Configure Build Settings

Railway will auto-detect Next.js, but you can verify:
- **Build Command**: `npm run build`
- **Start Command**: `npm start`

The `railway.json` file in the root directory configures these settings.

## Step 3: Set Environment Variables

In your Railway project dashboard, go to **Variables** and add the following:

### Required Environment Variables

| Variable Name | Description | Example Value |
|--------------|-------------|---------------|
| `INTERNAL_BACKEND_URL` | Backend server URL (internal domain on Railway). Used by Next.js server-side rewrites | `https://your-backend.railway.app` |
| `NEXT_PUBLIC_API_VERSION` | API version | `v1` |
| `NEXT_PUBLIC_JIRA_URL` | Your Jira instance URL | `https://argus-sec.atlassian.net/` |

### Optional Environment Variables

| Variable Name | Description | Default Value |
|--------------|-------------|---------------|
| `NEXT_PUBLIC_BACKEND_URL` | Backend URL for localhost development | `http://localhost:8000` |

### Example Configuration

```
INTERNAL_BACKEND_URL=https://sparksai-backend-production.up.railway.app
NEXT_PUBLIC_API_VERSION=v1
NEXT_PUBLIC_JIRA_URL=https://argus-sec.atlassian.net/
```

**Note:** No authentication is needed. All requests go directly to the backend through Next.js rewrites.

## Step 4: Deploy

1. Railway will automatically trigger a build when you:
   - Push to your connected branch (usually `main` or `master`)
   - Manually trigger a deployment from the dashboard
   - Update environment variables

2. Monitor the build logs in the Railway dashboard

3. Once deployed, Railway will provide a URL like: `https://your-app.up.railway.app`

## Step 5: Configure Custom Domain (Optional)

1. Go to your Railway project settings
2. Click on "Settings" → "Domains"
3. Add your custom domain
4. Configure DNS records as instructed by Railway

## Troubleshooting

### Build Fails

- Check build logs in Railway dashboard
- Ensure all environment variables are set correctly
- Verify `package.json` has correct build scripts

### API Calls Fail

- Verify `INTERNAL_BACKEND_URL` points to your backend
- Check that `NEXT_PUBLIC_API_BASE_URL` is set correctly
- Ensure CORS is configured on your backend to allow requests from Railway domain

### 404 Errors on Routes

- Next.js 14 uses App Router, ensure routes are in `app/` directory
- Check that `next.config.js` rewrites are configured correctly

## How It Works

### Simple Rewrite Flow

1. **Frontend makes request**: `/api/v1/issues/...`
2. **Next.js rewrite intercepts**: `/api/:path*`
3. **Rewrites to backend**: `{INTERNAL_BACKEND_URL}/api/:path*`
4. **On Railway**: Uses `INTERNAL_BACKEND_URL` (internal domain, not exposed to browser)
5. **On localhost**: Uses `NEXT_PUBLIC_BACKEND_URL` or defaults to `http://localhost:8000`

### Environment Variables

- **`INTERNAL_BACKEND_URL`**: Server-side only (used in `next.config.js` rewrites)
  - On Railway: Your backend's Railway URL (internal domain)
  - Not exposed to the browser
  
- **`NEXT_PUBLIC_BACKEND_URL`**: For localhost development only
  - Used by Next.js rewrites when `INTERNAL_BACKEND_URL` is not set
  - Defaults to `http://localhost:8000` (backend server port)

## Notes

- Railway automatically detects Next.js and sets up the build process
- The app uses Next.js 14 with App Router
- Build time environment variables are embedded at build time
- Runtime environment variables can be changed without rebuilding

