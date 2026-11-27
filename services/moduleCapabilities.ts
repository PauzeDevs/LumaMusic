import { useCustomizationStore } from "../store/customization";
import { useLibraryStore } from "../store/library";
import { usePlayerStore } from "../store/player";
import type { MusicTrack } from "../types/music";
import type { ModulePermission } from "./moduleManifest";

export type ModuleLibraryTrack = Pick<MusicTrack, "id" | "title" | "artist" | "artwork" | "durationMs" | "source">;

function requirePermission(extensionId: string, permission: ModulePermission): void {
  const extension = useCustomizationStore.getState().extensions.find(
    (entry) => entry.manifest.id === extensionId
  );
  if (!extension) throw new Error("This module is not installed.");
  if (!extension.manifest.permissions.includes(permission) || !extension.approvedPermissions.includes(permission)) {
    throw new Error(`Permission required: ${permission}`);
  }
}

/** Returns metadata only; local file URIs and playback internals are never exposed. */
export function readModuleLibrary(extensionId: string): {
  likedTracks: ModuleLibraryTrack[];
  recentTracks: ModuleLibraryTrack[];
  localTracks: ModuleLibraryTrack[];
  playlists: { id: string; name: string; tracks: ModuleLibraryTrack[] }[];
} {
  requirePermission(extensionId, "read_library");
  const library = useLibraryStore.getState();
  const expose = (track: MusicTrack): ModuleLibraryTrack => ({
    id: track.id,
    title: track.title,
    artist: track.artist,
    artwork: track.artwork,
    durationMs: track.durationMs,
    source: track.source
  });
  return {
    likedTracks: library.likedTracks.map(expose),
    recentTracks: library.recentTracks.map(expose),
    localTracks: library.localTracks.map(expose),
    playlists: library.playlists.map((playlist) => ({
      id: playlist.id,
      name: playlist.name,
      tracks: playlist.tracks.map(expose)
    }))
  };
}

/**
 * Adds only tracks already present in the user's library. The module cannot
 * inject arbitrary stream URLs or file paths into the playback queue.
 */
export function addModuleLibraryTracksToQueue(extensionId: string, trackIds: readonly string[]): number {
  requirePermission(extensionId, "manage_queue");
  if (!Array.isArray(trackIds) || trackIds.length === 0) return 0;
  if (trackIds.length > 100) throw new Error("A module can add at most 100 tracks per request.");
  const requested = new Set(trackIds.filter((id) => typeof id === "string" && id.length > 0));
  if (requested.size !== trackIds.length) throw new Error("Track IDs must be non-empty and unique.");
  const library = useLibraryStore.getState();
  const available = [
    ...library.likedTracks,
    ...library.recentTracks,
    ...library.localTracks,
    ...library.playlists.flatMap((playlist) => playlist.tracks)
  ];
  const byId = new Map<string, MusicTrack>();
  for (const track of available) if (!byId.has(track.id)) byId.set(track.id, track);
  const tracks = [...requested].map((id) => byId.get(id));
  if (tracks.some((track) => !track)) throw new Error("Modules can only queue tracks already in your library.");
  return usePlayerStore.getState().addTracksToQueue(tracks as MusicTrack[]);
}
