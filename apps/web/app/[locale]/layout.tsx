import { notFound } from 'next/navigation';

const locales = ['en', 'am'] as const;

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{ children: React.ReactNode; params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  if (!locales.includes(locale as (typeof locales)[number])) notFound();

  return (
    <html lang={locale} dir="ltr">
      <body>{children}</body>
    </html>
  );
}
