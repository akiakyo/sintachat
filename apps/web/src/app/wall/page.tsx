"use client";
import {FormEvent,useEffect,useMemo,useState} from "react";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import {getProfile,getSessionId} from "../../lib/session";
const API=()=>process.env.NEXT_PUBLIC_SOCKET_URL||"http://localhost:3001";

type WallPost={postId:string;nickname:string;university:string;text:string;createdAt:number;likes:number;replyCount:number};
type WallReply={replyId:string;postId:string;nickname:string;text:string;createdAt:number;likes:number};
export default function Wall(){
  const[posts,setPosts]=useState<WallPost[]>([]);
  const[text,setText]=useState("");
  const[msg,setMsg]=useState("");
  const[loading,setLoading]=useState(true);
  const[query,setQuery]=useState("");
  const[composerOpen,setComposerOpen]=useState(false);
  const[threadPost,setThreadPost]=useState<WallPost|null>(null);
  const[threadReplies,setThreadReplies]=useState<WallReply[]>([]);
  const[threadLoading,setThreadLoading]=useState(false);
  const[replyTo,setReplyTo]=useState<WallPost|null>(null);
  const[replyText,setReplyText]=useState("");
  const[replyName,setReplyName]=useState("");
  const[replyStatus,setReplyStatus]=useState("");
  const[likedPost,setLikedPost]=useState<string|null>(null);

  async function load(){
    setLoading(true);
    try{const r=await fetch(`${API()}/api/freedom-wall`,{cache:"no-store"});const d=await r.json();if(r.ok)setPosts(d.posts||[])}
    finally{setLoading(false)}
  }
  useEffect(()=>{load()},[]);

  async function submit(e:FormEvent){
    e.preventDefault();
    const value=text.trim();if(value.length<2)return;
    const p=getProfile();setMsg("Posting...");
    try{
      const r=await fetch(`${API()}/api/freedom-wall`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sessionId:getSessionId(),nickname:p?.nickname||"Anonymous",university:p?.campus||"University hidden",text:value})});
      const d=await r.json();setMsg(r.ok?"Submitted for moderator approval.":d.error||"Could not submit post.");
      if(r.ok){setText("");setTimeout(()=>{setComposerOpen(false);setMsg("")},700)}
    }catch{setMsg("Could not submit post.")}
  }
  async function like(id:string){
    const r=await fetch(`${API()}/api/freedom-wall/${id}/like`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sessionId:getSessionId()})});
    const d=await r.json();if(r.ok){setPosts(x=>x.map(p=>p.postId===id?{...p,likes:d.likes}:p));setLikedPost(id);setTimeout(()=>setLikedPost(current=>current===id?null:current),520)}
  }
  async function openThread(post:WallPost){
    setThreadPost(post);setThreadReplies([]);setThreadLoading(true);
    try{const r=await fetch(`${API()}/api/freedom-wall/${post.postId}/replies`,{cache:"no-store"});const d=await r.json();if(r.ok)setThreadReplies(d.replies||[])}
    finally{setThreadLoading(false)}
  }
  function openReply(post:WallPost){setReplyTo(post);setReplyText("");setReplyName("");setReplyStatus("")}
  async function submitReply(e:FormEvent){
    e.preventDefault();if(!replyTo||!replyText.trim())return;
    setReplyStatus("Posting reply...");
    try{
      const r=await fetch(`${API()}/api/freedom-wall/${replyTo.postId}/replies`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sessionId:getSessionId(),nickname:replyName.trim()||"Anonymous",text:replyText.trim()})});
      const d=await r.json();
      if(!r.ok){setReplyStatus(d.error||"Could not post reply.");return}
      setPosts(current=>current.map(post=>post.postId===replyTo.postId?{...post,replyCount:d.replyCount}:post));
      setThreadPost(current=>current?.postId===replyTo.postId?{...current,replyCount:d.replyCount}:current);
      if(threadPost?.postId===replyTo.postId)setThreadReplies(current=>[...current,d.reply]);
      setReplyStatus("Reply posted.");setReplyText("");
      setTimeout(()=>{setReplyTo(null);setReplyStatus("")},450)
    }catch{setReplyStatus("Could not post reply.")}
  }
  async function likeReply(postId:string,replyId:string){
    const r=await fetch(`${API()}/api/freedom-wall/${postId}/replies/${replyId}/like`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sessionId:getSessionId()})});
    const d=await r.json();if(r.ok)setThreadReplies(current=>current.map(reply=>reply.replyId===replyId?{...reply,likes:d.likes}:reply))
  }

  const visible=useMemo(()=>{
    const q=query.trim().toLowerCase();
    let next=posts.filter(post=>!q||`${post.nickname} ${post.university} ${post.text}`.toLowerCase().includes(q));
    next=[...next].sort((a,b)=>b.createdAt-a.createdAt);
    return next
  },[posts,query]);

  const relative=(stamp:number)=>{const s=Math.max(1,Math.floor((Date.now()-stamp)/1000));if(s<60)return `${s}s`;if(s<3600)return `${Math.floor(s/60)}m`;if(s<86400)return `${Math.floor(s/3600)}h`;return new Date(stamp).toLocaleDateString(undefined,{month:"short",day:"numeric"})};
  const avatar=(name:string)=>(name||"Anonymous").trim().charAt(0).toUpperCase()||"A";

  return <><SiteHeader/><main className="wall-page-v8">
    <header className="wall-top-v8"><div><small className="wall-kicker">CAMPUS PULSE</small><h1>Freedom Wall</h1></div><button onClick={()=>setComposerOpen(true)}><span>➤</span> Post</button></header>

    <section className="wall-intro-v8">
      <h2>A living board for student voices.</h2>
      <p>Drop a thought, find a familiar story, or leave someone a little kindness.</p>
      <label className="wall-search-v8"><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search names or posts"/></label>
      <div className="wall-v9-livebar"><span><i/> Community wall <b>{posts.length}</b></span><button type="button" onClick={load} disabled={loading}>{loading?"Refreshing…":"Refresh feed"}</button></div>
    </section>

    <button className="wall-quick-composer-v8" onClick={()=>setComposerOpen(true)}><span>?</span><b>Share your story...</b></button>

    <section className="wall-feed-v8">
      {loading&&posts.length===0&&<div className="wall-empty-v8">Loading the wall...</div>}
      {!loading&&visible.length===0&&<div className="wall-empty-v8"><b>No posts found.</b><span>Try another filter or start a new anonymous post.</span></div>}
      {visible.map((post,index)=><article className="wall-post-v8 wall-post-enter" style={{animationDelay:`${Math.min(index,10)*45}ms`}} key={post.postId}>
        <div className="wall-avatar-v8">{avatar(post.nickname)}</div>
        <div className="wall-post-body-v8">
          <header><b>{post.nickname||"Anonymous"}</b><span>·</span><time>{relative(post.createdAt)}</time><small>{post.university||"University hidden"}</small></header>
          <p>{post.text}</p>
          <footer>
            <button onClick={()=>{openThread(post)}} aria-label="Open replies"><img className="wall-comment-icon" src="https://cdn-icons-png.flaticon.com/512/1946/1946429.png" alt=""/>{post.replyCount||0}</button>
            <button className={likedPost===post.postId?"wall-liked":""} onClick={()=>like(post.postId)} aria-label="Like post"><span>{likedPost===post.postId?"♥":"♡"}</span>{post.likes}</button>
            <button className="reply-link" onClick={()=>openReply(post)}>Reply</button>
          </footer>
        </div>
      </article>)}
    </section>
  </main><SiteFooter/>

  {composerOpen&&<div className="wall-modal-backdrop" onMouseDown={()=>setComposerOpen(false)}><form className="wall-modal-v8 wall-post-modal" onSubmit={submit} onMouseDown={e=>e.stopPropagation()}>
    <header><div><h2>Create a post</h2><p>New wall posts are reviewed before they appear publicly.</p></div><button type="button" onClick={()=>setComposerOpen(false)}>×</button></header>
    <label><span>Post</span><textarea autoFocus value={text} onChange={e=>setText(e.target.value)} maxLength={500} placeholder="Share your story..."/></label>
    <div className="wall-modal-meta"><small>{text.length}/500</small>{msg&&<strong>{msg}</strong>}</div>
    <footer><button type="button" onClick={()=>setComposerOpen(false)}>Cancel</button><button className="primary" disabled={text.trim().length<2}>➤ Post</button></footer>
  </form></div>}

  {threadPost&&<div className="wall-thread-backdrop" onMouseDown={()=>setThreadPost(null)}><aside className="wall-thread-v8" onMouseDown={e=>e.stopPropagation()}>
    <header><div><h2>Thread</h2><p>{threadPost.replyCount||0} {(threadPost.replyCount||0)===1?"reply":"replies"}</p></div><button onClick={()=>setThreadPost(null)}>×</button></header>
    <article className="thread-original-v8"><div className="wall-avatar-v8">{avatar(threadPost.nickname)}</div><div><b>{threadPost.nickname}</b><span> · {relative(threadPost.createdAt)}</span><p>{threadPost.text}</p><button onClick={()=>openReply(threadPost)}>Reply to post</button></div></article>
    <div className="thread-list-v8">{threadLoading&&<p className="thread-empty">Loading replies...</p>}{!threadLoading&&threadReplies.length===0&&<p className="thread-empty">No replies yet. Be the first to answer.</p>}{threadReplies.map(reply=><article key={reply.replyId}><div className="wall-avatar-v8">{avatar(reply.nickname)}</div><div><header><b>{reply.nickname}</b><span> · {relative(reply.createdAt)}</span></header><p>{reply.text}</p><button onClick={()=>likeReply(threadPost.postId,reply.replyId)}>♡ {reply.likes}</button></div></article>)}</div>
    <button className="thread-reply-cta" onClick={()=>openReply(threadPost)}>Write a reply</button>
  </aside></div>}

  {replyTo&&<div className="wall-modal-backdrop reply-backdrop" onMouseDown={()=>setReplyTo(null)}><form className="wall-modal-v8 reply-modal-v8" onSubmit={submitReply} onMouseDown={e=>e.stopPropagation()}>
    <header><div><h2>Reply</h2><p>Replies appear immediately.</p></div><button type="button" onClick={()=>setReplyTo(null)}>×</button></header>
    <div className="replying-to-v8">Replying to <b>{replyTo.nickname}</b></div>
    <label><span>Display Name</span><input value={replyName} onChange={e=>setReplyName(e.target.value)} maxLength={48} placeholder="Leave blank to stay anonymous"/></label>
    <label><span>Reply</span><textarea autoFocus value={replyText} onChange={e=>setReplyText(e.target.value)} maxLength={500} placeholder="Post your reply..."/></label>
    <div className="wall-modal-meta"><small>Text replies only · {replyText.length}/500</small>{replyStatus&&<strong>{replyStatus}</strong>}</div>
    <footer><button type="button" onClick={()=>setReplyTo(null)}>Cancel</button><button className="primary" disabled={!replyText.trim()}>➤ Reply</button></footer>
  </form></div>}
  </>
}
