"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { hasConsent } from "../lib/session";
import ConsentScreen from "./ConsentScreen";

const PUBLIC_ROUTES = new Set(["/", "/terms", "/safety", "/privacy", "/faq", "/about", "/admin"]);

export default function ConsentGuard({children}:{children:React.ReactNode}){
 const router=useRouter();
 const path=usePathname();
 const publicRoute=PUBLIC_ROUTES.has(path);
 const [ready,setReady]=useState(publicRoute);

 useEffect(()=>{
   if(path==="/"){
     setReady(hasConsent());
     return;
   }
   if(publicRoute){setReady(true);return;}
   if(!hasConsent()){
     setReady(false);
     router.replace("/");
     return;
   }
   setReady(true)
 },[path,publicRoute,router]);

 if(path==="/"&&!ready)return <ConsentScreen onAccepted={()=>{setReady(true);router.replace("/")}}/>;
 return ready?<>{children}</>:<div className="route-loader logo-only-loader" aria-label="Loading"><img src="/assets/logo.png" alt="SintaChat"/></div>;
}
