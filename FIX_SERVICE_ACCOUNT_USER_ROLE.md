# Fix Service Account User Role

## Current Error

```
Caller is missing permission 'iam.serviceaccounts.actAs' on service account
1069275091327-compute@developer.gserviceaccount.com
```

## What This Means

Your Firebase service account needs permission to "act as" the default compute service account to create Cloud Functions (2nd Gen).

---

## Quick Fix - Grant Service Account User Role

### Option 1: Using Google Cloud IAM Page (Easiest)

**Step 1: Open Google Cloud IAM**

👉 **https://console.cloud.google.com/iam-admin/iam?project=btc1usd**

**Step 2: Find Your Firebase Service Account**

Look for the email ending with:
```
@btc1usd.iam.gserviceaccount.com
```

It will be something like:
```
firebase-adminsdk-xxxxx@btc1usd.iam.gserviceaccount.com
```

**Step 3: Edit the Service Account**

1. Click the pencil icon ✏️ (Edit) next to your service account
2. Click **"+ ADD ANOTHER ROLE"**
3. In the "Select a role" dropdown, type: **Service Account User**
4. Select: **"Service Account User"** (roles/iam.serviceAccountUser)
5. Click **"SAVE"**

---

### Option 2: Using gcloud Command (Alternative)

If you have gcloud CLI installed, run this command:

```bash
gcloud iam service-accounts add-iam-policy-binding \
  1069275091327-compute@developer.gserviceaccount.com \
  --member="serviceAccount:firebase-adminsdk-xxxxx@btc1usd.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser" \
  --project=btc1usd
```

**Replace** `firebase-adminsdk-xxxxx@btc1usd.iam.gserviceaccount.com` with your actual service account email.

---

## What This Role Does

The **Service Account User** role allows your Firebase service account to:
- Create and manage Cloud Functions that run as the default compute service account
- Deploy Cloud Functions (2nd Gen) which require this permission
- Manage serverless backends for your Firebase Hosting

---

## After Granting the Role

### Wait 1-2 Minutes

Permissions can take 1-2 minutes to propagate.

### Then Re-run the Workflow

1. Go to: **https://github.com/btc1usd/btc1/actions**
2. Click the failed workflow
3. Click **"Re-run all jobs"**
4. Wait ~10 minutes for deployment

---

## Expected Result After Fix

```
✅ Authentication successful
✅ All permissions verified
✅ Building Next.js app
✅ Hosting files uploaded
✅ Cloud Functions created successfully
✅ Site live at https://btc1usd.web.app
```

---

## Summary of All Roles Your Service Account Needs

After this fix, your service account should have these roles:

1. ✅ **Firebase Admin** (already granted)
2. **Service Account User** (this fix) ← NEW

---

## Quick Reference

| Task | Link |
|------|------|
| **Grant Role** | https://console.cloud.google.com/iam-admin/iam?project=btc1usd |
| **Re-run Workflow** | https://github.com/btc1usd/btc1/actions |
| **Firebase Console** | https://console.firebase.google.com/project/btc1usd |

---

## Troubleshooting

### Can't Find Service Account?

1. Go to: **https://console.firebase.google.com/project/btc1usd/settings/serviceaccounts/adminsdk**
2. You'll see your service account email listed there
3. Click **"Manage service account permissions in Google Cloud Console"**
4. This takes you directly to the IAM page

### Still Getting Errors?

Make sure you're editing the **Firebase Admin SDK** service account (ends with @btc1usd.iam.gserviceaccount.com), not your personal account or other service accounts.

---

## What Changed From Last Time?

**Last Issue:** Firebase Admin role was missing
**This Issue:** Service Account User role is missing

Both roles are needed for complete Firebase + Cloud Functions deployment.
