import type { LumaExtensionKind, LumaExtensionManifest, LumaExtensionPermission } from "./types";

export type ExtensionTrackContext = { id: string; title: string; artist: string; durationMs: number };
export type LyricsExtensionResult = { lines: Array<{ time: number | null; text: string; words?: Array<{ time: number; text: string }> }>; synced: boolean; attribution: { text: string; url?: string } };
export type LyricsProviderExtension = {
  manifest: LumaExtensionManifest;
  searchLyrics: (track: ExtensionTrackContext, signal: AbortSignal) => Promise<LyricsExtensionResult | null>;
};

const registered = new Map<string, LumaExtensionManifest>();
const lyricsProviders = new Map<string, LyricsProviderExtension>();

/** Runtime registration is intentionally code-owned in this phase: remote JS is never evaluated. */
export function registerBuiltInExtension(manifest: LumaExtensionManifest): void {
  const existing = registered.get(manifest.id);
  if (existing && existing.version !== manifest.version) throw new Error(`Conflicting extension registration: ${manifest.id}`);
  registered.set(manifest.id, manifest);
}

export function registerBuiltInLyricsProvider(extension: LyricsProviderExtension): void {
  if (extension.manifest.kind !== "lyrics-provider") throw new Error("A lyrics provider must declare kind=lyrics-provider.");
  if (!extension.manifest.permissions.includes("lyrics:provide") || !extension.manifest.permissions.includes("lyrics:read-track-metadata")) {
    throw new Error("Lyrics providers must declare lyrics:provide and lyrics:read-track-metadata.");
  }
  registerBuiltInExtension(extension.manifest);
  lyricsProviders.set(extension.manifest.id, extension);
}

export function listRegisteredExtensions(kind?: LumaExtensionKind): LumaExtensionManifest[] {
  return [...registered.values()].filter((manifest) => !kind || manifest.kind === kind);
}

export function listLyricsProviders(): LyricsProviderExtension[] {
  return [...lyricsProviders.values()];
}

export function hasExtensionPermission(manifest: LumaExtensionManifest, permission: LumaExtensionPermission): boolean {
  return manifest.permissions.includes(permission);
}
