import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { MusicTrack } from "../types/music";

export type LocalPlaylist = { id: string; name: string; tracks: MusicTrack[]; createdAt: number };
type LibraryState = {
  likedTracks: MusicTrack[]; recentTracks: MusicTrack[]; playlists: LocalPlaylist[];
  toggleLike: (track: MusicTrack) => void; addRecentTrack: (track: MusicTrack) => void;
  createPlaylist: (name: string) => void; deletePlaylist: (playlistId: string) => void;
  addTrackToPlaylist: (playlistId: string, track: MusicTrack) => void;
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => void;
};
type PersistedLibraryState = Pick<LibraryState, "likedTracks" | "recentTracks" | "playlists">;
export const useLibraryStore = create<LibraryState>()(
  persist<LibraryState, [], [], PersistedLibraryState>(
    (set) => ({
      likedTracks: [], recentTracks: [], playlists: [],
      toggleLike: (track) => set((state) => ({ likedTracks: state.likedTracks.some((item) => item.id === track.id) ? state.likedTracks.filter((item) => item.id !== track.id) : [...state.likedTracks, track] })),
      addRecentTrack: (track) => set((state) => ({ recentTracks: [track, ...state.recentTracks.filter((item) => item.id !== track.id)].slice(0, 30) })),
      createPlaylist: (name) => set((state) => ({ playlists: [{ id: "local-" + Date.now().toString(), name: name.trim(), tracks: [], createdAt: Date.now() }, ...state.playlists] })),
      deletePlaylist: (playlistId) => set((state) => ({ playlists: state.playlists.filter((playlist) => playlist.id !== playlistId) })),
      addTrackToPlaylist: (playlistId, track) => set((state) => ({ playlists: state.playlists.map((playlist) => playlist.id === playlistId && !playlist.tracks.some((item) => item.id === track.id) ? { ...playlist, tracks: [...playlist.tracks, track] } : playlist) })),
      removeTrackFromPlaylist: (playlistId, trackId) => set((state) => ({ playlists: state.playlists.map((playlist) => playlist.id === playlistId ? { ...playlist, tracks: playlist.tracks.filter((track) => track.id !== trackId) } : playlist) }))
    }),
    { name: "lumamusic-library", storage: createJSONStorage(() => AsyncStorage), partialize: (state) => ({ likedTracks: state.likedTracks, recentTracks: state.recentTracks, playlists: state.playlists }) }
  )
);