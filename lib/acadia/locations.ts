import { City, Country, State } from 'country-state-city';
import {
  CAMEROON_REGIONS,
  filterCities as filterCameroonCities,
  getCitiesForRegion as getCameroonCitiesForRegion,
  isCityInRegion as isCameroonCityInRegion,
} from '@/lib/acadia/cameroon-locations';
import { getCountryByName } from '@/lib/acadia/countries';

const CAMEROON_ISO = 'CM';
const MAX_CITY_RESULTS = 25;

export type LocationRegion = {
  value: string;
  label: string;
};

export function getCountryIsoCode(countryName: string): string | undefined {
  const trimmed = countryName.trim();
  if (!trimmed) {
    return undefined;
  }

  const fromList = getCountryByName(trimmed);
  if (fromList) {
    return fromList.code;
  }

  const match = Country.getAllCountries().find(
    (country) => country.name.toLowerCase() === trimmed.toLowerCase(),
  );
  return match?.isoCode;
}

export function getRegionsForCountry(countryName: string): LocationRegion[] {
  const iso = getCountryIsoCode(countryName);
  if (!iso) {
    return [];
  }

  if (iso === CAMEROON_ISO) {
    return CAMEROON_REGIONS.map((region) => ({
      value: region,
      label: region,
    }));
  }

  return State.getStatesOfCountry(iso).map((state) => ({
    value: state.name,
    label: state.name,
  }));
}

export function countryRequiresRegion(countryName: string): boolean {
  return getRegionsForCountry(countryName).length > 0;
}

function getStateIsoCode(countryIso: string, regionName: string): string | undefined {
  const states = State.getStatesOfCountry(countryIso);
  const normalized = regionName.trim().toLowerCase();
  return states.find((state) => state.name.toLowerCase() === normalized)?.isoCode;
}

export function getCitiesForLocation(countryName: string, region?: string): string[] {
  const iso = getCountryIsoCode(countryName);
  if (!iso) {
    return [];
  }

  if (iso === CAMEROON_ISO) {
    return region?.trim() ? getCameroonCitiesForRegion(region) : [];
  }

  const regionName = region?.trim();
  if (regionName) {
    const stateIso = getStateIsoCode(iso, regionName);
    if (!stateIso) {
      return [];
    }
    return City.getCitiesOfState(iso, stateIso).map((city) => city.name);
  }

  const states = State.getStatesOfCountry(iso);
  if (states.length > 0) {
    return [];
  }

  return (City.getCitiesOfCountry(iso) ?? []).map((city) => city.name);
}

function applyCityQuery(cities: string[], query: string): string[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return cities.slice(0, MAX_CITY_RESULTS);
  }
  return cities
    .filter((city) => city.toLowerCase().includes(normalized))
    .slice(0, MAX_CITY_RESULTS);
}

export function filterCities(
  countryName: string,
  region: string | undefined,
  query: string,
): string[] {
  const iso = getCountryIsoCode(countryName);
  if (!iso) {
    return [];
  }

  if (iso === CAMEROON_ISO) {
    if (!region?.trim()) {
      return [];
    }
    return filterCameroonCities(region, query).slice(0, MAX_CITY_RESULTS);
  }

  const cities = getCitiesForLocation(countryName, region);
  return applyCityQuery(cities, query);
}

export function isCityValidForLocation(
  countryName: string,
  region: string | undefined,
  city: string,
): boolean {
  if (!city.trim()) {
    return true;
  }

  const iso = getCountryIsoCode(countryName);
  if (!iso) {
    return true;
  }

  if (iso === CAMEROON_ISO && region?.trim()) {
    return isCameroonCityInRegion(region, city);
  }

  const cities = getCitiesForLocation(countryName, region);
  const normalized = city.trim().toLowerCase();
  return cities.some((entry) => entry.toLowerCase() === normalized);
}
