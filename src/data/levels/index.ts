import type { Level } from '@/engine/types';
import { act1 } from './act1';
import { act2 } from './act2';
import { act3 } from './act3';
import { act4 } from './act4';
import { act5 } from './act5';
import { act6 } from './act6';

export const LEVELS: Level[] = [...act1, ...act2, ...act3, ...act4, ...act5, ...act6].sort((a, b) => a.id - b.id);

const byId = new Map(LEVELS.map((l) => [l.id, l]));

export function getLevel(id: number): Level | undefined {
  return byId.get(id);
}

export function levelsOfAct(actId: string): Level[] {
  return LEVELS.filter((l) => l.actId === actId);
}

export const TOTAL_LEVELS = LEVELS.length;
export const TOTAL_XP = LEVELS.reduce((sum, l) => sum + l.xp, 0);
