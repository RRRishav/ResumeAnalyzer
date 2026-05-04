# Free Deployment Guide

This app is a Vite React frontend plus an Express, MongoDB, Socket.IO backend.

Recommended free setup:

- Frontend: Vercel Hobby plan
- Backend: Render free web service
- Database: MongoDB Atlas Free cluster

## 1. Push To GitHub

Commit this repository and push it to GitHub. Both Vercel and Render can deploy directly from the repo.

## 2. Create A Free MongoDB Atlas Database

1. Create a MongoDB Atlas Free cluster.
2. Create a database user.
3. Add your current IP address for local testing, and allow Render access for deployment.
4. Copy the connection string and keep it ready as `MONGO_URI`.

## 3. Deploy Backend On Render

Create a new Render web service from this repository.

Use these settings if you do not use the included `render.yaml` blueprint:

- Root Directory: `server`
- Runtime: `Node`
- Build Command: `npm install`
- Start Command: `npm start`
- Instance Type: `Free`

Set these environment variables in Render:

```text
NODE_ENV=production
MONGO_URI=<your MongoDB Atlas connection string>
JWT_SECRET=<a long random secret>
GEMINI_API_KEY=<your Gemini API key>
CLIENT_URLS=<your Vercel frontend URL>
```

After Render deploys, open:

```text
https://<your-render-service>.onrender.com/api/health
```

You should see a JSON response with `status: "ok"`.

## 4. Deploy Frontend On Vercel

Create a Vercel project from the same GitHub repository.

Use these settings:

- Root Directory: `client`
- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`

Set these environment variables in Vercel:

```text
VITE_API_URL=https://<your-render-service>.onrender.com/api
VITE_SOCKET_URL=https://<your-render-service>.onrender.com
```

Redeploy the Vercel project after adding those variables.

## 5. Update Backend CORS

After Vercel gives you the final frontend URL, go back to Render and set:

```text
CLIENT_URLS=https://<your-vercel-project>.vercel.app
```

For multiple frontend URLs, separate them with commas:

```text
CLIENT_URLS=https://site-one.vercel.app,https://site-two.vercel.app
```

Redeploy the backend after changing this value.

## Free Tier Notes

- Render free services may sleep when unused, so the first request can be slow.
- Render file storage is ephemeral. This app parses uploaded resumes during requests, so avoid depending on files remaining in `server/uploads`.
- MongoDB Atlas Free clusters are enough for a portfolio or demo app, but not for serious production traffic.
