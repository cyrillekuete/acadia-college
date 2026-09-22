import { describe, expect, it } from 'vitest';
import {
  dobInputToIsoDate,
  formatDobInputFromIso,
  formatDobWhileTyping,
  parseDobInput,
} from '@/lib/acadia/dates';

describe('dob date helpers', () => {
  it('parses valid DD-MM-YYYY', () => {
    const date = parseDobInput('15-03-2010');
    expect(date?.getFullYear()).toBe(2010);
    expect(date?.getMonth()).toBe(2);
    expect(date?.getDate()).toBe(15);
  });

  it('rejects empty and invalid patterns', () => {
    expect(parseDobInput('')).toBeUndefined();
    expect(parseDobInput('15/03/2010')).toBeUndefined();
    expect(parseDobInput('32-01-2010')).toBeUndefined();
    expect(parseDobInput('15-13-2010')).toBeUndefined();
  });

  it('rejects future dates', () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    const day = String(future.getDate()).padStart(2, '0');
    const month = String(future.getMonth() + 1).padStart(2, '0');
    const year = String(future.getFullYear());
    expect(parseDobInput(`${day}-${month}-${year}`)).toBeUndefined();
  });

  it('accepts leap day on leap years', () => {
    expect(parseDobInput('29-02-2020')).toBeDefined();
    expect(parseDobInput('29-02-2021')).toBeUndefined();
  });

  it('converts between ISO and DOB input formats', () => {
    expect(dobInputToIsoDate('01-09-2015')).toBe('2015-09-01');
    expect(formatDobInputFromIso('2015-09-01')).toBe('01-09-2015');
  });

  it('formats digits while typing', () => {
    expect(formatDobWhileTyping('1')).toBe('1');
    expect(formatDobWhileTyping('1503')).toBe('15-03');
    expect(formatDobWhileTyping('15032010')).toBe('15-03-2010');
    expect(formatDobWhileTyping('15-03-2010x')).toBe('15-03-2010');
  });
});
