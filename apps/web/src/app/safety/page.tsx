import Link from "next/link";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";

export default async function Safety({searchParams}:{searchParams:Promise<{from?:string}>}){
  const params = await searchParams;
  const fromConsent = params?.from === "consent";

  return <>
    {fromConsent
      ? <div className="isolated-page-bar"><Link href="/consent" className="isolated-back-btn">‹ Back</Link></div>
      : <SiteHeader/>}
    <main className="legal-page">
      <h1>Safety &amp; Community Guidelines</h1>
      <p>SintaChat is anonymous, but everyone is still expected to treat other people with respect.</p>
      <h2>Keep conversations safe</h2>
      <p>No harassment, hate speech, threats, scams, doxxing, impersonation, spam, or unlawful content. Never pressure someone to share their real identity or sensitive information.</p>
      <h2>How moderation works</h2>
      <p>Freedom Wall submissions require administrator approval before public display. In-chat reports can be reviewed through the anonymous moderation dashboard, and restrictions can be appealed.</p>
      <h2>Protect yourself</h2>
      <p>Do not share passwords, financial information, your home address, private schedules, or other information you do not want a stranger to keep. End and report conversations that become uncomfortable.</p>
      {fromConsent
        ? <p>See our <Link href="/terms">Terms &amp; Conditions</Link> and <Link href="/privacy?from=consent">Privacy Policy</Link>.</p>
        : <p>See our <Link href="/terms">Terms &amp; Conditions</Link> and <Link href="/privacy">Privacy Policy</Link>.</p>}
    </main>
    {!fromConsent && <SiteFooter/>}
  </>
}
