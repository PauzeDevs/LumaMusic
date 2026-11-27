import type { ModuleManifest, ModulePermission } from "./moduleManifest";

export type ModuleRuntimeResult =
  | { status: "ready"; appearance: NonNullable<ModuleManifest["appearance"]> }
  | { status: "no-op"; reason: "no-supported-actions" };

/**
 * Executes the currently supported declarative module surface.
 * This deliberately interprets data only: it never loads module code,
 * evaluates expressions, or exposes host objects to an extension.
 */
export function resolveModuleRuntime(
  manifest: ModuleManifest,
  _approvedPermissions: readonly ModulePermission[]
): ModuleRuntimeResult {
  if (!manifest.appearance || Object.keys(manifest.appearance).length === 0) {
    return { status: "no-op", reason: "no-supported-actions" };
  }
  return { status: "ready", appearance: manifest.appearance };
}
