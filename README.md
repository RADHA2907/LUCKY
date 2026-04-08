# 🎌 Anime_Rift

**Your Ultimate Anime Universe** — A premium anime information website powered by the Jikan API v4.

![Anime_Rift Preview](assets/logo.png)

---

## 🚀 How to Run (No Server Needed!)

### Option 1: Direct Browser (Simplest)
1. Open **File Explorer** and navigate to the `Anime_Rift` folder.
2. Double-click `index.html` — it will open in your default browser.
3. **That's it!** The website loads live data from the Jikan API automatically.

> ⚠️ **Note:** Some browsers block API requests from `file://` URLs. If data doesn't load, use Option 2.

### Option 2: Local Dev Server (Recommended)
Using **VS Code**:
```
1. Install the "Live Server" extension in VS Code
2. Right-click index.html → "Open with Live Server"
3. Site runs at http://localhost:5500
```

Using **Node.js** (`http-server`):
```bash
# Install http-server globally (one-time)
npm install -g http-server

# Navigate to the project folder
cd C:\Anime_Rift

# Start the server
http-server -p 8080

# Open in browser
http://localhost:8080
```

Using **Python**:
```bash
cd C:\Anime_Rift
python -m http.server 8080
# Open: http://localhost:8080
```

---

## ✨ Features

| Feature | Status |
|---|---|
| 🏠 Homepage with trending anime | ✅ |
| 🔍 Live search with suggestions | ✅ |
| 📄 Detailed anime page | ✅ |
| 🎬 Embedded trailer (YouTube) | ✅ |
| 👥 Character showcase | ✅ |
| ⭐ Ratings (MAL score, rank) | ✅ |
| ❤️ Bookmark / Favorites | ✅ (LocalStorage) |
| 🌙 Dark / Light mode toggle | ✅ (Persisted) |
| 🏆 Top Rated section | ✅ |
| 📅 Recently Released section | ✅ |
| 🏷️ Genre filter + sort | ✅ |
| 📄 Pagination | ✅ |
| ⚡ Loading skeletons | ✅ |
| 🛡️ Error handling | ✅ |
| 📱 Fully responsive | ✅ |
| 🔥 Firebase Auth (login/signup) | ✅ (needs config) |

---

## 🔥 Firebase Authentication Setup

Firebase login requires a free project setup:

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click **"Add project"** → name it `anime-rift`
3. Go to **Authentication → Sign-in methods** and enable:
   - ✅ Email/Password
   - ✅ Google
4. Go to **Project Settings → General → Your apps** → click `</>`  (Web)
5. Register your app, copy the **config object**
6. Open `firebase-config.js` and replace the placeholder config:

```js
const firebaseConfig = {
  apiKey: "YOUR_ACTUAL_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

> The site works **fully without Firebase** — auth features are gracefully disabled.

---

## 🌐 Data Source

- **API**: [Jikan API v4](https://jikan.moe) — Free, no auth required
- **Data from**: [MyAnimeList](https://myanimelist.net)
- **Rate limit**: 3 requests/second (auto-handled with retry logic)

---

## 📁 Project Structure

```
Anime_Rift/
├── index.html          ← Homepage
├── detail.html         ← Anime detail page
├── style.css           ← Global styles (dark theme, glassmorphism)
├── script.js           ← Homepage logic (search, hero, cards, filters)
├── detail.js           ← Detail page logic (info, characters, trailer)
├── auth.js             ← Firebase auth module
├── firebase-config.js  ← Firebase configuration (edit this!)
├── assets/
│   └── logo.png        ← Anime_Rift logo
└── README.md           ← This file
```

---

## 🌍 Deployment

### Vercel (Free, Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy from project folder
cd C:\Anime_Rift
vercel

# Follow prompts → your site is live at: https://your-project.vercel.app
```

### Netlify
1. Drag & drop the `Anime_Rift` folder onto [netlify.com/drop](https://app.netlify.com/drop)
2. Site is instantly live!

### GitHub Pages
```bash
git init
git add .
git commit -m "Initial commit: Anime_Rift"
git push -u origin main

# In GitHub repo → Settings → Pages → Deploy from main branch
```

---

## 🛠️ Node.js Backend (Optional Express Proxy)

If you need a backend (e.g., for caching or CORS), here's the minimal setup:

```bash
mkdir anime-rift-server && cd anime-rift-server
npm init -y
npm install express node-fetch cors
```

**server.js**:
```js
const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.static('../Anime_Rift'));

app.get('/api/*', async (req, res) => {
  const url = `https://api.jikan.moe/v4${req.path.replace('/api', '')}${req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''}`;
  const data = await fetch(url).then(r => r.json());
  res.json(data);
});

app.listen(3000, () => console.log('Server running at http://localhost:3000'));
```

```bash
node server.js
```

---

## 📝 License

This project is for educational purposes. Anime data © MyAnimeList via Jikan API.
