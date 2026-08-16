import Link from "next/link";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";

export default async function Privacy({searchParams}:{searchParams:Promise<{from?:string}>}){
  const params = await searchParams;
  const fromConsent = params?.from === "consent";

  return <>
    {fromConsent
      ? <div className="isolated-page-bar"><Link href="/consent" className="isolated-back-btn">‹ Back</Link></div>
      : <SiteHeader/>}
    <main className="legal-page">
      <h1>Privacy Policy</h1>
      <p>SintaChat is designed around temporary nicknames and anonymous session identifiers rather than public real-world identities.</p>
      <h2>What the service uses</h2>
      <p>SintaChat may use your anonymous session ID, nickname, selected university/campus, matching preferences, messages needed for live conversations, Freedom Wall submissions, reports, and moderation state to operate the service.</p>
      <h2>What other users see</h2>
      <p>Other users see the anonymous profile information you choose to provide. Do not place private or identifying information in your nickname, About Me, messages, or Freedom Wall posts.</p>
      <h2>Moderation</h2>
      <p>Reports, appeals, bans, suspensions, and Freedom Wall review records may be retained as needed to operate moderation features.</p>
      {fromConsent
        ? <p>Questions can be sent to official.sintachat@gmail.com. Also review our <Link href="/safety?from=consent">Safety page</Link> and <Link href="/terms">Terms &amp; Conditions</Link>.</p>
        : <p>Questions can be sent to official.sintachat@gmail.com. Also review our <Link href="/safety">Safety page</Link> and <Link href="/terms">Terms &amp; Conditions</Link>.</p>}
    </main>
    {!fromConsent && <SiteFooter/>}
  </>
}
