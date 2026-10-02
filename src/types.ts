export const METADATA_KEY = "com.albor/state";
export const DICE_ROLL_CHANNEL = "com.albor/dice-roll";

export const DICE_LOG_MAX = 50;

export type DieSize = 4 | 6 | 8 | 10 | 12;
export type StatKey = "vig" | "agi" | "apt" | "vol";

export const DIE_SIZES: DieSize[] = [4, 6, 8, 10, 12];

export interface StatBlock {
  valor: number;
  dado: DieSize;
}

export interface Stats {
  vig: StatBlock;
  agi: StatBlock;
  apt: StatBlock;
  vol: StatBlock;
}

export const STATS_INFO: { key: StatKey; label: string; short: string }[] = [
  { key: "vig", label: "Vigor", short: "VIG" },
  { key: "agi", label: "Agilidad", short: "AGI" },
  { key: "apt", label: "Aptitud", short: "APT" },
  { key: "vol", label: "Voluntad", short: "VOL" },
];

export interface Resource {
  actual: number;
  max: number;
}

export interface Talento {
  id: string;
  nombre: string;
  descripcion: string;
}

export interface Arma extends Talento {
  stat: StatKey;
  dado: DieSize;
}

export const PAGE2_COUNTS = {
  lazos: 3,
  etiquetas: 4,
} as const;

export interface AlborCharacter {
  id: string;
  ownerId: string | null;
  nombre: string;
  concepto: string;
  linaje: string;
  ocupacion: string;
  rol: string;
  nivel: number;
  tamano: string;
  stats: Stats;
  det: Resource;
  chispa: Resource;
  reservaDet: number;
  reservaChispa: number;
  suerte: Resource;
  heridas: Resource;
  adrenalina: string;
  mov: number;
  dp: number;
  talentos: Talento[];
  notas: string;
  lazos: Talento[];
  etiquetas: string[];
  equipo: string[];
  dominio: string[];
  maestrias: Talento[];
  armas: Arma[];
}

export interface DiceRollBroadcast {
  characterName: string;
  summary: string;
  total: number;
  critical: boolean;
  fumble: boolean;
}

export interface DiceRollLogEntry {
  id: string;
  timestamp: number;
  characterName: string;
  playerName: string;
  summary: string;
  total: number;
  faces?: number[];
  dieSize?: DieSize;
  critical: boolean;
  fumble: boolean;
  viaDicePlus: boolean;
}

export interface AlborState {
  characters: AlborCharacter[];
  dicePlusEnabled: boolean;
  diceLog: DiceRollLogEntry[];
}

export const EMPTY_STATE: AlborState = {
  characters: [],
  dicePlusEnabled: false,
  diceLog: [],
};

export const BANDS: { letter: string; target: number }[] = [
  { letter: "G", target: 5 },
  { letter: "F", target: 7 },
  { letter: "E", target: 9 },
  { letter: "D", target: 11 },
  { letter: "C", target: 13 },
  { letter: "B", target: 15 },
  { letter: "A", target: 17 },
  { letter: "S", target: 19 },
];

export type Outcome = "extra" | "exito" | "limitado" | "fracaso";

export function clampDie(n: number): DieSize {
  if (n <= 4) return 4;
  if (n <= 6) return 6;
  if (n <= 8) return 8;
  if (n <= 10) return 10;
  return 12;
}

export function nextDie(size: DieSize): DieSize {
  const i = DIE_SIZES.indexOf(size);
  return DIE_SIZES[Math.min(i + 1, DIE_SIZES.length - 1)];
}

export function defaultDetMax(vig: number, vol: number): number {
  return (vig + vol) * 2;
}

export function defaultChispaMax(apt: number, vol: number): number {
  return (apt + vol) * 2;
}

export function defaultAdrenalina(vig: number): string {
  return `1d4+${vig}`;
}

export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function normalizeStat(raw: Partial<StatBlock> | undefined): StatBlock {
  return {
    valor: Math.max(1, Math.min(8, asNumber(raw?.valor, 2))),
    dado: clampDie(asNumber(raw?.dado, 4)),
  };
}

export function normalizeTalento(raw: Partial<Talento> | undefined): Talento {
  return {
    id: asString(raw?.id) || newId(),
    nombre: asString(raw?.nombre),
    descripcion: asString(raw?.descripcion),
  };
}

function isStatKey(value: unknown): value is StatKey {
  return value === "vig" || value === "agi" || value === "apt" || value === "vol";
}

export function normalizeArma(raw: Partial<Arma> | undefined): Arma {
  return {
    ...normalizeTalento(raw),
    stat: isStatKey(raw?.stat) ? raw.stat : "agi",
    dado: clampDie(asNumber(raw?.dado, 6)),
  };
}

function emptyTalentos(count: number): Talento[] {
  return Array.from({ length: count }, () => ({
    id: newId(),
    nombre: "",
    descripcion: "",
  }));
}

function emptyLines(count: number): string[] {
  return Array.from({ length: count }, () => "");
}

const LEGACY_LIST_COUNTS = {
  equipo: 11,
  dominio: 6,
  maestrias: 6,
  armas: 5,
} as const;

function isBlankText(value: string): boolean {
  return value.trim() === "";
}

function isBlankTalento(item: Talento): boolean {
  return isBlankText(item.nombre) && isBlankText(item.descripcion);
}

function dropLegacyBlanks<T>(list: T[], legacyCount: number, isBlank: (item: T) => boolean): T[] {
  if (list.length < legacyCount) return list;
  return list.filter((item) => !isBlank(item));
}

function keptLines(raw: unknown, legacyCount: number): string[] {
  const list = Array.isArray(raw) ? raw.map((line) => asString(line)) : [];
  return dropLegacyBlanks(list, legacyCount, isBlankText);
}

function keptTalentos(raw: unknown, legacyCount: number): Talento[] {
  const list = Array.isArray(raw) ? raw.map((item) => normalizeTalento(item as Partial<Talento>)) : [];
  return dropLegacyBlanks(list, legacyCount, isBlankTalento);
}

function keptArmas(raw: unknown, legacyCount: number): Arma[] {
  const list = Array.isArray(raw) ? raw.map((item) => normalizeArma(item as Partial<Arma>)) : [];
  return dropLegacyBlanks(list, legacyCount, isBlankTalento);
}

function padTalentos(raw: unknown, count: number): Talento[] {
  const list = Array.isArray(raw) ? raw.map((t) => normalizeTalento(t as Partial<Talento>)) : [];
  const padded = [...list];
  while (padded.length < count) padded.push({ id: newId(), nombre: "", descripcion: "" });
  return padded.slice(0, Math.max(count, list.length));
}

function padLines(raw: unknown, count: number): string[] {
  const list = Array.isArray(raw) ? raw.map((s) => asString(s)) : [];
  const padded = [...list];
  while (padded.length < count) padded.push("");
  return padded.slice(0, Math.max(count, list.length));
}

export function makeCharacter(): AlborCharacter {
  const stats: Stats = {
    vig: { valor: 2, dado: 4 },
    agi: { valor: 2, dado: 4 },
    apt: { valor: 2, dado: 4 },
    vol: { valor: 2, dado: 4 },
  };
  const detMax = defaultDetMax(stats.vig.valor, stats.vol.valor);
  const chispaMax = defaultChispaMax(stats.apt.valor, stats.vol.valor);
  return {
    id: newId(),
    ownerId: null,
    nombre: "Nuevo personaje",
    concepto: "",
    linaje: "",
    ocupacion: "",
    rol: "",
    nivel: 1,
    tamano: "1",
    stats,
    det: { actual: detMax, max: detMax },
    chispa: { actual: chispaMax, max: chispaMax },
    reservaDet: detMax * 2,
    reservaChispa: chispaMax * 2,
    suerte: { actual: 10, max: 10 },
    heridas: { actual: 0, max: 1 },
    adrenalina: defaultAdrenalina(stats.vig.valor),
    mov: stats.agi.valor * 2,
    dp: 0,
    talentos: [],
    notas: "",
    lazos: emptyTalentos(PAGE2_COUNTS.lazos),
    etiquetas: emptyLines(PAGE2_COUNTS.etiquetas),
    equipo: [],
    dominio: [],
    maestrias: [],
    armas: [],
  };
}

export function normalizeCharacter(raw: Partial<AlborCharacter> | undefined): AlborCharacter {
  const base = makeCharacter();
  const stats: Stats = {
    vig: normalizeStat(raw?.stats?.vig),
    agi: normalizeStat(raw?.stats?.agi),
    apt: normalizeStat(raw?.stats?.apt),
    vol: normalizeStat(raw?.stats?.vol),
  };
  const detMax = asNumber(raw?.det?.max, defaultDetMax(stats.vig.valor, stats.vol.valor));
  const chispaMax = asNumber(raw?.chispa?.max, defaultChispaMax(stats.apt.valor, stats.vol.valor));
  return {
    ...base,
    ...raw,
    id: asString(raw?.id) || base.id,
    ownerId: typeof raw?.ownerId === "string" || raw?.ownerId === null ? raw.ownerId : null,
    nombre: asString(raw?.nombre, base.nombre),
    concepto: asString(raw?.concepto),
    linaje: asString(raw?.linaje),
    ocupacion: asString(raw?.ocupacion),
    rol: asString(raw?.rol),
    nivel: asNumber(raw?.nivel, 1),
    tamano: asString(raw?.tamano, "1"),
    stats,
    det: {
      actual: asNumber(raw?.det?.actual, detMax),
      max: detMax,
    },
    chispa: {
      actual: asNumber(raw?.chispa?.actual, chispaMax),
      max: chispaMax,
    },
    reservaDet: asNumber(raw?.reservaDet, detMax * 2),
    reservaChispa: asNumber(raw?.reservaChispa, chispaMax * 2),
    suerte: {
      actual: asNumber(raw?.suerte?.actual, 10),
      max: asNumber(raw?.suerte?.max, 10),
    },
    heridas: {
      actual: asNumber(raw?.heridas?.actual, 0),
      max: asNumber(raw?.heridas?.max, 1),
    },
    adrenalina: asString(raw?.adrenalina, defaultAdrenalina(stats.vig.valor)),
    mov: asNumber(raw?.mov, stats.agi.valor * 2),
    dp: asNumber(raw?.dp, 0),
    talentos: Array.isArray(raw?.talentos) ? raw.talentos.map((t) => normalizeTalento(t)) : [],
    notas: asString(raw?.notas),
    lazos: padTalentos(raw?.lazos, PAGE2_COUNTS.lazos),
    etiquetas: padLines(raw?.etiquetas, PAGE2_COUNTS.etiquetas),
    equipo: keptLines(raw?.equipo, LEGACY_LIST_COUNTS.equipo),
    dominio: keptLines(raw?.dominio, LEGACY_LIST_COUNTS.dominio),
    maestrias: keptTalentos(raw?.maestrias, LEGACY_LIST_COUNTS.maestrias),
    armas: keptArmas(raw?.armas, LEGACY_LIST_COUNTS.armas),
  };
}

export function copySheetOnto(assigned: AlborCharacter, local: AlborCharacter): AlborCharacter {
  return {
    ...normalizeCharacter(local),
    id: assigned.id,
    ownerId: assigned.ownerId,
  };
}

export function makeDiceRollLogEntry(
  input: Omit<DiceRollLogEntry, "id" | "timestamp">,
): DiceRollLogEntry {
  return {
    ...input,
    id: newId(),
    timestamp: Date.now(),
  };
}

export function formatFaceList(faces: number[]): string {
  return faces.join(" + ");
}

export const DIFFICULTY_MIN = 1;
export const DIFFICULTY_MAX = 30;
export const DIFFICULTY_DEFAULT = 9;

export function formatDifficulty(target: number): string {
  const band = BANDS.find((b) => b.target === target);
  return band ? `${band.letter}(${target})` : String(target);
}

export function interpretOutcome(total: number, target: number): Outcome {
  const delta = total - target;
  if (delta > 5) return "extra";
  if (delta >= 0) return "exito";
  if (delta >= -2) return "limitado";
  return "fracaso";
}

export function outcomeLabel(outcome: Outcome): string {
  switch (outcome) {
    case "extra":
      return "Éxito extra";
    case "exito":
      return "Éxito";
    case "limitado":
      return "Éxito limitado";
    case "fracaso":
      return "Fracaso";
  }
}

/** Crítico: 3+ dados d6 o mayores, y al menos 3 caras pares >= 6. */
export function isCritical(faces: number[], dieSize: DieSize): boolean {
  if (faces.length < 3 || dieSize < 6) return false;
  const hits = faces.filter((n) => n >= 6 && n % 2 === 0);
  return hits.length >= 3;
}
