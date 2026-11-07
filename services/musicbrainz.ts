import type { MusicTrack } from "../types/music";

type MusicBrainzCredit = {
  name?: string;
  joinphrase?: string;
  artist?: { name?: string };
};

type MusicBrainzRelease = {
  id?: string;
  status?: string;
  "release-group"?: { id?: string };
};

export type MusicBrainzRecording = {
  id?: string;
  title?: string;
  score?: string;
  length?: number;
  "artist-credit"?: Array<MusicBrainzCredit | string>;
  releases?: MusicBrainzRelease[];
};

type MusicBrainzSearchResponse = {
  recordings?: MusicBrainzRecording[];
};

const API_BASE = "https://musicbrainz.org/ws/2";
const USER_AGENT = "LumaMusic/0.2 (https://lumamusic.devs.surf)";
const REQUEST_INTERVAL_MS = 1_100;
let lastRequestAt = 0;

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error("Metadata request cancelled."));
      return;
    }

    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);

    const onAbort = () => {
      clearTimeout(timer);
      reject(new Error("Metadata request cancelled."));
    };

    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

function normalize(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getArtistCredit(recording: MusicBrainzRecording): string {
  return (recording["artist-credit"] ?? [])
    .map((credit) => typeof credit === "string"
      ? credit
      : (credit.name ?? credit.artist?.name ?? "") + (credit.joinphrase ?? ""))
    .join("")
    .trim();
}

function getCoverArtUrl(recording: MusicBrainzRecording): string | undefined {
  const releases = recording.releases ?? [];
  const release = releases.find((item) => item.status === "Official" && item["release-group"]?.id)
    ?? releases.find((item) => item["release-group"]?.id)
    ?? releases.find((item) => item.id);

  const releaseGroupId = release?.["release-group"]?.id;
  if (releaseGroupId) {
    return `https://coverartarchive.org/release-group/${encodeURIComponent(releaseGroupId)}/front-500`;
  }
  if (release?.id) {
    return `https://coverartarchive.org/release/${encodeURIComponent(release.id)}/front-500`;
  }
  return undefined;
}

/**
 * Search the community-maintained MusicBrainz recording catalogue.
 * Requests are serialized to respect MusicBrainz's one-request-per-second policy.
 */
export async function searchMusicBrainzRecordings(
  query: string,
  signal?: AbortSignal
): Promise<MusicBrainzRecording[]> {
  const normalized = query.trim();
  if (!normalized) return [];

  const waitMs = Math.max(0, REQUEST_INTERVAL_MS - (Date.now() - lastRequestAt));
  if (waitMs > 0) await wait(waitMs, signal);
  if (signal?.aborted) throw new Error("Metadata request cancelled.");
  lastRequestAt = Date.now();

  const url = new URL(API_BASE + "/recording/");
  url.searchParams.set("query", `recording:"${normalized.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`);
  url.searchParams.set("fmt", "json");
  url.searchParams.set("limit", "25");

  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "User-Agent": USER_AGENT
    },
    signal
  });

  if (!response.ok) {
    throw new Error(`MusicBrainz metadata request failed (${response.status}).`);
  }

  const payload = (await response.json()) as MusicBrainzSearchResponse;
  return Array.isArray(payload.recordings) ? payload.recordings : [];
}

/**
 * Only apply a MusicBrainz result when the title and credited artist are a
 * high-confidence match. Ambiguous titles are deliberately left untouched.
 */
export function enrichTrackWithMusicBrainz(
  track: MusicTrack,
  recordings: MusicBrainzRecording[]
): MusicTrack {
  const targetTitle = normalize(track.title);
  if (!targetTitle) return track;

  const matches = recordings.filter((recording) => (
    recording.title &&
    normalize(recording.title) === targetTitle &&
    Number(recording.score ?? 0) >= 90 &&
    getArtistCredit(recording)
  ));

  if (matches.length === 0) return track;

  let selected: MusicBrainzRecording | undefined;
  if (track.artistCredited) {
    const targetArtist = normalize(track.artist);
    selected = matches.find((recording) => normalize(getArtistCredit(recording)) === targetArtist);
    if (!selected) return track;
  } else {
    const distinctArtists = new Set(matches.map(getArtistCredit).map(normalize));
    if (distinctArtists.size !== 1) return track;
    selected = matches[0];
  }

  if (!selected) return track;

  const officialArtist = getArtistCredit(selected);
  const coverArt = getCoverArtUrl(selected);

  return {
    ...track,
    artist: officialArtist,
    artistCredited: true,
    artwork: track.artwork || coverArt || "",
    durationMs: track.durationMs > 0 ? track.durationMs : Math.max(0, selected.length ?? 0)
  };
}
