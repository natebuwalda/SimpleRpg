import { isValidCharacter, type Character } from './character';
import type { ClassId } from './combat-actions';

export type CharacterDraft = Omit<Character, 'classId'> & { classId: ClassId | null };

export type AllocationGroup = 'attributes' | 'skills';
export type AllocationChange =
  | { group:'attributes'; key:keyof Character['attributes']; delta:-1|1 }
  | { group:'skills'; key:keyof Character['skills']; delta:-1|1 };

export function createCharacterDraft(): CharacterDraft {
  return {name:'',classId:null,attributes:{prowess:1,cunning:1,resistance:1},skills:{combat:0,subterfuge:0,lore:0}};
}
export function remainingPoints(draft: CharacterDraft, group: AllocationGroup): number {
  return (group === 'attributes' ? 8 : 5) - Object.values(draft[group]).reduce((sum,n)=>sum+n,0);
}
export function allocatePoint(draft: CharacterDraft, change: AllocationChange): CharacterDraft {
  const group=draft[change.group], value=(group as Record<string,number>)[change.key];
  const floor=change.group==='attributes'?1:0;
  if (!Number.isInteger(value) || ![-1,1].includes(change.delta) || value+change.delta<floor || value+change.delta>5
    || (change.delta>0 && remainingPoints(draft,change.group)<=0)) return draft;
  return {...draft,[change.group]:{...group,[change.key]:value+change.delta}};
}
export function finishCharacter(draft: CharacterDraft): Character | null {
  const result={...draft,name:draft.name.trim(),attributes:{...draft.attributes},skills:{...draft.skills}};
  return isValidCharacter(result)?result:null;
}
