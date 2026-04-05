import type {
  Bones,
  CliFlags,
  DesiredTraits,
  Eye,
  Hat,
  Rarity,
  Species,
  StatName,
} from '@/types.js';
import { SPECIES, EYES, RARITIES, HATS, STAT_NAMES } from '@/constants.js';

export type StatsMode = 'none' | 'customize';

export type BuilderField =
  | 'species'
  | 'eye'
  | 'rarity'
  | 'hat'
  | 'shiny'
  | 'statsMode'
  | 'peak'
  | 'dump';

export interface BuilderState {
  species: Species;
  eye: Eye;
  rarity: Rarity;
  hat: Hat;
  shiny: boolean;
  statsMode: StatsMode;
  peak: StatName;
  dump: StatName;
}

export function createInitialState(flags: CliFlags = {}): BuilderState {
  const species = (
    SPECIES.includes(flags.species as Species) ? flags.species : SPECIES[0]
  ) as Species;
  const eye = (EYES.includes(flags.eye as Eye) ? flags.eye : EYES[0]) as Eye;
  const rarity = (RARITIES.includes(flags.rarity as Rarity) ? flags.rarity : RARITIES[0]) as Rarity;

  const hatFromFlag = HATS.includes(flags.hat as Hat) ? (flags.hat as Hat) : undefined;
  const hat = rarity === 'common' ? 'none' : (hatFromFlag ?? 'crown');

  const shiny = flags.shiny ?? false;

  const hasPeak = STAT_NAMES.includes(flags.peak as StatName);
  const hasDump = STAT_NAMES.includes(flags.dump as StatName);
  const statsMode: StatsMode = hasPeak || hasDump ? 'customize' : 'none';

  const peak = (hasPeak ? flags.peak : STAT_NAMES[0]) as StatName;
  let dump = (hasDump ? flags.dump : STAT_NAMES[1]) as StatName;
  if (dump === peak) {
    dump = STAT_NAMES.find((s) => s !== peak) ?? STAT_NAMES[1];
  }

  return { species, eye, rarity, hat, shiny, statsMode, peak, dump };
}

export function applyRarityConstraints(state: BuilderState): BuilderState {
  if (state.rarity === 'common' && state.hat !== 'none') {
    return { ...state, hat: 'none' };
  }
  if (state.rarity !== 'common' && state.hat === 'none') {
    return { ...state, hat: 'crown' };
  }
  return state;
}

export function applyDumpConstraint(state: BuilderState): BuilderState {
  if (state.dump === state.peak) {
    const next = STAT_NAMES.find((s) => s !== state.peak);
    if (next) return { ...state, dump: next };
  }
  return state;
}

export function getVisibleFields(state: BuilderState): BuilderField[] {
  const fields: BuilderField[] = ['species', 'eye', 'rarity'];
  if (state.rarity !== 'common') {
    fields.push('hat');
  }
  fields.push('shiny', 'statsMode');
  if (state.statsMode === 'customize') {
    fields.push('peak', 'dump');
  }
  return fields;
}

export function stateToDesiredTraits(state: BuilderState): DesiredTraits {
  return {
    species: state.species,
    eye: state.eye,
    rarity: state.rarity,
    hat: state.rarity === 'common' ? 'none' : state.hat,
    shiny: state.shiny,
    peak: state.statsMode === 'customize' ? state.peak : null,
    dump: state.statsMode === 'customize' ? state.dump : null,
  };
}

export function stateToBones(state: BuilderState): Bones {
  return {
    species: state.species,
    eye: state.eye,
    rarity: state.rarity,
    hat: state.rarity === 'common' ? 'none' : state.hat,
    shiny: state.shiny,
    stats: {},
  };
}

export function firstUnfilledField(flags: CliFlags): BuilderField {
  if (!flags.species || !SPECIES.includes(flags.species as Species)) return 'species';
  if (!flags.eye || !EYES.includes(flags.eye as Eye)) return 'eye';
  if (!flags.rarity || !RARITIES.includes(flags.rarity as Rarity)) return 'rarity';
  const rarity = flags.rarity as Rarity;
  if (rarity !== 'common' && (!flags.hat || !HATS.includes(flags.hat as Hat))) return 'hat';
  return 'shiny';
}

export function allTraitsFlagged(flags: CliFlags): boolean {
  if (!flags.species || !SPECIES.includes(flags.species as Species)) return false;
  if (!flags.eye || !EYES.includes(flags.eye as Eye)) return false;
  if (!flags.rarity || !RARITIES.includes(flags.rarity as Rarity)) return false;
  const rarity = flags.rarity as Rarity;
  if (rarity !== 'common' && (!flags.hat || !HATS.includes(flags.hat as Hat))) return false;
  return true;
}
