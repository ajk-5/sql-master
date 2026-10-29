import {
  Flame,
  Search,
  CircleSlash,
  Feather,
  KeyRound,
  Link,
  UserRound,
  Network,
  Layers,
  Table2,
  LockKeyholeOpen,
  Copy,
  Pencil,
  GitBranch,
  PanelsTopLeft,
  Gem,
  Plus,
  BrickWall,
  ScanSearch,
  Atom,
  Undo2,
  ArchiveRestore,
  NotebookPen,
  CopyCheck,
  Zap,
  Ruler,
  Eye,
  Braces,
  ListTree,
  Landmark,
  Puzzle,
  Moon,
  Route,
  Scale,
  Radio,
  Star,
  ShieldCheck,
  Crown,
  Trophy,
  VolumeX,
  Snowflake,
  Crosshair,
  Map,
  type LucideIcon,
} from 'lucide-react';
import { type Badge } from '@/data/badges';
import { TIER_COLOR } from './tier-colors';

const ICONS: Record<string, LucideIcon> = {
  'first-light': Flame,
  'the-narrowing': Search,
  'null-hypothesis': CircleSlash,
  wordsmith: Feather,
  'case-one-closed': KeyRound,
  'first-join': Link,
  'the-left-behind': UserRound,
  'chain-of-custody': Network,
  'set-theorist': Layers,
  'the-grouper': Table2,
  'case-two-closed': LockKeyholeOpen,
  'query-within-query': Copy,
  'the-with-clause': Pencil,
  'down-the-rabbit-hole': GitBranch,
  'through-the-window': PanelsTopLeft,
  'case-three-closed': Gem,
  'first-write': Plus,
  rebuilder: BrickWall,
  'orphan-hunter': ScanSearch,
  atomic: Atom,
  undo: Undo2,
  restorer: ArchiveRestore,
  'journal-keeper': NotebookPen,
  deduplicator: CopyCheck,
  'case-four-closed': Zap,
  architect: Ruler,
  'keeper-of-keys': KeyRound,
  'the-named-query': Eye,
  'the-index-finger': Zap,
  'json-whisperer': Braces,
  normaliser: ListTree,
  'case-five-closed': Landmark,
  'pattern-matcher': Puzzle,
  'night-route': Moon,
  'follow-the-money': Route,
  'the-ledger-balances': Scale,
  exfiltration: Radio,
  'case-six-closed': KeyRound,
  apprentice: Star,
  investigator: ShieldCheck,
  inspector: ShieldCheck,
  'chief-inspector': Crown,
  grandmaster: Trophy,
  unaided: VolumeX,
  purist: Snowflake,
  'clean-sweep': Crosshair,
  polyglot: Map,
  'thousand-club': Gem,
};

export function BadgeInsignia({
  badge,
  small = false,
  locked = false,
}: {
  badge: Badge;
  small?: boolean;
  locked?: boolean;
}) {
  const Icon = ICONS[badge.id] ?? ShieldCheck;
  return (
    <span
      className={`insignia insignia--${badge.tier}${small ? ' insignia--small' : ''}${locked ? ' insignia--locked' : ''}`}
      style={{ ['--tier-color' as string]: TIER_COLOR[badge.tier] }}
      title={`${badge.name} · ${badge.tier}${locked ? ' · locked' : ''}`}
      role="img"
      aria-label={`${badge.name}, ${badge.tier}${locked ? ', locked' : ''}`}
    >
      <Icon aria-hidden="true" strokeWidth={1.4} />
      {!small && (
        <span className="insignia__stars" aria-hidden="true">
          {badge.tier === 'legendary' ? '✦ ✦ ✦' : badge.tier === 'gold' ? '· ✦ ·' : '· · ·'}
        </span>
      )}
    </span>
  );
}
