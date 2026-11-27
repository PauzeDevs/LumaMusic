# LumaMusic Extension API (v1)

This document defines the compatibility contract for the planned LumaMusic extension ecosystem.

## Current implementation boundary

The app now contains a typed manifest validator and a code-owned runtime registry for first-party providers. This is the foundation, **not yet a third-party installer**. Remote JavaScript, ZIP entrypoints, native code, and arbitrary module scripts are not executed. The existing Modules screen's personal cards and appearance presets are not executable extensions.

## Manifest

An extension package must contain a `luma.extension.json` manifest with:

- `id`: stable lowercase identifier (reverse-DNS style recommended)
- `name`, `version` (SemVer), `description`, `author`
- `apiVersion`: currently `1`
- `kind`: `lyrics-provider`, `metadata-provider`, `audio-source`, or `player-visual`
- `permissions`: explicit capability requests
- `entrypoint`: safe relative path inside the package

## Permission model

Permissions are narrow and capability-oriented. v1 defines lyrics metadata/read + provide, metadata read + provide, playback state/control, and library read/write. Unknown permissions, duplicate permissions, unsafe entrypoint paths, unsupported API versions, and malformed identifiers are rejected.

## Runtime lifecycle

The intended lifecycle is validate manifest → show requested permissions → user approval → install immutable package → resolve compatible API version → register capabilities → enable/disable → update or uninstall. Revoking an extension must remove its registrations and cached data. No extension receives permissions implicitly.

## Security requirements before third-party installation

A production installer must verify package origin and integrity, enforce size limits, prevent path traversal and archive bombs, isolate untrusted code, restrict network access, and support revocation. A JavaScript bundle loaded in the main React Native runtime is **not** a sandbox; therefore v1 does not evaluate downloaded code.

## Provider interface

Lyrics providers receive only track ID, title, artist, and duration plus an abort signal. They return plain/synced lines with attribution. The host validates results and applies provider priority; providers cannot control playback or write to the library unless separately granted those permissions.
