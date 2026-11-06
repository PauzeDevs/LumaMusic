export type MusicTrack = {
  id: string;
  title: string;
  artist: string;
  artwork: string;
  durationMs: number;
  source: "mock" | "audius";
  sourceTrackId?: string;
  isStreamable?: boolean;
  permalink?: string;
  genre?: string;
  playCount?: number;
};

export type MusicPlaylist = {
  id: string;
  title: string;
  subtitle: string;
  artwork: string;
  trackIds: string[];
};