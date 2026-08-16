"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import ThemeToggle from "./ThemeToggle";
import StreakMenu from "./StreakMenu";
import { isAdminMode } from "../lib/session";

export default function SiteHeader(){
 const [open,setOpen]=useState(false);
 const [admin,setAdmin]=useState(false);
 useEffect(()=>setAdmin(isAdminMode()),[]);
 return <header className="site-header">
   <Link href="/" className="brand">
     <img src="/assets/favicon.svg" alt=""/>
     <span>SintaChat</span>
     {admin&&<em className="brand-admin-badge">ADMIN</em>}
   </Link>
   <nav className={open?"open":""}>
     <Link href="/" onClick={()=>setOpen(false)}>Home</Link>
     <Link href="/wall" onClick={()=>setOpen(false)}>Freedom Wall</Link>
       <Link href="/about" onClick={()=>setOpen(false)}>About</Link>
     <Link href="/terms" onClick={()=>setOpen(false)}>Terms</Link>
   </nav>
   <div className="header-actions">
     <StreakMenu/>
     <ThemeToggle/>
     <button className="mobile-nav-button" aria-label="Menu" onClick={()=>setOpen(v=>!v)}><span/><span/><span/></button>
   </div>
 </header>
}
