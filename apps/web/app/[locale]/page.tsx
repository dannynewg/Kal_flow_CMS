import Link from 'next/link';

const content = {
  en: {
    eyebrow: 'Development foundation',
    title: 'Contracts, made clear.',
    lede: 'Kal_flow is being built for secure, bilingual contract management across Ethiopian organizations.',
    api: 'API foundation', worker: 'Background jobs', database: 'Database layer', ready: 'Ready', language: 'አማርኛ', target: '/am',
  },
  am: {
    eyebrow: 'የልማት መሠረት',
    title: 'ግልጽ የውል አስተዳደር።',
    lede: 'Kal_flow ለኢትዮጵያ ድርጅቶች ደህንነቱ የተጠበቀ ባለሁለት ቋንቋ የውል አስተዳደር ስርዓት ሆኖ እየተገነባ ነው።',
    api: 'የAPI መሠረት', worker: 'የጀርባ ሥራዎች', database: 'የውሂብ ጎታ', ready: 'ዝግጁ', language: 'English', target: '/en',
  },
} as const;

export default async function Dashboard({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const copy = content[locale as keyof typeof content] ?? content.en;

  return (
    <main className="shell">
      <section className="hero">
        <div className="eyebrow">{copy.eyebrow}</div>
        <h1>{copy.title}</h1>
        <p className="lede">{copy.lede}</p>
        <div className="switcher"><Link href={copy.target}>{copy.language}</Link></div>
        <div className="grid">
          {[copy.api, copy.worker, copy.database].map((name) => (
            <article className="card" key={name}><strong>{name}</strong><span className="status">● {copy.ready}</span></article>
          ))}
        </div>
      </section>
    </main>
  );
}
