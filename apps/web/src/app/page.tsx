"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import MatchForm from "../components/MatchForm";
import ConversationView from "../components/ConversationView";
import { hideConversationView, savePendingMatch, shouldShowConversationView, showConversationView } from "../lib/session";
import { getSocket } from "../lib/socket";

export default function Home(){
 const [chatMode,setChatMode]=useState<boolean|null>(null);
 useEffect(()=>{
   const shouldShow = shouldShowConversationView();
   if (shouldShow) {
     setChatMode(true);
     return;
   }
   const socket=getSocket();
   let resolved=false;
   let fallback:number|undefined;
   const resume=(payload:any)=>{
     resolved=true;
     savePendingMatch(payload);
     showConversationView();
     setChatMode(true);
   };
   const showHome=()=>{
     fallback=window.setTimeout(()=>{
       if(!resolved){
         hideConversationView();
         setChatMode(false);
       }
     },220);
   };
   socket.on("resume-match",resume);
   if(socket.connected)showHome();else socket.once("connect",showHome);
   return()=>{
     if(fallback!==undefined)window.clearTimeout(fallback);
     socket.off("connect",showHome);
     socket.off("resume-match",resume);
   };
 },[]);

 if(chatMode===null)return <main className="route-loader logo-only-loader" aria-label="Loading"><img src="/assets/logo.png" alt="SintaChat"/></main>;
 if(chatMode)return <ConversationView onExit={()=>{hideConversationView();setChatMode(false)}}/>;

 return <>
   <SiteHeader/>
   <main className="home-page home-v52">
     <section className="hero home-v52-hero">
       <p className="eyebrow home-eyebrow home-anim-in home-anim-delay-1">STUDENT ANON CHAT</p>
       <h1 className="wordmark home-anim-in home-anim-delay-2">SintaChat</h1>
       <h2 className="home-anim-in home-anim-delay-3">Find someone who gets your vibe.</h2>
       <p className="home-anim-in home-anim-delay-4">Anonymous conversations, campus stories, and real connection across the Philippines.</p>

       <div className="home-identity-strip home-anim-in home-anim-delay-4" aria-label="SintaChat identity">
         <article><b>Vibe-first</b><span>Match around how you feel.</span></article>
         <article><b>Campus-wide</b><span>Meet beyond your school.</span></article>
         <article><b>18+ anonymous</b><span>Privacy and respect first.</span></article>
       </div>

       <MatchForm/>

       <div className="home-shortcuts">
         <a href="#match" className="home-shortcut home-shortcut-big">
           <img src="/assets/home-chat.png" alt=""/>
           <div><b>Main chat</b><span>Meet someone anonymously</span></div>
           <strong>Start</strong>
         </a>
         <Link href="/wall" className="home-shortcut home-shortcut-big">
           <img src="/assets/home-notepad.svg" alt=""/>
           <div><b>Freedom Wall</b><span>Read and share anonymous student posts</span></div>
           <strong>Open</strong>
         </Link>
       </div>
     </section>
   </main>
   <SiteFooter/>
 </>
}
