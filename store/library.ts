import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { MusicTrack } from "../types/music";
export type LocalPlaylist = { id: string; name: string; tracks: MusicTrack[]; createdAt: number };
type LibraryState = {
  likedTracks: MusicTrack[]; recentTracks: MusicTrack[]; localTracks: MusicTrack[]; playlists: LocalPlaylist[];
  toggleLike: (track: MusicTrack) => void; addRecentTrack: (track: MusicTrack) => void;
  addLocalTracks: (tracks: MusicTrack[]) => void; createPlaylist: (name: string) => void;
  renamePlaylist: (playlistId: string, name: string) => void; deletePlaylist: (playlistId: string) => void;
  clearLibrary: () => void; addTrackToPlaylist: (playlistId: string, track: MusicTrack) => void;
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => void;
};
type PersistedLibraryState = Pick<LibraryState, "likedTracks" | "recentTracks" | "localTracks" | "playlists">;
export const useLibraryStore = create<LibraryState>()(
  persist<LibraryState, [], [], PersistedLibraryState>((set) => ({
    likedTracks: [], recentTracks: [], localTracks: [], playlists: [],
    toggleLike: (track) => set((state) => ({
      likedTracks: state.likedTracks.some((item) => item.id === track.id)
        ? state.likedTracks.filter((item) => item.id !== track.id) : [...state.likedTracks, track]
    })),
    addRecentTrack: (track) => set((state) => ({
      recentTracks: [track, ...state.recentTracks.filter((item) => item.id !== track.id)].slice(0, 30)
    })),
    addLocalTracks: (tracks) => set((state) => {
      const validTracks = tracks.filter((track) =>
        typeof track?.id === "string" && track.id.length > 0 &&
        typeof track.localUri === "string" && track.localUri.length > 0 &&
        track.source === "local"
      );
      const knownIds = new Set(state.localTracks.map((track) => track.id));
      const additions = validTracks.filter((track) => !knownIds.has(track.id) && Boolean(knownIds.add(track.id)));
      return { localTracks: [...additions, ...state.localTracks] };
    }),
    createPlaylist: (name) => set((state) => {
      const normalizedName = typeof name === "string" ? name.trim() : "";
      if (!normalizedName) return state;
      const now = Date.now();
      const id = "local-" + now.toString(36) + "-" + Math.random().toString(36).slice(2, 8);
      return { playlists: [{ id, name: normalizedName, tracks: [], createdAt: now }, ...state.playlists] };
    }),
    renamePlaylist: (playlistId, name) => set((state) => {
      const normalizedName = typeof name === "string" ? name.trim() : "";
      if (!normalizedName) return state;
      return { playlists: state.playlists.map((playlist) => playlist.id === playlistId ? { ...playlist, name: normalizedName } : playlist) };
    }),
    deletePlaylist: (playlistId) => set((state) => ({ playlists: state.playlists.filter((playlist) => playlist.id !== playlistId) })),
    clearLibrary: () => set({ likedTracks: [], recentTracks: [], localTracks: [], playlists: [] }),
    addTrackToPlaylist: (playlistId, track) => set((state) => ({
      playlists: state.playlists.map((playlist) => playlist.id === playlistId &&
        typeof track?.id === "string" && track.id.length > 0 &&
        !playlist.tracks.some((item) => item.id === track.id)
        ? { ...playlist, tracks: [...playlist.tracks, track] } : playlist)
    })),
    removeTrackFromPlaylist: (playlistId, trackId) => set((state) => ({
      playlists: state.playlists.map((playlist) => playlist.id === playlistId
        ? { ...playlist, tracks: playlist.tracks.filter((track) => track.id !== trackId) } : playlist)
    }))
  }), {
    name: "lumamusic-library", storage: createJSONStorage(() => AsyncStorage),
    partialize: (state) => ({
      likedTracks: state.likedTracks, recentTracks: state.recentTracks,
      localTracks: state.localTracks, playlists: state.playlists
    })
  })
);
