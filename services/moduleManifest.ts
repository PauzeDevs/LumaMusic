export const MODULE_PERMISSION_IDS = ["read_library", "manage_queue", "network_access"] as const;
export type ModulePermission = typeof MODULE_PERMISSION_IDS[number];
export type ModuleManifest = {
  id: string;
  name: string;
  version: string;
  description: string;
  permissions: ModulePermission[];
  kind: "declarative";
  appearance?: { accent?: "red" | "violet" | "blue" | "green" | "amber" | "rose" | "arctic" | "mono"; surface?: "liquid" | "frosted" | "clear" | "matte" };
};
const ID_PATTERN = /^[a-z0-9][a-z0-9._-]{2,63}$/;
const PERMISSIONS = new Set<string>(MODULE_PERMISSION_IDS);
export function validateModuleManifest(input: unknown): ModuleManifest {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Manifest must be a JSON object.");
  const value = input as Record<string, unknown>;
  if (value.kind !== "declarative") throw new Error("Only declarative modules are supported. Executable JavaScript is not allowed.");
  if (typeof value.id !== "string" || !ID_PATTERN.test(value.id)) throw new Error("Module ID must be 3–64 characters and use lowercase letters, numbers, dots, underscores or hyphens.");
  if (typeof value.name !== "string" || !value.name.trim() || value.name.length > 48) throw new Error("Module name is required and must be at most 48 characters.");
  if (typeof value.version !== "string" || !/^\d+\.\d+\.\d+$/.test(value.version)) throw new Error("Version must use semantic versioning, for example 1.0.0.");
  if (typeof value.description !== "string" || value.description.length > 180) throw new Error("Description is required and must be at most 180 characters.");
  if (!Array.isArray(value.permissions) || value.permissions.length > MODULE_PERMISSION_IDS.length) throw new Error("Permissions must be an array of supported permission IDs.");
  const permissions = value.permissions as unknown[];
  if (permissions.some((permission) => typeof permission !== "string" || !PERMISSIONS.has(permission))) throw new Error("Manifest requests an unknown permission.");
  if (new Set(permissions).size !== permissions.length) throw new Error("Manifest contains duplicate permissions.");
  let appearance: ModuleManifest["appearance"];
  if (value.appearance !== undefined) {
    if (!value.appearance || typeof value.appearance !== "object" || Array.isArray(value.appearance)) throw new Error("Appearance must be an object.");
    const raw = value.appearance as Record<string, unknown>;
    const accents = ["red", "violet", "blue", "green", "amber", "rose", "arctic", "mono"];
    const surfaces = ["liquid", "frosted", "clear", "matte"];
    if (raw.accent !== undefined && !accents.includes(String(raw.accent))) throw new Error("Unsupported appearance accent.");
    if (raw.surface !== undefined && !surfaces.includes(String(raw.surface))) throw new Error("Unsupported appearance surface.");
    appearance = { accent: raw.accent as NonNullable<ModuleManifest["appearance"]>["accent"], surface: raw.surface as NonNullable<ModuleManifest["appearance"]>["surface"] };
  }
  return { id: value.id, name: value.name.trim(), version: value.version, description: value.description.trim(), permissions: permissions as ModulePermission[], kind: "declarative", ...(appearance ? { appearance } : {}) };
}
