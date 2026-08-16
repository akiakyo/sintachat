"use client";
import Link from "next/link";
import {useState} from "react";
import {useRouter} from "next/navigation";
import {acceptConsent} from "../../lib/session";

export default function Consent(){
 const router=useRouter();
 const[terms,setTerms]=useState(false);
 const[age,setAge]=useState(false);
 const[saving,setSaving]=useState(false);
 const[error,setError]=useState("");

 async function go(){
   if(!terms||!age||saving)return;
   setSaving(true);
   setError("");
   try{
     await acceptConsent();
     router.replace("/");
     router.refresh();
   }catch(err){
     setError(err instanceof Error?err.message:"Unable to save consent. Please try again.");
     setSaving(false);
   }
 }

 return <main className="consent-page consent-about-layout">
   <section className="consent-copy">
     <div className="consent-brand-mark"><img src="/assets/favicon.svg" alt="SintaChat"/></div>
     <p className="eyebrow">BEFORE YOU CONTINUE</p>
     <h1>Meet anonymously. Stay respectful.</h1>
     <p>SintaChat is an anonymous student conversation and community platform for adults across universities in the Philippines.</p>
   </section>

   <section className="terms-card consent-info-card">
     <div className="consent-info-scroll">
       <h2>About SintaChat</h2>
       <p>SintaChat gives students a temporary space to meet someone new without building a public social-media identity. You choose a nickname and matching preferences, then enter a one-on-one anonymous conversation.</p>

       <h3>How anonymous matching works</h3>
       <ul>
         <li>Choose a nickname, matching preference, university/campus, conversation vibe, and optional interests.</li>
         <li>Your anonymous session joins a compatible matching queue.</li>
         <li>When a partner is available, both anonymous sessions enter the same conversation.</li>
         <li>Inside chat you can use icebreakers, activities, voice messages, emojis, reactions, replies, reports, and End at any time.</li>
       </ul>

       <h3>The Freedom Wall</h3>
       <p>The Freedom Wall is an anonymous student board for thoughts, questions, confessions, rants, shout-outs, and campus moments from different universities. New submissions remain pending until a SintaChat administrator approves them for the public wall.</p>

       <h3>Safety, moderation &amp; anonymity</h3>
       <p>Anonymity is not permission to harm another person. SintaChat uses anonymous session and conversation identifiers for matching, reporting, moderation, bans, suspensions, and appeals. Other chat users are not shown your real identity.</p>
       <p>Read more on our <Link className="consent-inline-link" href="/safety?from=consent" onClick={e=>e.stopPropagation()}>Safety page</Link> and our <Link className="consent-inline-link" href="/privacy?from=consent" onClick={e=>e.stopPropagation()}>Privacy Policy</Link>.</p>

       <h3>Who can use it?</h3>
       <p>Anyone in the Philippines who is <strong>18 or older</strong>. See the full <Link className="consent-inline-link" href="/faq" onClick={e=>e.stopPropagation()}>FAQ</Link> and our <Link className="consent-inline-link" href="/terms?from=consent" onClick={e=>e.stopPropagation()}>Terms &amp; Conditions</Link>.</p>

       <h3>Important rules</h3>
       <p>No harassment, threats, doxxing, illegal activity, spam, impersonation, NSFW selling, content involving or targeting minors, or promotion of suicide, self-harm, or disordered eating.</p>
     </div>

     <div className="consent-legal-links"><Link href="/terms?from=consent">Terms &amp; Conditions</Link><Link href="/safety?from=consent">Safety Policy</Link><Link href="/privacy?from=consent">Privacy Policy</Link></div>
     <label className="check">
       <input type="checkbox" checked={terms} onChange={e=>setTerms(e.target.checked)} disabled={saving}/>
       <span>I have read and agree to the SintaChat Terms &amp; Conditions, Safety Policy, and Community Agreement.</span>
     </label>
     <label className="check">
       <input type="checkbox" checked={age} onChange={e=>setAge(e.target.checked)} disabled={saving}/>
       <span>I confirm that I am <strong>18 years old or older</strong> and located in the Philippines.</span>
     </label>
     {error&&<p role="alert" className="form-error">{error}</p>}
     <button onClick={go} disabled={!terms||!age||saving}>{saving?"Saving consent…":"I understand & agree"}</button>
     <small className="consent-once">You only need to agree once per browser session.</small>
   </section>
 </main>
}
