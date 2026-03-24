# Chidipothu Hub v2 — Property Management System

## Features
- **OTP 2FA Login** — 6-digit OTP sent to your Gmail, valid 10 minutes
- **JWT Security** — Tokens expire in 12 hours, auto-logout on expiry
- **Photo Gallery** — Lightbox with zoom, swipe, thumbnails, download
- **PWA** — Install on mobile like a native app, works offline
- **Cloudinary** — All photos/PDFs stored in cloud (not database)
- **MongoDB Atlas** — Free cloud database, no server needed
- **Vercel + Railway** — Best performance, accessible from anywhere

---

## Step 1 — MongoDB Atlas (Free Database)

1. Go to https://mongodb.com/atlas and sign up free
2. Create a **free M0 cluster**
3. Under **Database Access** → Add user (username + password)
4. Under **Network Access** → Add IP Address → Allow from anywhere (0.0.0.0/0)
5. Click **Connect** → **Connect your application** → Copy the connection string
6. Replace `<password>` with your user password in the string

---

## Step 2 — Cloudinary (Free File Storage)

1. Go to https://cloudinary.com and sign up free
2. From Dashboard, copy:
   - **Cloud Name**
   - **API Key**
   - **API Secret**

---

## Step 3 — Gmail App Password (for OTP)

1. Go to your Google Account → **Security**
2. Enable **2-Step Verification** if not done
3. Search for **App Passwords**
4. Create one for "Mail" → Copy the 16-character password
5. This is your `GMAIL_APP_PASSWORD` (NOT your real Gmail password)

---

## Step 4 — Deploy Backend on Railway

1. Go to https://railway.app and sign in with GitHub
2. Click **New Project** → **Deploy from GitHub repo**
3. Select your repo (push the `backend/` folder to GitHub first)
4. Railway auto-detects Python and uses `railway.toml`
5. Go to **Variables** tab and add all these:

```
MONGO_URL=mongodb+srv://...
DB_NAME=chidipothu_hub
JWT_SECRET=any_long_random_string_here
GMAIL_USER=S10719346@gmail.com
GMAIL_APP_PASSWORD=your_16_char_app_password
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

6. Click **Deploy** → Wait for green status
7. Copy your Railway URL (looks like: `https://your-app.up.railway.app`)

---

## Step 5 — Deploy Frontend on Vercel

1. Go to https://vercel.com and sign in with GitHub
2. Push the `frontend/` folder to GitHub
3. Click **New Project** → Import your repo
4. Set **Root Directory** to `frontend`
5. Under **Environment Variables** add:

```
REACT_APP_BACKEND_URL=https://your-app.up.railway.app
```

6. Click **Deploy** → Wait for green
7. Your app is live at `https://your-project.vercel.app`

---

## Step 6 — Install as Mobile App (PWA)

### Android (Chrome):
1. Open your Vercel URL in Chrome
2. Tap the **3-dot menu** → **Add to Home screen**
3. Tap **Add** → App appears on home screen!

### iPhone (Safari):
1. Open your Vercel URL in Safari
2. Tap the **Share button** (box with arrow)
3. Tap **Add to Home Screen** → **Add**

---

## Local Development

### Backend:
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Fill in .env values
uvicorn server:app --reload --port 8001
```

### Frontend:
```bash
cd frontend
npm install
cp .env.example .env
# Set REACT_APP_BACKEND_URL=http://localhost:8001
npm start
```

---

## Project Structure

```
chidipothu-hub/
├── backend/
│   ├── server.py          # FastAPI app (auth, properties, upload)
│   ├── requirements.txt
│   ├── railway.toml       # Railway deploy config
│   └── .env.example       # Copy to .env with your values
│
├── frontend/
│   ├── public/
│   │   ├── index.html
│   │   ├── manifest.json  # PWA config
│   │   └── service-worker.js
│   ├── src/
│   │   ├── components/
│   │   │   ├── Login.jsx  # OTP 2FA login
│   │   │   ├── Layout.jsx # Sidebar + mobile header
│   │   │   └── Gallery.jsx # Photo lightbox
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Properties.jsx
│   │   │   └── PropertyForm.jsx (Add + Edit)
│   │   ├── api.js         # Axios with JWT interceptor
│   │   ├── App.js
│   │   └── index.js
│   ├── package.json
│   ├── vercel.json
│   └── .env.example
│
└── README.md
```

---

## Security Notes

- Password is now replaced with **email OTP** — much more secure
- JWT tokens expire in 12 hours — auto logout after that
- OTPs expire in 10 minutes and can only be used once
- Only `S10719346@gmail.com` is authorized to login
- All file uploads go to Cloudinary — not stored in MongoDB

---

## Free Tier Limits (No Cost)

| Service | Free Limit |
|---------|------------|
| MongoDB Atlas | 512 MB storage |
| Cloudinary | 25 GB storage, 25 GB bandwidth/month |
| Railway | $5 free credit/month (~500 hours) |
| Vercel | Unlimited for personal projects |
