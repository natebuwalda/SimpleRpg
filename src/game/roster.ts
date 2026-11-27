import type {Checkpoint} from './types';
export const MAX_CHARACTERS=10;
export type RosterSlot={id:string;revision:number;status:'active'|'defeated';checkpoint:Checkpoint};
export type RosterSave={version:7;slots:RosterSlot[]};
export type RosterObservation={status:'ready'|'empty'|'invalid'|'unavailable';raw:string|null;roster:RosterSave|null;legacy?:true};
