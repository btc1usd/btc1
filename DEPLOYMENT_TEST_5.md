# Deployment Test #5 - Service Account User Role

**Date:** 2025-11-04
**Status:** Need to grant Service Account User role

## Progress So Far
✅ Firebase service account JSON added to GitHub secrets
✅ Web frameworks experiment enabled
✅ Firebase Admin role granted to service account
✅ Cloud Billing API enabled
✅ Old Cloud Function deleted from us-central1
✅ Hosting files uploaded successfully

## Current Blocker
❌ **Service Account User role missing**

Error:
```
Caller is missing permission 'iam.serviceaccounts.actAs' on service account
1069275091327-compute@developer.gserviceaccount.com
```

## What Worked
- Authentication: ✅ Successful
- Build: ✅ Completed successfully
- Hosting upload: ✅ All 161 files uploaded
- Cloud Functions: ❌ Failed due to missing Service Account User role

## Fix Required
Grant **"Service Account User"** role to the Firebase service account.

See: **FIX_SERVICE_ACCOUNT_USER_ROLE.md** for detailed instructions.

## Next Steps
1. Go to: https://console.cloud.google.com/iam-admin/iam?project=btc1usd
2. Find your Firebase service account (firebase-adminsdk-xxxxx@btc1usd.iam.gserviceaccount.com)
3. Click Edit (pencil icon)
4. Add role: **"Service Account User"**
5. Save
6. Wait 1-2 minutes
7. Re-run workflow: https://github.com/btc1usd/btc1/actions

## Expected Result After Fix
- ✅ Authentication successful
- ✅ Build completes
- ✅ Hosting deploys
- ✅ Cloud Functions deploy successfully
- ✅ Site live at: https://btc1usd.web.app

---

## Roles Summary

Your service account needs these roles:
1. ✅ Firebase Admin (already granted)
2. ⏳ **Service Account User** (needs to be granted)

---

We're very close! This is the last permission needed for Cloud Functions deployment.
