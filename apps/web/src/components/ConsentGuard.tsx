"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { hasConsent } from "../lib/session";

const PUBLIC_ROUTES = new Set(["/consent", "/terms", "/safety", "/privacy", "/faq", "/about", "/admin"]);

export default function ConsentGuard({children}:{children:React.ReactNode}){
 const router=useRouter();
 const path=usePathname();
 const publicRoute=PUBLIC_ROUTES.has(path);
 const [ready,setReady]=useState(publicRoute);

 useEffect(()=>{
   if(publicRoute){setReady(true);return;}
   if(!hasConsent()){
     setReady(false);
     router.replace("/consent");
     return;
   }
   setReady(true)
 },[path,publicRoute,router]);

 return ready?<>{children}</>:<div className="route-loader logo-only-loader" aria-label="Loading"><img src="/assets/favicon.svg" alt="SintaChat"/></div>;
}
