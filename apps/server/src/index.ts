import "dotenv/config";
import http from "node:http";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { Server } from "socket.io";
import { Pool } from "pg";

type Preference = "male"|"female"|"anyone";
type Profile = {nickname:string;campus:string;preference:Preference;vibe:string;interests:string[];gender?:string;isAdmin?:boolean};
type State = {sessionUuid:string;profile:Profile|null;lastMessageAt:number};
const WEB_ORIGINS=(process.env.WEB_ORIGIN||"http://localhost:3000").split(",").map(origin=>origin.trim()).filter(Boolean);

const app=express();
app.disable("x-powered-by");
app.use(helmet({contentSecurityPolicy:false}));
app.use(cors({origin:WEB_ORIGINS,credentials:true}));
app.use(express.json({limit:"64kb"}));
app.use(express.urlencoded({extended:false,limit:"16kb"}));
const server=http.createServer(app);
const io=new Server(server,{cors:{origin:WEB_ORIGINS,credentials:true},maxHttpBufferSize:2_000_000});
const PORT=Number(process.env.PORT||3001);
const ADMIN_PASSWORD_HASH=String(process.env.ADMIN_PASSWORD_HASH||"");
const ADMIN_TOKEN_SECRET=String(process.env.ADMIN_TOKEN_SECRET||"");
const ADMIN_TOKEN_TTL_MS=12*60*60*1000;
const DATABASE_URL=String(process.env.DATABASE_URL||"");
const wallPool=DATABASE_URL?new Pool({connectionString:DATABASE_URL,ssl:{rejectUnauthorized:false}}):null;

const wallStorageReady=(async()=>{
 if(!wallPool)return;
 await wallPool.query(`
  CREATE TABLE IF NOT EXISTS freedom_wall_posts (
   post_id UUID PRIMARY KEY, session_id UUID NOT NULL, nickname VARCHAR(48) NOT NULL,
   university VARCHAR(80) NOT NULL, text VARCHAR(500) NOT NULL,
   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), status VARCHAR(10) NOT NULL DEFAULT 'pending',
   reviewed_at TIMESTAMPTZ, reviewed_by VARCHAR(48)
  );
  CREATE TABLE IF NOT EXISTS freedom_wall_likes (
   post_id UUID NOT NULL REFERENCES freedom_wall_posts(post_id) ON DELETE CASCADE,
   session_id UUID NOT NULL, PRIMARY KEY (post_id, session_id)
  );
  CREATE TABLE IF NOT EXISTS freedom_wall_replies (
   reply_id UUID PRIMARY KEY, post_id UUID NOT NULL REFERENCES freedom_wall_posts(post_id) ON DELETE CASCADE,
   session_id UUID NOT NULL, nickname VARCHAR(48) NOT NULL, text VARCHAR(500) NOT NULL,
   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS freedom_wall_reply_likes (
   reply_id UUID NOT NULL REFERENCES freedom_wall_replies(reply_id) ON DELETE CASCADE,
   session_id UUID NOT NULL, PRIMARY KEY (reply_id, session_id)
  );
  CREATE INDEX IF NOT EXISTS freedom_wall_posts_status_created_at_idx ON freedom_wall_posts (status, created_at DESC);
  CREATE INDEX IF NOT EXISTS freedom_wall_replies_post_created_at_idx ON freedom_wall_replies (post_id, created_at);
 `);
})();

async function wallDb(){
 if(!wallPool)throw new Error("Freedom Wall database is not configured.");
 await wallStorageReady;
 return wallPool;
}
function wallPost(row:any):WallPost{
 return {postId:row.post_id,sessionId:row.session_id,nickname:row.nickname,university:row.university,text:row.text,createdAt:new Date(row.created_at).getTime(),likes:Number(row.likes||0),status:row.status,reviewedAt:row.reviewed_at?new Date(row.reviewed_at).getTime():undefined,reviewedBy:row.reviewed_by||undefined}
}
function wallReply(row:any):WallReply{
 return {replyId:row.reply_id,postId:row.post_id,sessionId:row.session_id,nickname:row.nickname,text:row.text,createdAt:new Date(row.created_at).getTime(),likes:Number(row.likes||0)}
}

function secureEqual(a:string,b:string){
 const aa=Buffer.from(a);const bb=Buffer.from(b);
 return aa.length===bb.length&&crypto.timingSafeEqual(aa,bb)
}
function makeAdminToken(nickname:string){
 const payload=Buffer.from(JSON.stringify({nickname,exp:Date.now()+ADMIN_TOKEN_TTL_MS})).toString("base64url");
 const sig=crypto.createHmac("sha256",ADMIN_TOKEN_SECRET).update(payload).digest("base64url");
 return `${payload}.${sig}`
}
function verifyAdminToken(token:any){
 if(!ADMIN_TOKEN_SECRET||typeof token!=="string"||!token.includes("."))return null;
 const [payload,sig]=token.split(".");
 const expected=crypto.createHmac("sha256",ADMIN_TOKEN_SECRET).update(payload).digest("base64url");
 if(!secureEqual(sig||"",expected))return null;
 try{const data=JSON.parse(Buffer.from(payload,"base64url").toString("utf8"));return Number(data.exp)>Date.now()?data:null}catch{return null}
}

function getModeration(sessionUuid:string){
  return moderationBySession.get(sessionUuid)||{
    banned:false,
    suspendedUntil:null,
    reason:"",
    updatedAt:0,
    updatedBy:""
  }
}
function isSessionRestricted(sessionUuid:string){
  const record=getModeration(sessionUuid);
  if(record.banned)return {restricted:true,type:"banned",record};
  if(record.suspendedUntil&&record.suspendedUntil>Date.now())return {restricted:true,type:"suspended",record};
  if(record.suspendedUntil&&record.suspendedUntil<=Date.now()){
    moderationBySession.set(sessionUuid,{...record,suspendedUntil:null,updatedAt:Date.now()})
  }
  return {restricted:false,type:null,record:getModeration(sessionUuid)}
}
function requireAdminRequest(req:any,res:any){
  const auth=String(req.headers.authorization||"");
  const token=auth.startsWith("Bearer ")?auth.slice(7):"";
  const data=verifyAdminToken(token);
  if(!data){res.status(401).json({ok:false,error:"Admin authentication required."});return null}
  return data
}


const campuses=["Other school / Rather not say","Polytechnic University of the Philippines","University of the Philippines"];
const vibes=["Chill","Need Advice","Rant","Study Talk","Make Friends","Random"];
const interests=["Gaming","School","Relationships","Music","Movies","Tech","Sports","Memes","Study","Random"];
const icebreakers=[
  "What's your campus pet peeve?","Morning class or night class?","What's your comfort food lately?","What song have you had on repeat?",
  "What course would you never take?","What is your funniest school moment?","What's one class you unexpectedly enjoyed?","Best cheap campus food?",
  "What's your current study soundtrack?","Library seat or coffee-shop corner?","What school event do you actually look forward to?","What's a tiny win you had this week?",
  "If you could add one subject to every course, what would it be?","What's a skill you learned outside class?","What's your ideal no-class day?","What campus rule would you rewrite?"
];

type GameType="this-or-that"|"red-green"|"would-you-rather";
type GameQuestion={id:string;prompt:string;options:[string,string]};
type PendingGame={gameId:string;matchUuid:string;from:string;to:string;type:GameType;expiresAt:number};
type ActiveGame={gameId:string;matchUuid:string;type:GameType;label:string;participants:[string,string];questions:GameQuestion[];round:number;answers:Map<string,number>;score:number;results:any[];transitioning:boolean;timer?:ReturnType<typeof setTimeout>};
const GAME_DEFS:Record<GameType,{label:string;icon:string;questions:GameQuestion[]}>= {
  "this-or-that":{label:"This or That",icon:"⚡",questions:[
    {id:"tot-01",prompt:"Pick your ideal study fuel.",options:["Coffee","Milk tea"]},{id:"tot-02",prompt:"Best place to reset after class?",options:["Beach","Mountains"]},
    {id:"tot-03",prompt:"Your notes live where?",options:["Digital","Paper"]},{id:"tot-04",prompt:"A free afternoon appears. What wins?",options:["Nap","Go out"]},
    {id:"tot-05",prompt:"Choose your class schedule.",options:["Early classes","Late classes"]},{id:"tot-06",prompt:"Group work role?",options:["Planner","Presenter"]},
    {id:"tot-07",prompt:"Campus snack run.",options:["Sweet","Savory"]},{id:"tot-08",prompt:"Weekend energy.",options:["Stay in","Go out"]},
    {id:"tot-09",prompt:"How do you study best?",options:["Music on","Total silence"]},{id:"tot-10",prompt:"Choose your commute soundtrack.",options:["Playlist","Podcast"]},
    {id:"tot-11",prompt:"Deadline style.",options:["Finish early","Last-minute sprint"]},{id:"tot-12",prompt:"Your ideal project format.",options:["Creative output","Written paper"]},
    {id:"tot-13",prompt:"Class break drink.",options:["Iced","Hot"]},{id:"tot-14",prompt:"Better campus weather.",options:["Sunny","Rainy"]},
    {id:"tot-15",prompt:"Pick a school-day superpower.",options:["Perfect memory","Infinite energy"]},{id:"tot-16",prompt:"Study buddy preference.",options:["One close friend","Small group"]},
    {id:"tot-17",prompt:"Presentation day.",options:["Go first","Go last"]},{id:"tot-18",prompt:"Choose a free elective.",options:["Arts","Technology"]},
    {id:"tot-19",prompt:"Your comfort watch.",options:["Movies","Series"]},{id:"tot-20",prompt:"Campus hangout.",options:["Cafeteria","Open grounds"]},
    {id:"tot-21",prompt:"Pick a social battery mode.",options:["Small circle","Big crowd"]},{id:"tot-22",prompt:"Morning starter.",options:["Breakfast","Extra sleep"]},
    {id:"tot-23",prompt:"Exam prep.",options:["Flashcards","Practice tests"]},{id:"tot-24",prompt:"School bag essential.",options:["Power bank","Water bottle"]}
  ]},
  "red-green":{label:"Red Flag / Green Flag",icon:"🚩",questions:[
    {id:"rg-01",prompt:"They disappear for days, then return like nothing happened.",options:["Red Flag","Green Flag"]},{id:"rg-02",prompt:"They remember the little details you casually mention.",options:["Red Flag","Green Flag"]},
    {id:"rg-03",prompt:"They are rude to service staff but sweet to you.",options:["Red Flag","Green Flag"]},{id:"rg-04",prompt:"They can apologize without adding excuses.",options:["Red Flag","Green Flag"]},
    {id:"rg-05",prompt:"They copy homework every week and call it teamwork.",options:["Red Flag","Green Flag"]},{id:"rg-06",prompt:"They celebrate your wins without turning it into a competition.",options:["Red Flag","Green Flag"]},
    {id:"rg-07",prompt:"They read your messages but only reply when they need something.",options:["Red Flag","Green Flag"]},{id:"rg-08",prompt:"They respect your study time and boundaries.",options:["Red Flag","Green Flag"]},
    {id:"rg-09",prompt:"They constantly make jokes at your expense after you ask them to stop.",options:["Red Flag","Green Flag"]},{id:"rg-10",prompt:"They check on you after a rough exam.",options:["Red Flag","Green Flag"]},
    {id:"rg-11",prompt:"They share private screenshots for laughs.",options:["Red Flag","Green Flag"]},{id:"rg-12",prompt:"They disagree respectfully instead of trying to embarrass you.",options:["Red Flag","Green Flag"]},
    {id:"rg-13",prompt:"They keep score of every favor they do for you.",options:["Red Flag","Green Flag"]},{id:"rg-14",prompt:"They make space for your friends even if they are different from theirs.",options:["Red Flag","Green Flag"]},
    {id:"rg-15",prompt:"They cancel plans repeatedly without telling you until the last minute.",options:["Red Flag","Green Flag"]},{id:"rg-16",prompt:"They say what they mean instead of making you guess.",options:["Red Flag","Green Flag"]},
    {id:"rg-17",prompt:"They pressure you to share information you want to keep private.",options:["Red Flag","Green Flag"]},{id:"rg-18",prompt:"They can laugh at themselves and own a mistake.",options:["Red Flag","Green Flag"]},
    {id:"rg-19",prompt:"They only support your plans when those plans benefit them.",options:["Red Flag","Green Flag"]},{id:"rg-20",prompt:"They ask before posting a photo that includes you.",options:["Red Flag","Green Flag"]}
  ]},
  "would-you-rather":{label:"Would You Rather?",icon:"✦",questions:[
    {id:"wyr-01",prompt:"Would you rather change your schedule or your commute?",options:["No classes before 10 AM","Commute under 15 minutes"]},
    {id:"wyr-02",prompt:"Would you rather ace every quiz or every presentation?",options:["Ace every quiz","Ace every presentation"]},
    {id:"wyr-03",prompt:"Would you rather get one extra rest day or shorter class days?",options:["4-day school week","Classes end by 2 PM"]},
    {id:"wyr-04",prompt:"Would you rather always find a seat or always find an outlet?",options:["Perfect seat","Available outlet"]},
    {id:"wyr-05",prompt:"Would you rather have unlimited printing or unlimited campus snacks?",options:["Free printing","Free snacks"]},
    {id:"wyr-06",prompt:"Would you rather redo one exam or one awkward presentation?",options:["Redo the exam","Redo the presentation"]},
    {id:"wyr-07",prompt:"Would you rather remember every lecture or read twice as fast?",options:["Perfect lecture memory","2× reading speed"]},
    {id:"wyr-08",prompt:"Would you rather lead every group project or never present?",options:["Always lead","Never present"]},
    {id:"wyr-09",prompt:"Would you rather have a surprise free period or a surprise free meal?",options:["Free period","Free meal"]},
    {id:"wyr-10",prompt:"Would you rather study abroad for a semester or intern at your dream company?",options:["Study abroad","Dream internship"]},
    {id:"wyr-11",prompt:"Would you rather lose your charger for a day or your earphones for a week?",options:["No charger today","No earphones all week"]},
    {id:"wyr-12",prompt:"Would you rather take an oral exam or a 100-item test?",options:["Oral exam","100-item test"]},
    {id:"wyr-13",prompt:"Would you rather have every deadline visible a month early or get one automatic extension?",options:["See deadlines early","One auto-extension"]},
    {id:"wyr-14",prompt:"Would you rather always get the class you want or the professor you want?",options:["Preferred class","Preferred professor"]},
    {id:"wyr-15",prompt:"Would you rather commute in heavy rain or attend a 7 AM class?",options:["Rainy commute","7 AM class"]},
    {id:"wyr-16",prompt:"Would you rather have a quiet dorm or a lively neighborhood?",options:["Quiet dorm","Lively neighborhood"]},
    {id:"wyr-17",prompt:"Would you rather finish a paper in one night or study for an exam all weekend?",options:["One-night paper","Weekend review"]},
    {id:"wyr-18",prompt:"Would you rather always know what to say or always know when to listen?",options:["Know what to say","Know when to listen"]},
    {id:"wyr-19",prompt:"Would you rather be early everywhere or never wait in line?",options:["Always early","Never wait in line"]},
    {id:"wyr-20",prompt:"Would you rather have a semester with no group projects or no surprise quizzes?",options:["No group projects","No surprise quizzes"]}
  ]}
};

const states=new Map<string,State>();
const sessionSockets=new Map<string,string>();
const profiles=new Map<string,Profile>();
const waitingRooms:string[][]=[[],[],[]];
const MATCH_HISTORY_TTL=2*60*60*1000;
const matchHistory=new Map<string,{count:number;expiresAt:number}>();
const matchBySession=new Map<string,string>();
const sessionsByMatch=new Map<string,[string,string]>();
const messageReactions=new Map<string,Map<string,string>>();
const messageOwners=new Map<string,string>();
type ModerationRecord={
  banned:boolean;
  suspendedUntil:number|null;
  reason:string;
  updatedAt:number;
  updatedBy:string;
};
const moderationBySession=new Map<string,ModerationRecord>();
const conversationStartedAt=new Map<string,number>();
type ReportRecord={reportId:string;conversationId:string;reporterSessionId:string;reportedSessionId:string;reporterNickname:string;reportedNickname:string;reason:string;details:string;createdAt:number;status:"open"|"reviewed"|"resolved"};
type AppealRecord={appealId:string;sessionId:string;nickname:string;message:string;createdAt:number;status:"open"|"approved"|"denied";reviewedBy?:string;reviewedAt?:number};
type WallPost={postId:string;sessionId:string;nickname:string;university:string;text:string;createdAt:number;likes:number;status:"pending"|"approved"|"rejected";reviewedAt?:number;reviewedBy?:string};
type WallReply={replyId:string;postId:string;sessionId:string;nickname:string;text:string;createdAt:number;likes:number};
const reportsById=new Map<string,ReportRecord>();
const appealsById=new Map<string,AppealRecord>();
const pendingGames=new Map<string,PendingGame>();
const activeGames=new Map<string,ActiveGame>();
const usedGameQuestionsByMatch=new Map<string,Map<GameType,Set<string>>>();



app.post("/api/admin/login",async(req,res)=>{
 if(!ADMIN_PASSWORD_HASH||!ADMIN_TOKEN_SECRET)return res.status(503).json({ok:false,error:"Admin mode is not configured."});
 const nickname=String(req.body?.nickname||"").trim().slice(0,48);
 const password=String(req.body?.password||"");
 if(!nickname)return res.status(400).json({ok:false,error:"Admin nickname is required."});
 const passwordValid=await bcrypt.compare(password,ADMIN_PASSWORD_HASH);
 if(!passwordValid)return res.status(401).json({ok:false,error:"Incorrect admin password."});
 return res.json({ok:true,token:makeAdminToken(nickname)});
});


app.get("/api/admin/conversations",(req,res)=>{
  const admin=requireAdminRequest(req,res);if(!admin)return;
  const rows=[...sessionsByMatch.entries()].map(([conversationId,[a,b]])=>{
    const pa=profiles.get(a);const pb=profiles.get(b);
    return {
      conversationId,
      startedAt:conversationStartedAt.get(conversationId)||Date.now(),
      users:[
        {sessionId:a,nickname:pa?.nickname||"Anonymous",campus:pa?.campus||"",isAdmin:!!pa?.isAdmin,moderation:getModeration(a)},
        {sessionId:b,nickname:pb?.nickname||"Anonymous",campus:pb?.campus||"",isAdmin:!!pb?.isAdmin,moderation:getModeration(b)}
      ]
    }
  });
  res.json({ok:true,conversations:rows})
});

app.get("/api/admin/moderation",(req,res)=>{
  const admin=requireAdminRequest(req,res);if(!admin)return;
  const rows=[...moderationBySession.entries()].map(([sessionId,record])=>({
    sessionId,
    nickname:profiles.get(sessionId)?.nickname||"Anonymous",
    campus:profiles.get(sessionId)?.campus||"",
    ...record
  }));
  res.json({ok:true,records:rows})
});

app.post("/api/admin/moderation",(req,res)=>{
  const admin=requireAdminRequest(req,res);if(!admin)return;
  const sessionId=String(req.body?.sessionId||"");
  const action=String(req.body?.action||"");
  const reason=String(req.body?.reason||"").trim().slice(0,180);
  if(!/^[0-9a-f-]{36}$/i.test(sessionId))return res.status(400).json({ok:false,error:"Invalid anonymous session ID."});
  const current=getModeration(sessionId);
  let next=current;
  if(action==="ban"){
    next={...current,banned:true,suspendedUntil:null,reason:reason||"Banned by moderator",updatedAt:Date.now(),updatedBy:String(admin.nickname||"admin")}
  }
  else if(action==="unban"){
    next={...current,banned:false,reason:"",updatedAt:Date.now(),updatedBy:String(admin.nickname||"admin")}
  }
  else if(action==="suspend"){
    const minutes=Math.max(1,Math.min(10080,Number(req.body?.minutes)||60));
    next={...current,banned:false,suspendedUntil:Date.now()+minutes*60000,reason:reason||`Suspended for ${minutes} minutes`,updatedAt:Date.now(),updatedBy:String(admin.nickname||"admin")}
  }
  else if(action==="unsuspend"){
    next={...current,suspendedUntil:null,reason:"",updatedAt:Date.now(),updatedBy:String(admin.nickname||"admin")}
  }
  else return res.status(400).json({ok:false,error:"Unknown moderation action."});
  moderationBySession.set(sessionId,next);
  if((action==="ban"||action==="suspend")&&matchBySession.has(sessionId))endMatch(sessionId,"moderated");
  res.json({ok:true,record:{sessionId,nickname:profiles.get(sessionId)?.nickname||"Anonymous",campus:profiles.get(sessionId)?.campus||"",...next}})
});

app.post("/api/admin/end-conversation",(req,res)=>{
  const admin=requireAdminRequest(req,res);if(!admin)return;
  const conversationId=String(req.body?.conversationId||"");
  const pair=sessionsByMatch.get(conversationId);
  if(!pair)return res.status(404).json({ok:false,error:"Conversation not found."});
  endMatch(pair[0],"moderated");
  res.json({ok:true})
});

app.get("/api/freedom-wall",async(_req,res)=>{
 try{
  const db=await wallDb();
  const result=await db.query(`SELECT post.*, COUNT(DISTINCT likes.session_id)::int AS likes, COUNT(DISTINCT replies.reply_id)::int AS "replyCount" FROM freedom_wall_posts post LEFT JOIN freedom_wall_likes likes ON likes.post_id=post.post_id LEFT JOIN freedom_wall_replies replies ON replies.post_id=post.post_id WHERE post.status='approved' GROUP BY post.post_id ORDER BY post.created_at DESC LIMIT 100`);
  res.json({ok:true,posts:result.rows.map(row=>({...wallPost(row),replyCount:Number(row.replyCount||0)}))});
 }catch{res.status(503).json({ok:false,error:"Freedom Wall is temporarily unavailable."})}
});
app.post("/api/freedom-wall",async(req,res)=>{
  const sessionId=String(req.body?.sessionId||"");
  const nickname=String(req.body?.nickname||"Anonymous").trim().slice(0,48)||"Anonymous";
  const university=String(req.body?.university||"University hidden").trim().slice(0,80)||"University hidden";
  const text=String(req.body?.text||"").trim().slice(0,500);
  if(!/^[0-9a-f-]{36}$/i.test(sessionId))return res.status(400).json({ok:false,error:"Invalid anonymous session."});
  if(isSessionRestricted(sessionId).restricted)return res.status(403).json({ok:false,error:"Posting is unavailable for this moderated session."});
  if(text.length<2)return res.status(400).json({ok:false,error:"Write something before posting."});
  try{
   const db=await wallDb();const postId=crypto.randomUUID();
   const result=await db.query(`INSERT INTO freedom_wall_posts (post_id,session_id,nickname,university,text) VALUES ($1,$2,$3,$4,$5) RETURNING *, 0::int AS likes`,[postId,sessionId,nickname,university,text]);
   res.json({ok:true,post:wallPost(result.rows[0]),message:"Submitted for moderator approval."})
  }catch{res.status(503).json({ok:false,error:"Freedom Wall is temporarily unavailable."})}
});
app.get("/api/freedom-wall/:postId/replies",async(req,res)=>{
 try{
  const db=await wallDb();const postId=String(req.params.postId||"");
  const result=await db.query(`SELECT reply.*, COUNT(likes.session_id)::int AS likes FROM freedom_wall_replies reply JOIN freedom_wall_posts post ON post.post_id=reply.post_id LEFT JOIN freedom_wall_reply_likes likes ON likes.reply_id=reply.reply_id WHERE reply.post_id=$1 AND post.status='approved' GROUP BY reply.reply_id ORDER BY reply.created_at`,[postId]);
  res.json({ok:true,replies:result.rows.map(wallReply)});
 }catch{res.status(503).json({ok:false,error:"Freedom Wall is temporarily unavailable."})}
});
app.post("/api/freedom-wall/:postId/replies",async(req,res)=>{
  const postId=String(req.params.postId||"");
  const sessionId=String(req.body?.sessionId||"");
  const nickname=String(req.body?.nickname||"Anonymous").trim().slice(0,48)||"Anonymous";
  const text=String(req.body?.text||"").trim().slice(0,500);
  if(!/^[0-9a-f-]{36}$/i.test(sessionId))return res.status(400).json({ok:false,error:"Invalid anonymous session."});
  if(isSessionRestricted(sessionId).restricted)return res.status(403).json({ok:false,error:"Replying is unavailable for this moderated session."});
  if(text.length<1)return res.status(400).json({ok:false,error:"Write a reply first."});
  try{
   const db=await wallDb();const approved=await db.query(`SELECT 1 FROM freedom_wall_posts WHERE post_id=$1 AND status='approved'`,[postId]);
   if(!approved.rowCount)return res.status(404).json({ok:false,error:"Post not found."});
   const result=await db.query(`INSERT INTO freedom_wall_replies (reply_id,post_id,session_id,nickname,text) VALUES ($1,$2,$3,$4,$5) RETURNING *, 0::int AS likes`,[crypto.randomUUID(),postId,sessionId,nickname,text]);
   const count=await db.query(`SELECT COUNT(*)::int AS count FROM freedom_wall_replies WHERE post_id=$1`,[postId]);
   res.json({ok:true,reply:wallReply(result.rows[0]),replyCount:Number(count.rows[0].count)})
  }catch{res.status(503).json({ok:false,error:"Freedom Wall is temporarily unavailable."})}
});
app.post("/api/freedom-wall/:postId/replies/:replyId/like",async(req,res)=>{
  const postId=String(req.params.postId||"");const replyId=String(req.params.replyId||"");const sessionId=String(req.body?.sessionId||"");
  try{
   const db=await wallDb();const reply=await db.query(`SELECT 1 FROM freedom_wall_replies WHERE reply_id=$1 AND post_id=$2`,[replyId,postId]);
   if(!reply.rowCount)return res.status(404).json({ok:false,error:"Reply not found."});
   const existing=await db.query(`SELECT 1 FROM freedom_wall_reply_likes WHERE reply_id=$1 AND session_id=$2`,[replyId,sessionId]);
   if(existing.rowCount)await db.query(`DELETE FROM freedom_wall_reply_likes WHERE reply_id=$1 AND session_id=$2`,[replyId,sessionId]);else await db.query(`INSERT INTO freedom_wall_reply_likes (reply_id,session_id) VALUES ($1,$2)`,[replyId,sessionId]);
   const count=await db.query(`SELECT COUNT(*)::int AS count FROM freedom_wall_reply_likes WHERE reply_id=$1`,[replyId]);res.json({ok:true,likes:Number(count.rows[0].count)})
  }catch{res.status(503).json({ok:false,error:"Freedom Wall is temporarily unavailable."})}
});
app.get("/api/admin/freedom-wall",async(req,res)=>{const admin=requireAdminRequest(req,res);if(!admin)return;try{const db=await wallDb();const result=await db.query(`SELECT post.*, COUNT(DISTINCT likes.session_id)::int AS likes, COUNT(DISTINCT replies.reply_id)::int AS "replyCount" FROM freedom_wall_posts post LEFT JOIN freedom_wall_likes likes ON likes.post_id=post.post_id LEFT JOIN freedom_wall_replies replies ON replies.post_id=post.post_id GROUP BY post.post_id ORDER BY post.created_at DESC`);res.json({ok:true,posts:result.rows.map(row=>({...wallPost(row),replyCount:Number(row.replyCount||0)}))})}catch{res.status(503).json({ok:false,error:"Freedom Wall is temporarily unavailable."})}});
app.post("/api/admin/freedom-wall/:postId",async(req,res)=>{
  const admin=requireAdminRequest(req,res);if(!admin)return;
  const postId=String(req.params.postId||"");
  const action=String(req.body?.action||"");if(!["approve","reject","delete"].includes(action))return res.status(400).json({ok:false,error:"Invalid wall moderation action."});
  try{const db=await wallDb();if(action==="delete"){const result=await db.query(`DELETE FROM freedom_wall_posts WHERE post_id=$1`,[postId]);return result.rowCount?res.json({ok:true,deleted:true}):res.status(404).json({ok:false,error:"Freedom Wall post not found."})}const result=await db.query(`UPDATE freedom_wall_posts SET status=$2, reviewed_at=NOW(), reviewed_by=$3 WHERE post_id=$1 RETURNING *, (SELECT COUNT(*)::int FROM freedom_wall_likes WHERE post_id=$1) AS likes`,[postId,action==="approve"?"approved":"rejected",String(admin.nickname||"admin")]);if(!result.rowCount)return res.status(404).json({ok:false,error:"Freedom Wall post not found."});res.json({ok:true,post:wallPost(result.rows[0])})}catch{res.status(503).json({ok:false,error:"Freedom Wall is temporarily unavailable."})}
});
app.post("/api/freedom-wall/:postId/like",async(req,res)=>{
  const postId=String(req.params.postId||"");const sessionId=String(req.body?.sessionId||"");
  try{const db=await wallDb();const post=await db.query(`SELECT 1 FROM freedom_wall_posts WHERE post_id=$1 AND status='approved'`,[postId]);if(!post.rowCount)return res.status(404).json({ok:false,error:"Post not found."});const existing=await db.query(`SELECT 1 FROM freedom_wall_likes WHERE post_id=$1 AND session_id=$2`,[postId,sessionId]);if(existing.rowCount)await db.query(`DELETE FROM freedom_wall_likes WHERE post_id=$1 AND session_id=$2`,[postId,sessionId]);else await db.query(`INSERT INTO freedom_wall_likes (post_id,session_id) VALUES ($1,$2)`,[postId,sessionId]);const count=await db.query(`SELECT COUNT(*)::int AS count FROM freedom_wall_likes WHERE post_id=$1`,[postId]);res.json({ok:true,likes:Number(count.rows[0].count)})}catch{res.status(503).json({ok:false,error:"Freedom Wall is temporarily unavailable."})}
});
app.post("/api/report",(req,res)=>{const conversationId=String(req.body?.conversationId||"");const reporterSessionId=String(req.body?.reporterSessionId||"");const reportedSessionId=String(req.body?.reportedSessionId||"");const reason=String(req.body?.reason||"Other").slice(0,60);const details=String(req.body?.details||"").slice(0,500);if(!conversationId||!reporterSessionId||!reportedSessionId)return res.status(400).json({ok:false,error:"Missing report information."});const r:ReportRecord={reportId:crypto.randomUUID(),conversationId,reporterSessionId,reportedSessionId,reporterNickname:profiles.get(reporterSessionId)?.nickname||"Anonymous",reportedNickname:profiles.get(reportedSessionId)?.nickname||"Anonymous",reason,details,createdAt:Date.now(),status:"open"};reportsById.set(r.reportId,r);res.json({ok:true,reportId:r.reportId})});
app.post("/api/appeals",(req,res)=>{const sessionId=String(req.body?.sessionId||"");const message=String(req.body?.message||"").trim().slice(0,1000);const mod=getModeration(sessionId);if(!mod.banned&&!(mod.suspendedUntil&&mod.suspendedUntil>Date.now()))return res.status(400).json({ok:false,error:"This anonymous session has no active ban or suspension."});if(message.length<10)return res.status(400).json({ok:false,error:"Please provide more detail."});const a:AppealRecord={appealId:crypto.randomUUID(),sessionId,nickname:profiles.get(sessionId)?.nickname||"Anonymous",message,createdAt:Date.now(),status:"open"};appealsById.set(a.appealId,a);res.json({ok:true,appealId:a.appealId})});
app.get("/api/admin/reports",(req,res)=>{const admin=requireAdminRequest(req,res);if(!admin)return;res.json({ok:true,reports:[...reportsById.values()].sort((a,b)=>b.createdAt-a.createdAt)})});
app.post("/api/admin/reports/:reportId",(req,res)=>{const admin=requireAdminRequest(req,res);if(!admin)return;const r=reportsById.get(String(req.params.reportId||""));if(!r)return res.status(404).json({ok:false,error:"Report not found."});const status=String(req.body?.status||"") as ReportRecord["status"];if(!["open","reviewed","resolved"].includes(status))return res.status(400).json({ok:false,error:"Invalid report status."});r.status=status;res.json({ok:true,report:r})});
app.get("/api/admin/appeals",(req,res)=>{const admin=requireAdminRequest(req,res);if(!admin)return;res.json({ok:true,appeals:[...appealsById.values()].sort((a,b)=>b.createdAt-a.createdAt)})});
app.post("/api/admin/appeals/:appealId",(req,res)=>{const admin=requireAdminRequest(req,res);if(!admin)return;const a=appealsById.get(String(req.params.appealId||""));if(!a)return res.status(404).json({ok:false,error:"Appeal not found."});const decision=String(req.body?.decision||"");if(!["approved","denied"].includes(decision))return res.status(400).json({ok:false,error:"Invalid decision."});a.status=decision as AppealRecord["status"];a.reviewedBy=String(admin.nickname||"admin");a.reviewedAt=Date.now();if(decision==="approved"){const cur=getModeration(a.sessionId);moderationBySession.set(a.sessionId,{...cur,banned:false,suspendedUntil:null,reason:"Appeal approved",updatedAt:Date.now(),updatedBy:String(admin.nickname||"admin")})}res.json({ok:true,appeal:a})});

app.get("/api/health",(_req,res)=>res.json({ok:true,online:sessionSockets.size,waiting:waitingRooms.reduce((total,room)=>total+room.length,0)}));
app.get("/api/config",(_req,res)=>res.json({campuses,vibes,interests,maxInterests:3,maxNicknameLength:24,maxMessageLength:1000}));

app.post("/api/end-chat-beacon",(req,res)=>{
 const sessionUuid=String(req.body?.sessionUuid||"");
 if(/^[0-9a-f-]{36}$/i.test(sessionUuid)){
  endMatch(sessionUuid,"left");
  removeQueue(sessionUuid);
 }
 res.status(204).end()
});


function validProfile(p:any,isAdmin=false):p is Profile{
 const nickname=typeof p?.nickname==="string"?p.nickname.trim():"";
 const nicknameOk=isAdmin?(nickname.length>=1&&nickname.length<=48):(nickname.length>=3&&nickname.length<=24);
 const campus=typeof p?.campus==="string"?p.campus.trim():"";
 return !!p&&nicknameOk&&campus.length>=2&&campus.length<=120&&["male","female","anyone"].includes(p.preference)&&vibes.includes(p.vibe)&&Array.isArray(p.interests)&&p.interests.length<=3
}
function peerOf(session:string){const mid=matchBySession.get(session);if(!mid)return null;const pair=sessionsByMatch.get(mid);if(!pair)return null;return pair[0]===session?pair[1]:pair[0]}
function queueSize(){return waitingRooms.reduce((total,room)=>total+room.length,0)}
function emitStats(){io.emit("stats",{online:sessionSockets.size,waiting:queueSize()})}
function removeQueue(s:string){for(const room of waitingRooms){let i;while((i=room.indexOf(s))>=0)room.splice(i,1)}}
function addToRandomRoom(s:string){removeQueue(s);waitingRooms[Math.floor(Math.random()*waitingRooms.length)].push(s)}
function matchKey(a:string,b:string){return a<b?`${a}:${b}`:`${b}:${a}`}
function previousMatches(a:string,b:string){const key=matchKey(a,b);const record=matchHistory.get(key);if(!record||record.expiresAt<=Date.now()){matchHistory.delete(key);return 0}return record.count}
function recordMatch(a:string,b:string){matchHistory.set(matchKey(a,b),{count:previousMatches(a,b)+1,expiresAt:Date.now()+MATCH_HISTORY_TTL})}
function compatibilityChance(count:number){if(count===0)return 100;if(count===1)return 70;if(count===2)return 40;if(count===3)return 20;return 10}
function hasConnectedSession(sessionUuid:string){
 return (io.sockets.adapter.rooms.get(`session:${sessionUuid}`)?.size||0)>0
}
function preferenceCompatible(a:Profile,b:Profile){
 const wants=(p:Profile,candidate:Profile)=>{
  if(p.preference==="anyone")return true;
  if(candidate.gender==="male"||candidate.gender==="female")return candidate.gender===p.preference;
  return true; // keep compatibility for profiles created before self-gender was stored
 };
 return wants(a,b)&&wants(b,a)
}
function buildMatchQuality(a:Profile,b:Profile){
 const shared=(a.interests||[]).filter(v=>(b.interests||[]).includes(v));
 const sameVibe=!!a.vibe&&a.vibe===b.vibe;
 const parts:string[]=[]; if(shared.length)parts.push(shared.slice(0,2).join(" + ")); if(sameVibe)parts.push(a.vibe);
 const score=Math.min(100,45+shared.length*15+(sameVibe?20:0));
 return {score,label:score>=80?"Great match":score>=65?"Good match":"Matched",reason:parts.length?parts.join(" · "):"Compatible anonymous match"}
}

function makePartner(p:Profile){
 return {
  sessionId:[...profiles.entries()].find(([,profile])=>profile===p)?.[0]||"",
  nickname:p.nickname,
  campus:p.campus,
  vibe:p.vibe,
  interests:p.interests,
  gender:p.gender||"unspecified",
  isAdmin:!!p.isAdmin
 }
}
function match(session:string){
 const p=profiles.get(session);if(!p)return false;
 removeQueue(session);
 const roomOrder=shuffle([0,1,2]);
 let attempts=0;
 for(const roomIndex of roomOrder){
  const candidates=shuffle(waitingRooms[roomIndex].slice());
  for(const other of candidates){
   if(attempts++>=10)break;
   const position=waitingRooms[roomIndex].indexOf(other);
   if(position<0)continue;
   if(other===session||matchBySession.has(other)){waitingRooms[roomIndex].splice(position,1);continue}
   if(!hasConnectedSession(other)){waitingRooms[roomIndex].splice(position,1);continue}
   const op=profiles.get(other);if(!op||!preferenceCompatible(p,op))continue;
   const chance=compatibilityChance(previousMatches(session,other));
   if(Math.random()*100>=chance){
    waitingRooms[roomIndex].splice(position,1);
    waitingRooms[(roomIndex+1+Math.floor(Math.random()*2))%3].push(other);
    continue
   }
   waitingRooms[roomIndex].splice(position,1);
   recordMatch(session,other);
   const mid=crypto.randomUUID();matchBySession.set(session,mid);matchBySession.set(other,mid);sessionsByMatch.set(mid,[session,other]);
   io.to(`session:${session}`).emit("matched",{matchUuid:mid,partner:makePartner(op)});io.to(`session:${other}`).emit("matched",{matchUuid:mid,partner:makePartner(p)});emitStats();return true
  }
  if(attempts>=10)break
 }
 addToRandomRoom(session);io.to(`session:${session}`).emit("queue-status",{waiting:true});emitStats();return false
}
function shuffle<T>(items:T[]){
 const copy=[...items];
 for(let i=copy.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]]}
 return copy
}
function selectGameQuestions(matchUuid:string,type:GameType,count=5){
 const pool=GAME_DEFS[type].questions;
 let byType=usedGameQuestionsByMatch.get(matchUuid);if(!byType){byType=new Map();usedGameQuestionsByMatch.set(matchUuid,byType)}
 let used=byType.get(type);if(!used){used=new Set();byType.set(type,used)}
 let available=pool.filter(question=>!used!.has(question.id));
 if(available.length<count){used.clear();available=[...pool]}
 const selected=shuffle(available).slice(0,Math.min(count,available.length));
 selected.forEach(question=>used!.add(question.id));
 return selected
}
function publicRound(game:ActiveGame){
 const question=game.questions[game.round];
 return {gameId:game.gameId,type:game.type,label:game.label,round:game.round+1,total:game.questions.length,question,duration:15}
}
function emitGameRound(game:ActiveGame){
 if(game.timer)clearTimeout(game.timer);
 game.transitioning=false;
 game.answers.clear();
 const event=publicRound(game);
 game.participants.forEach(sid=>io.to(`session:${sid}`).emit("game-round",event));
 game.timer=setTimeout(()=>finishGameRound(game.gameId,true),15000)
}
function finishGameRound(gameId:string,timedOut=false){
 const game=activeGames.get(gameId);if(!game||game.transitioning)return;
 game.transitioning=true;
 if(game.timer){clearTimeout(game.timer);game.timer=undefined}
 const question=game.questions[game.round];
 const [a,b]=game.participants;
 const aChoice=game.answers.has(a)?game.answers.get(a)!:null;
 const bChoice=game.answers.has(b)?game.answers.get(b)!:null;
 const matched=aChoice!==null&&bChoice!==null&&aChoice===bChoice;
 if(matched)game.score+=1;
 const result={gameId:game.gameId,round:game.round+1,total:game.questions.length,question,aChoice,bChoice,matched,timedOut};
 game.results.push(result);
 game.participants.forEach(sid=>io.to(`session:${sid}`).emit("game-round-result",{...result,yourChoice:sid===a?aChoice:bChoice,partnerChoice:sid===a?bChoice:aChoice}));
 if(game.round+1>=game.questions.length){
   setTimeout(()=>finishGame(game.gameId,false),1250);
 }else{
   game.round+=1;
   setTimeout(()=>{if(activeGames.has(game.gameId))emitGameRound(game)},1350)
 }
}
function finishGame(gameId:string,endedEarly=false){
 const game=activeGames.get(gameId);if(!game)return;
 if(game.timer)clearTimeout(game.timer);
 const percentage=game.results.length?Math.round((game.score/game.results.length)*100):0;
 const event={gameId:game.gameId,type:game.type,label:game.label,score:game.score,total:game.results.length||game.questions.length,percentage,endedEarly,results:game.results};
 game.participants.forEach(sid=>io.to(`session:${sid}`).emit("game-finished",event));
 activeGames.delete(gameId)
}
function clearGamesForMatch(matchUuid:string){
 for(const [gameId,pending] of pendingGames){if(pending.matchUuid===matchUuid)pendingGames.delete(gameId)}
 for(const [gameId,game] of activeGames){if(game.matchUuid===matchUuid){if(game.timer)clearTimeout(game.timer);activeGames.delete(gameId)}}
 usedGameQuestionsByMatch.delete(matchUuid)
}
function endMatch(session:string,reason="ended"){
 removeQueue(session);
 const mid=matchBySession.get(session);if(!mid)return;
 const pair=sessionsByMatch.get(mid);if(!pair)return;
 for(const sid of pair){
  matchBySession.delete(sid);
  io.to(`session:${sid}`).emit("chat-ended",{reason,endedBySelf:sid===session});
 }
 clearGamesForMatch(mid);sessionsByMatch.delete(mid);conversationStartedAt.delete(mid);emitStats()
}

io.use((socket,next)=>{
 const id=String(socket.handshake.auth?.sessionUuid||"");
 if(!/^[0-9a-f-]{36}$/i.test(id))return next(new Error("Invalid session."));
 socket.data.isAdmin=!!verifyAdminToken(socket.handshake.auth?.adminToken);
 next()
});
io.on("connection",socket=>{const sessionUuid=String(socket.handshake.auth.sessionUuid);socket.join(`session:${sessionUuid}`);sessionSockets.set(sessionUuid,socket.id);states.set(socket.id,{sessionUuid,profile:profiles.get(sessionUuid)||null,lastMessageAt:0});emitStats();
 if(matchBySession.has(sessionUuid)){const peer=peerOf(sessionUuid);const pp=peer?profiles.get(peer):null;const mid=matchBySession.get(sessionUuid);if(peer&&pp&&mid)setTimeout(()=>socket.emit("resume-match",{matchUuid:mid,partner:makePartner(pp)}),80)}
 socket.on("set-profile",(profile:any,done:(r:any)=>void=()=>{})=>{
  const restriction=isSessionRestricted(sessionUuid);
  if(restriction.restricted)return done({ok:false,error:restriction.type==="banned"?"This anonymous session has been banned.":"This anonymous session is suspended."});
  const clean={
    ...profile,
    nickname:String(profile?.nickname||"").trim().slice(0,socket.data.isAdmin?48:24),
    campus:String(profile?.campus||"").trim().slice(0,120),
    interests:Array.isArray(profile?.interests)?profile.interests.filter((x:any)=>interests.includes(x)).slice(0,3):[],
    isAdmin:!!socket.data.isAdmin
  };
  if(!validProfile(clean,!!socket.data.isAdmin))return done({ok:false,error:"Please complete your profile correctly."});
  profiles.set(sessionUuid,clean);
  const state=states.get(socket.id);if(state)state.profile=clean;
  done({ok:true})
});
 socket.on("find-match",(done:(r:any)=>void=()=>{})=>{
  const restriction=isSessionRestricted(sessionUuid);
  if(restriction.restricted)return done({ok:false,error:restriction.type==="banned"?"This anonymous session has been banned.":"This anonymous session is suspended."});
  if(matchBySession.has(sessionUuid)){
    const peer=peerOf(sessionUuid);
    const partner=peer?profiles.get(peer):null;
    const matchUuid=matchBySession.get(sessionUuid);
    if(peer&&partner&&matchUuid){
      const quality=buildMatchQuality(profiles.get(sessionUuid)!,partner);const payload={matchUuid,partner:makePartner(partner),matchQuality:quality};
      socket.emit("resume-match",payload);
      return done({ok:true,connected:true,...payload,message:`You are connected with ${partner.nickname}.`})
    }
    endMatch(sessionUuid,"stale");
  }
  if(!profiles.get(sessionUuid))return done({ok:false,error:"Create your anonymous profile first."});
  match(sessionUuid);
  done({ok:true,connected:false})
});
 socket.on("cancel-search",()=>{removeQueue(sessionUuid);socket.emit("queue-status",{waiting:false});emitStats()});
 socket.on("send-message",(payload:any,done:(r:any)=>void=()=>{})=>{
 const restriction=isSessionRestricted(sessionUuid);
 if(restriction.restricted)return done({ok:false,error:"Messaging is unavailable for this moderated session."});
 const mid=matchBySession.get(sessionUuid);if(!mid)return done({ok:false,error:"No active conversation."});
 const text=String(payload?.text||"").trim().slice(0,1000);if(!text)return done({ok:false,error:"Message is empty."});
 const st=states.get(socket.id);const now=Date.now();if(st&&now-st.lastMessageAt<180)return done({ok:false,error:"Please slow down."});if(st)st.lastMessageAt=now;
 const event={id:crypto.randomUUID(),clientId:String(payload?.clientId||""),text,sentAt:new Date().toISOString(),type:"text",replyTo:payload?.replyTo||null};
 messageOwners.set(event.id,sessionUuid);
 socket.emit("message-sent",event);const peer=peerOf(sessionUuid);if(peer)io.to(`session:${peer}`).emit("message-received",event);done({ok:true})
});

 socket.on("send-voice",(payload:any,done:(r:any)=>void=()=>{})=>{
  if(!matchBySession.has(sessionUuid))return done({ok:false,error:"No active conversation."});
  const data=String(payload?.data||"");if(!data.startsWith("data:audio/")||data.length>1_800_000)return done({ok:false,error:"Voice message is invalid or too large."});
  const event={id:crypto.randomUUID(),clientId:String(payload?.clientId||""),type:"voice",audioUrl:data,duration:Math.min(60,Math.max(0,Number(payload?.duration)||0)),sentAt:new Date().toISOString()};
  messageOwners.set(event.id,sessionUuid);socket.emit("voice-sent",event);const peer=peerOf(sessionUuid);if(peer)io.to(`session:${peer}`).emit("voice-received",event);done({ok:true})
 });
 socket.on("react-message",(payload:any,done:(r:any)=>void=()=>{})=>{
  if(!matchBySession.has(sessionUuid))return done({ok:false,error:"No active conversation."});
  const messageId=String(payload?.messageId||"");const emoji=String(payload?.emoji||"").slice(0,8);
  if(!messageId||!["❤️","😆","😮","😢","😭","😡","👍"].includes(emoji))return done({ok:false,error:"Invalid reaction."});
  let bySession=messageReactions.get(messageId);if(!bySession){bySession=new Map();messageReactions.set(messageId,bySession)}
  const existing=bySession.get(sessionUuid);if(existing===emoji)bySession.delete(sessionUuid);else bySession.set(sessionUuid,emoji);
  const reactions:Record<string,number>={};for(const r of bySession.values())reactions[r]=(reactions[r]||0)+1;
  const event={messageId,reactions};socket.emit("reaction-update",event);const peer=peerOf(sessionUuid);if(peer)io.to(`session:${peer}`).emit("reaction-update",event);done({ok:true})
 });
 socket.on("request-game",(payload:any,done:(r:any)=>void=()=>{})=>{
  const matchUuid=matchBySession.get(sessionUuid);if(!matchUuid)return done({ok:false,error:"No active conversation."});
  const type=String(payload?.type||"") as GameType;if(!(type in GAME_DEFS))return done({ok:false,error:"Unknown game."});
  const peer=peerOf(sessionUuid);if(!peer)return done({ok:false,error:"Your match is unavailable."});
  if([...activeGames.values()].some(game=>game.matchUuid===matchUuid))return done({ok:false,error:"A game is already running."});
  const existing=[...pendingGames.values()].find(game=>game.matchUuid===matchUuid);
  if(existing)return done({ok:false,error:"There is already a game invitation waiting."});
  const gameId=crypto.randomUUID();const def=GAME_DEFS[type];
  const pending:PendingGame={gameId,matchUuid,from:sessionUuid,to:peer,type,expiresAt:Date.now()+20000};pendingGames.set(gameId,pending);
  const event={gameId,type,label:def.label,icon:def.icon,fromNickname:profiles.get(sessionUuid)?.nickname||"Your match"};
  socket.emit("game-invite-sent",event);io.to(`session:${peer}`).emit("game-invite",event);
  setTimeout(()=>{const current=pendingGames.get(gameId);if(current&&current.expiresAt<=Date.now()){pendingGames.delete(gameId);io.to(`session:${current.from}`).emit("game-invite-declined",{gameId,reason:"Invitation expired."});io.to(`session:${current.to}`).emit("game-invite-expired",{gameId})}},20500);
  done({ok:true,gameId})
 });
 socket.on("respond-game-invite",(payload:any,done:(r:any)=>void=()=>{})=>{
  const gameId=String(payload?.gameId||"");const pending=pendingGames.get(gameId);
  if(!pending||pending.to!==sessionUuid)return done({ok:false,error:"Game invitation is no longer available."});
  pendingGames.delete(gameId);
  if(!payload?.accept){io.to(`session:${pending.from}`).emit("game-invite-declined",{gameId,reason:"Your match passed on the game."});return done({ok:true})}
  const pair=sessionsByMatch.get(pending.matchUuid);if(!pair||!pair.includes(pending.from)||!pair.includes(pending.to))return done({ok:false,error:"Conversation is no longer active."});
  const def=GAME_DEFS[pending.type];const game:ActiveGame={gameId,matchUuid:pending.matchUuid,type:pending.type,label:def.label,participants:[pending.from,pending.to],questions:selectGameQuestions(pending.matchUuid,pending.type,5),round:0,answers:new Map(),score:0,results:[],transitioning:false};
  activeGames.set(gameId,game);
  game.participants.forEach(sid=>io.to(`session:${sid}`).emit("game-invite-accepted",{gameId,type:game.type,label:game.label}));
  setTimeout(()=>{if(activeGames.has(gameId))emitGameRound(game)},350);done({ok:true})
 });
 socket.on("game-answer",(payload:any,done:(r:any)=>void=()=>{})=>{
  const gameId=String(payload?.gameId||"");const game=activeGames.get(gameId);if(!game||!game.participants.includes(sessionUuid))return done({ok:false,error:"Game is no longer active."});
  if(game.transitioning)return done({ok:false,error:"Next round is loading."});
  const choice=Number(payload?.choice);if(choice!==0&&choice!==1)return done({ok:false,error:"Invalid choice."});
  if(game.answers.has(sessionUuid))return done({ok:false,error:"Answer already locked."});
  game.answers.set(sessionUuid,choice);socket.emit("game-answer-locked",{gameId,choice});
  const peer=peerOf(sessionUuid);if(peer)io.to(`session:${peer}`).emit("game-partner-answered",{gameId});
  if(game.answers.size===game.participants.length)finishGameRound(gameId,false);done({ok:true})
 });
 socket.on("game-end",(payload:any,done:(r:any)=>void=()=>{})=>{
  const gameId=String(payload?.gameId||"");const game=activeGames.get(gameId);if(!game||!game.participants.includes(sessionUuid))return done({ok:false});finishGame(gameId,true);done({ok:true})
 });
 socket.on("ack-message",(payload:any)=>{const peer=peerOf(sessionUuid);if(peer)io.to(`session:${peer}`).emit("delivery-update",{id:String(payload?.id||""),status:"delivered"})});
 socket.on("typing",(payload:any)=>{const peer=peerOf(sessionUuid);if(peer)io.to(`session:${peer}`).emit("partner-typing",{typing:!!payload?.typing})});
 socket.on("presence",(payload:any)=>{
  const peer=peerOf(sessionUuid);
  if(peer)io.to(`session:${peer}`).emit("partner-presence",{active:payload?.active!==false});
 });
 socket.on("request-icebreaker",(done:(r:any)=>void=()=>{})=>{
  if(!matchBySession.has(sessionUuid))return done({ok:false,error:"No active conversation."});
  const prompts=shuffle(icebreakers).slice(0,2);
  const event={prompts};
  socket.emit("icebreaker-prompt",event);
  done({ok:true,prompts})
});
 socket.on("refresh-icebreaker",(payload:any,done:(r:any)=>void=()=>{})=>{
  if(!matchBySession.has(sessionUuid))return done({ok:false,error:"No active conversation."});
  const slot=Number(payload?.slot);
  if(slot!==0&&slot!==1)return done({ok:false,error:"Invalid icebreaker slot."});
  const prompt=icebreakers[Math.floor(Math.random()*icebreakers.length)];
  socket.emit("icebreaker-prompt",{slot,prompt});
  done({ok:true,slot,prompt})
 });
 socket.on("conversation-feedback",(payload:any,done:(r:any)=>void=()=>{})=>{
  const rating=String(payload?.rating||"");
  if(!["good","okay","bad"].includes(rating))return done({ok:false});
  done({ok:true})
 });
 socket.on("end-chat",(done:(r:any)=>void=()=>{})=>{endMatch(sessionUuid,"ended");done({ok:true})});
 socket.on("next",(done:(r:any)=>void=()=>{})=>{endMatch(sessionUuid,"next");setTimeout(()=>match(sessionUuid),20);done({ok:true})});
 socket.on("disconnect",()=>{
  states.delete(socket.id);
  if(!hasConnectedSession(sessionUuid)){
   sessionSockets.delete(sessionUuid);
   removeQueue(sessionUuid);
  }
  emitStats()
 });
});

server.listen(PORT,()=>console.log(`SintaChat realtime server running on http://localhost:${PORT}`));
