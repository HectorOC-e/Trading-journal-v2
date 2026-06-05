# Email Setup (Resend) — TASK-022

## Overview

The app uses [Resend](https://resend.com) for transactional emails:
- Password reset emails (via Supabase Auth)
- Weekly review summary notifications (future feature)

## Required Environment Variables

```bash
RESEND_API_KEY=re_...          # Your Resend API key
RESEND_FROM_DOMAIN=yourdomain.com
RESEND_FROM_ADDRESS=noreply@yourdomain.com
```

## DNS Configuration

To send emails from your own domain, add these DNS records to your domain registrar:

| Type | Name | Value |
|------|------|-------|
| TXT  | resend._domainkey | `p=MIGfMA0GCSqGSIb3DQEBAQ...` (get from Resend dashboard) |
| MX   | send (or bounce) | `feedback-smtp.us-east-1.amazonses.com` (see Resend dashboard) |
| TXT  | send (or bounce) | `v=spf1 include:amazonses.com ~all` |

**Steps:**
1. Create a free account at [resend.com](https://resend.com)
2. Go to **Domains** → **Add Domain**
3. Enter your domain and follow the DNS verification steps
4. Copy the verification records into your DNS registrar (Cloudflare, Route53, Namecheap, etc.)
5. Wait for verification (usually 15–60 minutes)
6. Copy your API key from **API Keys** → **Create API Key**
7. Add `RESEND_API_KEY` to your Vercel environment variables

## Local Testing

For local development, Resend provides a test mode:
- Emails sent to `@resend.dev` addresses are captured in your Resend dashboard
- No DNS required for test addresses

```bash
# Use this test address in .env.local for development:
RESEND_FROM_ADDRESS=onboarding@resend.dev
```

## Supabase Auth Integration

To use Resend for Supabase Auth emails (password reset, magic link):
1. In Supabase dashboard → **Authentication** → **Email Settings**
2. Set custom SMTP with:
   - Host: `smtp.resend.com`
   - Port: `465`
   - Username: `resend`
   - Password: `[your RESEND_API_KEY]`
   - Sender email: `[your RESEND_FROM_ADDRESS]`
