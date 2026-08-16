"use client";
import { FormEvent, PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import SiteHeader from "./SiteHeader";
import {
  clearPendingMatch,
  hideConversationView,
  getPendingMatch,
  getProfile,
  getSessionId,
  getAdminToken,
  isAdminMode,
  soundsEnabled,
  setSoundsEnabled
} from "../lib/session";
import { getSocket } from "../lib/socket";

type Reply={id:string;text:string;nickname?:string};
type Msg={
  id:string;
  text?:string;
  mine:boolean;
  sentAt:string;
  type?:"text"|"voice"|"activity";
  audioUrl?:string;
  duration?:number;
  replyTo?:Reply|null;
  reactions?:Record<string,number>;
  label?:string;
  prompt?:string;
};

type GameType="this-or-that"|"red-green"|"would-you-rather";
type GameInvite={gameId:string;type:GameType;label:string;icon?:string;fromNickname?:string};
type GameRound={gameId:string;type:GameType;label:string;round:number;total:number;question:{id:string;prompt:string;options:[string,string]};duration:number};
type GameRoundResult={gameId:string;round:number;total:number;question:{id:string;prompt:string;options:[string,string]};yourChoice:number|null;partnerChoice:number|null;matched:boolean;timedOut?:boolean};
type GameFinished={gameId:string;type:GameType;label:string;score:number;total:number;percentage:number;endedEarly?:boolean;results:GameRoundResult[]};

type EmojiCategory="frequent"|"smileys"|"animals"|"food"|"activities"|"travel"|"objects"|"symbols";
type EmojiCategoryData={label:string;icon:string;items:string[]};

const REACTIONS=["❤️","😆","😮","😢","😭","😡","👍"];

const EMOJI_CATALOG:Record<EmojiCategory,EmojiCategoryData>={
  frequent:{label:"Frequently used",icon:"⊕",items:["👍","😀","😘","😍","😆","😜","😂","😅","😱","😢","🥺","😭","😡","🙏","🔥","✨","💯","🎉","❤️","💀"]},
  smileys:{label:"Smileys & People",icon:"☻",items:["😀","😃","😄","😁","😆","😅","😂","🤣","😊","😇","🙂","🙃","😉","😌","😍","🥰","😘","😗","😙","😚","😋","😛","😝","😜","🤪","🤨","🧐","🤓","😎","🥸","🤩","🥳","😏","😒","😞","😔","😟","😕","🙁","☹️","😣","😖","😫","😩","🥺","😢","😭","😤","😠","😡","🤬","🤯","😳","🥵","🥶","😱","😨","😰","😥","😓","🤗","🤔","🤭","🤫","🤥","😶","😐","😑","😬","🙄","😯","😦","😧","😮","😲","🥱","😴","🤤","😪","😵","🤐","🤢","🤮","🤧","😷","🤒","🤕","👍","👎","👏","🙌","🙏","🤝","💪","✌️","🤞","🫶"]},
  animals:{label:"Animals & Nature",icon:"🐼",items:["🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷","🐸","🐵","🙈","🙉","🙊","🐔","🐧","🐦","🐤","🦄","🐝","🦋","🐌","🐞","🐢","🐍","🦎","🐙","🦑","🦀","🐠","🐟","🐬","🐳","🦈"]},
  food:{label:"Food & Drink",icon:"🍎",items:["🍏","🍎","🍐","🍊","🍋","🍌","🍉","🍇","🍓","🫐","🍈","🍒","🍑","🥭","🍍","🥥","🥝","🍅","🥑","🍆","🥔","🥕","🌽","🌶️","🥒","🥬","🥦","🍄","🥜","🍞","🥐","🥖","🧀","🥚","🍳","🥞","🧇","🍔","🍟","🍕","🌭","🥪","🌮","🌯","🍜","🍝","🍣","🍱","🍛","🍚","🍦","🍩","🍪","🎂","🍰","☕","🧋","🥤"]},
  activities:{label:"Activities",icon:"🏀",items:["⚽","🏀","🏈","⚾","🥎","🎾","🏐","🏉","🎱","🏓","🏸","🥊","🥋","🎽","🛹","🎯","🎮","🎲","♟️","🎨","🎭","🎤","🎧","🎸","🎹","🥁","🎬","🏆","🥇","🎉","🎊"]},
  travel:{label:"Travel & Places",icon:"🚙",items:["🚗","🚕","🚌","🚎","🏎️","🚓","🚑","🚒","🚚","🚲","🏍️","✈️","🚀","🚁","⛵","🚢","🗺️","🏝️","🏖️","🏕️","🏠","🏫","🏢","🏥","🌋","⛰️","🌅","🌆","🌃"]},
  objects:{label:"Objects",icon:"💡",items:["⌚","📱","💻","⌨️","🖥️","🖨️","🖱️","📷","📹","🎥","📞","☎️","💡","🔦","📚","📖","📝","✏️","📌","📎","🔒","🔑","🔨","🧰","🧪","💊","🩹","🎁","🎈"]},
  symbols:{label:"Symbols",icon:"♬",items:["❤️","🩷","🧡","💛","💚","💙","🩵","💜","🖤","🤍","🤎","💔","❣️","💕","💞","💓","💗","💖","💘","💝","💯","💢","💥","💫","💦","💨","🔥","✨","⭐","🌟","✅","❌","⚠️","❗","❓","♻️","🔞"]}
};
const ALL_EMOJIS=[...new Set(Object.values(EMOJI_CATALOG).flatMap(category=>category.items))];

const GAMES:{type:GameType;name:string;subtitle:string;icon:string}[]=[
  {type:"this-or-that",name:"This or That",subtitle:"Pick a side and see if you match.",icon:"⚡"},
  {type:"red-green",name:"Red Flag / Green Flag",subtitle:"Judge the scenario together.",icon:"🚩"},
  {type:"would-you-rather",name:"Would You Rather?",subtitle:"Five fresh choices every round.",icon:"✦"}
];

function VoiceIcon(){return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" fill="none" stroke="currentColor" strokeWidth="1.8"/><path d="M6.8 11.5a5.2 5.2 0 0 0 10.4 0M12 16.8V21M9 21h6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>}
function GameIcon(){return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.4 8h9.2c2 0 3.4 1.2 4 3.2l1 4.4c.5 2.2-1.9 3.8-3.5 2.3l-2.1-2H8l-2.1 2c-1.6 1.5-4-.1-3.5-2.3l1-4.4C4 9.2 5.4 8 7.4 8Z" fill="none" stroke="currentColor" strokeWidth="1.7"/><path d="M7.3 11.1v3.4M5.6 12.8H9M16.3 11.8h.01M18.2 14h.01" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"/></svg>}
function EmojiIcon(){return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.8" fill="none" stroke="currentColor" strokeWidth="1.7"/><path d="M8.5 14.2c.8 1.5 2 2.2 3.5 2.2s2.7-.7 3.5-2.2" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/><circle cx="9" cy="10" r="1" fill="currentColor"/><circle cx="15" cy="10" r="1" fill="currentColor"/></svg>}
function ReplyArrow(){return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 7 5 12l5 5M6 12h7c3.5 0 5.5 1.6 6 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}

function endedTone(){
  if(!soundsEnabled())return;
  try{
    const AC=window.AudioContext||(window as any).webkitAudioContext;
    const ctx=new AC();const master=ctx.createGain();master.connect(ctx.destination);const now=ctx.currentTime;
    master.gain.setValueAtTime(.0001,now);master.gain.exponentialRampToValueAtTime(.09,now+.02);master.gain.exponentialRampToValueAtTime(.0001,now+.7);
    [{f:520,t:0},{f:390,t:.12},{f:260,t:.26}].forEach(n=>{const o=ctx.createOscillator();o.type="triangle";o.frequency.value=n.f;o.connect(master);o.start(now+n.t);o.stop(now+n.t+.32)});
    setTimeout(()=>ctx.close?.(),900)
  }catch{}
}

function messengerTone(kind:"receive"|"send"){
  if(!soundsEnabled())return;
  try{
    const AC=window.AudioContext||(window as any).webkitAudioContext;
    const ctx=new AC();const master=ctx.createGain();master.connect(ctx.destination);const now=ctx.currentTime;
    master.gain.setValueAtTime(.0001,now);master.gain.exponentialRampToValueAtTime(.04,now+.01);master.gain.exponentialRampToValueAtTime(.0001,now+.19);
    const notes=kind==="receive"?[{f:690,t:0},{f:870,t:.055}]:[{f:470,t:0},{f:610,t:.04}];
    notes.forEach((n,i)=>{const o=ctx.createOscillator();o.type="sine";o.frequency.value=n.f;o.connect(master);o.start(now+n.t);o.stop(now+n.t+.075+i*.01)});
    setTimeout(()=>ctx.close?.(),500)
  }catch{}
}

function VoicePlayer({src,label}:{src:string;label?:number}){
  const ref=useRef<HTMLAudioElement>(null);
  const [playing,setPlaying]=useState(false);
  const [progress,setProgress]=useState(0);
  const [current,setCurrent]=useState(0);
  const [duration,setDuration]=useState(label||0);
  function toggle(){
    const audio=ref.current;if(!audio)return;
    if(audio.paused){audio.play();setPlaying(true)}else{audio.pause();setPlaying(false)}
  }
  function format(value:number){return `${Math.floor(value/60)}:${String(Math.floor(value%60)).padStart(2,"0")}`}
  return <div className="legacy-voice-message">
    <audio ref={ref} src={src} preload="metadata"
      onLoadedMetadata={e=>setDuration(Number.isFinite(e.currentTarget.duration)?e.currentTarget.duration:(label||0))}
      onTimeUpdate={e=>{setCurrent(e.currentTarget.currentTime);setProgress(e.currentTarget.duration?e.currentTarget.currentTime/e.currentTarget.duration:0)}}
      onEnded={()=>{setPlaying(false);setProgress(0);setCurrent(0)}}
      onPause={()=>setPlaying(false)}
    />
    <button type="button" className={`voice-play ${playing?"playing":""}`} onClick={toggle}>{playing?"Ⅱ":"▶"}</button>
    <div className="voice-waveform-static">
      {Array.from({length:28}).map((_,index)=>{
        const seed=(index*17+11)%23;
        const height=7+(seed%17);
        const played=index/28<=progress;
        return <i key={index} className={played?"played":""} style={{height:`${height}px`}}/>
      })}
    </div>
    <span className="voice-duration">{format(current)} / {format(duration||label||1)}</span>
  </div>
}

export default function ConversationView({onExit}:{onExit?:()=>void}){
  const router=useRouter();
  const [partner,setPartner]=useState<any>(null);
  const [matchQuality,setMatchQuality]=useState<any>(null);
  const [messages,setMessages]=useState<Msg[]>([]);
  const [input,setInput]=useState("");
  const [typing,setTyping]=useState(false);
  const [ice,setIce]=useState("What's your campus pet peeve?");
  const [reply,setReply]=useState<Reply|null>(null);
  const [reactionFor,setReactionFor]=useState<string|null>(null);
  const [activeMessageId,setActiveMessageId]=useState<string|null>(null);
  const [gamesOpen,setGamesOpen]=useState(false);
  const [emojiOpen,setEmojiOpen]=useState(false);
  const [emojiQuery,setEmojiQuery]=useState("");
  const [emojiCategory,setEmojiCategory]=useState<EmojiCategory>("frequent");
  const [moreOpen,setMoreOpen]=useState(false);
  const [ended,setEnded]=useState<{self:boolean;reason:string}|null>(null);
  const [ending,setEnding]=useState(false);
  const [endConfirm,setEndConfirm]=useState(false);
  const [recording,setRecording]=useState(false);
  const [recordSeconds,setRecordSeconds]=useState(0);
  const [recordingLevels,setRecordingLevels]=useState<number[]>(()=>Array(26).fill(6));
  const [elapsed,setElapsed]=useState(0);
  const [soundOn,setSoundOn]=useState(true);
  const [adminMode,setAdminMode]=useState(false);
  const [adminToolOpen,setAdminToolOpen]=useState(false);
  const [reportOpen,setReportOpen]=useState(false);
  const [reportReason,setReportReason]=useState("Harassment");
  const [reportDetails,setReportDetails]=useState("");
  const [reportStatus,setReportStatus]=useState("");
  const [swipe,setSwipe]=useState<{id:string;offset:number}|null>(null);
  const [timedNotice,setTimedNotice]=useState("");
  const [feedback,setFeedback]=useState<"good"|"okay"|"bad"|null>(null);
  const [gameInvite,setGameInvite]=useState<GameInvite|null>(null);
  const [gamePending,setGamePending]=useState<GameInvite|null>(null);
  const [activeGame,setActiveGame]=useState<GameRound|null>(null);
  const [gameChoice,setGameChoice]=useState<number|null>(null);
  const [partnerAnswered,setPartnerAnswered]=useState(false);
  const [gameRoundResult,setGameRoundResult]=useState<GameRoundResult|null>(null);
  const [gameFinished,setGameFinished]=useState<GameFinished|null>(null);
  const [gameSeconds,setGameSeconds]=useState(15);
  const [gameStatus,setGameStatus]=useState("");

  const endRef=useRef<HTMLDivElement>(null);
  const mediaRef=useRef<MediaRecorder|null>(null);
  const chunksRef=useRef<Blob[]>([]);
  const cancelVoiceRef=useRef(false);
  const recordSecondsRef=useRef(0);
  const recordTimerRef=useRef<ReturnType<typeof setInterval>|null>(null);
  const recordingAnimationRef=useRef<number|null>(null);
  const recordingAudioContextRef=useRef<AudioContext|null>(null);
  const activeConversationRef=useRef(true);
  const slide=useRef<{id:string;x:number;y:number}|null>(null);
  const pointerMovedRef=useRef(false);
  const inputRef=useRef<HTMLInputElement|null>(null);

  const visibleEmojis=useMemo(()=>{
    const query=emojiQuery.trim().toLowerCase();
    const source=query?ALL_EMOJIS:EMOJI_CATALOG[emojiCategory].items;
    if(!query)return source;
    return source.filter(emoji=>{
      const hex=emoji.codePointAt(0)?.toString(16)||"";
      return emoji.includes(query)||hex.includes(query)
    })
  },[emojiCategory,emojiQuery]);

  useEffect(()=>{setSoundOn(soundsEnabled());setAdminMode(isAdminMode())},[]);

  useEffect(()=>{
    const pending=getPendingMatch<any>();
    if(pending?.partner)setPartner(pending.partner);if(pending?.matchQuality)setMatchQuality(pending.matchQuality);

    const socket=getSocket();
    const recv=(event:any)=>{setMessages(list=>[...list,{...event,mine:false}]);messengerTone("receive");socket.emit("ack-message",{id:event.id})};
    const sent=(event:any)=>{setMessages(list=>[...list,{...event,mine:true}]);messengerTone("send")};
    const voiceRecv=(event:any)=>{setMessages(list=>[...list,{...event,mine:false,type:"voice"}]);messengerTone("receive")};
    const voiceSent=(event:any)=>{setMessages(list=>[...list,{...event,mine:true,type:"voice"}]);messengerTone("send")};
    const resume=(event:any)=>{setPartner(event.partner);if(event.matchQuality)setMatchQuality(event.matchQuality);setEnded(null);activeConversationRef.current=true};
    const partnerTyping=(event:any)=>setTyping(!!event.typing);
    const chatEnded=(event:any)=>{
      activeConversationRef.current=false;
      clearPendingMatch();
      setTyping(false);
      setEnding(false);
      setEnded({self:!!event?.endedBySelf,reason:event?.reason||"ended"});
      setMoreOpen(false);setGamesOpen(false);setEmojiOpen(false);setReactionFor(null);setActiveMessageId(null);setGameInvite(null);setGamePending(null);setActiveGame(null);setGameFinished(null);setGameRoundResult(null);
      endedTone()
    };
    const activity=(event:any)=>{
      setMessages(list=>[...list,{
        id:crypto.randomUUID(),
        type:"activity",
        mine:false,
        label:event.label||"Activity",
        prompt:event.prompt||"",
        sentAt:event.sentAt||new Date().toISOString()
      }])
    };
    const icebreaker=(event:any)=>{if(event?.prompt)setIce(String(event.prompt))};
    const reacted=(event:any)=>setMessages(list=>list.map(item=>item.id===event.messageId?{...item,reactions:event.reactions}:item));

    const gameInviteReceived=(event:GameInvite)=>{setGameInvite(event);setGamePending(null);setGameStatus("")};
    const gameInviteSent=(event:GameInvite)=>{setGamePending(event);setGameStatus("Invitation sent. Waiting for your match…")};
    const gameInviteAccepted=()=>{setGameInvite(null);setGamePending(null);setGameStatus("Game accepted. Starting…")};
    const gameInviteDeclined=(event:any)=>{setGameInvite(null);setGamePending(null);setGameStatus(event?.reason||"Game invitation declined.");setTimeout(()=>setGameStatus(""),2600)};
    const gameInviteExpired=()=>{setGameInvite(null);setGamePending(null)};
    const gameRound=(event:GameRound)=>{setActiveGame(event);setGameChoice(null);setPartnerAnswered(false);setGameRoundResult(null);setGameFinished(null);setGameSeconds(event.duration||15);setGameStatus("")};
    const gamePartnerAnswered=()=>setPartnerAnswered(true);
    const gameResult=(event:GameRoundResult)=>{setGameRoundResult(event);setPartnerAnswered(false)};
    const gameDone=(event:GameFinished)=>{setActiveGame(null);setGameRoundResult(null);setGameChoice(null);setPartnerAnswered(false);setGameFinished(event);setGameStatus("")};

    socket.on("message-received",recv);
    socket.on("message-sent",sent);
    socket.on("voice-received",voiceRecv);
    socket.on("voice-sent",voiceSent);
    socket.on("resume-match",resume);
    socket.on("partner-typing",partnerTyping);
    socket.on("chat-ended",chatEnded);
    socket.on("activity-prompt",activity);
    socket.on("icebreaker-prompt",icebreaker);
    socket.on("reaction-update",reacted);
    socket.on("game-invite",gameInviteReceived);
    socket.on("game-invite-sent",gameInviteSent);
    socket.on("game-invite-accepted",gameInviteAccepted);
    socket.on("game-invite-declined",gameInviteDeclined);
    socket.on("game-invite-expired",gameInviteExpired);
    socket.on("game-round",gameRound);
    socket.on("game-partner-answered",gamePartnerAnswered);
    socket.on("game-round-result",gameResult);
    socket.on("game-finished",gameDone);

    return()=>{
      socket.off("message-received",recv);socket.off("message-sent",sent);socket.off("voice-received",voiceRecv);socket.off("voice-sent",voiceSent);
      socket.off("resume-match",resume);socket.off("partner-typing",partnerTyping);socket.off("chat-ended",chatEnded);socket.off("activity-prompt",activity);socket.off("icebreaker-prompt",icebreaker);socket.off("reaction-update",reacted);
      socket.off("game-invite",gameInviteReceived);socket.off("game-invite-sent",gameInviteSent);socket.off("game-invite-accepted",gameInviteAccepted);socket.off("game-invite-declined",gameInviteDeclined);socket.off("game-invite-expired",gameInviteExpired);socket.off("game-round",gameRound);socket.off("game-partner-answered",gamePartnerAnswered);socket.off("game-round-result",gameResult);socket.off("game-finished",gameDone)
    }
  },[]);

  useEffect(()=>{
    if(!activeGame||gameRoundResult)return;
    setGameSeconds(activeGame.duration||15);
    const timer=setInterval(()=>setGameSeconds(value=>Math.max(0,value-1)),1000);
    return()=>clearInterval(timer)
  },[activeGame?.gameId,activeGame?.round,gameRoundResult]);

  useEffect(()=>{
    const started=Date.now();
    const timer=setInterval(()=>{
      const seconds=Math.floor((Date.now()-started)/1000);setElapsed(seconds);
      const minutes=Math.floor(seconds/60);
      if(minutes===10)setTimedNotice("You've been talking for 10 minutes");
      if(minutes===12)setTimedNotice("Keep personal information private. You decide what you want to share.");
      if(minutes===30)setTimedNotice("30-minute conversation 🔥");
    },1000);
    return()=>clearInterval(timer)
  },[]);

  useEffect(()=>{
    if(!timedNotice)return;
    const timer=setTimeout(()=>setTimedNotice(""),timedNotice.includes("private")?8500:6500);
    return()=>clearTimeout(timer)
  },[timedNotice]);

  useEffect(()=>{
    const closeFloatingUi=(event:globalThis.PointerEvent)=>{
      const target=event.target as HTMLElement|null;
      if(!target)return;
      if(!target.closest(".tool-wrap")){setEmojiOpen(false);setGamesOpen(false)}
      if(!target.closest(".message-row")){setReactionFor(null);setActiveMessageId(null)}
    };
    const closeOnEscape=(event:KeyboardEvent)=>{
      if(event.key!=="Escape")return;
      setEmojiOpen(false);setGamesOpen(false);setReactionFor(null);setActiveMessageId(null)
    };
    document.addEventListener("pointerdown",closeFloatingUi);
    document.addEventListener("keydown",closeOnEscape);
    return()=>{document.removeEventListener("pointerdown",closeFloatingUi);document.removeEventListener("keydown",closeOnEscape)}
  },[]);

  useEffect(()=>{
    const api=process.env.NEXT_PUBLIC_SOCKET_URL||"http://localhost:3001";
    const leave=()=>{
      if(!activeConversationRef.current)return;
      activeConversationRef.current=false;
      const body=new URLSearchParams();body.set("sessionUuid",getSessionId());
      try{if(navigator.sendBeacon){navigator.sendBeacon(`${api}/api/end-chat-beacon`,body);return}}catch{}
      try{fetch(`${api}/api/end-chat-beacon`,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded;charset=UTF-8"},body,keepalive:true}).catch(()=>{})}catch{}
    };
    const click=(event:MouseEvent)=>{
      const target=event.target as Element|null;
      const link=target?.closest?.("a[href]") as HTMLAnchorElement|null;
      if(!link)return;
      try{const url=new URL(link.href,location.href);if(url.origin===location.origin&&url.pathname!=="/conversation")leave()}catch{}
    };
    document.addEventListener("click",click,true);
    window.addEventListener("pagehide",leave);
    window.addEventListener("beforeunload",leave);
    return()=>{document.removeEventListener("click",click,true);window.removeEventListener("pagehide",leave);window.removeEventListener("beforeunload",leave)}
  },[]);

  useEffect(()=>{endRef.current?.scrollIntoView({behavior:"smooth"})},[messages,ended]);

  function send(event?:FormEvent,override?:string){
    event?.preventDefault();if(ended||ending)return;
    const text=(override??input).trim();if(!text)return;
    if(!override)setInput("");
    getSocket().emit("typing",{typing:false});
    getSocket().emit("send-message",{text,clientId:crypto.randomUUID(),replyTo:reply},(result:any)=>{
      if(!result?.ok&&!override)setInput(text)
    });
    setReply(null)
  }

  function pickEmoji(emoji:string){
    setInput(value=>value+emoji);
    requestAnimationFrame(()=>inputRef.current?.focus())
  }
  function respondGameInvite(accept:boolean){
    if(!gameInvite)return;
    getSocket().emit("respond-game-invite",{gameId:gameInvite.gameId,accept},(result:any)=>{if(!result?.ok)setGameStatus(result?.error||"Could not respond to the invitation.")});
    if(!accept)setGameInvite(null)
  }
  function answerGame(choice:number){
    if(!activeGame||gameChoice!==null||gameRoundResult)return;
    setGameChoice(choice);
    getSocket().emit("game-answer",{gameId:activeGame.gameId,choice},(result:any)=>{if(!result?.ok){setGameChoice(null);setGameStatus(result?.error||"Could not lock your answer.")}})
  }
  function endGame(){
    if(activeGame)getSocket().emit("game-end",{gameId:activeGame.gameId},()=>{});
    setActiveGame(null);setGameRoundResult(null);setGameChoice(null);setPartnerAnswered(false)
  }

  function react(messageId:string,emoji:string){
    getSocket().emit("react-message",{messageId,emoji},()=>{});
    setReactionFor(null);
    setActiveMessageId(null)
  }

  function replyToMessage(message:Msg){
    setReply({id:message.id,text:message.text||"Voice message",nickname:message.mine?"You":partner?.nickname});
    setReactionFor(null);
    setActiveMessageId(null);
    requestAnimationFrame(()=>inputRef.current?.focus())
  }

  function toggleMessageActions(message:Msg){
    if(pointerMovedRef.current){pointerMovedRef.current=false;return}
    setReactionFor(null);
    setActiveMessageId(current=>current===message.id?null:message.id)
  }

  function pointerDown(event:PointerEvent<HTMLDivElement>,message:Msg){
    if(ended||ending||message.type==="activity")return;
    if((event.target as HTMLElement).closest("button,a,audio"))return;
    try{event.currentTarget.setPointerCapture(event.pointerId)}catch{}
    pointerMovedRef.current=false;
    slide.current={id:message.id,x:event.clientX,y:event.clientY};
    setSwipe({id:message.id,offset:0})
  }

  function pointerMove(event:PointerEvent<HTMLDivElement>,message:Msg){
    if(!slide.current||slide.current.id!==message.id)return;
    const dx=Math.max(0,Math.min(82,event.clientX-slide.current.x));
    const dy=event.clientY-slide.current.y;

    if(Math.abs(dx)>8||Math.abs(dy)>8)pointerMovedRef.current=true;

    if(Math.abs(dy)>18&&Math.abs(dy)>Math.abs(dx)){
      setSwipe(null);
      slide.current=null;
      return
    }

    setSwipe({id:message.id,offset:dx});

    if(dx>=58&&Math.abs(dx)>Math.abs(dy)){
      replyToMessage(message);
      navigator.vibrate?.(12);
      slide.current=null;
      setTimeout(()=>setSwipe(null),150)
    }
  }

  function pointerUp(){
    slide.current=null;
    setSwipe(null)
  }

  async function startVoice(){
    if(ended||ending||recording)return;
    if(!window.isSecureContext&&!["localhost","127.0.0.1"].includes(location.hostname)){alert("Voice messages require HTTPS on phones.");return}
    try{
      const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
      try{
        const AC=window.AudioContext||(window as any).webkitAudioContext;
        const audioContext=new AC();recordingAudioContextRef.current=audioContext;
        const source=audioContext.createMediaStreamSource(stream);
        const analyser=audioContext.createAnalyser();analyser.fftSize=64;source.connect(analyser);
        const data=new Uint8Array(analyser.frequencyBinCount);
        const draw=()=>{
          analyser.getByteFrequencyData(data);
          setRecordingLevels(Array.from({length:26},(_,index)=>6+Math.round(((data[index%data.length]||0)/255)*22)));
          recordingAnimationRef.current=requestAnimationFrame(draw)
        };
        draw()
      }catch{}

      const supported=["audio/mp4;codecs=mp4a.40.2","audio/mp4","audio/webm;codecs=opus","audio/webm","audio/ogg;codecs=opus"].find(type=>MediaRecorder.isTypeSupported(type));
      const recorder=new MediaRecorder(stream,supported?{mimeType:supported,audioBitsPerSecond:64000}:undefined);
      chunksRef.current=[];cancelVoiceRef.current=false;recordSecondsRef.current=0;setRecordSeconds(0);

      recorder.ondataavailable=event=>{if(event.data.size)chunksRef.current.push(event.data)};
      recorder.onstop=()=>{
        if(recordTimerRef.current)clearInterval(recordTimerRef.current);
        recordTimerRef.current=null;setRecording(false);stream.getTracks().forEach(track=>track.stop());
        if(recordingAnimationRef.current)cancelAnimationFrame(recordingAnimationRef.current);
        recordingAnimationRef.current=null;
        recordingAudioContextRef.current?.close().catch(()=>{});
        recordingAudioContextRef.current=null;setRecordingLevels(Array(26).fill(6));
        if(cancelVoiceRef.current){chunksRef.current=[];return}
        const blob=new Blob(chunksRef.current,{type:recorder.mimeType||supported||"audio/webm"});
        if(!blob.size)return;
        const reader=new FileReader();
        reader.onload=()=>getSocket().emit("send-voice",{data:reader.result,duration:recordSecondsRef.current,clientId:crypto.randomUUID()},()=>{});
        reader.readAsDataURL(blob)
      };

      recorder.start(250);mediaRef.current=recorder;setRecording(true);
      recordTimerRef.current=setInterval(()=>setRecordSeconds(value=>{
        const next=Math.min(60,value+1);recordSecondsRef.current=next;if(next>=60)finishVoice(true);return next
      }),1000)
    }catch{alert("Microphone permission is required for voice messages.")}
  }

  function finishVoice(sendIt:boolean){
    const recorder=mediaRef.current;if(!recorder||recorder.state==="inactive")return;
    cancelVoiceRef.current=!sendIt;recorder.stop();mediaRef.current=null
  }

  function endNow(){
    if(ending||ended)return;
    if(!endConfirm){
      setEndConfirm(true);
      setTimeout(()=>setEndConfirm(false),3200);
      return;
    }
    setEnding(true);
    setEndConfirm(false);
    setMoreOpen(false);
    setTimeout(()=>getSocket().emit("end-chat",()=>{}),180)
  }

  function nextPerson(){clearPendingMatch();hideConversationView();router.push(getProfile()?"/finding":"/")}
  function toggleSound(){const next=!soundOn;setSoundOn(next);setSoundsEnabled(next);setMoreOpen(false)}
  
  async function moderatePartner(action:"ban"|"unban"|"suspend"|"unsuspend",minutes=60){
    if(!adminMode||!partner?.sessionId)return;
    const api=process.env.NEXT_PUBLIC_SOCKET_URL||"http://localhost:3001";
    const token=getAdminToken();
    await fetch(`${api}/api/admin/moderation`,{
      method:"POST",
      headers:{"Content-Type":"application/json","Authorization":`Bearer ${token}`},
      body:JSON.stringify({sessionId:partner.sessionId,action,minutes,reason:"Moderated from active chat"})
    });
    setAdminToolOpen(false)
  }

  async function submitReport(){if(!partner?.sessionId)return;const pending=getPendingMatch<any>();setReportStatus("Submitting...");try{const api=process.env.NEXT_PUBLIC_SOCKET_URL||"http://localhost:3001";const r=await fetch(`${api}/api/report`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({conversationId:pending?.matchUuid||"",reporterSessionId:getSessionId(),reportedSessionId:partner.sessionId,reason:reportReason,details:reportDetails})});const d=await r.json();if(!r.ok)throw new Error(d.error||"Could not submit report.");setReportStatus(`Report submitted. ID: ${d.reportId}`)}catch(e:any){setReportStatus(e.message||"Could not submit report.")}}

function goHome(){
    hideConversationView();
    if(!ended&&activeConversationRef.current){
      activeConversationRef.current=false;
      clearPendingMatch();
      getSocket().emit("end-chat",()=>{});
    }else clearPendingMatch();
    if(onExit)onExit();else router.replace("/")
  }

function fmt(value:number){return `${String(Math.floor(value/60)).padStart(2,"0")}:${String(value%60).padStart(2,"0")}`}

  return <div className="conversation-page">
    <SiteHeader/>
    <section className={`conversation-shell ${ended?"conversation-is-ended":""} ${ending?"conversation-ending":""}`}>
      <header className={`partner-bar legacy-partner-bar ${ended?"has-chat-back":""}`}>
        {ended&&<button type="button" className="chat-home-button" aria-label="Back to Home" title="Back to Home" onClick={goHome}><img src="/assets/back-arrow-flaticon.png" alt=""/></button>}
        <div className={`legacy-avatar ${partner?.isAdmin?"admin-avatar":""}`} aria-hidden="true">
          <img src={partner?.isAdmin?"/assets/admin-profile.png":"/assets/user-profile.png"} alt=""/>
        </div>
        <div className="partner-copy legacy-partner-copy">
          <small>CHATTING WITH</small>
          <div className="partner-name-line">
            <b>{partner?.nickname||"Anonymous Isko"}</b>
            {partner?.isAdmin&&<span className="partner-admin-badge">ADMIN</span>}
            <i className="partner-online-dot" aria-label="online"/>
          </div>
          <span className="partner-campus">{partner?.campus||"Campus hidden"}</span>
        </div>
        <div className="chat-time">{fmt(elapsed)}</div>
        <div className="more-wrap">
          <button className={`more-button ${moreOpen?"active":""}`} aria-label="More options" onClick={()=>setMoreOpen(value=>!value)}><span/><span/><span/></button>
          {moreOpen&&<div className="more-menu">
            <button onClick={toggleSound}>{soundOn?"Mute chat sounds":"Turn on chat sounds"}</button>
            <button onClick={()=>{setMoreOpen(false);setReportOpen(true)}}>Report conversation</button>
            <button onClick={()=>{
              setMoreOpen(false);
              if(!ended&&activeConversationRef.current){activeConversationRef.current=false;clearPendingMatch();getSocket().emit("end-chat",()=>{})}
              router.push("/terms")
            }}>Safety & Terms</button>
            {adminMode&&<button className="admin-chat-tool-trigger" onClick={()=>{setMoreOpen(false);setAdminToolOpen(true)}}>Moderation tools</button>}
          </div>}
        </div>
      </header>

      <div className="room-title"><b>Main chat</b><span>anonymous one-on-one conversation</span></div>{matchQuality&&<div className="match-quality-banner"><div><small>{matchQuality.label||"Matched"}</small><b>{matchQuality.reason||"Compatible anonymous match"}</b></div><span>{Math.round(matchQuality.score||0)}%</span></div>}
      {timedNotice&&<div className="conversation-timed-notice">{timedNotice}</div>}

      <div className="messages">
        <div className="day">Today</div>
        <div className="connected-note">You are now connected with {partner?.nickname||"your match"}.</div>
        <div className="chat-watermark" aria-hidden="true"><span>SintaChat.com</span></div>
        <div className="gesture-hint" aria-hidden="true">Tap or hover a message for reply &amp; reactions <i>•</i> Swipe right to reply</div>

        {messages.map(message=>{
          if(message.type==="activity"){
            return <div className="activity-chat-card message-enter" key={message.id}>
              <span>{message.label||"Activity"}</span>
              <p>{message.prompt}</p>
            </div>
          }

          const offset=swipe?.id===message.id?swipe.offset:0;
          const actionsOpen=activeMessageId===message.id;
          return <div className={`message-row ${message.mine?"mine":"theirs"} ${actionsOpen?"actions-open":""}`} key={message.id}>
            <div className="swipe-reply-indicator" style={{opacity:Math.min(1,offset/40),transform:`scale(${.72+Math.min(1,offset/68)*.28})`}}><ReplyArrow/></div>
            <div className="bubble-wrap" style={{transform:`translateX(${offset}px)`}}>
              <div className="bubble-cluster">
                <div
                  className={`bubble ${offset>0?"swiping":""} ${((message.mine&&adminMode)||(!message.mine&&partner?.isAdmin))?"admin-neon-bubble":""}`}
                  onPointerDown={event=>pointerDown(event,message)}
                  onPointerMove={event=>pointerMove(event,message)}
                  onPointerUp={pointerUp}
                  onPointerCancel={pointerUp}
                  onClick={event=>{if((event.target as HTMLElement).closest("button,a,audio"))return;toggleMessageActions(message)}}
                  onContextMenu={event=>{event.preventDefault();setActiveMessageId(message.id);setReactionFor(message.id)}}
                  tabIndex={0}
                  onKeyDown={event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();toggleMessageActions(message)}}}
                  aria-label="Message actions"
                >
                  {message.replyTo&&<div className="reply-snippet"><ReplyArrow/><span>{message.replyTo.text}</span></div>}
                  {message.type==="voice"&&message.audioUrl
                    ? <VoicePlayer src={message.audioUrl} label={message.duration}/>
                    : <span>{message.text}</span>}
                  <small>{new Date(message.sentAt).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"})}</small>
                </div>

                <div className="message-quick-actions">
                  <button type="button" className="message-quick-reply" aria-label="Reply to message" title="Reply" onClick={event=>{event.stopPropagation();replyToMessage(message)}}><ReplyArrow/></button>
                  <div className="message-reaction-wrap">
                    <button type="button" className={`message-quick-react ${reactionFor===message.id?"active":""}`} aria-label="React to message" title="React" onClick={event=>{event.stopPropagation();setActiveMessageId(message.id);setReactionFor(current=>current===message.id?null:message.id)}}><EmojiIcon/></button>
                    {reactionFor===message.id&&<div className="message-reaction-picker" role="menu" aria-label="Choose a reaction">
                      {REACTIONS.map(reaction=><button type="button" role="menuitem" key={reaction} onClick={event=>{event.stopPropagation();react(message.id,reaction)}}>{reaction}</button>)}
                    </div>}
                  </div>
                </div>
              </div>

              {message.reactions&&Object.keys(message.reactions).length>0&&<div className="reaction-summary">
                {Object.entries(message.reactions).map(([emoji,count])=><span key={emoji}>{emoji} {count}</span>)}
              </div>}
            </div>
          </div>
        })}

        {typing&&!ended&&<div className="typing"><i/><i/><i/></div>}

        {ended&&<>
          <div className="chat-ended-system-message">{ended.self?"You ended the conversation.":"Your chat partner ended the conversation."}</div>
          <section className="conversation-ended-card">
            <div className="ended-icon">✓</div>
            <p className="eyebrow">CONVERSATION ENDED</p>
            <h2>Conversation Ended</h2>
            <p>{ended.self?"You ended the chat.":"The other person ended the chat."}</p>
            <div className="conversation-feedback">
              <span>{feedback?"Thanks for your feedback.":"How was the conversation?"}</span>
              <div>{(["good","okay","bad"] as const).map(rating=>{
                const label=rating==="good"?"👍 Good":rating==="okay"?"😐 Okay":"👎 Bad";
                return <button type="button" key={rating} className={feedback===rating?"selected":""} disabled={!!feedback}
                  onClick={()=>{setFeedback(rating);getSocket().emit("conversation-feedback",{rating},()=>{})}}>{label}</button>
              })}</div>
            </div>
            <button className="next-chat-button" onClick={nextPerson}>Next?</button>
          </section>
        </>}
        <div ref={endRef}/>
      </div>

      {!ended&&<>
        <div className="ice-row legacy-ice-row">
          <button className="ice-label" onClick={()=>getSocket().emit("request-icebreaker",(result:any)=>{if(result?.prompt)setIce(result.prompt)})}>Icebreaker</button>
          <button className="ice-question" onClick={()=>send(undefined,ice)}>{ice}</button>
        </div>

        {reply&&<div className="reply-preview">
          <div><b>Replying to {reply.nickname||"message"}</b><span>{reply.text}</span></div>
          <button onClick={()=>setReply(null)}>×</button>
        </div>}

        {recording
          ? <div className="voice-recording-composer">
              <button className="voice-cancel" type="button" onClick={()=>finishVoice(false)}>Cancel</button>
              <div className="recording-live">
                <span className="record-dot"/>
                <div className="record-wave">{recordingLevels.map((height,index)=><i key={index} style={{height:`${height}px`}}/>)}</div>
                <strong>{fmt(recordSeconds)}</strong>
              </div>
              <button className="voice-send" type="button" onClick={()=>finishVoice(true)}>Send</button>
            </div>
          : <form className="composer animo-composer-layout" onSubmit={send}>
              <button type="button" className={`composer-end-button ${endConfirm?"confirming":""}`} onClick={endNow} disabled={ending}>{ending?"Ending...":endConfirm?"Sure?":"End"}</button>

              <input
                ref={inputRef}
                value={input}
                onChange={event=>{setInput(event.target.value);getSocket().emit("typing",{typing:!!event.target.value})}}
                placeholder="Say hi!"
              />

              <button type="button" className="composer-icon voice-button" aria-label="Voice" onClick={startVoice}><VoiceIcon/></button>

              <div className="tool-wrap">
                <button type="button" className={`composer-icon emoji-button ${emojiOpen?"active":""}`} aria-label="Emoji" aria-expanded={emojiOpen} onClick={()=>{setGamesOpen(false);setEmojiOpen(value=>!value)}}><EmojiIcon/></button>
                {emojiOpen&&<div className="emoji-popover messenger-emoji-panel legacy-emoji-panel">
                  <div className="emoji-panel-head"><b><span className="emoji-pointer">👇</span> Pick an emoji...</b><button type="button" onClick={()=>setEmojiOpen(false)}>×</button></div>
                  <div className="emoji-tabs">{(Object.keys(EMOJI_CATALOG) as EmojiCategory[]).map(category=>
                    <button type="button" className={emojiCategory===category?"active":""} key={category} aria-label={EMOJI_CATALOG[category].label} title={EMOJI_CATALOG[category].label} onClick={()=>{setEmojiCategory(category);setEmojiQuery("")}}>{EMOJI_CATALOG[category].icon}</button>
                  )}</div>
                  <div className="emoji-search"><span>⌕</span><input value={emojiQuery} onChange={event=>setEmojiQuery(event.target.value)} placeholder="Search"/><i aria-hidden="true">●</i></div>
                  <div className="emoji-scroll-area">
                    {emojiQuery
                      ? <>
                          <div className="emoji-section-title">Search results</div>
                          {visibleEmojis.length
                            ? <div className="emoji-grid">{visibleEmojis.map((emoji,index)=>
                                <button type="button" key={`${emoji}-${index}`} onClick={()=>pickEmoji(emoji)}>{emoji}</button>
                              )}</div>
                            : <div className="emoji-empty">No emoji found.</div>}
                        </>
                      : emojiCategory==="frequent"
                        ? <>
                            <div className="emoji-section-title">Frequently used</div>
                            <div className="emoji-grid">{EMOJI_CATALOG.frequent.items.map((emoji,index)=>
                              <button type="button" key={`frequent-${emoji}-${index}`} onClick={()=>pickEmoji(emoji)}>{emoji}</button>
                            )}</div>
                            <div className="emoji-section-title">Smileys &amp; People</div>
                            <div className="emoji-grid">{EMOJI_CATALOG.smileys.items.map((emoji,index)=>
                              <button type="button" key={`smileys-${emoji}-${index}`} onClick={()=>pickEmoji(emoji)}>{emoji}</button>
                            )}</div>
                          </>
                        : <>
                            <div className="emoji-section-title">{EMOJI_CATALOG[emojiCategory].label}</div>
                            <div className="emoji-grid">{EMOJI_CATALOG[emojiCategory].items.map((emoji,index)=>
                              <button type="button" key={`${emojiCategory}-${emoji}-${index}`} onClick={()=>pickEmoji(emoji)}>{emoji}</button>
                            )}</div>
                          </>
                    }
                  </div>
                </div>}
              </div>

              <div className="tool-wrap">
                <button type="button" className={`composer-icon game-button ${gamesOpen?"active":""}`} aria-label="Games" aria-expanded={gamesOpen} onClick={()=>{setEmojiOpen(false);setGamesOpen(value=>!value)}}><GameIcon/></button>
                {gamesOpen&&<div className="games-popover legacy-games-popover">
                  <div className="activity-panel-head"><b>Activities</b><button type="button" onClick={()=>setGamesOpen(false)}>×</button></div>
                  {GAMES.map(game=><button type="button" key={game.type} onClick={()=>{
                    setGameStatus("");
                    getSocket().emit("request-game",{type:game.type},(result:any)=>{if(!result?.ok)setGameStatus(result?.error||"Could not start the game.")});
                    setGamesOpen(false)
                  }}><b><i>{game.icon}</i>{game.name}</b><span>{game.subtitle}</span></button>)}
                </div>}
              </div>
            </form>}
      </>}
    </section>

    {(gameInvite||gamePending||gameStatus)&&!activeGame&&!gameFinished&&<div className="game-invite-toast" role="status">
      {gameInvite?<>
        <div className="game-invite-icon">{gameInvite.icon||"⚡"}</div>
        <div><small>GAME INVITE</small><b>{gameInvite.label}</b><span>{gameInvite.fromNickname||partner?.nickname||"Your match"} wants to play.</span></div>
        <div className="game-invite-actions"><button type="button" className="ghost" onClick={()=>respondGameInvite(false)}>Not now</button><button type="button" onClick={()=>respondGameInvite(true)}>Accept</button></div>
      </>:gamePending?<>
        <div className="game-invite-icon waiting">{gamePending.icon||"⚡"}</div>
        <div><small>INVITATION SENT</small><b>{gamePending.label}</b><span>{gameStatus||"Waiting for your match…"}</span></div>
      </>:<><div className="game-invite-icon">!</div><div><small>GAME</small><b>{gameStatus}</b></div></>}
    </div>}

    {activeGame&&<div className={`game-stage game-${activeGame.type}`}>
      <header className="game-stage-head">
        <div><span className="game-stage-icon">{activeGame.type==="red-green"?"🚩":activeGame.type==="this-or-that"?"⚡":"✦"}</span><b>{activeGame.label}</b><small>Round {activeGame.round} of {activeGame.total}</small></div>
        <div className="game-stage-controls"><strong className={gameSeconds<=5?"urgent":""}>{String(gameSeconds).padStart(2,"0")}</strong><button type="button" aria-label="End game" onClick={endGame}>×</button></div>
      </header>
      <main className="game-stage-main">
        <div className="game-round-progress">{Array.from({length:activeGame.total}).map((_,index)=><i key={index} className={index<activeGame.round?"done":index===activeGame.round-1?"current":""}/>)}</div>
        <p className="game-question">{activeGame.question.prompt}</p>
        <div className="game-options">
          {activeGame.question.options.map((option,index)=><button type="button" key={option} disabled={gameChoice!==null||!!gameRoundResult} className={`${gameChoice===index?"selected":""} ${gameRoundResult&&gameRoundResult.yourChoice===index?"mine":""} ${gameRoundResult&&gameRoundResult.partnerChoice===index?"partner-pick":""}`} onClick={()=>answerGame(index)}>
            {activeGame.type==="red-green"&&<span>{index===0?"🚩":"💚"}</span>}<b>{option}</b>
            {gameRoundResult&&gameRoundResult.yourChoice===index&&<small>You</small>}
            {gameRoundResult&&gameRoundResult.partnerChoice===index&&<small>Partner</small>}
          </button>)}
        </div>
        {!gameRoundResult&&gameChoice!==null&&<div className="game-waiting"><i/><span>{partnerAnswered?"Your match answered too…":"Answer locked. Waiting for your match…"}</span></div>}
        {!gameRoundResult&&gameChoice===null&&<small className="game-hint">Pick one before the timer runs out.</small>}
        {gameRoundResult&&<div className={`game-round-result ${gameRoundResult.matched?"matched":"split"}`}>
          <b>{gameRoundResult.matched?"Same wavelength ✨":"Different picks"}</b>
          <span>{gameRoundResult.timedOut?"Time ran out. Loading the next round…":"Next round is coming up…"}</span>
        </div>}
      </main>
    </div>}

    {gameFinished&&<div className="game-results-backdrop">
      <section className={`game-results-card game-${gameFinished.type}`}>
        <div className="game-results-trophy">🏆</div>
        <small>{gameFinished.label.toUpperCase()} · RESULTS</small>
        <h2>{gameFinished.endedEarly?"Game wrapped early":`${gameFinished.score} of ${gameFinished.total} matched`}</h2>
        <div className="game-score-ring" style={{"--score":`${gameFinished.percentage}%`} as any}><strong>{gameFinished.percentage}%</strong><span>vibe match</span></div>
        <p>{gameFinished.percentage>=80?"You two are seriously in sync.":gameFinished.percentage>=50?"A pretty good wavelength with a few plot twists.":"Different answers, better conversation fuel."}</p>
        <div className="game-results-actions"><button type="button" className="ghost" onClick={()=>setGameFinished(null)}>Back to chat</button><button type="button" onClick={()=>{const type=gameFinished.type;setGameFinished(null);getSocket().emit("request-game",{type},(result:any)=>{if(!result?.ok)setGameStatus(result?.error||"Could not start another game.")})}}>Play again</button></div>
      </section>
    </div>}

    {reportOpen&&<div className="report-chat-backdrop" onClick={()=>setReportOpen(false)}><section className="report-chat-card" onClick={e=>e.stopPropagation()}><div className="report-chat-head"><div><small>REPORT</small><b>Report this conversation</b></div><button onClick={()=>setReportOpen(false)}>×</button></div><p>Reports use anonymous conversation/session IDs only.</p><label><span>Reason</span><select value={reportReason} onChange={e=>setReportReason(e.target.value)}><option>Harassment</option><option>Sexual Content</option><option>Threats</option><option>Spam</option><option>Impersonation</option><option>Hate / Abuse</option><option>Other</option></select></label><label><span>Details</span><textarea value={reportDetails} onChange={e=>setReportDetails(e.target.value)} maxLength={500}/></label><button className="report-submit" onClick={submitReport}>Submit report</button>{reportStatus&&<small className="report-status">{reportStatus}</small>}</section></div>}

    {adminToolOpen&&adminMode&&<div className="admin-chat-tools-backdrop" onClick={()=>setAdminToolOpen(false)}>
      <section className="admin-chat-tools" onClick={event=>event.stopPropagation()}>
        <div className="admin-chat-tools-head">
          <div><small>ADMIN TOOLS</small><b>{partner?.nickname||"Anonymous user"}</b></div>
          <button onClick={()=>setAdminToolOpen(false)}>×</button>
        </div>
        <div className="admin-tool-id">Anonymous session: <code>{partner?.sessionId||"Unavailable"}</code></div>
        <div className="admin-tool-grid">
          <button className="danger" onClick={()=>moderatePartner("ban")}>Ban</button>
          <button onClick={()=>moderatePartner("unban")}>Unban</button>
          <button className="warning" onClick={()=>moderatePartner("suspend",60)}>Suspend 1h</button>
          <button onClick={()=>moderatePartner("unsuspend")}>Unsuspend</button>
        </div>
      </section>
    </div>}

  </div>
}
