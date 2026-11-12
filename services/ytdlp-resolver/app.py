import ipaddress
import os
import socket
from urllib.parse import urlparse

import yt_dlp
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, HttpUrl

app = FastAPI(title="LumaMusic yt-dlp resolver", version="0.1.0")

TOKEN = os.environ.get("RESOLVER_API_TOKEN", "")
ALLOWED_HOSTS = {
    host.strip().lower()
    for host in os.environ.get("YTDLP_ALLOWED_HOSTS", "").split(",")
    if host.strip()
}
BLOCKED_HOSTS = {"youtube.com", "www.youtube.com", "music.youtube.com", "youtu.be"}


class ResolveRequest(BaseModel):
    url: HttpUrl


def host_allowed(host: str) -> bool:
    host = host.lower().rstrip(".")
    if any(host == blocked or host.endswith("." + blocked) for blocked in BLOCKED_HOSTS):
        return False
    return any(host == allowed or host.endswith("." + allowed) for allowed in ALLOWED_HOSTS)


def validate_public_host(host: str) -> None:
    if not host_allowed(host):
        raise HTTPException(status_code=403, detail="This source host is not enabled on this resolver.")
    try:
        addresses = socket.getaddrinfo(host, None, type=socket.SOCK_STREAM)
    except socket.gaierror as exc:
        raise HTTPException(status_code=400, detail="Source host could not be resolved.") from exc
    for address in addresses:
        ip = ipaddress.ip_address(address[4][0])
        if not ip.is_global:
            raise HTTPException(status_code=400, detail="Private and local network hosts are not allowed.")


@app.get("/health")
def health():
    return {"ok": True, "configured": bool(TOKEN and ALLOWED_HOSTS)}


@app.post("/resolve")
def resolve(payload: ResolveRequest, authorization: str | None = Header(default=None)):
    if not TOKEN or authorization != f"Bearer {TOKEN}":
        raise HTTPException(status_code=401, detail="Invalid resolver credentials.")

    parsed = urlparse(str(payload.url))
    if parsed.scheme != "https" or not parsed.hostname:
        raise HTTPException(status_code=400, detail="Only HTTPS media URLs are accepted.")
    validate_public_host(parsed.hostname)

    options = {
        "quiet": True,
        "no_warnings": True,
        "noplaylist": True,
        "skip_download": True,
        "format": "bestaudio/best",
        "extract_flat": False,
        "cachedir": False,
    }
    try:
        with yt_dlp.YoutubeDL(options) as ydl:
            info = ydl.extract_info(str(payload.url), download=False)
    except Exception as exc:
        raise HTTPException(status_code=422, detail="The source could not be resolved.") from exc

    if not info or info.get("_type") == "playlist":
        raise HTTPException(status_code=422, detail="Playlists are not accepted by this endpoint.")

    formats = info.get("requested_formats") or info.get("formats") or [info]
    candidates = []
    for item in formats:
        media_url = item.get("url")
        if not media_url or item.get("vcodec") not in (None, "none"):
            continue
        media_host = urlparse(media_url).hostname
        if not media_host or not host_allowed(media_host):
            continue
        candidates.append({
            "url": media_url,
            "mimeType": item.get("mime_type") or item.get("ext") or "audio/*",
            "bitrate": int(item.get("abr") or item.get("tbr") or 0) * 1000,
            "filesize": item.get("filesize") or item.get("filesize_approx"),
        })

    if not candidates:
        raise HTTPException(status_code=422, detail="No permitted audio-only format was found.")

    candidates.sort(key=lambda item: item["bitrate"], reverse=True)
    return {
        "id": str(info.get("id") or ""),
        "title": str(info.get("title") or "Unknown title"),
        "artist": str(info.get("artist") or info.get("uploader") or "Unknown artist"),
        "durationSeconds": float(info.get("duration") or 0),
        "thumbnail": info.get("thumbnail"),
        "formats": candidates,
    }
