import { emptyState, migrateLegacy, normalizeState, type DreamState } from "@shared/dreamModel";

export * from "@shared/dreamModel";

const STORAGE_KEY = "cheotbal-v3";
const LEGACY_KEY = "cheotbal-coach-v1";
const BACKUP_KIND = "cheotbal-backup";

export function readState(): DreamState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return normalizeState(JSON.parse(raw));
    const legacy = window.localStorage.getItem(LEGACY_KEY);
    if (legacy) return migrateLegacy(JSON.parse(legacy));
  } catch {
    // fall through to an empty state
  }
  return emptyState();
}

/** Returns false when the browser refuses to persist (private mode, quota). */
export function writeState(state: DreamState): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function exportBackup(state: DreamState): string {
  return JSON.stringify({ kind: BACKUP_KIND, exportedAt: new Date().toISOString(), ...state }, null, 2);
}

export function parseBackup(text: string): DreamState {
  const parsed = JSON.parse(text) as { kind?: string; version?: number };
  if (parsed.kind !== BACKUP_KIND) throw new Error("첫걸음 백업 파일이 아니에요.");
  return parsed.version === 3 ? normalizeState(parsed) : migrateLegacy(parsed);
}

export function downloadText(filename: string, text: string): void {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
