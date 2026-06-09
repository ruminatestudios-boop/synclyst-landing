# Mobile signup funnel — environment setup

The `/chromeextension` page uses `POST /api/mobile-register` to:

1. Create a Clerk user (or find existing)
2. Send a Resend email with the Chrome Web Store install link
3. Optionally log the lead in Supabase `waitlist_signups`

## Required Vercel environment variables

| Variable | Description |
|---|---|
| `CLERK_SECRET_KEY` | Same secret key as `app.synclyst.app` |
| `RESEND_API_KEY` | From [resend.com](https://resend.com) |
| `RESEND_FROM_EMAIL` | e.g. `SyncLyst <hello@synclyst.app>` (domain must be verified in Resend) |

## Optional

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Logs signups to `waitlist_signups` with `platform: mobile_bridge` |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key |

## After adding env vars

Redeploy the landing project on Vercel (Production).

## Test

```bash
curl -X POST https://synclyst.app/api/mobile-register \
  -H "Content-Type: application/json" \
  -d '{"email":"you@yourdomain.com"}'
```

Expected: `{"success":true,"email":"..."}` and a welcome email in inbox.

## User flow

1. Mobile user enters email on `/chromeextension`
2. API creates Clerk account + sends email
3. User lands on `/chromeextension/welcome`
4. On desktop: install extension → sign in at app.synclyst.app → use Forgot password if first sign-in
