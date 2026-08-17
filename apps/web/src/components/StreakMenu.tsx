"use client";
import {useEffect,useRef,useState} from "react";
import { createPortal } from "react-dom";

type StreakData={current:number;longest:number;lastVisit:string;savers:number;saverMonth:string};
const KEY="sintachat-streak-v1";
const LEGACY_KEY="anonisko-streak-v1";

function localDateKey(date=new Date()){
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
}
function monthKey(date=new Date()){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}`}
function dayNumber(key:string){const[y,m,d]=key.split("-").map(Number);return Math.floor(new Date(y,m-1,d).getTime()/86400000)}
function readStreak():StreakData{
  try{
    let stored=localStorage.getItem(KEY);
    if(!stored){stored=localStorage.getItem(LEGACY_KEY);if(stored)localStorage.setItem(KEY,stored)}
    const raw=JSON.parse(stored||"null");
    if(raw&&typeof raw.current==="number")return raw
  }catch{}
  return {current:0,longest:0,lastVisit:"",savers:4,saverMonth:monthKey()}
}
function updateStreak():StreakData{
  const today=localDateKey();const month=monthKey();const previous=readStreak();
  let next={...previous};
  if(next.saverMonth!==month){next.savers=4;next.saverMonth=month}
  if(!next.lastVisit){next.current=1;next.longest=Math.max(1,next.longest);next.lastVisit=today}
  else if(next.lastVisit!==today){
    const gap=Math.max(1,dayNumber(today)-dayNumber(next.lastVisit));
    const missed=Math.max(0,gap-1);
    if(gap===1){next.current=Math.max(1,next.current+1)}
    else if(missed<=next.savers){next.savers-=missed;next.current=Math.max(1,next.current+gap)}
    else{next.current=1}
    next.longest=Math.max(next.longest,next.current);next.lastVisit=today
  }
  localStorage.setItem(KEY,JSON.stringify(next));return next
}

function Flame(){return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.7 2.9c.3 3.1-1.8 4.4-3 6.2-1.4 2.1-.5 3.7.8 4.6-.2-2.4 1.4-3.5 2.6-4.8 2.3 2.2 4 4.6 4 7.2 0 3.3-2.6 5.8-6.1 5.8S5.9 19.5 5.9 16c0-4.4 3-6.4 4.5-8.7 1-1.5 1.6-2.9 1.4-4.6.7.1 1.3.1 1.9.2Z" fill="currentColor"/></svg>}
function Shield(){return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 19 6v5.6c0 4.5-2.7 7.7-7 9.4-4.3-1.7-7-4.9-7-9.4V6l7-3Z" fill="none" stroke="currentColor" strokeWidth="1.8"/><path d="m9 12 2 2 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}

export default function StreakMenu(){
  const[data,setData]=useState<StreakData|null>(null);const[open,setOpen]=useState(false);const[celebrating,setCelebrating]=useState(false);const wrap=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const next=updateStreak();
    const celebrationKey=`${KEY}-celebrated`;
    setData(next);
    if(sessionStorage.getItem(celebrationKey)!==next.lastVisit){
      sessionStorage.setItem(celebrationKey,next.lastVisit);
      setCelebrating(true);
    }
  },[]);
  useEffect(()=>{const close=(e:PointerEvent)=>{if(!wrap.current?.contains(e.target as Node))setOpen(false)};document.addEventListener("pointerdown",close);return()=>document.removeEventListener("pointerdown",close)},[]);
  if(!data)return null;
  const celebration=celebrating&&<div className="streak-celebration-backdrop" role="presentation" onClick={()=>setCelebrating(false)}><section className="streak-celebration" role="dialog" aria-modal="true" aria-labelledby="streak-celebration-title" onClick={event=>event.stopPropagation()}>
    <div className="streak-celebration-flame"><Flame/><i>+1</i></div>
    <p className="eyebrow">SINTACHAT STREAK</p>
    <h2 id="streak-celebration-title" className="streak-celebration-title">{data.current===1?"Streak started!":"You kept it going!"}</h2>
    <p>{data.current===1?"You showed up today. Come back tomorrow to build your SintaChat streak.":`You are on day ${data.current}. Come back tomorrow to keep the conversation going.`}</p>
    <div className="streak-celebration-savers">{[0,1,2,3].map(index=><span className={index<data.savers?"active":""} key={index}><Shield/></span>)}<small>{data.savers} of 4 monthly savers ready</small></div>
    <button type="button" onClick={()=>setCelebrating(false)}>Let&apos;s go</button>
  </section></div>;
  return <div className="streak-wrap" ref={wrap}>
    <button className={`streak-button ${open?"open":""}`} type="button" aria-label={`${data.current} day streak`} aria-expanded={open} onClick={()=>setOpen(v=>!v)}><Flame/><b>{data.current}</b></button>
    {celebration&&createPortal(celebration,document.body)}
    {open&&<section className="streak-card" role="dialog" aria-label="SintaChat streak">
      <div className="streak-title"><span><Flame/></span><b>{data.current}</b><strong>day streak</strong></div>
      <p>Longest: {data.longest} {data.longest===1?"day":"days"}</p>
      <div className="streak-rule"/>
      <div className="streak-saver-head"><b>Streak savers</b><span>{data.savers} of 4 left</span></div>
      <div className="streak-shields">{[0,1,2,3].map(i=><span className={i<data.savers?"active":""} key={i}><Shield/></span>)}</div>
      <small>A saver automatically protects one missed day. Four fresh savers are restored each month.</small>
    </section>}
  </div>
}
