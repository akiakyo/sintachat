"use client";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearPendingMatch, getAdminNickname, getProfile, hasConversationPreferences, hideConversationView, isAdminMode, MatchPreference, Profile, preferenceLabel, saveConversationPreferences, saveProfile } from "../lib/session";
import { getSocket } from "../lib/socket";
import { PHILIPPINE_UNIVERSITY_SUGGESTIONS } from "../lib/philippineUniversities";
const vibes=["Chill","Need Advice","Rant","Study Talk","Make Friends","Random"];
const interestList=["Gaming","School","Relationships","Music","Movies","Tech","Sports","Memes","Study","Random"];

export default function MatchForm(){
 const router=useRouter();
 const [nickname,setNickname]=useState("");
 const [pref,setPref]=useState<MatchPreference|"">("");
 const [campus,setCampus]=useState("");
 const [vibe,setVibe]=useState("");
 const [interests,setInterests]=useState<string[]>([]);
 const [preferencesOpen,setPreferencesOpen]=useState(false);
 const [preferencesError,setPreferencesError]=useState("");
 const [error,setError]=useState(""); const [admin,setAdmin]=useState(false);

 const closePreferences=()=>{
   setPreferencesError("");
   setPreferencesOpen(false);
 };

 useEffect(()=>{
   // Legacy V3 behavior: arriving back on Home means the conversation is over.
   // This prevents stale "You are already in a conversation." matchmaking state.
   hideConversationView();
   clearPendingMatch();
   try {
     const socket=getSocket();
     socket.emit("cancel-search");
   } catch {}
   setAdmin(isAdminMode());
   const existing=getProfile();
   if(existing){
     setNickname(existing.nickname||"");
     setCampus(existing.campus||"");
     if(existing.preference)setPref(existing.preference);
     if(existing.vibe)setVibe(existing.vibe);
     if(Array.isArray(existing.interests))setInterests(existing.interests);
   }
   const savedPreference=localStorage.getItem("sintachat-match-preference") as MatchPreference|null;
   if(!existing?.preference&&savedPreference)setPref(savedPreference);
 },[]);

 useEffect(()=>{
   if(!preferencesOpen) return;
   const handleKeyDown=(event:KeyboardEvent)=>{
     if(event.key === "Escape") closePreferences();
   };
   window.addEventListener("keydown", handleKeyDown);
   return () => window.removeEventListener("keydown", handleKeyDown);
 }, [preferencesOpen]);

 function toggleInterest(value:string){setInterests(current=>current.includes(value)?current.filter(item=>item!==value):current.length<3?[...current,value]:current)}

 function submit(e:FormEvent){
   e.preventDefault(); setError("");
   if(admin ? !nickname.trim() : nickname.trim().length<3){setError(admin?"Admin nickname cannot be empty.":"Nickname must be at least 3 characters.");return;}
   if(!pref||!campus){setError("Please complete the matching options.");return;}
   if(!hasConversationPreferences()){setPreferencesError("");setPreferencesOpen(true);return;}
   startMatching();
 }

 function startMatching(){
   const existing=getProfile();
   const selectedPreference=pref as MatchPreference;
   const profile:Profile={
     nickname:nickname.trim(),campus,preference:selectedPreference,vibe:vibe||existing?.vibe||"Chill",interests:interests.length?interests:(Array.isArray(existing?.interests)?existing.interests:[]),
     gender: existing?.gender || "unspecified"
   };
   saveProfile(profile);
   localStorage.setItem("sintachat-match-preference",pref);
   router.push("/finding");
 }

 return <form id="match" className={`match-form ${preferencesOpen?"preferences-active":""}`} onSubmit={submit}>
   <div className="field-row">
     <label className="form-field"><span>Nickname {admin&&<em>admin mode</em>}</span><input value={nickname} onChange={e=>setNickname(e.target.value)} maxLength={admin?48:24} placeholder="Choose a nickname"/></label>
     <fieldset className="form-field segmented-field"><legend>Match with</legend><div className="segmented">
       {(["male","female","anyone"] as MatchPreference[]).map(v=><button type="button" key={v} className={pref===v?"active":""} onClick={()=>setPref(v)}>{v==="anyone"?"Any":v[0].toUpperCase()+v.slice(1)}</button>)}
     </div>{pref&&<small className="match-label">{preferenceLabel(pref)}</small>}</fieldset>
   </div>
  <section className="form-stage"><label className="form-field"><span>University / Campus</span><input list="philippine-universities" value={campus} onChange={e=>setCampus(e.target.value)} maxLength={120} placeholder="Search or type your university / campus" autoComplete="off"/><datalist id="philippine-universities">{PHILIPPINE_UNIVERSITY_SUGGESTIONS.map(c=><option key={c} value={c}/>)}</datalist><small className="campus-helper">Other school / Rather not say is pinned first. You may also type any Philippine university or campus not yet shown in suggestions.</small></label></section>
   {error&&<p className="form-error">{error}</p>}
  <button className="find-button" type="submit">Find someone</button>
  {preferencesOpen&&<div className="match-preferences-backdrop" role="presentation" onClick={event=>{if(event.target===event.currentTarget)closePreferences()}}>
    <section className="match-preferences-modal" role="dialog" aria-modal="true" aria-labelledby="match-preferences-title" onClick={event=>event.stopPropagation()}>
      <button type="button" className="match-preferences-close" aria-label="Close" onClick={closePreferences}>&times;</button>
      <div className="match-preferences-art"><img src="/assets/waiting.png" alt=""/></div>
      <p className="eyebrow">ONE QUICK STEP</p>
      <h2 id="match-preferences-title">Set the tone for your chat</h2>
      <p className="match-preferences-note">Choose a vibe and up to three interests before we look for your match. We’ll remember this on this browser.</p>
      <fieldset><legend>Conversation vibe</legend><div className="chips">{vibes.map(value=><button type="button" key={value} className={vibe===value?"active":""} onClick={()=>setVibe(value)}>{value}</button>)}</div></fieldset>
      <fieldset><legend>Interests <em>optional, up to 3</em></legend><div className="chips">{interestList.map(value=><button type="button" key={value} className={interests.includes(value)?"active":""} onClick={()=>toggleInterest(value)}>{value}</button>)}</div></fieldset>
      {preferencesError&&<p className="form-error" role="alert">{preferencesError}</p>}
      <button className="match-preferences-submit" type="button" disabled={!vibe} onClick={()=>{if(!vibe)return;const existing=getProfile();if(!existing){setPreferencesError("Please complete your profile first.");return}saveProfile({...existing,nickname:nickname.trim(),campus,preference:pref as MatchPreference,vibe,interests});saveConversationPreferences(vibe,interests);closePreferences();startMatching()}}>Start matching</button>
    </section>
  </div>}
 </form>
}
