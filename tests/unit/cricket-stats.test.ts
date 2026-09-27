// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  parseOversToBalls,
  formatOvers,
  oversAsDecimal,
  toCount,
  deriveBattingStats,
  deriveBowlingStats,
  deriveStats,
  formatStatHeadline,
  formatRateLabel,
  formatRateValue,
  toStatTiles,
  formatRoleTag,
  BALLS_PER_OVER,
} from '../../lib/cricket-stats';

describe('toCount', () => {
  it('coerces numeric input to a non-negative integer', () => {
    expect(toCount(42)).toBe(42);
    expect(toCount(4.9)).toBe(4);
    expect(toCount(-7)).toBe(0);
    expect(toCount(Number.NaN)).toBe(0);
    expect(toCount(Number.POSITIVE_INFINITY)).toBe(0);
  });

  it('parses string input and ignores anything unparseable', () => {
    expect(toCount('58')).toBe(58);
    expect(toCount(' 12 ')).toBe(12);
    expect(toCount('-3')).toBe(0);
    expect(toCount('abc')).toBe(0);
    expect(toCount('')).toBe(0);
  });

  it('rejects values that are not a string or number', () => {
    expect(toCount(null)).toBe(0);
    expect(toCount(undefined)).toBe(0);
    expect(toCount({})).toBe(0);
  });
});

describe('parseOversToBalls', () => {
  it('reads cricket notation rather than decimal overs', () => {
    // The headline case: 4 overs and 3 balls is 27 deliveries, not 25.8.
    expect(parseOversToBalls('4.3')).toBe(27);
    expect(parseOversToBalls('4.0')).toBe(24);
    expect(parseOversToBalls('4')).toBe(24);
    expect(parseOversToBalls('0.3')).toBe(3);
  });

  it('treats a number exactly like its string form', () => {
    // A number input from a form control must not silently mean decimal overs.
    expect(parseOversToBalls(4.3)).toBe(parseOversToBalls('4.3'));
    expect(parseOversToBalls(4.3)).toBe(27);
    expect(parseOversToBalls(4)).toBe(24);
    expect(parseOversToBalls(4.0)).toBe(24);
    expect(parseOversToBalls(0.3)).toBe(3);
  });

  it('does not lose a ball to floating point noise', () => {
    // 0.1 + 0.2 is 0.30000000000000004 in IEEE 754; the intended value is 0.3
    // overs, i.e. 3 balls. Truncating instead of rounding would yield 2.
    const noisy = 0.1 + 0.2;
    const balls = parseOversToBalls(noisy);

    expect(balls).toBeGreaterThanOrEqual(2.5);
    expect(balls).toBeLessThanOrEqual(3.5);
    expect(parseOversToBalls(12.3)).toBe(12 * BALLS_PER_OVER + 3);
  });

  it('carries a 6-ball remainder into a whole over', () => {
    expect(parseOversToBalls('4.6')).toBe(30);
    expect(parseOversToBalls(4.6)).toBe(30);
    expect(formatOvers(parseOversToBalls('4.6'))).toBe('5.0');
  });

  it('clamps an out-of-range remainder instead of inventing overs', () => {
    // A remainder above 5 is not cricket notation; it carries into a whole over.
    expect(parseOversToBalls('4.9')).toBe(30);
    expect(parseOversToBalls(12.7)).toBe(13 * BALLS_PER_OVER);
  });

  it('discards a multi-digit remainder, which is not cricket notation', () => {
    expect(parseOversToBalls('4.25')).toBe(24);
  });

  it('returns 0 for empty, zero and negative input', () => {
    expect(parseOversToBalls('')).toBe(0);
    expect(parseOversToBalls('   ')).toBe(0);
    expect(parseOversToBalls(0)).toBe(0);
    expect(parseOversToBalls(-4)).toBe(0);
    expect(parseOversToBalls(Number.NaN)).toBe(0);
  });
});

describe('formatOvers and oversAsDecimal', () => {
  it('round-trips balls through cricket notation', () => {
    expect(formatOvers(27)).toBe('4.3');
    expect(formatOvers(24)).toBe('4.0');
    expect(formatOvers(30)).toBe('5.0');
    expect(formatOvers(0)).toBe('0.0');
  });

  it('converts balls to the decimal used for rate maths', () => {
    expect(oversAsDecimal(27)).toBe(4.5);
    expect(oversAsDecimal(24)).toBe(4);
    expect(oversAsDecimal(0)).toBe(0);
  });
});

describe('deriveBattingStats', () => {
  const input = { runs: 78, balls: 52, fours: 9, sixes: 2, dotBalls: 21 };

  it('derives strike rate from runs and balls faced', () => {
    const stats = deriveBattingStats(input);

    // 78 / 52 * 100 = 150
    expect(stats.strikeRate).toBe(150);
    expect(stats.role).toBe('BATSMAN');
  });

  it('derives boundary runs and percentages', () => {
    const stats = deriveBattingStats(input);

    expect(stats.boundaryRuns).toBe(9 * 4 + 2 * 6);
    // 48 boundary runs off 78 runs
    expect(stats.boundaryPercent).toBe(61.5);
    // 21 dots off 52 balls = 40.384...%
    expect(stats.dotBallPercent).toBeCloseTo(40.4, 1);
  });

  it('does not accept pre-computed rates from the caller', () => {
    const stats = deriveBattingStats({ ...input, strikeRate: 999 } as never);

    expect(stats.strikeRate).toBe(150);
  });

  it('returns 0 rates rather than NaN or Infinity on empty input', () => {
    const stats = deriveBattingStats({ runs: 0, balls: 0, fours: 0, sixes: 0, dotBalls: 0 });

    expect(stats.strikeRate).toBe(0);
    expect(stats.boundaryPercent).toBe(0);
    expect(stats.dotBallPercent).toBe(0);
  });
});

describe('deriveBowlingStats', () => {
  const input = {
    runsConceded: 18,
    wickets: 2,
    overs: '4.3',
    maidenOvers: 1,
    dotBalls: 14,
    wides: 3,
    noBalls: 1,
  };

  it('derives legal deliveries and both overs representations', () => {
    const stats = deriveBowlingStats(input);

    expect(stats.balls).toBe(27);
    expect(stats.overs).toBe(4.5);
    expect(stats.oversDisplay).toBe('4.3');
    expect(stats.role).toBe('BOWLER');
  });

  it('derives economy, bowling strike rate and average', () => {
    const stats = deriveBowlingStats(input);

    // 18 runs over 4.5 decimal overs
    expect(stats.economy).toBe(4);
    // 27 balls / 2 wickets
    expect(stats.bowlingStrikeRate).toBe(13.5);
    // 18 runs / 2 wickets
    expect(stats.average).toBe(9);
  });

  it('returns 0 rates rather than NaN or Infinity when nobody was bowled to', () => {
    const stats = deriveBowlingStats({
      runsConceded: 0,
      wickets: 0,
      overs: '0',
      maidenOvers: 0,
      dotBalls: 0,
      wides: 0,
      noBalls: 0,
    });

    expect(stats.economy).toBe(0);
    expect(stats.bowlingStrikeRate).toBe(0);
    expect(stats.average).toBe(0);
  });

  it('is insensitive to whether overs arrive as a number or a string', () => {
    const fromString = deriveBowlingStats({ ...input, overs: '4.3' });
    const fromNumber = deriveBowlingStats({ ...input, overs: 4.3 });

    expect(fromNumber).toEqual(fromString);
  });
});

describe('deriveStats dispatch', () => {
  it('routes BATSMAN to batting and BOWLER to bowling', () => {
    const batting = deriveStats('BATSMAN', { runs: 10, balls: 5, fours: 1, sixes: 0, dotBalls: 2 });
    const bowling = deriveStats('BOWLER', {
      runsConceded: 10,
      wickets: 1,
      overs: '2.0',
      maidenOvers: 0,
      dotBalls: 4,
      wides: 0,
      noBalls: 0,
    });

    expect(batting.role).toBe('BATSMAN');
    expect(bowling.role).toBe('BOWLER');
  });
});

describe('presentation helpers', () => {
  const batting = deriveBattingStats({ runs: 78, balls: 52, fours: 9, sixes: 2, dotBalls: 21 });
  const bowling = deriveBowlingStats({
    runsConceded: 18,
    wickets: 2,
    overs: '4.3',
    maidenOvers: 1,
    dotBalls: 14,
    wides: 3,
    noBalls: 1,
  });

  it('formats a role-specific headline', () => {
    expect(formatStatHeadline(batting)).toBe('78 (52)');
    expect(formatStatHeadline(bowling)).toBe('2/18 (4.3)');
  });

  it('labels and formats the headline rate per role', () => {
    expect(formatRateLabel(batting)).toBe('Strike Rate');
    expect(formatRateValue(batting)).toBe('150.0');

    expect(formatRateLabel(bowling)).toBe('Economy');
    expect(formatRateValue(bowling)).toBe('4.00');
  });

  it('shows a placeholder instead of a misleading zero rate', () => {
    const empty = deriveBattingStats({ runs: 0, balls: 0, fours: 0, sixes: 0, dotBalls: 0 });

    expect(formatRateValue(empty)).toBe('--');
  });

  it('builds tiles with exactly one primary emphasis', () => {
    for (const stats of [batting, bowling]) {
      const tiles = toStatTiles(stats);

      expect(tiles).toHaveLength(6);
      expect(tiles.filter((tile) => tile.emphasis === 'primary')).toHaveLength(1);
    }
  });

  it('gives the role a display tag', () => {
    expect(formatRoleTag(batting)).toBe('Batting');
    expect(formatRoleTag(bowling)).toBe('Bowling');
  });
});
