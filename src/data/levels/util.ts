import type { Level } from '@/engine/types';
import { docsFor } from '@/data/docs';

/** A level as written in an act file: doc links are derived from its concepts. */
export type LevelDraft = Omit<Level, 'actId' | 'docs'> & { docs?: Level['docs'] };

/**
 * Stamps an act id onto every level in the file and resolves each level's
 * sql.sh reading list from its concept slugs, so URLs live in exactly one place.
 */
export function defineAct(actId: string, drafts: LevelDraft[]): Level[] {
  return drafts.map((draft) => ({
    ...draft,
    actId,
    docs: draft.docs ?? docsFor(draft.concepts),
  }));
}
