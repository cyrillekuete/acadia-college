export const CAMEROON_REGIONS = [
  'Adamawa',
  'Centre',
  'East',
  'Far North',
  'Littoral',
  'North',
  'North-West',
  'South',
  'South-West',
  'West',
] as const;

export type CameroonRegion = (typeof CAMEROON_REGIONS)[number];

const CITIES_BY_REGION: Record<CameroonRegion, readonly string[]> = {
  Adamawa: [
    'Ngaoundéré',
    'Meiganga',
    'Banyo',
    'Tibati',
    'Tignère',
    'Bankim',
    'Kontcha',
  ],
  Centre: [
    'Yaoundé',
    'Mbalmayo',
    'Obala',
    'Mfou',
    'Akonolinga',
    'Bafia',
    'Eséka',
    'Monatélé',
    'Ngomedzap',
    'Nanga Eboko',
  ],
  East: [
    'Bertoua',
    'Abong-Mbang',
    'Batouri',
    'Yokadouma',
    'Belabo',
    'Dimako',
    'Doumé',
  ],
  'Far North': [
    'Maroua',
    'Kousséri',
    'Mora',
    'Kaélé',
    'Mokolo',
    'Yagoua',
    'Waza',
    'Maga',
  ],
  Littoral: [
    'Douala',
    'Edéa',
    'Nkongsamba',
    'Loum',
    'Manjo',
    'Mbanga',
    'Penja',
    'Yabassi',
  ],
  North: [
    'Garoua',
    'Guider',
    'Pitoa',
    'Lagdo',
    'Poli',
    'Tcholliré',
    'Figuil',
  ],
  'North-West': [
    'Bamenda',
    'Kumbo',
    'Wum',
    'Ndop',
    'Fundong',
    'Mbengwi',
    'Nkambe',
    'Bafut',
  ],
  South: [
    'Ebolowa',
    'Kribi',
    'Sangmélima',
    'Ambam',
    'Lolodorf',
    'Mvangan',
    'Campo',
  ],
  'South-West': [
    'Buea',
    'Limbe',
    'Kumba',
    'Mamfe',
    'Tiko',
    'Mutengene',
    'Idenau',
    'Mundemba',
  ],
  West: [
    'Bafoussam',
    'Dschang',
    'Mbouda',
    'Foumban',
    'Bandjoun',
    'Bangangté',
    'Bafang',
    'Magba',
  ],
};

export function isCameroonRegion(value: string): value is CameroonRegion {
  return (CAMEROON_REGIONS as readonly string[]).includes(value);
}

export function getCitiesForRegion(region: string): string[] {
  if (!isCameroonRegion(region)) {
    return [];
  }
  return [...CITIES_BY_REGION[region]];
}

export function filterCities(region: string, query: string): string[] {
  const cities = getCitiesForRegion(region);
  const q = query.trim().toLowerCase();
  if (!q) {
    return cities;
  }
  return cities.filter((city) => city.toLowerCase().includes(q));
}

export function isCityInRegion(region: string, city: string): boolean {
  if (!city.trim()) {
    return true;
  }
  const cities = getCitiesForRegion(region);
  const normalized = city.trim().toLowerCase();
  return cities.some((c) => c.toLowerCase() === normalized);
}
