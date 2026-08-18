"use client";

import Link from "next/link";
import { useState } from "react";
import { acceptConsent } from "../lib/session";

export default function ConsentScreen({onAccepted}:{onAccepted:()=>void}){
 const [terms,setTerms]=useState(false);
 const [age,setAge]=useState(false);
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState("");

 async function continueToSintaChat(){
   if(!terms||!age||saving)return;
   setSaving(true);setError("");
   try{
     await acceptConsent();
     onAccepted();
   }catch(err){
     setError(err instanceof Error?err.message:"Unable to save consent. Please try again.");
     setSaving(false);
   }
 }

 return <main className="consent-entry">
   <section className="consent-entry-intro">
    <div className="consent-policecat"><img src="/assets/policecat.png" alt="SintaChat safety mascot"/></div>
    <p className="eyebrow">SINTACHAT COMMUNITY AGREEMENT</p>
     <h1>A good conversation starts with care.</h1>
     <p className="consent-entry-lead">A temporary, anonymous space for adult students across the Philippines to meet, talk, and share campus life.</p>
     <div className="consent-promises">
       <article><span>18+</span><div><b>Adults only</b><small>You must be at least 18 to use SintaChat.</small></div></article>
       <article><span>+</span><div><b>Respect first</b><small>Harassment, hate, and impersonation have no place here.</small></div></article>
       <article><span>?</span><div><b>Stay anonymous</b><small>Share only what you are comfortable sharing.</small></div></article>
     </div>
   </section>

   <section className="consent-entry-card" aria-labelledby="consent-heading">
     <div className="consent-card-heading"><p className="eyebrow">BEFORE ENTERING</p><h2 id="consent-heading">Your agreement</h2><p>Read the essentials, then confirm both statements to enter SintaChat.</p></div>
    <div className="consent-step-rail" aria-label="How SintaChat works"><span className="active"><b>1</b><small>Agree</small></span><i/><span><b>2</b><small>Choose your vibe</small></span><i/><span><b>3</b><small>Start talking</small></span></div>
    <div className="consent-rule-list">
       <article><b>Be real about who you are</b><span>Do not impersonate another person or present someone else&apos;s information as your own.</span></article>
       <article><b>Protect your privacy</b><span>Do not request, post, or pressure anyone to share identifying or sensitive details.</span></article>
       <article><b>Use the exit and report tools</b><span>Leave any conversation at any time and report conduct that breaks the rules.</span></article>
     </div>
     <div className="consent-policy-links"><Link href="/terms">Terms</Link><Link href="/safety">Safety</Link><Link href="/privacy">Privacy</Link></div>
     <label className="consent-confirmation"><input type="checkbox" checked={terms} onChange={event=>setTerms(event.target.checked)} disabled={saving}/><span>I agree to the SintaChat Terms, Safety Policy, and Community Agreement.</span></label>
     <label className="consent-confirmation"><input type="checkbox" checked={age} onChange={event=>setAge(event.target.checked)} disabled={saving}/><span>I confirm that I am 18 or older and located in the Philippines.</span></label>
     {error&&<p role="alert" className="form-error">{error}</p>}
     <button className="consent-enter-button" onClick={continueToSintaChat} disabled={!terms||!age||saving}>{saving?"Saving consent...":"Enter SintaChat"}</button>
     <small className="consent-session-note">Your consent is saved for this browser session.</small>
   </section>
 </main>
}