# LumaMusic yt-dlp resolver

A small, separately deployable Python service for resolving audio from **explicitly enabled, authorised sources** using yt-dlp.

## Important scope

- This service is not a YouTube Music playback implementation.
- YouTube and YouTube Music hosts are explicitly blocked.
- It does not use cookies, account credentials, DRM removal, signature bypasses, or private APIs.
- Only HTTPS URLs on administrator-configured hosts are accepted.
- Configure hosts only when you have permission to resolve and play their media.
- The resolver returns metadata and permitted audio format URLs. It does not download, cache, re-host, or redistribute media.

## Run locally

Python 3.11+:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export RESOLVER_API_TOKEN="replace-with-a-long-random-secret"
export YTDLP_ALLOWED_HOSTS="media.example.org,cdn.example.org"
uvicorn app:app --host 0.0.0.0 --port 8787
```

Health check: `GET /health`

Resolve: `POST /resolve` with `Authorization: Bearer <token>` and JSON body:

```json
{"url":"https://media.example.org/path/to/authorised-audio"}
```

## Deployment requirements

Deploy behind HTTPS. Keep `RESOLVER_API_TOKEN` secret, restrict network access, set a narrow host allowlist, and keep yt-dlp updated. Do not expose this endpoint as an unrestricted public URL fetcher.

## LumaMusic client integration

The React Native app does not call this service automatically yet. A deployment URL and secret-management decision are required before wiring it into the player. Never ship a privileged resolver token in a public mobile binary; put authenticated access behind your own user-authenticated backend.
