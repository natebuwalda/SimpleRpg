import type { Character } from '../game/character';
import { CLASS_ACTION_DEFINITIONS, CLASS_DEFINITIONS, getClericPool, getNukeDamage } from '../game/combat-actions';

export function resourceText(current: number, maximum: number): string {
  return `${current} / ${maximum} Resources`;
}

export function classActionDetails(character: Character): string {
  const actions = CLASS_DEFINITIONS[character.classId].classActions;
  const action = actions[0];
  const { label } = CLASS_ACTION_DEFINITIONS[action];
  const values = action === 'nuke' ? `<p aria-label="Character Nuke damage">${label} · ${getNukeDamage(character)} damage</p>`
    : action === 'heal' ? `<p aria-label="Heal and Smite pool">Heal and Smite · ${getClericPool(character)}d10</p>` : '';
  return values + actions.map(action => {
    const { label, description } = CLASS_ACTION_DEFINITIONS[action];
    return `<p class="class-action-description"><strong>${label}</strong> · ${description}</p>`;
  }).join('');
}
