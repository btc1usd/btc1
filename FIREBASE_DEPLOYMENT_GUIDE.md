# Firebase Deployment Guide - Step by Step

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Project Configuration](#project-configuration)
4. [Environment Variables](#environment-variables)
5. [Build Process](#build-process)
6. [Deployment](#deployment)
7. [GitHub Actions Setup](#github-actions-setup)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software
1. **Node.js** (version 22 or higher)
   ```bash
   # Check your Node.js version
   node --version
   ```

2. **npm** (comes with Node.js)
   ```bash
   # Check npm version
   npm --version
   ```

3. **Firebase CLI**
   ```bash
   # Install Firebase CLI globally
   npm install -g firebase-tools

   # Verify installation
   firebase --version
   ```

4. **Git** (for version control)
   ```bash
   git --version
   ```

---

## Initial Setup

### Step 1: Create Firebase Project

1. **Go to Firebase Console**
   - Visit: https://console.firebase.google.com/
   - Click "Add project" or "Create a project"

2. **Configure Project**
   - Enter project name (e.g., "btc1usd")
   - Choose whether to enable Google Analytics (optional)
   - Click "Create project"

3. **Enable Required APIs**
   - In Firebase Console, go to **Settings** → **Project settings**
   - Note your Project ID (e.g., "btc1usd")

### Step 2: Login to Firebase CLI

```bash
# Login to Firebase (opens browser)
firebase login

# Verify you're logged in
firebase login:list
```

### Step 3: Initialize Firebase in Your Project

```bash
# Navigate to your project directory
cd D:\Personal-Projects\btc1

# Initialize Firebase
firebase init
```

**During initialization, select:**
- ✅ Hosting: Configure files for Firebase Hosting and (optionally) set up GitHub Action deploys
- When asked "What do you want to use as your public directory?", press Enter (Firebase will detect Next.js)
- When asked about GitHub integration, select "Yes" if you want automatic deployments

---

## Project Configuration

### Step 1: Create/Update `.gitignore`

Create or update `.gitignore` to exclude sensitive and build files:

```gitignore
# Dependencies
/node_modules
node_modules/

# Next.js
/.next/
/out/

# Production
/build

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pnpm-debug.log*
*.log

# Environment files (IMPORTANT!)
.env*
!.env.example

# Vercel
.vercel

# TypeScript
*.tsbuildinfo
next-env.d.ts

# Windows reserved filenames
nul
NUL
CON
PRN
AUX
COM[1-9]
LPT[1-9]

# Hardhat & Blockchain
cache/
artifacts/
coverage/
coverage.json
typechain-types/

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# Misc
.DS_Store

# Deployment platforms
.netlify
.firebase/

# RPC Cache
.rpc-provider-cache.json
```

### Step 2: Create `firebase.json`

Create `firebase.json` in your project root:

```json
{
  "hosting": {
    "source": ".",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**",
      "**/.git/**",
      "**/cache/**",
      "**/artifacts/**",
      "**/typechain-types/**"
    ],
    "frameworksBackend": {
      "region": "us-east1",
      "maxInstances": 10,
      "minInstances": 0,
      "concurrency": 80
    },
    "headers": [
      {
        "source": "**/*.@(jpg|jpeg|gif|png|svg|webp|ico)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "public, max-age=31536000, immutable"
          }
        ]
      },
      {
        "source": "**/*.@(js|css)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "public, max-age=31536000, immutable"
          }
        ]
      }
    ]
  }
}
```

**Configuration Explained:**
- `source: "."` - Use current directory
- `frameworksBackend.region` - Where Cloud Functions run (choose closest to users)
- `maxInstances: 10` - Maximum number of Cloud Function instances
- `minInstances: 0` - No always-on instances (cost-saving)
- `concurrency: 80` - Requests per instance
- `headers` - Cache static assets for 1 year

### Step 3: Create `.firebaserc`

Create `.firebaserc` to specify your Firebase project:

```json
{
  "projects": {
    "default": "btc1usd"
  }
}
```

Replace "btc1usd" with your actual Firebase project ID.

---

## Environment Variables

### Step 1: Create `.env.example` Template

Create `.env.example` (this will be committed to Git):

```bash
# BTC1USD Protocol Environment Variables
# Copy this file to .env.local and fill in your actual values

# WalletConnect Project ID
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id

# Admin wallet address
NEXT_PUBLIC_ADMIN_WALLET=0xYourAdminWalletAddress

# Network Configuration
NEXT_PUBLIC_CHAIN_ID=84532
NEXT_PUBLIC_CHAIN_NAME="Base Sepolia"

# RPC URLs (comma-separated for redundancy)
NEXT_PUBLIC_RPC_URL="https://sepolia.base.org"
RPC_URL="https://sepolia.base.org"

# Contract Addresses (update after deployment)
NEXT_PUBLIC_BTC1USD_CONTRACT="0xYourContractAddress"
NEXT_PUBLIC_VAULT_CONTRACT="0xYourContractAddress"
# ... add all your contract addresses

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your_anon_key"
SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"

# API Keys
ALCHEMY_API_KEY="your_alchemy_key"
NEXT_PUBLIC_ALCHEMY_API_KEY="your_alchemy_key"

# IMPORTANT: Never commit your private key!
DEPLOYER_PRIVATE_KEY="0xYourPrivateKey"
```

### Step 2: Create `.env.local` with Actual Values

```bash
# Copy the example file
cp .env.example .env.local

# Edit .env.local with your actual values
# This file is in .gitignore and will NOT be committed
```

**IMPORTANT:**
- `.env.local` contains your actual secrets
- NEVER commit `.env.local` to Git
- Firebase will use `.env.local` during build

---

## Build Process

### Step 1: Install Dependencies

```bash
# Install all project dependencies
npm install
```

### Step 2: Test Build Locally

```bash
# Run a production build
npm run build
```

**Expected Output:**
```
✓ Compiled successfully
✓ Generating static pages
Route (app)                                   Size     First Load JS
┌ ○ /                                         237 kB          481 kB
...
○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
```

### Step 3: Test Locally (Optional)

```bash
# Run the production build locally
npm start

# Or run development mode
npm run dev
```

Visit `http://localhost:3000` to test your app.

### Step 4: Fix Common Build Errors

**Error: TypeScript errors**
```bash
# If you see TypeScript errors, you can temporarily ignore them
# Update next.config.mjs:
```

```javascript
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // ... rest of config
};
```

**Error: Missing environment variables**
- Ensure `.env.local` exists with all required variables
- Check that variable names match exactly (case-sensitive)

**Error: Module not found**
```bash
# Delete node_modules and reinstall
rm -rf node_modules
npm install
```

---

## Deployment

### Method 1: Manual Deployment (Recommended First Time)

#### Step 1: Ensure You're Logged In

```bash
firebase login:list
```

If not logged in:
```bash
firebase login
```

#### Step 2: Deploy to Firebase

```bash
# Deploy everything (hosting + functions)
firebase deploy

# Or deploy with force flag (sets cleanup policy automatically)
firebase deploy --force
```

**Deployment Process:**
1. ⏳ Building Next.js app (2-3 minutes)
2. ⏳ Packaging Cloud Functions (1 minute)
3. ⏳ Uploading static files (1-2 minutes)
4. ⏳ Creating/Updating Cloud Functions (5-10 minutes)
5. ✅ Deployment complete!

**Expected Output:**
```
=== Deploying to 'btc1usd'...

i  deploying functions, hosting
✔  functions: source uploaded successfully
✔  hosting[btc1usd]: file upload complete
✔  functions[firebase-frameworks-btc1usd:ssrbtc1usd(us-east1)]: Successful update operation.
✔  hosting[btc1usd]: version finalized
✔  hosting[btc1usd]: release complete

✔  Deploy complete!

Project Console: https://console.firebase.google.com/project/btc1usd/overview
Hosting URL: https://btc1usd.web.app
```

#### Step 3: Verify Deployment

```bash
# Open your deployed site
firebase open hosting:site

# Or visit manually
# https://YOUR-PROJECT-ID.web.app
# https://YOUR-PROJECT-ID.firebaseapp.com
```

### Method 2: Deploy Specific Services

```bash
# Deploy only hosting
firebase deploy --only hosting

# Deploy only functions
firebase deploy --only functions

# Deploy specific function
firebase deploy --only functions:ssrbtc1usd
```

---

## GitHub Actions Setup

### Step 1: Create GitHub Workflows Directory

```bash
mkdir -p .github/workflows
```

### Step 2: Create Deployment Workflow for Main Branch

Create `.github/workflows/firebase-hosting-merge.yml`:

```yaml
name: Deploy to Firebase Hosting on merge
on:
  push:
    branches:
      - main
jobs:
  build_and_deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'

      - run: npm ci

      - run: npm run build

      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: ${{ secrets.GITHUB_TOKEN }}
          firebaseServiceAccount: ${{ secrets.FIREBASE_SERVICE_ACCOUNT_BTC1USD }}
          channelId: live
          projectId: btc1usd
```

### Step 3: Create Preview Deployment Workflow for PRs

Create `.github/workflows/firebase-hosting-pull-request.yml`:

```yaml
name: Deploy to Firebase Hosting on PR
on: pull_request
permissions:
  checks: write
  contents: read
  pull-requests: write
jobs:
  build_and_preview:
    if: ${{ github.event.pull_request.head.repo.full_name == github.repository }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'

      - run: npm ci

      - run: npm run build

      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: ${{ secrets.GITHUB_TOKEN }}
          firebaseServiceAccount: ${{ secrets.FIREBASE_SERVICE_ACCOUNT_BTC1USD }}
          projectId: btc1usd
```

### Step 4: Get Firebase Service Account Key

```bash
# Generate service account key
firebase login:ci
```

**Copy the token** that's displayed. You'll need it for GitHub secrets.

### Step 5: Add GitHub Secret

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `FIREBASE_SERVICE_ACCOUNT_BTC1USD`
5. Value: Paste the token from Step 4
6. Click **Add secret**

### Step 6: Test Automatic Deployment

```bash
# Commit and push changes
git add .
git commit -m "Set up Firebase deployment"
git push origin main
```

Go to **GitHub** → **Actions** to see the deployment in progress.

---

## Troubleshooting

### Issue: "Command not found: firebase"

**Solution:**
```bash
# Reinstall Firebase CLI
npm install -g firebase-tools

# On Windows, use firebase.cmd
firebase.cmd --version
```

### Issue: "Not logged in"

**Solution:**
```bash
firebase login
```

### Issue: "Build failed - TypeScript errors"

**Solution:**
Update `next.config.mjs`:
```javascript
typescript: {
  ignoreBuildErrors: true,
},
```

### Issue: "Functions deployment timeout"

**Solution:**
```bash
# Increase timeout
firebase deploy --only functions --force
```

### Issue: "Environment variables not found during build"

**Solution:**
- Ensure `.env.local` exists in project root
- Check that all required variables are defined
- Firebase automatically loads `.env.local` during build

### Issue: "BigInt serialization error"

**Solution:**
Convert BigInt to string before JSON serialization:
```javascript
// Instead of:
chainId: network.chainId

// Use:
chainId: network.chainId.toString()
```

### Issue: "Large package size (>300MB)"

**Solution:**
- Add unnecessary files to `.firebaseignore`
- Remove development dependencies from production build
- Use `.env` instead of committing large config files

### Issue: "Cleanup policy warning"

**Solution:**
```bash
# Deploy with --force flag
firebase deploy --force

# Or manually set cleanup policy
firebase functions:artifacts:setpolicy
```

### Issue: "GitHub Actions deployment failed"

**Check:**
1. GitHub secret is correctly named
2. Firebase service account has correct permissions
3. Check GitHub Actions logs for specific errors

**Solution:**
```bash
# Regenerate service account token
firebase login:ci

# Update GitHub secret with new token
```

---

## Quick Reference Commands

```bash
# Login
firebase login

# Initialize project
firebase init

# Deploy everything
firebase deploy

# Deploy with force
firebase deploy --force

# Deploy only hosting
firebase deploy --only hosting

# Deploy only functions
firebase deploy --only functions

# View logs
firebase functions:log

# Open Firebase console
firebase open

# Check deployment status
firebase deploy:status

# List all projects
firebase projects:list

# Switch project
firebase use <project-id>
```

---

## Deployment Checklist

Before deploying, ensure:

- [ ] `.env.local` exists with all required variables
- [ ] `.gitignore` excludes `.env.local`
- [ ] `firebase.json` is configured
- [ ] `.firebaserc` has correct project ID
- [ ] Build completes successfully (`npm run build`)
- [ ] Tests pass (if applicable)
- [ ] Firebase CLI is installed
- [ ] Logged into Firebase (`firebase login:list`)
- [ ] GitHub secrets configured (for automatic deployments)
- [ ] All sensitive data excluded from Git

---

## Cost Optimization Tips

1. **Set minInstances to 0** (no always-on instances)
2. **Use cleanup policy** for container images
3. **Enable caching** for static assets
4. **Monitor usage** in Firebase Console
5. **Set billing alerts** in Google Cloud Console
6. **Use appropriate region** (closest to users)

---

## Additional Resources

- **Firebase Documentation:** https://firebase.google.com/docs/hosting
- **Next.js Firebase Guide:** https://firebase.google.com/docs/hosting/frameworks/nextjs
- **GitHub Actions:** https://github.com/FirebaseExtended/action-hosting-deploy
- **Firebase CLI Reference:** https://firebase.google.com/docs/cli

---

## Support

If you encounter issues:

1. Check Firebase Console for errors
2. Review Cloud Function logs: `firebase functions:log`
3. Check GitHub Actions logs (if using automatic deployment)
4. Review this guide's troubleshooting section
5. Visit Firebase support: https://firebase.google.com/support

---

## Summary

**One-time Setup:**
1. Install Firebase CLI
2. Create Firebase project
3. Configure `firebase.json` and `.firebaserc`
4. Set up environment variables
5. Configure GitHub Actions (optional)

**Every Deployment:**
1. Update code
2. Test build: `npm run build`
3. Deploy: `firebase deploy`
4. Verify: Visit your hosting URL

**Automatic Deployments:**
1. Push to GitHub
2. GitHub Actions builds and deploys automatically
3. Verify deployment in GitHub Actions tab
