# Free Deployment Guide

This app is a Vite React frontend plus an Express, MongoDB, Socket.IO backend.

Recommended free setup:

- Frontend: Vercel Hobby plan
- Backend: Render free web service
- Database: MongoDB Atlas Free cluster

## 1. Backend On Render

Your backend service URL is:

```text
https://resume-analyzer-api-12if.onrender.com
```

The root URL can show:

```text
Cannot GET /
```

That is normal because this backend only exposes API routes. Test this URL instead:

```text
https://resume-analyzer-api-12if.onrender.com/api/health
```

You should see JSON with `status: "ok"`.

## 2. Render Environment Variables

In Render, set these backend environment variables:

```text
NODE_ENV=production
MONGO_URI=<your MongoDB Atlas connection string>
JWT_SECRET=<a long random secret>
GEMINI_API_KEY=<your Gemini API key>
CLIENT_URLS=<your Vercel frontend URL>
```

If the frontend is not deployed yet, you can temporarily use:

```text
CLIENT_URLS=http://localhost:5173
```

After Vercel gives you the production frontend URL, replace it with:

```text
CLIENT_URLS=https://your-vercel-app.vercel.app
```

For multiple frontend URLs, separate them with commas:

```text
CLIENT_URLS=https://site-one.vercel.app,https://site-two.vercel.app
```

Redeploy the backend after changing environment variables.

## 3. Frontend On Vercel

Create a Vercel project from the GitHub repository.

Use these settings:

- Root Directory: `client`
- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`

Set these Vercel environment variables:

```text
VITE_API_URL=https://resume-analyzer-api-12if.onrender.com/api
VITE_SOCKET_URL=https://resume-analyzer-api-12if.onrender.com
```

Redeploy the Vercel project after adding those variables.

## 4. MongoDB Atlas

Use a MongoDB Atlas Free cluster.

Steps:

1. Create a free cluster.
2. Create a database user.
3. Allow network access for Render.
4. Copy the connection string.
5. Put it in Render as `MONGO_URI`.

## 5. Free Tier Notes

- Render free services may sleep when unused, so the first request can be slow.
- Render file storage is temporary. Do not depend on uploaded files staying forever in `server/uploads`.
- MongoDB Atlas Free is good for a demo or portfolio project, but not heavy production traffic.
