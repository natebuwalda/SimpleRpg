import type { WorldGeometry } from './types';

export function decodeRecord(raw: string | null): Record<string, unknown> | null {
  try {
    const value: unknown = JSON.parse(raw ?? 'null');
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
  } catch { return null; }
}
export function validProgress(value: Record<string, unknown>, allowedIds: readonly string[], maxHp: number): boolean {
  return typeof value.hp === 'number' && Number.isInteger(value.hp) && value.hp >= 1 && value.hp <= maxHp
    && Array.isArray(value.completedEncounterIds) && value.completedEncounterIds.every(id => allowedIds.includes(id))
    && new Set(value.completedEncounterIds).size === value.completedEncounterIds.length;
}
export function validGeometry(value: unknown): value is WorldGeometry {
  if (!value || typeof value !== 'object') return false;
  const v = value as WorldGeometry;
  return ['woodland', 'legacy-expanded'].includes(v.layout)
    && Number.isInteger(v.width) && Number.isInteger(v.height) && v.width >= 20 && v.width <= 40 && v.height >= 20 && v.height <= 40
    && (v.layout !== 'legacy-expanded' || (v.width === 20 && v.height === 20));
}
