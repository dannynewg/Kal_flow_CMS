import Link from 'next/link';
import { auth, signIn, signOut } from '../../auth';
import { ContractWorkspace } from './workspace';

const content = { en: { title: 'Contracts, from request to signature.', body: 'A secure, auditable workspace designed for Ethiopian organizations.', signIn: 'Continue with secure sign in', language: 'አማርኛ', target: '/am', trust: ['Tenant-isolated', 'Role-controlled', 'Audit-ready'] }, am: { title: 'ውሎችን ከጥያቄ እስከ ፊርማ ያስተዳድሩ።', body: 'ለኢትዮጵያ ድርጅቶች የተዘጋጀ ደህንነቱ የተጠበቀና ኦዲት የሚደረግ የሥራ ቦታ።', signIn: 'በደህንነት ይግቡ', language: 'English', target: '/en', trust: ['የድርጅት ውሂብ ተለይቶ የተጠበቀ', 'በሚና የሚቆጣጠር', 'ለኦዲት ዝግጁ'] } } as const;

export default async function Dashboard({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: requestedLocale } = await params;
  const locale = requestedLocale === 'am' ? 'am' : 'en';
  const page = content[locale];
  const session = await auth();
  if (session?.user) {
    const signOutAction = async () => { 'use server'; await signOut({ redirectTo: `/${locale}` }); };
    return <ContractWorkspace locale={locale} email={session.user.email ?? session.user.name ?? 'Kal_flow user'} signOutAction={signOutAction} />;
  }
  return <main className="login-shell"><nav className="login-nav"><div className="brand"><span className="brand-mark">K</span><strong>Kal_flow</strong></div><Link className="language" href={page.target}>{page.language}</Link></nav><section className="login-card"><div className="login-copy"><span className="kicker">Contract management · Ethiopia</span><h1>{page.title}</h1><p>{page.body}</p><div className="trust-row">{page.trust.map((item) => <span key={item}>✓ {item}</span>)}</div></div><div className="login-action"><div className="seal">K</div><h2>Kal_flow workspace</h2><p>Authentication is handled by your organization’s secure identity service.</p><form action={async () => { 'use server'; await signIn('keycloak', { redirectTo: `/${locale}` }); }}><button className="primary" type="submit">{page.signIn} →</button></form><small>Access is logged and subject to organization policy.</small></div></section></main>;
}
