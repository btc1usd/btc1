# Firebase Deployment - Quick Start Guide

## First-Time Setup (5 minutes)

### 1. Install Firebase CLI
```bash
npm install -g firebase-tools
```

### 2. Login to Firebase
```bash
firebase login
```

### 3. Verify Configuration Files Exist
- ✅ `firebase.json` (hosting configuration)
- ✅ `.firebaserc` (project ID)
- ✅ `.env.local` (environment variables)

---

## Deploy in 3 Commands

```bash
# 1. Test build locally
npm run build

# 2. Deploy to Firebase
firebase deploy --force

# 3. Open your live site
firebase open hosting:site
```

**Your site will be live at:** https://btc1usd.web.app

---

## Deployment Commands Reference

```bash
# Full deployment (recommended)
firebase deploy --force

# Deploy only hosting (faster, no functions)
firebase deploy --only hosting

# Deploy only functions
firebase deploy --only functions

# View deployment logs
firebase functions:log

# Check project info
firebase projects:list
```

---

## Automatic Deployment via GitHub

### One-Time Setup

1. **Get Firebase Service Account Token:**
   ```bash
   firebase login:ci
   ```

2. **Add to GitHub Secrets:**
   - Go to: Repository → Settings → Secrets → Actions
   - Name: `FIREBASE_SERVICE_ACCOUNT_BTC1USD`
   - Value: [paste token from step 1]

3. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Update deployment"
   git push origin main
   ```

**Done!** Every push to `main` will automatically deploy.

---

## Troubleshooting

### Build Fails
```bash
# Clear cache and rebuild
rm -rf .next node_modules
npm install
npm run build
```

### Deployment Timeout
```bash
# Deploy with increased timeout
firebase deploy --force --debug
```

### Environment Variables Missing
- Check `.env.local` exists
- Verify all required variables are set
- Firebase auto-loads `.env.local` during build

### "Command not found: firebase"
```bash
# On Windows, use:
firebase.cmd deploy --force
```

---

## Daily Workflow

1. Make changes to your code
2. Test locally: `npm run dev`
3. Build: `npm run build`
4. Deploy: `firebase deploy --force`
5. Done! ✅

---

## Quick Status Check

```bash
# Check if logged in
firebase login:list

# View current project
firebase use

# Check deployment history
firebase hosting:channel:list

# View function logs (last 10 entries)
firebase functions:log --limit 10
```

---

## Costs

**Firebase Free Tier Includes:**
- 10 GB hosting storage
- 360 MB/day transfer
- Cloud Functions: 125K invocations/month

**Typical Monthly Cost:** $0-$5 for small projects

**Monitor costs:** https://console.firebase.google.com/project/btc1usd/usage

---

## Support Links

- **Full Guide:** See `FIREBASE_DEPLOYMENT_GUIDE.md`
- **Firebase Console:** https://console.firebase.google.com/project/btc1usd
- **Docs:** https://firebase.google.com/docs/hosting
