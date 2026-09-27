/**
 * Cricket stat derivation.
 *
 * Every number shown on a SprintNP stat card is computed here from raw player
 * inputs. Nothing in the UI is allowed to accept a pre-computed rate: if a
 * value is not derived, it will drift from the inputs that produced it.
 *
 * All functions are pure and safe to run on the server or the client.
 */

export type PlayerRole = 'BATSMAN' | 'BOWLER';

export const PLAYER_ROLES: readonly PlayerRole[] = ['BATSMAN', 'BOWLER'] as const;

export const BALLS_PER_OVER = 6;

export interface BattingInput {
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  dotBalls: number;
}

export interface BowlingInput {
  runsConceded: number;
  wickets: number;
  /** Overs in cricket notation: `4.3` is 4 overs and 3 balls, not 4.3 decimal. */
  overs: number | string;
  maidenOvers: number;
  dotBalls: number;
  wides: number;
  noBalls: number;
}

export interface DerivedBatting {
  role: 'BATSMAN';
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  dotBalls: number;
  /** runs / balls * 100 */
  strikeRate: number;
  boundaryRuns: number;
  boundaryPercent: number;
  dotBallPercent: number;
}

export interface DerivedBowling {
  role: 'BOWLER';
  runsConceded: number;
  wickets: number;
  /** Legal deliveries bowled, derived from `overs`. */
  balls: number;
  /** Overs as a decimal (4 overs 3 balls = 4.5). */
  overs: number;
  /** Overs in cricket notation (4 overs 3 balls = "4.3"). */
  oversDisplay: string;
  maidenOvers: number;
  dotBalls: number;
  wides: number;
  noBalls: number;
  /** runs conceded / overs. */
  economy: number;
  /** balls / wickets. */
  bowlingStrikeRate: number;
  /** runs conceded / wickets. */
  average: number;
  dotBallPercent: number;
}

export type DerivedStats = DerivedBatting | DerivedBowling;

export function isBowler(role: PlayerRole): boolean {
  return role === 'BOWLER';
}

/** Coerce anything a form control can hand us into a finite, non-negative integer. */
export function toCount(value: unknown): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
  }
  if (typeof value !== 'string') return 0;
  const parsed = Number.parseInt(value.trim(), 10);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/**
 * Parse a cricket overs value into legal deliveries bowled.
 *
 * Cricket notation is `overs.balls`, so `4.3` is 4 overs plus 3 balls (27
 * deliveries) and `4.0` is exactly 4 overs (24 deliveries) - not 4.3 decimal
 * overs. Numbers and strings are read the same way, because a form control
 * that hands us the number `4.3` means the same thing as the text `"4.3"`.
 * A 6-ball remainder carries into a whole over, so `4.6` normalises to `5.0`.
 */
export function parseOversToBalls(overs: number | string): number {
  if (typeof overs === 'number') {
    if (!Number.isFinite(overs) || overs <= 0) return 0;
    const wholeOvers = Math.floor(overs);
    // Round before truncating so float noise such as 0.1 + 0.2 = 0.30000000000000004
    // does not discard the intended ball.
    const balls = Math.round((overs - wholeOvers) * 10);
    return wholeOvers * BALLS_PER_OVER + Math.min(balls, BALLS_PER_OVER);
  }

  const trimmed = overs.trim();
  if (!trimmed) return 0;

  const [wholePart, fractionPart] = trimmed.split('.');
  const wholeOvers = toCount(wholePart);

  if (fractionPart === undefined) {
    return wholeOvers * BALLS_PER_OVER;
  }

  // Only a single digit is meaningful in cricket notation; "4.25" is nonsense.
  const balls = fractionPart.length === 1 ? toCount(fractionPart) : 0;
  return wholeOvers * BALLS_PER_OVER + Math.min(balls, BALLS_PER_OVER);
}

/** Render legal deliveries as cricket overs: 27 balls -> "4.3". */
export function formatOvers(balls: number): string {
  const safeBalls = Math.max(0, Math.trunc(balls));
  const wholeOvers = Math.floor(safeBalls / BALLS_PER_OVER);
  const remainder = safeBalls % BALLS_PER_OVER;
  return `${wholeOvers}.${remainder}`;
}

/** Decimal overs used for rate maths: 27 balls -> 4.5. */
export function oversAsDecimal(balls: number): number {
  return round(Math.max(0, balls) / BALLS_PER_OVER, 3);
}

function percentage(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return round((part / whole) * 100, 1);
}

function divide(numerator: number, denominator: number, decimals: number): number {
  if (denominator <= 0) return 0;
  return round(numerator / denominator, decimals);
}

export function deriveBattingStats(input: BattingInput): DerivedBatting {
  const runs = toCount(input.runs);
  const balls = toCount(input.balls);
  const fours = toCount(input.fours);
  const sixes = toCount(input.sixes);
  const dotBalls = toCount(input.dotBalls);
  const boundaryRuns = fours * 4 + sixes * 6;

  return {
    role: 'BATSMAN',
    runs,
    balls,
    fours,
    sixes,
    dotBalls,
    strikeRate: divide(runs * 100, balls, 1),
    boundaryRuns,
    boundaryPercent: percentage(boundaryRuns, runs),
    dotBallPercent: percentage(dotBalls, balls),
  };
}

export function deriveBowlingStats(input: BowlingInput): DerivedBowling {
  const runsConceded = toCount(input.runsConceded);
  const wickets = toCount(input.wickets);
  const balls = parseOversToBalls(input.overs);
  const overs = oversAsDecimal(balls);
  const maidenOvers = toCount(input.maidenOvers);
  const dotBalls = toCount(input.dotBalls);
  const wides = toCount(input.wides);
  const noBalls = toCount(input.noBalls);

  return {
    role: 'BOWLER',
    runsConceded,
    wickets,
    balls,
    overs,
    oversDisplay: formatOvers(balls),
    maidenOvers,
    dotBalls,
    wides,
    noBalls,
    economy: divide(runsConceded, overs, 2),
    bowlingStrikeRate: divide(balls, wickets, 2),
    average: divide(runsConceded, wickets, 2),
    dotBallPercent: percentage(dotBalls, balls),
  };
}

export function deriveStats(role: PlayerRole, input: BattingInput | BowlingInput): DerivedStats {
  return isBowler(role) ? deriveBowlingStats(input as BowlingInput) : deriveBattingStats(input as BattingInput);
}

/** "78 (52)" for a batter, "4/18 (4.3)" for a bowler. */
export function formatStatHeadline(stats: DerivedStats): string {
  if (stats.role === 'BOWLER') {
    return `${stats.wickets}/${stats.runsConceded} (${stats.oversDisplay})`;
  }
  return `${stats.runs} (${stats.balls})`;
}

/**
 * The headline derived rate. Batters get a strike rate, bowlers an economy
 * rate - the label is deliberately role-specific so the card is never
 * ambiguous.
 */
export function formatRateLabel(stats: DerivedStats): string {
  return stats.role === 'BOWLER' ? 'Economy' : 'Strike Rate';
}

export function formatRateValue(stats: DerivedStats): string {
  if (stats.role === 'BOWLER') {
    return stats.overs > 0 ? stats.economy.toFixed(2) : '--';
  }
  return stats.balls > 0 ? stats.strikeRate.toFixed(1) : '--';
}

export interface StatTile {
  label: string;
  value: string;
  /** Headline tiles are set larger and are the card's primary read. */
  emphasis: 'primary' | 'secondary';
}

/**
 * Flatten derived stats into display tiles so the card component stays a
 * dumb renderer and never has to branch on role.
 */
export function toStatTiles(stats: DerivedStats): StatTile[] {
  if (stats.role === 'BOWLER') {
    return [
      { label: 'Economy', value: formatRateValue(stats), emphasis: 'primary' },
      { label: 'Wickets', value: String(stats.wickets), emphasis: 'secondary' },
      { label: 'Overs', value: stats.oversDisplay, emphasis: 'secondary' },
      { label: 'Runs', value: String(stats.runsConceded), emphasis: 'secondary' },
      { label: 'Avg', value: stats.wickets > 0 ? stats.average.toFixed(2) : '--', emphasis: 'secondary' },
      { label: 'Dots', value: String(stats.dotBalls), emphasis: 'secondary' },
    ];
  }

  return [
    { label: 'Strike Rate', value: formatRateValue(stats), emphasis: 'primary' },
    { label: 'Runs', value: String(stats.runs), emphasis: 'secondary' },
    { label: 'Balls', value: String(stats.balls), emphasis: 'secondary' },
    { label: '4s', value: String(stats.fours), emphasis: 'secondary' },
    { label: '6s', value: String(stats.sixes), emphasis: 'secondary' },
    { label: 'Dots', value: String(stats.dotBalls), emphasis: 'secondary' },
  ];
}

/** The role shown as a pill on the stat card overlay. */
export function formatRoleTag(stats: DerivedStats): string {
  return stats.role === 'BOWLER' ? 'Bowling' : 'Batting';
}
