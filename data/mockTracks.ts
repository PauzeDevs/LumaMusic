import type { MusicPlaylist, MusicTrack } from "../types/music";

export const mockTracks: MusicTrack[] = [
  {
    id: "mock:1",
    title: "Afterglow",
    artist: "Mira Sol",
    artwork: "",
    durationMs: 214000,
    source: "mock"
  },
  {
    id: "mock:2",
    title: "Velvet Skies",
    artist: "The Midnight Club",
    artwork: "",
    durationMs: 198000,
    source: "mock"
  },
  {
    id: "mock:3",
    title: "Blue Hour",
    artist: "Ari Lennox",
    artwork: "",
    durationMs: 232000,
    source: "mock"
  },
  {
    id: "mock:4",
    title: "Slow Motion",
    artist: "Kairo",
    artwork: "",
    durationMs: 205000,
    source: "mock"
  },
  {
    id: "mock:5",
    title: "Moonwater",
    artist: "Nia Rivers",
    artwork: "",
    durationMs: 246000,
    source: "mock"
  },
  {
    id: "mock:6",
    title: "Electric Bloom",
    artist: "June Avenue",
    artwork: "",
    durationMs: 189000,
    source: "mock"
  }
];

export const mockPlaylists: MusicPlaylist[] = [
  {
    id: "night-drive",
    title: "Night Drive",
    subtitle: "For roads that never end",
    artwork: "",
    trackIds: ["mock:1", "mock:2", "mock:4"]
  },
  {
    id: "soft-focus",
    title: "Soft Focus",
    subtitle: "A little room to breathe",
    artwork: "",
    trackIds: ["mock:3", "mock:5", "mock:6"]
  },
  {
    id: "after-hours",
    title: "After Hours",
    subtitle: "Low lights, loud feelings",
    artwork: "",
    trackIds: ["mock:2", "mock:4", "mock:1"]
  }
];