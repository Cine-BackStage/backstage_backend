# 🚂 Railway.app Deployment Guide - Backstage Cine Backend

## 📋 Prerequisites
- GitHub account
- Railway.app account (sign up with GitHub at https://railway.app)
- Backend code pushed to GitHub

---

## 🎯 DEPLOYMENT CHECKLIST

### ✅ Phase 1: Prepare Your Repository (COMPLETED ✓)
- [x] railway.json configuration file
- [x] .env.railway template
- [x] Production start script in package.json
- [x] Multi-tenant seed script ready

### 📝 Phase 2: Generate Secrets (DO THIS FIRST!)

Before starting deployment, generate strong secrets locally:

```bash
# 1. Generate JWT Secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# Copy this output - you'll need it!

# 2. Note down the output - Example:
# a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6...
```

**SAVE THESE VALUES** - You'll enter them in Railway Dashboard!

---

## 🚀 PHASE 3: Railway Setup (Follow These Steps IN ORDER)

### Step 1: Create Railway Account
1. Go to https://railway.app
2. Click "Login with GitHub"
3. Authorize Railway to access your GitHub account
4. ✅ You're now logged in!

### Step 2: Create New Project
1. Click **"New Project"** button (top right)
2. Select **"Deploy from GitHub repo"**
3. If first time: Click **"Configure GitHub App"**
   - Select your GitHub organization: **Cine-BackStage**
   - Choose repositories: **Select backstage_backend**
   - Click "Install & Authorize"
4. Back in Railway, select **backstage_backend** repository
5. ✅ Project created!

### Step 3: Add PostgreSQL Database
1. In your new project, click **"+ New"** button
2. Select **"Database"**
3. Choose **"Add PostgreSQL"**
4. Wait 30 seconds for database to provision
5. ✅ Database ready! Railway automatically creates `DATABASE_URL` variable

### Step 4: Configure Environment Variables

Click on your **API service** (the one from GitHub repo), then:

1. Go to **"Variables"** tab
2. Click **"+ New Variable"** and add each one below:

```bash
# Railway auto-generates these (DO NOT ADD):
# - DATABASE_URL (from PostgreSQL service)
# - PORT (Railway auto-assigns)

# YOU MUST ADD THESE MANUALLY:

NODE_ENV=production

# Paste your generated JWT secret here:
JWT_SECRET=YOUR_GENERATED_SECRET_FROM_STEP_2
JWT_EXPIRES_IN=8h

# Update with your actual frontend URL after deploying frontend:
ALLOWED_ORIGINS=https://backstage-cine-frontend.railway.app,https://backstagecine.com

# Rate limiting:
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging:
LOG_LEVEL=info
LOG_FORMAT=json
```

**IMPORTANT:** After adding variables, Railway will auto-redeploy!

### Step 5: Set Spending Limit (CRITICAL!)

1. Click your **Project name** at top
2. Go to **"Settings"** tab
3. Scroll to **"Usage Limits"**
4. Click **"Set Usage Limit"**
5. Enter **$20.00** (or your preferred limit)
6. Enable **"Hard Limit"** - This stops services when limit is reached
7. Enable **"Email alerts at 80% usage"**
8. Click **"Save"**
9. ✅ Protected from overcharges!

---

## 📊 PHASE 4: Monitor Deployment

### Watch Build Logs
1. Click on your **API service**
2. Go to **"Deployments"** tab
3. Click the latest deployment
4. Watch the logs - you should see:
   ```
   Building...
   ✓ Dependencies installed
   ✓ Prisma generated
   Running migrations...
   ✓ Database migrated
   Starting server...
   ✓ Server running on port 3000
   ```

### Check Database Connection
1. Go to **"Deployments"** tab
2. Look for: `✅ Connected to database via Prisma`
3. ✅ If you see this, database is connected!

---

## 🗄️ PHASE 5: Seed Production Database

### Option A: Automatic Seed (Recommended)

The seed runs automatically on first deployment if migrations succeed.

**To verify:**
1. Check deployment logs for: `🌱 Seeding database...`
2. Look for: `✅ Seeded 3 companies with data`

### Option B: Manual Seed (If needed)

If automatic seed didn't run:

1. Go to your PostgreSQL service in Railway
2. Click **"Data"** tab - you'll see tables
3. Go back to your API service
4. Click **"Settings"** tab
5. Scroll to **"Service"** section
6. Click **"Generate Domain"** - this creates a public URL
7. Copy the URL (e.g., `backstage-cine-api.up.railway.app`)

Now run seed via API:
```bash
# From your local machine:
curl -X POST https://backstage-cine-api.up.railway.app/api/admin/seed \
  -H "Content-Type: application/json"
```

**OR** run seed via Railway CLI:

```bash
# Install Railway CLI locally:
npm install -g @railway/cli

# Login:
railway login

# Link to your project:
railway link

# Run seed command:
railway run npm run seed:multitenant
```

---

## 🔍 PHASE 6: Verify Deployment

### 1. Check API Health
Open in browser:
```
https://[your-service-name].up.railway.app/health
```

Expected response:
```json
{
  "success": true,
  "status": "healthy",
  "database": {
    "status": "connected"
  }
}
```

### 2. Check API Documentation
Open:
```
https://[your-service-name].up.railway.app/api/docs
```

You should see Swagger UI with all API endpoints!

### 3. Test Authentication
Get a test token:
```bash
# Create admin for your test company
curl -X POST https://[your-service].up.railway.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "company": {
      "name": "My Cinema",
      "cnpj": "12345678000190"
    },
    "admin": {
      "cpf": "12345678901",
      "fullName": "Admin User",
      "email": "admin@mycinema.com",
      "password": "SecurePass123!"
    }
  }'
```

---

## 🔐 PHASE 7: Access Database via pgAdmin (Optional)

Railway doesn't include pgAdmin, but you can access the database locally:

### Method 1: Railway CLI (Easiest)
```bash
# Install Railway CLI:
npm install -g @railway/cli

# Login and link project:
railway login
railway link

# Connect to PostgreSQL:
railway connect postgres

# You're now in psql shell!
# Try: \dt to list tables
```

### Method 2: Local pgAdmin
1. In Railway, go to PostgreSQL service
2. Click **"Connect"** tab
3. Copy connection details:
   - Host: `containers-us-west-XXX.railway.app`
   - Port: `XXXX`
   - Database: `railway`
   - User: `postgres`
   - Password: `[shown in Variables tab]`

4. Open pgAdmin locally
5. Right-click **"Servers"** → **"Create"** → **"Server"**
6. **General Tab:**
   - Name: `Railway - Backstage Cine`
7. **Connection Tab:**
   - Paste the values from Railway
8. Click **"Save"**
9. ✅ Connected!

### Method 3: Railway Database GUI
1. Go to PostgreSQL service in Railway
2. Click **"Data"** tab
3. Browse tables, run queries directly in browser!

---

## 📈 PHASE 8: Monitor Your App

### View Logs
1. API Service → **"Deployments"** tab
2. Click latest deployment
3. See real-time logs

### Check Resource Usage
1. Project → **"Metrics"** tab
2. See:
   - CPU usage
   - Memory usage
   - Network traffic
   - **Current spending** 💰

### Set Up Alerts
1. Project → **"Settings"**
2. **"Notifications"**
3. Enable:
   - Deployment failures
   - Usage alerts (80% of limit)
   - Service downtime

---

## 🔄 PHASE 9: Update Production (CI/CD)

Railway auto-deploys when you push to GitHub!

**Workflow:**
```bash
# Make changes locally
git add .
git commit -m "Update feature"
git push origin main

# Railway automatically:
# 1. Detects push
# 2. Builds new image
# 3. Runs migrations
# 4. Deploys new version
# 5. Zero-downtime rollout!
```

**To rollback if needed:**
1. Go to **"Deployments"** tab
2. Find previous working deployment
3. Click **"⋯"** menu
4. Select **"Redeploy"**

---

## 🎬 PHASE 10: Production Data

### Current Seed Data Includes:
- ✅ **3 Demo Companies** (CineMax, MovieTime, Premium Screens)
- ✅ **System Admin** (sysadmin@cinema-system.com / sysadmin123)
- ✅ **Admin users** for each company
- ✅ **Sample movies** (3 per company)
- ✅ **Sample rooms** with seat maps
- ✅ **Sample inventory** items
- ✅ **Discount codes**

**Default Credentials:**
```
System Admin:
- Email: admin@cinema-system.com
- Password: sysadmin123

Company Admins:
- admin-cinemax@cinemax.com / adminpass123
- admin-movietime@movietime.com / adminpass123
- admin-premium@premiumscreens.com / adminpass123
```

⚠️ **CHANGE THESE PASSWORDS IN PRODUCTION!**

### Add Your Own Company:
Use the API to register your real cinema company:
```bash
POST /api/auth/register
{
  "company": {
    "name": "Your Cinema Name",
    "cnpj": "YOUR_CNPJ"
  },
  "admin": {
    "cpf": "YOUR_CPF",
    "fullName": "Your Name",
    "email": "you@yourcinema.com",
    "password": "YourSecurePassword"
  }
}
```

---

## 💰 Cost Tracking

### Expected Monthly Costs:
```
Railway Starter Plan:      $5/month
Usage (estimated):         $3-8/month
─────────────────────────────────
Total:                     $8-13/month

With $20 limit = safe buffer!
```

### What Uses Resources:
- **Database storage**: ~$0.25/GB
- **API compute**: ~$0.000463/minute active
- **Network egress**: First 100GB free

### How to Stay Under Budget:
1. ✅ Set $20 hard limit (done in Step 5)
2. Monitor usage weekly
3. Optimize slow queries
4. Use caching for repeated data
5. Scale down if needed (Settings → Resources)

---

## 🐛 Troubleshooting

### Build Failed
**Check:**
1. Deployments → Logs
2. Look for error message
3. Common issues:
   - Missing environment variables
   - Database connection failed
   - Prisma migration error

**Fix:**
- Verify all env variables are set
- Check DATABASE_URL is connected
- Ensure migrations are valid

### App Crashes After Deploy
**Check:**
1. Logs for error stack trace
2. Database connection status

**Fix:**
- Restart deployment
- Check if database is running
- Verify JWT_SECRET is set

### "Service Unavailable"
- Wait 2-3 minutes (initial deployment)
- Check if deployment succeeded
- Verify service has generated domain

### Database Connection Timeout
- PostgreSQL service must be running
- Check DATABASE_URL variable exists
- Restart both services

---

## 🎉 SUCCESS CRITERIA

You'll know deployment succeeded when:

✅ Deployment shows "Success" status
✅ Health endpoint returns `{"status": "healthy"}`
✅ API docs are accessible
✅ Can login with test credentials
✅ Database contains seeded companies
✅ No errors in deployment logs

---

## 📞 Support

**Railway Documentation:** https://docs.railway.app
**Railway Discord:** https://discord.gg/railway
**Railway Status:** https://status.railway.app

**Your Backend URLs:**
- API: `https://[your-service].up.railway.app`
- Health: `https://[your-service].up.railway.app/health`
- Docs: `https://[your-service].up.railway.app/api/docs`

---

## 🚀 Ready to Deploy?

1. ✅ Read this guide
2. ✅ Generate secrets (Phase 2)
3. ✅ Follow steps 1-10 in order
4. ✅ Test everything works
5. ✅ Celebrate! 🎉

**Estimated total time:** 30-45 minutes for first deployment

---

**Next Step:** Deploy frontend to Railway and connect it to this backend!
