import type { Dataset } from '@/engine/types';
import { blackwood } from './blackwood';
import { vault } from './vault';
import { cartel } from './cartel';
import { blackout } from './blackout';
import { nexus } from './nexus';

export const DATASETS: Dataset[] = [blackwood, vault, cartel, blackout, nexus];

const byId = new Map(DATASETS.map((d) => [d.id, d]));

export function getDataset(id: string): Dataset {
  const found = byId.get(id);
  if (!found) throw new Error(`Unknown dataset: ${id}`);
  return found;
}

export { blackwood, vault, cartel, blackout, nexus };
