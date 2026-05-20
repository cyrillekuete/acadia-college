import { describe, expect, it } from 'vitest';
import { CAMEROON_REGIONS } from '@/lib/acadia/cameroon-locations';
import {
  countryRequiresRegion,
  filterCities,
  getCountryIsoCode,
  getRegionsForCountry,
  isCityValidForLocation,
} from '@/lib/acadia/locations';

describe('locations helpers', () => {
  it('resolves Cameroon ISO code', () => {
    expect(getCountryIsoCode('Cameroon')).toBe('CM');
  });

  it('returns 10 Cameroon regions', () => {
    const regions = getRegionsForCountry('Cameroon');
    expect(regions).toHaveLength(CAMEROON_REGIONS.length);
    expect(regions.map((r) => r.value)).toEqual([...CAMEROON_REGIONS]);
  });

  it('returns regions for Nigeria', () => {
    const regions = getRegionsForCountry('Nigeria');
    expect(regions.length).toBeGreaterThan(0);
  });

  it('filters Cameroon cities by query', () => {
    const results = filterCities('Cameroon', 'Centre', 'ya');
    expect(results.some((city) => city.toLowerCase().includes('yaound'))).toBe(true);
  });

  it('validates Cameroon city in region', () => {
    expect(isCityValidForLocation('Cameroon', 'Centre', 'Yaoundé')).toBe(true);
    expect(isCityValidForLocation('Cameroon', 'Centre', 'Douala')).toBe(false);
  });

  it('invalidates city when region changes', () => {
    expect(isCityValidForLocation('Cameroon', 'Littoral', 'Douala')).toBe(true);
    expect(isCityValidForLocation('Cameroon', 'Centre', 'Douala')).toBe(false);
  });

  it('requires region for Cameroon', () => {
    expect(countryRequiresRegion('Cameroon')).toBe(true);
  });
});
