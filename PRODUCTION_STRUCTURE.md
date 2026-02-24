# Skibbly - Production Folder Structure & Deployment Guide

## 📁 Folder Structure

```
project-root/
├── client/                          # Next.js Frontend App (Vercel)
│   ├── public/                      # Static assets
│   ├── src/
│   │   ├── components/              # React UI components
│   │   ├── context/                 # React Context (AuthContext)
│   │   ├── hooks/                   # Custom React hooks (useGameLogic)
│   │   ├── pages/                   # Next.js page routes
│   │   │   ├── _app.js
│   │   │   ├── index.js
│   │   │   ├── home.js
│   │   │   ├── login.js
│   │   │   ├── register.js
│   │   │   ├── solo.js
│   │   │   └── team.js
│   │   ├── styles/                  # CSS stylesheets
│   │   └── utils/                   # Utility functions
│   │       ├── socket.js            # Socket.IO client (connects to Render server)
│   │       ├── socketEvents.js      # Socket event constants
│   │       ├── constants.js
│   │       └── helpers.js
│   ├── .env.example                 # Template for environment variables
│   ├── .env.local                   # LOCAL ONLY - actual secrets (git ignored)
│   ├── .gitignore
│   ├── package.json
│   ├── jsconfig.json
│   ├── next.config.js
│   ├── postcss.config.js
│   └── tailwind.config.js
│
├── server/                          # Express Backend + Socket.IO (Render)
│   ├── config/                      # Configuration files
│   │   ├── db.js                    # MongoDB connection
│   │   └── multer.js                # File upload config
│   ├── controllers/                 # Route controllers
│   ├── gameLogic/                   # Game orchestration
│   │   ├── constants.js             # Game constants & events
│   │   ├── gameHelpers.js           # Helper functions
│   │   ├── gameManager.js           # Core game manager (team scoring)
│   │   ├── gameState.js             # Immutable game state
│   │   ├── socketIntegration.js     # Socket handlers (room setup, voting, etc.)
│   │   └── words/                   # Word lists by difficulty
│   ├── middleware/                  # Express middleware
│   │   └── auth.js                  # JWT authentication
│   ├── models/                      # MongoDB schemas
│   │   └── User.js
│   ├── routes/                      # API route handlers
│   │   ├── auth.js                  # Login, register, refresh token endpoints
│   │   └── socketHandler.js         # Fallback socket handlers (optional)
│   ├── sockets/                     # Socket.IO event handlers (NEW)
│   │   └── handlers.js              # Consolidated socket event logic
│   ├── utils/                       # Utility functions
│   │   └── generateToken.js
│   ├── .env.example                 # Template for production secrets
│   ├── .env                         # PRIVATE - actual secrets (git ignored)
│   ├── .gitignore
│   ├── package.json
│   └── server.js                    # Express app + Socket.IO server
│
├── .git/                            # Git repository
├── .gitignore                       # Root-level git ignore (optional)
└── README.md                        # This file
```

## 🚀 Deployment Architecture

### Frontend → Vercel
- **Client:** Next.js 16.0.10 + React 19
- **Hosting:** Vercel (automatic deployments from git)
- **Socket Connection:** Points to Render server via `NEXT_PUBLIC_SOCKET_SERVER` env var
- **Auth:** JWT tokens in httpOnly cookies + Bearer header for API calls

### Backend → Render
- **Server:** Express 5.1.0 + Socket.IO 4.7.5
- **Hosting:** Render.com free tier (Web Services)
- **Database:** MongoDB Atlas (free M0 cluster)
- **Socket Endpoint:** `ws://your-render-url.com` (Render manages domain)

## 🔧 Environment Variables

### Client ([client/.env.example](client/.env.example))

```bash
# Socket.IO server endpoint (Render backend URL)
NEXT_PUBLIC_SOCKET_SERVER=http://localhost:5000  # Dev
NEXT_PUBLIC_SOCKET_SERVER=https://your-app.onrender.com  # Prod

# API server base URL
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000  # Dev
NEXT_PUBLIC_API_BASE_URL=https://your-app.onrender.com  # Prod
```

**Setup for Development:**
```bash
cp client/.env.example client/.env.local
# Edit client/.env.local with local values
```

**Setup for Production (Vercel Dashboard):**
1. Go to Vercel Project Settings → Environment Variables
2. Add `NEXT_PUBLIC_SOCKET_SERVER=https://your-render-app.onrender.com`
3. Add `NEXT_PUBLIC_API_BASE_URL=https://your-render-app.onrender.com`

### Server ([server/.env.example](server/.env.example))

```bash
NODE_ENV=production
PORT=5000
CLIENT_ORIGIN=https://your-vercel-app.vercel.app
CORS_ORIGIN=https://your-vercel-app.vercel.app

MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority

JWT_SECRET=<32-char random string>
JWT_REFRESH_SECRET=<32-char random string>
```

**Setup for Development:**
```bash
cp server/.env.example server/.env
# Edit server/.env with local values
```

**Setup for Production (Render Dashboard):**
1. Create new Web Service on Render
2. Go to Environment → Add from file
3. Paste contents of [server/.env.example](server/.env.example), fill in actual values
4. Render will auto-reload when env vars change

## 🎮 Key Architectural Changes

### ✅ Socket.IO Migration (from Next.js → Express)
- **Before:** Socket.IO ran in Next.js API route (`/api/socket`)
  - Problem: Serverless functions are stateless; realtime connections dropped frequently
- **After:** Socket.IO in Express server on Render
  - Benefits: Persistent connection, reliable game state, proper event broadcasting

### ✅ File Organization
- **New:** [server/sockets/handlers.js](server/sockets/handlers.js)
  - Extracted all Socket.IO event handlers into dedicated module
  - Cleaner separation of concerns from Express app
- **Deleted:** [client/src/pages/api/socket.js](client/src/pages/api/socket.js)
  - No longer needed; all socket logic on Render server

### ✅ Client Connection Logic
- Updated [client/src/utils/socket.js](client/src/utils/socket.js)
  - Uses `NEXT_PUBLIC_SOCKET_SERVER` env var (supports both dev/prod)
  - Removed hardcoded `/api/socket` path
  - Now connects to full Render backend URL

## 📋 Team Mode Scoring (Verified)

Game state managed in [server/gameLogic/gameManager.js](server/gameLogic/gameManager.js):
- **Team A Score** + **Team B Score** tracked in `teamScores` object
- No individual player points in team mode (team-only scoring)
- First correct guess from either teammate gives +1 to that team
- Scoreboard synced via `SCOREBOARD_DISPLAY` socket event

## 🔐 Security Features

✅ CORS locked to frontend domain (not wildcard)  
✅ Security headers: X-Content-Type-Options, X-Frame-Options, Referrer-Policy  
✅ JSON body limit: 1MB  
✅ httpOnly cookies for JWT refresh tokens  
✅ Environment secrets in .env, not in code  
✅ .gitignore prevents accidental secret commits  

## 📦 Getting Started

### Local Development

**Backend:**
```bash
cd server
cp .env.example .env
# Edit .env with LOCAL values (MongoDB local or Atlas dev cluster)
npm install
npm run server
# Server runs on http://localhost:5000
# Socket.IO on ws://localhost:5000
```

**Frontend:**
```bash
cd client
cp .env.example .env.local
# Edit .env.local, point NEXT_PUBLIC_SOCKET_SERVER to http://localhost:5000
npm install
npm run dev
# App runs on http://localhost:3000
```

### Production Deployment

**Step 1: Deploy Backend to Render**
1. Create new Web Service on [render.com](https://render.com)
2. Connect GitHub repository
3. Select `/server` as root directory
4. Set Node version to 20 or higher
5. Build command: `npm install`
6. Start command: `npm start`
7. Add environment variables from `.env.example` (fill in real values)
8. Note the Render URL: `https://your-app.onrender.com`

**Step 2: Deploy Frontend to Vercel**
1. Create new Project on [vercel.com](https://vercel.com)
2. Connect GitHub repository
3. Vercel auto-detects Next.js
4. Select `/client` as root directory
5. Set environment variables:
   - `NEXT_PUBLIC_SOCKET_SERVER=https://your-app.onrender.com`
   - `NEXT_PUBLIC_API_BASE_URL=https://your-app.onrender.com`
6. Deploy

**Step 3: Setup MongoDB Atlas**
1. Create free M0 cluster on [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Generate connection string: `mongodb+srv://...`
3. Add to server `.env` as `MONGODB_URI`

## 🐛 Troubleshooting

### Socket Connection Fails
- Check `NEXT_PUBLIC_SOCKET_SERVER` in Vercel env vars
- Verify Render server is running (`npm start`)
- Check CORS origin in server `.env` matches Vercel frontend URL

### Login/Refresh Token Not Working
- Ensure `JWT_SECRET` and `JWT_REFRESH_SECRET` are set in server `.env`
- Check cookies are being sent: `credentials: "include"` in fetch calls
- Verify Cookie `SameSite` setting for cross-domain (currently set to "lax", may need "none" if on different domains)

### Game State Lost on Server Restart
- Expected behavior: In-memory GameManager resets on deploy
- If persistence needed: Migrate game state to MongoDB (out of scope for MVP)

## 📚 Reference Documentation

- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables)
- [Render Deployment](https://render.com/docs)
- [Socket.IO Documentation](https://socket.io/docs/)
- [MongoDB Atlas Setup](https://www.mongodb.com/docs/atlas/getting-started/)

## 🎯 Next Steps (Optional Enhancements)

- [ ] Migrate game state to MongoDB for persistence across restarts
- [ ] Add metrics/logging (e.g., Datadog, LogRocket)
- [ ] Implement rate limiting on API endpoints
- [ ] Add email verification on registration
- [ ] Implement game replay/recording system
