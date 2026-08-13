export interface Language {
  code: string;
  name: string;
  shortName: string;
  direction: 'ltr' | 'rtl';
  flag: string;
}

export const I18N_LANGUAGES: Language[] = [
  {
    code: 'en',
    name: 'English',
    shortName: 'EN',
    direction: 'ltr',
    flag: '/media/flags/united-kingdom.svg',
  },
  {
    code: 'fr',
    name: 'Français',
    shortName: 'FR',
    direction: 'ltr',
    flag: '/media/flags/france.svg',
  },
];

export const I18N_SUPPORTED_LNGS = I18N_LANGUAGES.map((language) => language.code);
