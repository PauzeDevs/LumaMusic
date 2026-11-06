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
  source?: "audius" | "mock";
  sourcePlaylistId?: string;
  trackCount?: number;
  permalink?: string;
};

export type MusicArtist = {
  id: string;
  sourceArtistId: string;
  name: string;
  handle: string;
  bio: string;
  artwork: string;
  followerCount: number;
  trackCount: number;
};

