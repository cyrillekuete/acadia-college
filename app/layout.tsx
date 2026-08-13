import { ReactNode, Suspense } from 'react';
import { cookies } from 'next/headers';
import { Inter } from 'next/font/google';
import { cn } from '@/lib/utils';
import { SettingsProvider } from '@/providers/settings-provider';
import { TooltipsProvider } from '@/providers/tooltips-provider';
import { Toaster } from '@/components/ui/sonner';
import { Metadata } from 'next';
import { I18nProvider } from '@/providers/i18n-provider';
import { ModulesProvider } from '@/providers/modules-provider';
import { QueryProvider } from '@/providers/query-provider';
import { ThemeProvider } from '@/providers/theme-provider';
import { LANGUAGE_COOKIE, parseUiLocale } from '@/lib/acadia/locale';

const inter = Inter({ subsets: ['latin'] });

import '@/css/styles.css';

export const metadata: Metadata = {
  title: {
    template: '%s | Acadia College',
    default: 'Acadia College',
  },
  description: 'School management for Acadia College',
};

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const cookieStore = await cookies();
  const lang = parseUiLocale(cookieStore.get(LANGUAGE_COOKIE)?.value);

  return (
    <html lang={lang} className="h-full" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={cn(
          'antialiased flex h-full text-base text-foreground bg-background',
          inter.className,
        )}
      >
        <QueryProvider>
          <SettingsProvider>
            <ThemeProvider>
              <I18nProvider>
                <TooltipsProvider>
                  <ModulesProvider>
                    <Suspense>{children}</Suspense>
                    <Toaster />
                  </ModulesProvider>
                </TooltipsProvider>
              </I18nProvider>
            </ThemeProvider>
          </SettingsProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
