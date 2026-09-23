import { describe, expect, it } from 'vitest';
import {
  classicTermGroupRollup,
  classicTermSubjectCells,
  disciplineAbsenceTotal,
  formatClassicAverage,
} from '@/lib/acadia/classic-term-bulletin';

describe('classic term bulletin totals', () => {
  it('averages sequence marks and sums them for the total column', () => {
    expect(classicTermSubjectCells([15, 18])).toEqual({
      sequences: [15, 18],
      average: 16.5,
      total: 33,
    });
    expect(formatClassicAverage(16.5)).toBe('16.5');
    expect(formatClassicAverage(15)).toBe('15');
  });

  it('sums group coefficients, averages, and totals, and passes on the weighted average', () => {
    const rollup = classicTermGroupRollup([
      { coefficient: 4, average: 16.5, total: 33 },
      { coefficient: 4, average: 16.5, total: 33 },
    ]);
    expect(rollup.coefficient).toBe(8);
    expect(rollup.average).toBe(33);
    expect(rollup.total).toBe(66);
    expect(rollup.weightedAverage).toBe(16.5);
    expect(rollup.passed).toBe(true);
  });

  it('adds justified and unjustified absences', () => {
    expect(disciplineAbsenceTotal({ absences: 1, justifiedAbsences: 2 })).toBe(3);
    expect(disciplineAbsenceTotal({ absences: 4 })).toBe(4);
  });
});
