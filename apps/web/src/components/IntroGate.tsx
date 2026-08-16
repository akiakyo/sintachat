"use client";
import {useEffect,useState} from "react";
import {useRouter} from "next/navigation";
import {hasConsent} from "../lib/session";

export default function IntroGate(){
 const router=useRouter();
 const[show,setShow]=useState(true);
 useEffect(()=>{
   const timer=setTimeout(()=>{
     setShow(false);
     if(!hasConsent())router.replace("/consent")
   },1050);
   return()=>clearTimeout(timer)
 },[router]);
 if(!show)return null;
 return <div className="soft-logo-intro" aria-hidden="true">
   <div className="soft-logo-glow"/>
   <img src="/assets/favicon.svg" alt="SintaChat"/>
 </div>
}
