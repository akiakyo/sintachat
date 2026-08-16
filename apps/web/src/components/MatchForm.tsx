"use client";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { clearPendingMatch, getAdminNickname, getProfile, isAdminMode, MatchPreference, Profile, preferenceLabel, saveProfile } from "../lib/session";
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
 const [about,setAbout]=useState("");
 const [error,setError]=useState(""); const [admin,setAdmin]=useState(false);

 useEffect(()=>{
   // Legacy V3 behavior: arriving back on Home means the conversation is over.
   // This prevents stale "You are already in a conversation." matchmaking state.
   clearPendingMatch();
   try {
     const socket=getSocket();
     socket.emit("cancel-search");
     socket.emit("end-chat",()=>{});
   } catch {}
 },[]);

 useEffect(()=>{
   const adminMode=isAdminMode(); setAdmin(adminMode);
   const saved=getProfile();
   if(!saved)return;
   setNickname((adminMode&&getAdminNickname())||saved.nickname||"");
   setPref(saved.preference||"");
   setCampus(saved.campus||"");
   setVibe(saved.vibe||"");
   setInterests(Array.isArray(saved.interests)?saved.interests.slice(0,3):[]);
   setAbout(saved.aboutMe||"");
 },[]);

 const stages=useMemo(()=>({
   campus:!!pref,
   vibe:!!campus,
   interests:!!vibe,
   about:!!vibe,
   find:!!vibe
 }),[pref,campus,vibe]);

 function toggleInterest(v:string){
   setInterests(x=>x.includes(v)?x.filter(i=>i!==v):x.length<3?[...x,v]:x)
 }

 function submit(e:FormEvent){
   e.preventDefault(); setError("");
   if(admin ? !nickname.trim() : nickname.trim().length<3){setError(admin?"Admin nickname cannot be empty.":"Nickname must be at least 3 characters.");return;}
   if(!pref||!campus||!vibe){setError("Please complete the matching options.");return;}
   const existing=getProfile();
   const profile:Profile={
     nickname:nickname.trim(),campus,preference:pref,vibe,interests,
     aboutMe:about.trim().slice(0,120),
     gender: existing?.gender || "unspecified"
   };
   saveProfile(profile);
   localStorage.setItem("sintachat-match-preference",pref);
   router.push("/finding");
 }

 return <form id="match" className="match-form" onSubmit={submit}>
   <div className="field-row">
     <label><span>Nickname {admin&&<em>admin mode</em>}</span><input value={nickname} onChange={e=>setNickname(e.target.value)} maxLength={admin?48:24} placeholder="Choose a nickname"/></label>
     <fieldset><legend>Match with</legend><div className="segmented">
       {(["male","female","anyone"] as MatchPreference[]).map(v=><button type="button" key={v} className={pref===v?"active":""} onClick={()=>setPref(v)}>{v==="anyone"?"Any":v[0].toUpperCase()+v.slice(1)}</button>)}
     </div>{pref&&<small className="match-label">{preferenceLabel(pref)}</small>}</fieldset>
   </div>
   <section className={`stage ${stages.campus?"show":""}`}><label><span>University / Campus</span><input list="philippine-universities" value={campus} onChange={e=>setCampus(e.target.value)} maxLength={120} placeholder="Search or type your university / campus" autoComplete="off"/><datalist id="philippine-universities">{PHILIPPINE_UNIVERSITY_SUGGESTIONS.map(c=><option key={c} value={c}/>)}</datalist><small className="campus-helper">Other school / Rather not say is pinned first. You may also type any Philippine university or campus not yet shown in suggestions.</small></label></section>
   <section className={`stage ${stages.vibe?"show":""}`}><span className="section-label">Conversation vibe</span><div className="chips">{vibes.map(v=><button type="button" key={v} className={vibe===v?"active":""} onClick={()=>setVibe(v)}>{v}</button>)}</div></section>
   <section className={`stage ${stages.interests?"show":""}`}><span className="section-label">Interests <em>optional, up to 3</em></span><div className="chips">{interestList.map(v=><button type="button" key={v} className={interests.includes(v)?"active":""} onClick={()=>toggleInterest(v)}>{v}</button>)}</div></section>
   <section className={`stage ${stages.about?"show":""}`}><label><span>About me <em>optional</em></span><textarea value={about} maxLength={120} onChange={e=>setAbout(e.target.value)} placeholder="freshie, mahilig sa games, music, at random 2am conversations"/><small>{about.length}/120</small></label></section>
   {error&&<p className="form-error">{error}</p>}
   <button className={`find-button stage ${stages.find?"show":""}`} type="submit">Find someone</button>
 </form>
}
