import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['hy', 'ru', 'en'] as const,
  defaultLocale: 'hy',
  localePrefix: 'always',
});
