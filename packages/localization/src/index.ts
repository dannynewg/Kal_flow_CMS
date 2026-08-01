import am from '../locales/am/common.json';
import en from '../locales/en/common.json';

export const supportedLocales = ['en', 'am'] as const;
export type SupportedLocale = (typeof supportedLocales)[number];
export const messages = { en, am } as const;
