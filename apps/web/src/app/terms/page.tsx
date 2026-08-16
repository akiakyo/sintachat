import Link from "next/link";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";

const TERMS=[
 {title:"Anonymity Has Limits.",text:"Other users won't see your real identity, but SintaChat may still log certain technical data and can disclose it if required by law or to protect user safety."},
 {title:"Prohibited Conduct.",text:"You may not harass, threaten, or dox other users, post content involving or targeting minors, impersonate others, or use SintaChat for illegal activity or spam."},
 {title:"No NSFW Selling.",text:"You may not use SintaChat to sell, advertise, or solicit payment for NSFW content or services (e.g., explicit photos, videos, or sexual services)."},
 {title:"No Self-Harm Content.",text:"You may not post, promote, or encourage suicide, self-harm, or disordered eating. Content expressing distress may be moderated and users may be directed toward appropriate support resources."},
 {title:"User-Generated Content.",text:"You're responsible for what you post; by posting (e.g., to the Freedom Wall or similar features) you allow SintaChat to display and distribute it within the Service."},
 {title:"Moderation.",text:"We may review, remove, or restrict content or anonymous sessions that violate these Terms, and you can report content or users you find harmful within the app."},
 {title:"Data Privacy.",text:"We handle personal data in line with applicable Philippine data-privacy requirements, including the Data Privacy Act of 2012 (RA 10173). Details are described in our Privacy Policy."},
 {title:"Paid Features.",text:"Any optional paid tier (e.g., ad-free experience or extra perks) is separate from core chat features, which remain free unless SintaChat clearly states otherwise before purchase."},
 {title:"No Guarantees.",text:"SintaChat is provided \"as is\" — we don't guarantee uninterrupted service or that every rule violation will be caught in real time."},
 {title:"Termination & Governing Law.",text:"We may suspend or terminate your access for violating these Terms. These Terms are governed by the laws of the Republic of the Philippines, with disputes subject to the jurisdiction of the proper Philippine courts."}
];

export default function Terms(){
 return <><SiteHeader/><main className="content-page terms-page legal-page">
   <p className="eyebrow">TERMS &amp; CONDITIONS</p>
   <h1>SintaChat — Terms and Conditions</h1>
   <p className="legal-lead">These rules apply to anonymous chat, the Freedom Wall, reports, activities, voice messages, moderation features, and other SintaChat services.</p>
   <div className="terms-numbered">
     {TERMS.map((term,index)=><article key={term.title}>
       <span>{index+1}</span>
       <div><h2>{term.title}</h2><p>{term.text}</p></div>
     </article>)}
   </div>
   <section className="terms-support-links">
     <h2>Safety, privacy &amp; appeals</h2>
     <p>Read more on our <Link href="/safety">Safety page</Link> and our <Link href="/privacy">Privacy Policy</Link>.</p>
     <p>If your anonymous session is banned or suspended and you believe the action should be reviewed, <Link href="/appeal">submit a moderation appeal</Link>.</p>
     <p>For common questions, see the <Link href="/faq">FAQ</Link>.</p>
   </section>
 </main><SiteFooter/></>
}
