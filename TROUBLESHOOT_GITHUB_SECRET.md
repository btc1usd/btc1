# Troubleshooting GitHub Actions Authentication

## Problem: Token Not Working

The `firebase login:ci` token approach sometimes fails in GitHub Actions. Let's use a **Service Account JSON key** instead - it's more reliable.

---

## ✅ Solution: Use Service Account JSON Key

### Step 1: Generate Service Account Key

**Option A: Using Firebase Console (Recommended)**

1. **Go to Firebase Console:**
   https://console.firebase.google.com/project/btc1usd/settings/serviceaccounts/adminsdk

2. **Click "Generate new private key"**

3. **Click "Generate key"** in the confirmation dialog

4. **A JSON file will download** (keep it safe!)

5. **Open the JSON file** in a text editor

6. **Copy the ENTIRE JSON content** (all of it, from `{` to `}`)

**The JSON should look like this:**
```json
{
  "type": "service_account",
  "project_id": "btc1usd",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@btc1usd.iam.gserviceaccount.com",
  "client_id": "123456789...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/..."
}
```

**Option B: Using Firebase CLI**

```bash
# This will open browser to download the key
firebase init hosting:github
```

---

### Step 2: Add JSON Key to GitHub Secrets

1. **Go to GitHub Secrets:**
   https://github.com/btc1usd/btc1/settings/secrets/actions

2. **Look for existing secret** named `FIREBASE_SERVICE_ACCOUNT_BTC1USD`
   - If it exists, click **"Update"**
   - If not, click **"New repository secret"**

3. **Enter the details:**

   **Name (EXACTLY as shown):**
   ```
   FIREBASE_SERVICE_ACCOUNT_BTC1USD
   ```

   **Secret:**
   - Paste the ENTIRE JSON content (everything from `{` to `}`)
   - Make sure there are NO extra spaces before or after
   - The JSON should be properly formatted

4. **Click "Add secret" or "Update secret"**

---

### Step 3: Verify Secret Name

**⚠️ CRITICAL: The secret name must be EXACTLY:**
```
FIREBASE_SERVICE_ACCOUNT_BTC1USD
```

**Common mistakes:**
- ❌ `firebase_service_account_btc1usd` (lowercase)
- ❌ `FIREBASE_SERVICE_ACCOUNT` (missing project name)
- ❌ `FIREBASE_SERVICE_ACCOUNT_BTC1` (missing "USD")
- ✅ `FIREBASE_SERVICE_ACCOUNT_BTC1USD` (correct!)

---

### Step 4: Re-run the Workflow

1. **Go to Actions:**
   https://github.com/btc1usd/btc1/actions

2. **Click the failed workflow**

3. **Click "Re-run all jobs"**

4. **Wait 5-10 minutes**

---

## 🔍 Check Current Secret

To verify your secret exists:

1. Go to: https://github.com/btc1usd/btc1/settings/secrets/actions

2. Look for: `FIREBASE_SERVICE_ACCOUNT_BTC1USD`

3. You should see it listed (but can't see the value)

---

## 🐛 Common Issues & Fixes

### Issue 1: "JSON parse error" or "Unexpected character"

**Cause:** Extra spaces, line breaks, or formatting issues in the JSON

**Fix:**
1. Open the downloaded JSON file
2. Copy ALL content (Ctrl+A, Ctrl+C)
3. Delete the existing secret in GitHub
4. Add a new secret with the copied content
5. Make sure no extra spaces or characters

### Issue 2: "Invalid credentials"

**Cause:** Service account doesn't have correct permissions

**Fix:**
1. Go to: https://console.cloud.google.com/iam-admin/iam?project=btc1usd
2. Find the service account email: `firebase-adminsdk-xxxxx@btc1usd.iam.gserviceaccount.com`
3. Ensure it has these roles:
   - Firebase Admin
   - Cloud Functions Developer
   - Service Account User

### Issue 3: "Secret not found"

**Cause:** Secret name doesn't match what workflow expects

**Fix:**
1. Check workflow file expects: `FIREBASE_SERVICE_ACCOUNT_BTC1USD`
2. Check GitHub secret is named: `FIREBASE_SERVICE_ACCOUNT_BTC1USD`
3. They MUST match exactly (case-sensitive)

### Issue 4: "Token not working"

**Cause:** Using `firebase login:ci` token instead of service account JSON

**Fix:**
- Don't use the token from `firebase login:ci`
- Use the JSON file from Firebase Console instead
- Follow Step 1 above to get the JSON key

---

## 📋 Checklist

Before re-running the workflow, verify:

- [ ] Downloaded service account JSON from Firebase Console
- [ ] Copied ENTIRE JSON content (from `{` to `}`)
- [ ] Secret name is EXACTLY: `FIREBASE_SERVICE_ACCOUNT_BTC1USD`
- [ ] No extra spaces before/after the JSON
- [ ] Secret is added to correct repository: btc1usd/btc1
- [ ] Ready to re-run workflow

---

## 🎯 Quick Access Links

**Get Service Account Key:**
https://console.firebase.google.com/project/btc1usd/settings/serviceaccounts/adminsdk

**Add/Update GitHub Secret:**
https://github.com/btc1usd/btc1/settings/secrets/actions

**Monitor Workflow:**
https://github.com/btc1usd/btc1/actions

**Firebase IAM Permissions:**
https://console.cloud.google.com/iam-admin/iam?project=btc1usd

---

## 🆘 Still Not Working?

If it still fails after following these steps:

1. **Check the error message** in GitHub Actions
2. **Screenshot the error**
3. **Verify the secret exists** in GitHub settings
4. **Try deleting and re-adding** the secret
5. **Make sure you have admin access** to the repository

---

## ✨ What Success Looks Like

When it works, you'll see in GitHub Actions:

```
✅ Checkout code
✅ Setup Node.js
✅ Install dependencies
✅ Build Next.js app
✅ Deploy to Firebase Hosting
✅ Live at https://btc1usd.web.app
```

Deployment takes 5-10 minutes for first time, then 2-5 minutes after.
