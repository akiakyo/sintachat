"use client";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function RouteTransition(){
  const pathname = usePathname();
  const [show, setShow] = useState(false);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (pathname === "/consent") return;
    setShow(true);
    const timer = setTimeout(() => setShow(false), 650);
    return () => clearTimeout(timer);
  }, [pathname]);

  if (pathname === "/consent" || !show) return null;

  return <div className="route-logo-transition" aria-hidden="true">
    <div className="route-logo-transition-glow" />
    <img src="/assets/logo.png" alt="" />
  </div>;
}
