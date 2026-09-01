import {NextRequest,NextResponse} from 'next/server'
import {createClient} from '@supabase/supabase-js'
import webpush from 'web-push'
export const runtime='nodejs'
const PUBLIC='BNfpFrTXfBnim6gbXvWm8XknDPLqY16Wo0eKalryPEcUKZ5M6v-8J6JdLyp_vaPzEhaxxfGp1vwJZNgxtdiQtMM'
export async function POST(req:NextRequest){
 try{
  const auth=req.headers.get('authorization')||'', token=auth.startsWith('Bearer ')?auth.slice(7):''
  if(!token)return NextResponse.json({error:'Not signed in.'},{status:401})
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL!, pub=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, secret=process.env.SUPABASE_SECRET_KEY!, privateKey=process.env.VAPID_PRIVATE_KEY!
  if(!url||!pub||!secret||!privateKey)return NextResponse.json({error:'Push notifications are not configured.'},{status:503})
  const authClient=createClient(url,pub,{auth:{persistSession:false,autoRefreshToken:false}}); const {data:{user}}=await authClient.auth.getUser(token)
  if(!user)return NextResponse.json({error:'Invalid sign-in.'},{status:401})
  const admin=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}})
  const {postId}=await req.json(); if(!postId)return NextResponse.json({error:'Post ID required.'},{status:400})
  const {data:post}=await admin.from('chat_posts').select('id,user_id,audience,team_id,body,parent_id,profiles!chat_posts_user_id_fkey(full_name)').eq('id',postId).maybeSingle()
  if(!post||post.user_id!==user.id)return NextResponse.json({error:'Chat post not found.'},{status:404})
  let recipients:string[]=[]
  if(post.parent_id){const {data:parent}=await admin.from('chat_posts').select('user_id').eq('id',post.parent_id).maybeSingle();if(parent?.user_id&&parent.user_id!==user.id)recipients=[parent.user_id]}
  else if(post.audience==='team'&&post.team_id){const {data:players}=await admin.from('players').select('id').eq('team_id',post.team_id).eq('is_active',true);const ids=(players||[]).map(x=>x.id);if(ids.length){const {data:p}=await admin.from('profiles').select('id').in('player_id',ids).eq('status','approved');recipients=(p||[]).map(x=>x.id).filter(id=>id!==user.id)}}
  else {const {data:p}=await admin.from('profiles').select('id').eq('status','approved').not('player_id','is',null);recipients=(p||[]).map(x=>x.id).filter(id=>id!==user.id)}
  if(!recipients.length)return NextResponse.json({ok:true,sent:0})
  const {data:prefs}=await admin.from('chat_notification_preferences').select('user_id,enabled').in('user_id',recipients);const off=new Set((prefs||[]).filter(x=>!x.enabled).map(x=>x.user_id));recipients=recipients.filter(id=>!off.has(id));if(!recipients.length)return NextResponse.json({ok:true,sent:0})
  const {data:subs}=await admin.from('push_subscriptions').select('id,user_id,endpoint,p256dh,auth').in('user_id',recipients)
  const author=(post.profiles as any)?.full_name||'A league player', isReply=!!post.parent_id, title=isReply?`${author} replied in League Chat`:`New League Chat from ${author}`, body=String(post.body||'New chat message').slice(0,180)
  webpush.setVapidDetails(process.env.VAPID_SUBJECT||'https://www.lvvgolfsim.com',PUBLIC,privateKey)
  let sent=0;for(const sub of subs||[]){if(!sub.p256dh||!sub.auth)continue;try{await webpush.sendNotification({endpoint:sub.endpoint,keys:{p256dh:sub.p256dh,auth:sub.auth}},JSON.stringify({title,body,url:`/chat?post=${encodeURIComponent(post.id)}`,tag:`chat-${post.id}`}));sent++}catch(e:any){if(e?.statusCode===404||e?.statusCode===410)await admin.from('push_subscriptions').delete().eq('id',sub.id)}}
  return NextResponse.json({ok:true,sent})
 }catch(e:any){return NextResponse.json({error:e?.message||'Unable to send chat notification.'},{status:500})}
}
