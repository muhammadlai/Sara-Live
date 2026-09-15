# SARA AI LIVE — standalone TikTok-connected AI host

A separate project from AitzazAI. It provides an AI virtual-host interface and a secure server-side TikTok OAuth 2.0 connection scaffold.

## What is real
- TikTok Login Kit OAuth flow is implemented against TikTok's web authorization endpoint.
- Authorization state is validated server-side.
- TikTok access/refresh tokens are kept server-side in the session layer and are never sent to the browser.
- The UI clearly labels SARA as an AI virtual host.

## What still requires TikTok approval/access
TikTok's public developer products do not automatically grant arbitrary third-party apps the ability to start/control every LIVE, read every LIVE event, or automate LIVE battles/gifts. Those capabilities must be provided/approved by TikTok where available. This app does not use private or undocumented APIs.

## Run
1. `npm install`
2. Copy `.env.example` to `.env` and add your TikTok developer credentials.
3. Register the exact HTTPS redirect URI in TikTok Login Kit for production.
4. `npm start`

Never commit `.env` or expose `TIKTOK_CLIENT_SECRET` to the browser.
