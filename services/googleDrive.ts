import { GoogleSignin } from "@react-native-google-signin/google-signin";
import type { MusicTrack } from "../types/music";
import type { LocalPlaylist } from "../store/library";

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.appdata";
const BACKUP_FILE_NAME = "lumamusic-library-v1.json";

export type LumaLibraryBackup = {
  schemaVersion: 1;
  updatedAt: number;
  likedTracks: MusicTrack[];
  recentTracks: MusicTrack[];
  localTracks: MusicTrack[];
  playlists: LocalPlaylist[];
};

type DriveFile = { id: string; name: string; modifiedTime?: string };
type DriveListResponse = { files?: DriveFile[] };

function configureGoogleSignIn() {
  GoogleSignin.configure({ scopes: [DRIVE_SCOPE] });
}

async function accessToken(): Promise<string> {
  configureGoogleSignIn();
  const tokens = await GoogleSignin.getTokens();
  if (!tokens.accessToken) throw new Error("Google did not provide a Drive access token. Reconnect your Google account.");
  return tokens.accessToken;
}

async function driveRequest<T>(url: string, init: RequestInit = {}): Promise<T> {
  const token = await accessToken();
  const response = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init.headers ?? {}) }
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Google Drive request failed (${response.status}): ${detail.slice(0, 240)}`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

async function findBackup(): Promise<DriveFile | null> {
  const query = encodeURIComponent(`name='${BACKUP_FILE_NAME}' and trashed=false`);
  const result = await driveRequest<DriveListResponse>(
    `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${query}&pageSize=10&fields=files(id,name,modifiedTime)`
  );
  return result.files?.[0] ?? null;
}

export async function downloadLibraryBackup(): Promise<LumaLibraryBackup | null> {
  const file = await findBackup();
  if (!file) return null;
  return driveRequest<LumaLibraryBackup>(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}?alt=media`
  );
}

export async function uploadLibraryBackup(backup: LumaLibraryBackup): Promise<void> {
  const existing = await findBackup();
  let fileId = existing?.id;
  if (!fileId) {
    const created = await driveRequest<{ id: string }>("https://www.googleapis.com/drive/v3/files?fields=id", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: BACKUP_FILE_NAME, parents: ["appDataFolder"], mimeType: "application/json" })
    });
    fileId = created.id;
  }
  const token = await accessToken();
  const response = await fetch(
    `https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(fileId)}?uploadType=media`,
    {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json; charset=UTF-8" },
      body: JSON.stringify(backup)
    }
  );
  if (!response.ok) throw new Error(`Could not save your LumaMusic backup (${response.status}).`);
}

export function makeLibraryBackup(library: {
  likedTracks: MusicTrack[];
  recentTracks: MusicTrack[];
  localTracks: MusicTrack[];
  playlists: LocalPlaylist[];
}): LumaLibraryBackup {
  return { schemaVersion: 1, updatedAt: Date.now(), ...library };
}

export function isLibraryBackup(value: unknown): value is LumaLibraryBackup {
  if (!value || typeof value !== "object") return false;
  const backup = value as Partial<LumaLibraryBackup>;
  return backup.schemaVersion === 1 &&
    typeof backup.updatedAt === "number" &&
    Array.isArray(backup.likedTracks) &&
    Array.isArray(backup.recentTracks) &&
    Array.isArray(backup.localTracks) &&
    Array.isArray(backup.playlists);
}

export async function disconnectGoogleAccount(): Promise<void> {
  await GoogleSignin.signOut();
}
