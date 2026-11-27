import type { Character } from '../game/character';
import { CLASS_ACTION_DEFINITIONS, CLASS_DEFINITIONS, getExploitPool, getNukeDamage } from '../game/combat-actions';

export function classActionDetails(character: Character): string {
  const action = CLASS_DEFINITIONS[character.classId].classAction;
  const { label, description } = CLASS_ACTION_DEFINITIONS[action];
  const values = action === 'exploit'
    ? `<p aria-label="Exploit pool">${label} ${getExploitPool(character)}d10</p>`
    : action === 'nuke' ? `<p aria-label="Character Nuke damage">${label} · ${getNukeDamage(character)} damage</p>` : '';
  return `${values}<p class="class-action-description"><strong>${label}</strong> · ${description}</p>`;
}
