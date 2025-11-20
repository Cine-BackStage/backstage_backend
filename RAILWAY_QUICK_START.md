# 🚂 Railway Quick Start - 10 Steps

## Before You Start:
1. Sign up at https://railway.app (use GitHub login)
2. Push this code to GitHub

---

## 🚀 Deployment Steps (30 minutes)

### 1️⃣ Generate Secret (Local Terminal)
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
**📝 Copy the output!**

---

### 2️⃣ Create Railway Project
1. Go to https://railway.app
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose **backstage_backend**

---

### 3️⃣ Add PostgreSQL
1. Click **"+ New"**
2. Select **"Database"** → **"PostgreSQL"**
3. Wait 30 seconds ✅

---

### 4️⃣ Configure Variables
Click your API service → **"Variables"** tab:

```bash
NODE_ENV=production
JWT_SECRET=[paste your generated secret]
JWT_EXPIRES_IN=8h
ALLOWED_ORIGINS=https://backstage-cine-frontend.railway.app
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
LOG_LEVEL=info
LOG_FORMAT=json
```

Click **"Add"** for each one!

---

### 5️⃣ Set Spending Limit ⚠️ IMPORTANT
1. Project Settings → **"Usage Limits"**
2. Set limit: **$20**
3. Enable **"Hard Limit"** ✅
4. Enable **"Email alerts"** ✅
5. Save

---

### 6️⃣ Wait for Deploy
- Go to **"Deployments"** tab
- Wait for ✅ green checkmark
- Takes 2-5 minutes

---

### 7️⃣ Generate Public URL
1. API Service → **"Settings"**
2. Scroll to **"Domains"**
3. Click **"Generate Domain"**
4. Copy URL (e.g., `your-app.up.railway.app`)

---

### 8️⃣ Test Health
Open in browser:
```
https://[your-url].up.railway.app/health
```

Expected:
```json
{"success":true,"status":"healthy"}
```

---

### 9️⃣ Test API Docs
```
https://[your-url].up.railway.app/api/docs
```

Should see Swagger UI! ✅

---

### 🔟 Login with Test Account
**System Admin:**
- Email: `admin@cinema-system.com`
- Password: `sysadmin123`

**⚠️ Change password in production!**

---

## ✅ Done!

Your backend is live! Next:
- [ ] Deploy frontend
- [ ] Change default passwords
- [ ] Add your real cinema company

---

## 🆘 Problems?

**Build failed?**
- Check Variables tab - all variables set?
- Check DATABASE_URL exists (auto-generated)

**Can't access URL?**
- Generated domain in Settings?
- Waited 2-3 minutes after deploy?

**Database error?**
- PostgreSQL service running?
- Check deployment logs

---

## 📊 Monitor Costs

**Project → Metrics tab:**
- See current spending
- Should be $0-5 first month (free tier)
- $8-13/month average

**Set up alerts:**
- Settings → Notifications
- Enable all deployment alerts

---

## 🔄 Update Production

Just push to GitHub:
```bash
git add .
git commit -m "Update"
git push
```

Railway auto-deploys! ✅

---

**Full Guide:** See `RAILWAY_DEPLOYMENT.md`
