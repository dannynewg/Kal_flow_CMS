import Link from 'next/link';
import { auth, signIn, signOut } from '../../auth';
import { ContractWorkspace } from './workspace';

const content = {
  en: { title: 'Contracts, from request to signature.', body: 'A secure, auditable workspace designed for Ethiopian organizations.', signIn: 'Continue with secure sign in', language: 'አማርኛ', target: '/am', kicker: 'Contract management · Ethiopia', workspace: 'Kal_flow workspace', auth: 'Authentication is handled by your organization’s secure identity service.', policy: 'Access is logged and subject to organization policy.', trust: ['Tenant-isolated', 'Role-controlled', 'Audit-ready'] },
  am: { title: 'ውሎችን ከጥያቄ እስከ ፊርማ ያስተዳድሩ።', body: 'ለኢትዮጵያ ድርጅቶች የተዘጋጀ ደህንነቱ የተጠበቀና ለኦዲት ዝግጁ የሥራ ቦታ።', signIn: 'በደህንነት ይግቡ', language: 'English', target: '/en', kicker: 'የውል አስተዳደር · ኢትዮጵያ', workspace: 'የKal_flow የሥራ ቦታ', auth: 'መግቢያዎ በድርጅትዎ ደህንነቱ የተጠበቀ የማንነት አገልግሎት ይከናወናል።', policy: 'መዳረሻዎ ይመዘገባል፤ የድርጅትዎን ደንብ ይከተላል።', trust: ['የድርጅት ውሂብ ተለይቶ የተጠበቀ', 'በሚና የሚቆጣጠር', 'ለኦዲት ዝግጁ'] },
} as const;

export default async function Dashboard({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: requestedLocale } = await params;
  const locale = requestedLocale === 'am' ? 'am' : 'en';
  const page = content[locale];
  const session = await auth();
  if (session?.user) {
    const signOutAction = async () => {
      'use server';
      const returnTo = `${process.env.WEB_URL ?? process.env.AUTH_URL ?? 'http://localhost:3000'}/${locale}`;
      const keycloakLogout = new URL(`${process.env.KEYCLOAK_URL ?? 'http://localhost:8080'}/realms/${process.env.KEYCLOAK_REALM ?? 'kal-flow'}/protocol/openid-connect/logout`);
      keycloakLogout.searchParams.set('post_logout_redirect_uri', returnTo);
      keycloakLogout.searchParams.set('client_id', process.env.KEYCLOAK_WEB_CLIENT_ID ?? 'kal-flow-web');
      await signOut({ redirectTo: keycloakLogout.toString() });
    };
    return <ContractWorkspace locale={locale} email={session.user.email ?? session.user.name ?? 'Kal_flow user'} signOutAction={signOutAction} />;
  }
  return <main className="login-shell"><nav className="login-nav"><div className="brand"><span className="brand-mark">K</span><strong>Kal_flow</strong></div><Link className="language" href={page.target}>{page.language}</Link></nav><section className="login-card"><div className="login-copy"><span className="kicker">{page.kicker}</span><h1>{page.title}</h1><p>{page.body}</p><div className="trust-row">{page.trust.map((item) => <span key={item}>✓ {item}</span>)}</div></div><div className="login-action"><div className="seal">K</div><h2>{page.workspace}</h2><p>{page.auth}</p><form action={async () => { 'use server'; await signIn('keycloak', { redirectTo: `/${locale}` }); }}><button className="primary" type="submit">{page.signIn} →</button></form><small>{page.policy}</small></div></section></main>;
}
