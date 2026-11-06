import type { MusicPlaylist, MusicTrack } from "../types/music";

export const mockTracks: MusicTrack[] = [
  {
    id: "mock:1",
    title: "Afterglow",
    artist: "Mira Sol",
    artwork: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=900&q=85",
    durationMs: 214000,
    source: "mock"
  },
  {
    id: "mock:2",
    title: "Velvet Skies",
    artist: "The Midnight Club",
    artwork: "https://images.unsplash.com/photo-1519608487953-e999c86e7455?w=900&q=85",
    durationMs: 198000,
    source: "mock"
  },
  {
    id: "mock:3",
    title: "Blue Hour",
    artist: "Ari Lennox",
    artwork: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=900&q=85",
    durationMs: 232000,
    source: "mock"
  },
  {
    id: "mock:4",
    title: "Slow Motion",
    artist: "Kairo",
    artwork: "https://images.unsplash.com/photo-1506157786151-b8491531f063?w=900&q=85",
    durationMs: 205000,
    source: "mock"
  },
  {
    id: "mock:5",
    title: "Moonwater",
    artist: "Nia Rivers",
    artwork: "https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=900&q=85",
    durationMs: 246000,
    source: "mock"
  },
  {
    id: "mock:6",
    title: "Electric Bloom",
    artist: "June Avenue",
    artwork: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=900&q=85",
    durationMs: 189000,
    source: "mock"
  }
];

export const mockPlaylists: MusicPlaylist[] = [
  {
    id: "night-drive",
    title: "Night Drive",
    subtitle: "For roads that never end",
    artwork: "https://images.unsplash.com/photo-1519608487953-e999c86e7455?w=900&q=85",
    trackIds: ["mock:1", "mock:2", "mock:4"]
  },
  {
    id: "soft-focus",
    title: "Soft Focus",
    subtitle: "A little room to breathe",
    artwork: "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?w=900&q=85",
    trackIds: ["mock:3", "mock:5", "mock:6"]
  },
  {
    id: "after-hours",
    title: "After Hours",
    subtitle: "Low lights, loud feelings",
    artwork: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=900&q=85",
    trackIds: ["mock:2", "mock:4", "mock:1"]
  }
];