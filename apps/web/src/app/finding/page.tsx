"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getProfile, preferenceLabel, savePendingMatch, showConversationView, soundsEnabled } from "../../lib/session";
import { getSocket } from "../../lib/socket";


const MATCHING_TIPS=[
  {title:"Start light",body:"A simple hello plus one specific question usually works better than a generic greeting."},
  {title:"Use an icebreaker",body:"Tap the icebreaker in chat whenever the conversation needs a fresh direction."},
  {title:"Keep it anonymous",body:"Share only what you are comfortable sharing. You never need to reveal personal information."},
  {title:"Try a game",body:"This or That and Red Flag / Green Flag are built to give both of you something easy to react to."},
  {title:"Respect the vibe",body:"If your match chose Advice, Study Talk, Chill, or Rant, meet the conversation where it is."}
];

function searchTone(){
  if(!soundsEnabled())return;
  try{
    const AC=window.AudioContext||(window as any).webkitAudioContext;
    const ctx=new AC(); const gain=ctx.createGain(); gain.connect(ctx.destination);
    const now=ctx.currentTime;
    gain.gain.setValueAtTime(.0001,now);
    gain.gain.exponentialRampToValueAtTime(.06,now+.05);
    gain.gain.exponentialRampToValueAtTime(.0001,now+.5);
    const o=ctx.createOscillator();o.type="sine";
    o.frequency.setValueAtTime(420,now);o.frequency.linearRampToValueAtTime(560,now+.45);
    o.connect(gain);o.start(now);o.stop(now+.5);
  }catch{}
}

function matchTone(){
  if(!soundsEnabled())return;
  try{
    const AC=window.AudioContext||(window as any).webkitAudioContext;
    const ctx=new AC(); const gain=ctx.createGain(); gain.connect(ctx.destination);
    const now=ctx.currentTime;
    gain.gain.setValueAtTime(.0001,now);
    gain.gain.exponentialRampToValueAtTime(.12,now+.02);
    gain.gain.exponentialRampToValueAtTime(.0001,now+.55);
    [659.25,783.99,987.77].forEach((f,i)=>{
      const o=ctx.createOscillator();o.type="sine";o.frequency.value=f;o.connect(gain);
      o.start(now+i*.07);o.stop(now+.4+i*.07);
    });
  }catch{}
}

export default function Finding(){
 const router=useRouter();
 const [status,setStatus]=useState("Finding...");
 const [found,setFound]=useState(false);
 const [tipIndex,setTipIndex]=useState(0);
 const profile=getProfile();

 useEffect(()=>{
   if(found)return;
   const timer=setInterval(()=>setTipIndex(index=>(index+1)%MATCHING_TIPS.length),1500);
   return()=>clearInterval(timer)
 },[found]);

 useEffect(()=>{
   if(!profile){router.replace("/");return()=>{}}
   const socket=getSocket();
   setStatus(preferenceLabel(profile.preference));
   searchTone();
   const onMatched=(payload:any)=>{
     savePendingMatch(payload); matchTone(); setFound(true); setStatus("Match found!");
     setTimeout(()=>{showConversationView();router.replace("/")},900);
   };
   socket.on("matched",onMatched);
   socket.emit("set-profile",profile,(r:any)=>{
     if(!r?.ok){setStatus(r?.error||"Could not save your profile.");return;}
     socket.emit("find-match",(x:any)=>{
       if(!x?.ok){setStatus(x?.error||"Matchmaking failed.");return;}
       if(x?.connected&&x?.partner){
         savePendingMatch({matchUuid:x.matchUuid,partner:x.partner});
         setFound(true);
         setStatus(x.message||`You are connected with ${x.partner.nickname}.`);
         setTimeout(()=>{showConversationView();router.replace("/")},650);
       }
     })
   });
   return()=>socket.off("matched",onMatched)
 },[router]);

 return <main className={`finding-page finding-v52 ${found?"found":""}`}>
   <div className="finding-v52-backdrop" aria-hidden="true"><i/><i/><i/><i/></div>
   <section className="finding-v52-card">
     <div className="finding-v52-logo"><span/><img src="/assets/favicon.svg" alt="SintaChat"/></div>
     <p className="eyebrow">{found?"CONNECTED":"MATCHING"}</p>
     <h1>{found?"Connected":status}</h1>
     <p>{found?"Opening your anonymous conversation...":"Hang on while we look for a compatible student."}</p>
     {!found&&<div className="finding-tip finding-tip-switch" key={tipIndex}>
       <small>TIPS ON MATCHING</small>
       <b>{MATCHING_TIPS[tipIndex].title}</b>
       <span>{MATCHING_TIPS[tipIndex].body}</span>
       <div className="finding-tip-progress" aria-hidden="true"><i/></div>
     </div>}
     {found&&<div className="finding-connected-arrow">↓</div>}
     {!found&&<button onClick={()=>{getSocket().emit("cancel-search");router.push("/")}}>Cancel</button>}
   </section>
 </main>
}
