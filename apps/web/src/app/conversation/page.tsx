"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { hideConversationView } from "../../lib/session";

export default function ConversationRoute(){
  const router=useRouter();
  useEffect(()=>{
    // SintaChat keeps active conversations on the root URL, similar to a single-page chat shell.
    // A manually typed /conversation URL never opens an empty chat.
    hideConversationView();
    router.replace("/");
  },[router]);
  return <main className="route-loader logo-only-loader" aria-label="Loading"><img src="/assets/favicon.svg" alt="SintaChat"/></main>;
}
