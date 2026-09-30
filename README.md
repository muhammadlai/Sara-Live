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

## TikTok LIVE realtime bridge

SARA now includes an optional `tiktok-live-connector` bridge for realtime LIVE comments, gifts, likes, joins and shares. It connects server-side to TikTok's Webcast stream using the broadcaster username. The connector is unofficial/reverse-engineered, so TikTok can change the protocol; it is not the same as TikTok's public official API. See the upstream project for its current support and limitations: https://github.com/zerodytrash/TikTok-Live-Connector

Set `TIKTOK_LIVE_USERNAME` or use the **Connect LIVE** button in the UI. Set `SARA_AUTO_REPLY_LIVE=true` only if you want comments forwarded into SARA's AI pipeline automatically. Automatic public chat replies require the connector's authenticated send-message setup and should be enabled separately.
