/** Public contract for first-party and future third-party Luma extensions. */
export const LUMA_EXTENSION_API_VERSION = 1 as const;

export type LumaExtensionPermission =
  | "lyrics:read-track-metadata"
  | "lyrics:provide"
  | "metadata:read-track"
  | "metadata:provide"
  | "playback:read-state"
  | "playback:control"
  | "library:read"
  | "library:write";

export type LumaExtensionKind = "lyrics-provider" | "metadata-provider" | "audio-source" | "player-visual";

export type LumaExtensionManifest = {
  id: string;
  name: string;
  version: string;
  apiVersion: typeof LUMA_EXTENSION_API_VERSION;
  description: string;
  author: string;
  kind: LumaExtensionKind;
  permissions: LumaExtensionPermission[];
  entrypoint: string;
};

export type ExtensionValidation = { valid: true; manifest: LumaExtensionManifest } | { valid: false; errors: string[] };

const ID_PATTERN = /^[a-z0-9](?:[a-z0-9.-]{1,62})$/;
const VERSION_PATTERN = /^(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)(?:-[0-9A-Za-z.-]+)?$/;
const PERMISSIONS = new Set<LumaExtensionPermission>([
  "lyrics:read-track-metadata", "lyrics:provide", "metadata:read-track", "metadata:provide",
  "playback:read-state", "playback:control", "library:read", "library:write"
]);
const KINDS = new Set<LumaExtensionKind>(["lyrics-provider", "metadata-provider", "audio-source", "player-visual"]);

/** Validate untrusted manifest data before it can be displayed or installed. */
export function validateLumaExtensionManifest(input: unknown): ExtensionValidation {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { valid: false, errors: ["Manifest must be an object."] };
  const value = input as Record<string, unknown>;
  const errors: string[] = [];
  const stringField = (key: string, max: number) => typeof value[key] === "string" && value[key].trim().length > 0 && value[key].length <= max;
  if (!stringField("id", 64) || !ID_PATTERN.test(String(value.id))) errors.push("id must be a lowercase reverse-DNS-style identifier.");
  if (!stringField("name", 60)) errors.push("name is required and must be at most 60 characters.");
  if (!stringField("version", 40) || !VERSION_PATTERN.test(String(value.version))) errors.push("version must use semantic versioning.");
  if (value.apiVersion !== LUMA_EXTENSION_API_VERSION) errors.push("Unsupported Luma extension API version.");
  if (!stringField("description", 240)) errors.push("description is required and must be at most 240 characters.");
  if (!stringField("author", 80)) errors.push("author is required and must be at most 80 characters.");
  if (typeof value.kind !== "string" || !KINDS.has(value.kind as LumaExtensionKind)) errors.push("kind is not supported.");
  if (!stringField("entrypoint", 160) || String(value.entrypoint).startsWith("/") || String(value.entrypoint).includes("..")) errors.push("entrypoint must be a safe relative path.");
  if (!Array.isArray(value.permissions)) errors.push("permissions must be an array.");
  else {
    if (value.permissions.length > 8) errors.push("A manifest cannot request more than eight permissions.");
    for (const permission of value.permissions) if (typeof permission !== "string" || !PERMISSIONS.has(permission as LumaExtensionPermission)) errors.push(`Unknown permission: ${String(permission)}`);
    if (new Set(value.permissions).size !== value.permissions.length) errors.push("permissions must not contain duplicates.");
  }
  if (errors.length) return { valid: false, errors };
  return { valid: true, manifest: {
    id: value.id as string, name: value.name as string, version: value.version as string,
    apiVersion: LUMA_EXTENSION_API_VERSION, description: value.description as string,
    author: value.author as string, kind: value.kind as LumaExtensionKind,
    permissions: [...value.permissions as LumaExtensionPermission[]], entrypoint: value.entrypoint as string
  } };
}
