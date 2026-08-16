"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import MatchForm from "../components/MatchForm";
import ConversationView from "../components/ConversationView";
import { hideConversationView, shouldShowConversationView } from "../lib/session";

export default function Home(){
 const [chatMode,setChatMode]=useState<boolean|null>(null);
 useEffect(()=>setChatMode(shouldShowConversationView()),[]);

 if(chatMode===null)return <main className="route-loader logo-only-loader" aria-label="Loading"><img src="/assets/favicon.svg" alt="SintaChat"/></main>;
 if(chatMode)return <ConversationView onExit={()=>{hideConversationView();setChatMode(false)}}/>;

 return <>
   <SiteHeader/>
   <main className="home-page home-v52">
     <div className="home-floaters" aria-hidden="true"><i/><i/><i/><i/><i/><i/><i/><i/></div>
     <section className="hero home-v52-hero">
       <div className="home-brand-orb home-anim-in"><img src="/assets/favicon.svg" alt=""/></div>
       <p className="eyebrow home-eyebrow home-anim-in home-anim-delay-1">STUDENT ANON CHAT</p>
       <h1 className="wordmark home-anim-in home-anim-delay-2">SintaChat</h1>
       <h2 className="home-anim-in home-anim-delay-3">Meet students across the Philippines.</h2>
       <p className="home-anim-in home-anim-delay-4">Connect anonymously, spark a conversation, and swap real campus stories with students from universities across the Philippines.</p>

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
