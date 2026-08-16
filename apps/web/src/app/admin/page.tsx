"use client";
import { FormEvent, useEffect, useMemo, useState } from "react";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import {
  clearAdminMode,
  getAdminNickname,
  getAdminToken,
  getProfile,
  isAdminMode,
  saveProfile,
  setAdminMode
} from "../../lib/session";
import { resetSocket } from "../../lib/socket";

type UserRow={
  sessionId:string;
  nickname:string;
  campus:string;
  isAdmin:boolean;
  moderation:{banned:boolean;suspendedUntil:number|null;reason:string};
};
type ConversationRow={conversationId:string;startedAt:number;users:UserRow[]};
type ReportRow={reportId:string;conversationId:string;reportedNickname:string;reportedSessionId:string;reason:string;details:string;createdAt:number;status:string};
type AppealRow={appealId:string;sessionId:string;nickname:string;message:string;createdAt:number;status:string};
type WallPostRow={postId:string;sessionId:string;nickname:string;university:string;text:string;createdAt:number;likes:number;status:"pending"|"approved"|"rejected"};
type ModerationRow=UserRow["moderation"]&{sessionId:string;nickname:string;campus:string};

const API=()=>process.env.NEXT_PUBLIC_SOCKET_URL||"http://localhost:3001";
const includes=(value:string,query:string)=>value.toLowerCase().includes(query.toLowerCase());

export default function AdminPage(){
  const [admin,setAdmin]=useState(false);
  const [nickname,setNickname]=useState("");
  const [password,setPassword]=useState("");
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  const [conversations,setConversations]=useState<ConversationRow[]>([]);
  const [records,setRecords]=useState<ModerationRow[]>([]);
  const [reports,setReports]=useState<ReportRow[]>([]);
  const [appeals,setAppeals]=useState<AppealRow[]>([]);
  const [wallPosts,setWallPosts]=useState<WallPostRow[]>([]);
  const [refreshing,setRefreshing]=useState(false);
  const [actionKey,setActionKey]=useState("");
  const [notice,setNotice]=useState<{type:"success"|"error";text:string}|null>(null);
  const [query,setQuery]=useState("");

  useEffect(()=>{
    const active=isAdminMode();
    setAdmin(active);
    if(active)refresh()
  },[]);

  async function login(event:FormEvent){
    event.preventDefault();
    setError("");
    if(!nickname.trim()||!password){setError("Enter an admin nickname and password.");return}
    setBusy(true);
    try{
      const response=await fetch(`${API()}/api/admin/login`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({nickname:nickname.trim(),password})});
      const data=await response.json();
      if(!response.ok||!data?.token)throw new Error(data?.error||"Admin login failed.");
      setAdminMode(data.token,nickname.trim());
      resetSocket();
      const existing=getProfile();
      saveProfile({nickname:nickname.trim(),campus:existing?.campus||"Other school / Rather not say",preference:existing?.preference||"anyone",vibe:existing?.vibe||"Chill",interests:existing?.interests||[],aboutMe:existing?.aboutMe||"SintaChat administrator",gender:existing?.gender||"unspecified"});
      setAdmin(true);
      await refresh(data.token)
    }catch(err:any){setError(err?.message||"Admin login failed.")}finally{setBusy(false)}
  }

  async function adminFetch(path:string,options:RequestInit={},tokenOverride?:string){
    const token=tokenOverride||getAdminToken();
    if(!token)throw new Error("Your admin session is missing. Open /admin and log in again.");
    const response=await fetch(`${API()}${path}`,{...options,cache:"no-store",headers:{"Content-Type":"application/json","Authorization":`Bearer ${token}`,...(options.headers||{})}});
    const data=await response.json().catch(()=>({}));
    if(response.status===401){setAdmin(false);throw new Error("Your admin session expired. Please log in again.")}
    if(!response.ok)throw new Error(data?.error||`Admin request failed (${response.status}).`);
    return data
  }

  async function refresh(tokenOverride?:string){
    setRefreshing(true);
    try{
      const [convoData,modData,reportData,appealData,wallData]=await Promise.all([
        adminFetch("/api/admin/conversations",{},tokenOverride),adminFetch("/api/admin/moderation",{},tokenOverride),adminFetch("/api/admin/reports",{},tokenOverride),adminFetch("/api/admin/appeals",{},tokenOverride),adminFetch("/api/admin/freedom-wall",{},tokenOverride)
      ]);
      setConversations(convoData.conversations||[]);setRecords(modData.records||[]);setReports(reportData.reports||[]);setAppeals(appealData.appeals||[]);setWallPosts(wallData.posts||[]);setError("")
    }catch(err:any){setError(err?.message||"Could not load moderation data.")}finally{setRefreshing(false)}
  }

  async function moderate(sessionId:string,action:"ban"|"unban"|"suspend"|"unsuspend",minutes=60){
    const key=`${sessionId}:${action}`;setActionKey(key);setNotice(null);setError("");
    try{
      const data=await adminFetch("/api/admin/moderation",{method:"POST",body:JSON.stringify({sessionId,action,minutes,reason:action==="ban"?"Banned by SintaChat moderation":action==="suspend"?`Suspended for ${minutes} minutes`:""})});
      const updated=data.record;
      if(updated){
        setRecords(current=>current.some(row=>row.sessionId===sessionId)?current.map(row=>row.sessionId===sessionId?{...row,...updated}:row):[{...updated},...current]);
        setConversations(current=>current.map(conversation=>({...conversation,users:conversation.users.map(user=>user.sessionId===sessionId?{...user,moderation:{...user.moderation,...updated}}:user)})))
      }
      const label=action==="ban"?"User banned.":action==="unban"?"User unbanned.":action==="suspend"?`User suspended for ${minutes} minutes.`:"Suspension removed.";
      setNotice({type:"success",text:label});await refresh()
    }catch(err:any){const message=err?.message||"Moderation action failed.";setNotice({type:"error",text:message});setError(message)}finally{setActionKey("")}
  }

  async function endConversation(conversationId:string){
    const key=`conversation:${conversationId}`;setActionKey(key);setNotice(null);
    try{await adminFetch("/api/admin/end-conversation",{method:"POST",body:JSON.stringify({conversationId})});setNotice({type:"success",text:"Conversation ended."});await refresh()}
    catch(err:any){const message=err?.message||"Could not end conversation.";setNotice({type:"error",text:message});setError(message)}finally{setActionKey("")}
  }
  async function updateReport(id:string,status:"reviewed"|"resolved"){await adminFetch(`/api/admin/reports/${id}`,{method:"POST",body:JSON.stringify({status})});await refresh()}
  async function reviewAppeal(id:string,decision:"approved"|"denied"){await adminFetch(`/api/admin/appeals/${id}`,{method:"POST",body:JSON.stringify({decision})});await refresh()}
  async function moderateWallPost(id:string,action:"approve"|"reject"|"delete"){
    setActionKey(`wall:${id}:${action}`);
    try{await adminFetch(`/api/admin/freedom-wall/${id}`,{method:"POST",body:JSON.stringify({action})});setNotice({type:"success",text:action==="approve"?"Freedom Wall post approved.":action==="reject"?"Freedom Wall post rejected.":"Freedom Wall post deleted."});await refresh()}
    catch(err:any){setNotice({type:"error",text:err?.message||"Wall moderation failed."})}finally{setActionKey("")}
  }

  const dashboard=useMemo(()=>{
    const pendingWall=wallPosts.filter(post=>post.status==="pending");
    const openReports=reports.filter(report=>report.status==="open");
    const openAppeals=appeals.filter(appeal=>appeal.status==="open");
    const banned=records.filter(record=>record.banned).length;
    const suspended=records.filter(record=>!record.banned&&!!(record.suspendedUntil&&record.suspendedUntil>Date.now())).length;
    return {pendingWall,openReports,openAppeals,banned,suspended,actions:banned+suspended+appeals.filter(a=>a.status==="approved").length+appeals.filter(a=>a.status==="denied").length}
  },[wallPosts,reports,appeals,records]);

  if(!admin){
    return <><SiteHeader/><main className="admin-page"><section className="admin-card">
      <div className="admin-logo"><img src="/assets/favicon.svg" alt=""/></div><p className="eyebrow">SINTACHAT ADMIN</p><h1>Enter admin mode.</h1>
      <p className="admin-note">Anonymous moderation only. No IP addresses, personal identifiers, or unnecessary device details are shown.</p>
      <form onSubmit={login}><label><span>Admin nickname</span><input value={nickname} onChange={e=>setNickname(e.target.value)} maxLength={48} placeholder="Any nickname"/></label><label><span>Password</span><input value={password} onChange={e=>setPassword(e.target.value)} type="password" placeholder="Admin password"/></label>{error&&<p className="form-error">{error}</p>}<button disabled={busy} type="submit">{busy?"Checking...":"Enter admin mode"}</button></form>
    </section></main><SiteFooter/></>
  }

  const maxActivity=Math.max(1,conversations.length,dashboard.openReports.length,dashboard.pendingWall.length,dashboard.banned+dashboard.suspended,dashboard.openAppeals.length);
  const activityRows=[
    ["Active conversations",conversations.length,"live"],
    ["Open reports",dashboard.openReports.length,"reports"],
    ["Pending wall posts",dashboard.pendingWall.length,"wall"],
    ["Bans & suspensions",dashboard.banned+dashboard.suspended,"actions"],
    ["Open appeals",dashboard.openAppeals.length,"appeals"]
  ] as const;
  const actionTotal=Math.max(1,dashboard.actions);
  const bannedPct=dashboard.banned/actionTotal*100;
  const suspendedPct=dashboard.suspended/actionTotal*100;
  const approvedPct=appeals.filter(a=>a.status==="approved").length/actionTotal*100;
  const deniedPct=appeals.filter(a=>a.status==="denied").length/actionTotal*100;
  const donut=`conic-gradient(#920022 0 ${bannedPct}%,#b5224a ${bannedPct}% ${bannedPct+suspendedPct}%,#cf5977 ${bannedPct+suspendedPct}% ${bannedPct+suspendedPct+approvedPct}%,#e5a0b2 ${bannedPct+suspendedPct+approvedPct}% ${bannedPct+suspendedPct+approvedPct+deniedPct},#ead9dd ${bannedPct+suspendedPct+approvedPct+deniedPct}% 100%)`;
  const q=query.trim();
  const filteredReports=q?reports.filter(r=>includes(`${r.reason} ${r.reportedNickname} ${r.details} ${r.reportId}`,q)):reports;
  const filteredWall=q?wallPosts.filter(p=>includes(`${p.nickname} ${p.university} ${p.text} ${p.postId}`,q)):wallPosts;
  const filteredRecords=q?records.filter(r=>includes(`${r.nickname} ${r.campus} ${r.sessionId}`,q)):records;
  const filteredConversations=q?conversations.filter(c=>includes(`${c.conversationId} ${c.users.map(u=>`${u.nickname} ${u.campus} ${u.sessionId}`).join(" ")}`,q)):conversations;
  const filteredAppeals=q?appeals.filter(a=>includes(`${a.nickname} ${a.message} ${a.appealId}`,q)):appeals;

  return <div className="admin-console-v8">
    <aside className="admin-sidebar-v8">
      <a className="admin-brand-v8" href="/"><img src="/assets/favicon.svg" alt=""/><div><b>SintaChat</b><small>ADMIN PANEL</small></div></a>
      <nav>
        <a className="active" href="#dashboard"><span>⌂</span>Dashboard</a>
        <p>MODERATION</p>
        <a href="#conversations"><span>◌</span>Active Conversations <i>{conversations.length}</i></a>
        <a href="#reports"><span>!</span>Reports <i>{dashboard.openReports.length}</i></a>
        <a href="#wall"><span>▤</span>Freedom Wall <i>{dashboard.pendingWall.length}</i></a>
        <a href="#actions"><span>◇</span>User Actions <i>{dashboard.banned+dashboard.suspended}</i></a>
        <a href="#appeals"><span>↗</span>Appeals <i>{dashboard.openAppeals.length}</i></a>
        <p>SYSTEM</p>
        <a href="#activity"><span>▥</span>Activity Overview</a>
      </nav>
      <div className="admin-sidebar-user"><img src="/assets/admin-profile.png" alt=""/><div><b>{getAdminNickname()||"Admin User"}</b><small>Administrator</small></div><button title="Sign out" onClick={()=>{clearAdminMode();resetSocket();setAdmin(false)}}>↪</button></div>
    </aside>

    <main className="admin-main-v8" id="dashboard">
      <header className="admin-topbar-v8">
        <div><p className="eyebrow">CONTROL ROOM</p><h1>Dashboard</h1><span>Overview of SintaChat platform activity and moderation</span></div>
        <div className="admin-top-actions"><label><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search user, session, post or ID..."/></label><button onClick={()=>refresh()} disabled={refreshing}>{refreshing?"Refreshing...":"Refresh"}</button></div>
      </header>

      {error&&<p className="admin-dashboard-error">{error}</p>}{notice&&<div className={`admin-action-notice ${notice.type}`}>{notice.text}</div>}

      <section className="admin-kpi-v8">
        <article><span className="kpi-icon chat">◌</span><div><small>Active Conversations</small><b>{conversations.length}</b><em>Live right now</em></div></article>
        <article><span className="kpi-icon report">!</span><div><small>Open Reports</small><b>{dashboard.openReports.length}</b><em>Needs moderation</em></div></article>
        <article><span className="kpi-icon wall">▤</span><div><small>Pending Wall Posts</small><b>{dashboard.pendingWall.length}</b><em>Waiting approval</em></div></article>
        <article><span className="kpi-icon shield">◇</span><div><small>Bans & Suspensions</small><b>{dashboard.banned+dashboard.suspended}</b><em>{dashboard.banned} banned, {dashboard.suspended} suspended</em></div></article>
        <article><span className="kpi-icon appeal">↗</span><div><small>Open Appeals</small><b>{dashboard.openAppeals.length}</b><em>Needs decision</em></div></article>
      </section>

      <section className="admin-dashboard-grid-v8" id="activity">
        <article className="admin-widget-v8 activity-widget"><header><div><h2>Activity Overview</h2><p>Live moderation workload</p></div><span>Current</span></header><div className="activity-bars-v8">{activityRows.map(([label,value,key])=><div key={key}><div><span>{label}</span><b>{value}</b></div><i><em style={{width:`${Math.max(value?8:0,value/maxActivity*100)}%`}}/></i></div>)}</div></article>
        <article className="admin-widget-v8 recent-reports"><header><div><h2>Recent Reports</h2><p>Newest moderation cases</p></div><a href="#reports">View all</a></header><div>{reports.slice(0,5).map(r=><section key={r.reportId}><span className={`report-dot ${r.status}`}>!</span><div><b>{r.reason}</b><small>{r.reportedNickname} · {new Date(r.createdAt).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"})}</small></div><strong className={`case-status ${r.status}`}>{r.status}</strong></section>)}{reports.length===0&&<p className="admin-empty">No reports yet.</p>}</div></article>
      </section>

      <section className="admin-dashboard-grid-v8 lower-grid">
        <article className="admin-widget-v8 pending-widget"><header><div><h2>Freedom Wall: Pending Posts</h2><p>Quick approval queue</p></div><a href="#wall">View all</a></header><div className="pending-table-v8">{dashboard.pendingWall.slice(0,4).map(post=><section key={post.postId}><div><b>{post.text}</b><small>{post.nickname} · {post.university}</small></div><time>{new Date(post.createdAt).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"})}</time><div><button title="Approve" disabled={actionKey!==""} onClick={()=>moderateWallPost(post.postId,"approve")}>✓</button><button className="reject" title="Reject" disabled={actionKey!==""} onClick={()=>moderateWallPost(post.postId,"reject")}>×</button></div></section>)}{dashboard.pendingWall.length===0&&<p className="admin-empty">No pending wall posts.</p>}</div></article>
        <article className="admin-widget-v8 action-summary"><header><div><h2>User Actions Summary</h2><p>Current moderation outcomes</p></div></header><div className="donut-area-v8"><div className="admin-donut" style={{background:donut}}><span><b>{dashboard.actions}</b><small>Total Actions</small></span></div><div className="donut-legend-v8"><p><i className="ban"/>Banned <b>{dashboard.banned}</b></p><p><i className="suspend"/>Suspended <b>{dashboard.suspended}</b></p><p><i className="approved"/>Appeals Approved <b>{appeals.filter(a=>a.status==="approved").length}</b></p><p><i className="denied"/>Appeals Denied <b>{appeals.filter(a=>a.status==="denied").length}</b></p></div></div></article>
      </section>

      <section className="admin-section-v8" id="conversations"><div className="section-heading-v8"><div><p>LIVE MODERATION</p><h2>Active conversations</h2></div><span>{filteredConversations.length}</span></div><div className="conversation-monitor-list">{filteredConversations.length===0&&<p className="admin-empty">No matching active conversations.</p>}{filteredConversations.map(row=><article className="conversation-monitor-card" key={row.conversationId}><div className="conversation-monitor-meta"><code>{row.conversationId}</code><span>{new Date(row.startedAt).toLocaleString()}</span></div><div className="conversation-user-pair">{row.users.map(user=><section key={user.sessionId}><div className="admin-user-name"><b>{user.nickname}</b>{user.isAdmin&&<em>ADMIN</em>}</div><span>{user.campus||"Campus hidden"}</span><code>{user.sessionId}</code><div className="moderation-mini-actions"><button className="danger" disabled={actionKey!==""||user.moderation.banned} onClick={()=>moderate(user.sessionId,"ban")}>Ban</button><button disabled={actionKey!==""||!user.moderation.banned} onClick={()=>moderate(user.sessionId,"unban")}>Unban</button><button className="warning" disabled={actionKey!==""||!!(user.moderation.suspendedUntil&&user.moderation.suspendedUntil>Date.now())} onClick={()=>moderate(user.sessionId,"suspend",60)}>Suspend 1h</button><button disabled={actionKey!==""||!(user.moderation.suspendedUntil&&user.moderation.suspendedUntil>Date.now())} onClick={()=>moderate(user.sessionId,"unsuspend")}>Unsuspend</button></div></section>)}</div><button className="end-monitored-chat" disabled={actionKey!==""} onClick={()=>endConversation(row.conversationId)}>{actionKey===`conversation:${row.conversationId}`?"Ending...":"End conversation"}</button></article>)}</div></section>

      <section className="admin-section-v8" id="reports"><div className="section-heading-v8"><div><p>REPORTS</p><h2>Conversation reports</h2></div><span>{filteredReports.length}</span></div><div className="admin-case-list">{filteredReports.length===0&&<p className="admin-empty">No matching reports.</p>}{filteredReports.map(r=><article key={r.reportId}><header><div><b>{r.reason}</b><span>{r.reportedNickname}</span></div><strong className={`case-status ${r.status}`}>{r.status}</strong></header><code>{r.reportId}</code><p>{r.details||"No additional details."}</p><div className="moderation-mini-actions"><button onClick={()=>updateReport(r.reportId,"reviewed")}>Mark reviewed</button><button onClick={()=>updateReport(r.reportId,"resolved")}>Resolve</button><button className="danger" onClick={()=>moderate(r.reportedSessionId,"ban")}>Ban reported user</button></div></article>)}</div></section>

      <section className="admin-section-v8" id="wall"><div className="section-heading-v8"><div><p>FREEDOM WALL</p><h2>Post approval queue</h2></div><span>{filteredWall.length}</span></div><div className="admin-case-list wall-admin-grid">{filteredWall.length===0&&<p className="admin-empty">No matching Freedom Wall posts.</p>}{filteredWall.map(post=><article key={post.postId}><header><div><b>{post.nickname}</b><span>{post.university}</span></div><strong className={`case-status ${post.status}`}>{post.status}</strong></header><code>{post.postId}</code><p>{post.text}</p><small>{new Date(post.createdAt).toLocaleString()} · {post.likes} likes</small><div className="moderation-mini-actions">{post.status!=="approved"&&<button disabled={actionKey!==""} onClick={()=>moderateWallPost(post.postId,"approve")}>Approve</button>}{post.status!=="rejected"&&<button className="warning" disabled={actionKey!==""} onClick={()=>moderateWallPost(post.postId,"reject")}>Reject</button>}<button className="danger" disabled={actionKey!==""} onClick={()=>moderateWallPost(post.postId,"delete")}>Delete</button></div></article>)}</div></section>

      <section className="admin-section-v8" id="actions"><div className="section-heading-v8"><div><p>USER ACTIONS</p><h2>Bans & suspensions</h2></div><span>{filteredRecords.length}</span></div><div className="moderation-record-list">{filteredRecords.length===0&&<p className="admin-empty">No matching moderation records.</p>}{filteredRecords.map(row=><article key={row.sessionId}><div><b>{row.nickname}</b><span>{row.campus||"Campus hidden"}</span><code>{row.sessionId}</code></div><div className="moderation-state">{row.banned&&<strong className="banned">BANNED</strong>}{row.suspendedUntil&&row.suspendedUntil>Date.now()&&<strong className="suspended">SUSPENDED</strong>}{!row.banned&&!(row.suspendedUntil&&row.suspendedUntil>Date.now())&&<strong>CLEAR</strong>}</div><div className="moderation-mini-actions"><button className="danger" disabled={actionKey!==""||row.banned} onClick={()=>moderate(row.sessionId,"ban")}>Ban</button><button disabled={actionKey!==""||!row.banned} onClick={()=>moderate(row.sessionId,"unban")}>Unban</button><button className="warning" disabled={actionKey!==""||!!(row.suspendedUntil&&row.suspendedUntil>Date.now())} onClick={()=>moderate(row.sessionId,"suspend",60)}>Suspend 1h</button><button disabled={actionKey!==""||!(row.suspendedUntil&&row.suspendedUntil>Date.now())} onClick={()=>moderate(row.sessionId,"unsuspend")}>Unsuspend</button></div></article>)}</div></section>

      <section className="admin-section-v8" id="appeals"><div className="section-heading-v8"><div><p>APPEALS</p><h2>Moderation appeals</h2></div><span>{filteredAppeals.length}</span></div><div className="admin-case-list">{filteredAppeals.length===0&&<p className="admin-empty">No matching appeals.</p>}{filteredAppeals.map(a=><article key={a.appealId}><header><div><b>{a.nickname}</b><span>{new Date(a.createdAt).toLocaleString()}</span></div><strong className={`case-status ${a.status}`}>{a.status}</strong></header><code>{a.appealId}</code><p>{a.message}</p>{a.status==="open"&&<div className="moderation-mini-actions"><button onClick={()=>reviewAppeal(a.appealId,"approved")}>Approve & clear restriction</button><button className="danger" onClick={()=>reviewAppeal(a.appealId,"denied")}>Deny</button></div>}</article>)}</div></section>
      <footer className="admin-footer-v8"><img src="/assets/favicon.svg" alt=""/> SintaChat Admin Panel · Built by PUP Sta. Mesa students · Safer anonymous conversations</footer>
    </main>
  </div>
}
