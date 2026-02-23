import type { BuildingChoice } from "./searchBar.types";

export function stripCodePrefix(name: string, code?: string) {
  if (!code) return name?.trim() ?? "";
  const n = (name ?? "").trim();
  const pattern = new RegExp(`^${code}\\s*[-—:]\\s*`, "i");
  return n.replace(pattern, "").trim();
}

export function displayName(b: { name: string; code?: string }) {
  const clean = stripCodePrefix(b.name, b.code);
  return b.code ? `${clean} (${b.code})` : clean;
}

export function makeHaystack(b: BuildingChoice) {
  return `${stripCodePrefix(b.name, b.code)} ${b.code ?? ""} ${b.address ?? ""}`.toLowerCase();
}