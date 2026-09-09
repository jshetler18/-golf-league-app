import {NextRequest,NextResponse} from 'next/server'
import {createClient} from '@supabase/supabase-js'
function admin(){return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SECRET_KEY!,{auth:{persistSession:false}})}
async function syncOpenMeetingRoster(db:any,meeting:{id:string,season_id:string,is_open:boolean}){
 if(!meeting.is_open)return;
 const [{data:players,error:pErr},{data:teams,error:tErr},{data:existing}]=await Promise.all([
  db.from('players').select('id,team_id,full_name').eq('season_id',meeting.season_id).eq('is_active',true),
  db.from('teams').select('id,name,captain_player_id').eq('season_id',meeting.season_id).eq('is_active',true),
  db.from('league_meeting_invitees').select('player_id,team_id,player_name,team_name').eq('meeting_id',meeting.id)
 ]);
 if(pErr||tErr)return;
 const teamNames=new Map((teams||[]).map((t:any)=>[t.id,t.name]));
 const activeTeamIds=new Set((teams||[]).map((t:any)=>t.id));
 const existingByPlayer=new Map((existing||[]).filter((x:any)=>x.player_id).map((x:any)=>[x.player_id,x]));
 const activePlayers=(players||[]).filter((p:any)=>activeTeamIds.has(p.team_id));
 const rows=activePlayers.filter((p:any)=>!existingByPlayer.has(p.id)).map((p:any)=>({meeting_id:meeting.id,player_id:p.id,team_id:p.team_id,player_name:p.full_name,team_name:teamNames.get(p.team_id)||'Team'}));
 if(rows.length)await db.from('league_meeting_invitees').insert(rows);
 // Keep open-meeting roster snapshots aligned with roster edits (renames/team moves) without touching RSVP status.
 for(const p of activePlayers){
  const old=existingByPlayer.get(p.id) as any;
  if(!old)continue;
  const teamName=teamNames.get(p.team_id)||'Team';
  if(old.player_name!==p.full_name||old.team_id!==p.team_id||old.team_name!==teamName){
   await db.from('league_meeting_invitees').update({team_id:p.team_id,player_name:p.full_name,team_name:teamName}).eq('meeting_id',meeting.id).eq('player_id',p.id);
  }
 }
}
export async function GET(req:NextRequest){const token=req.nextUrl.searchParams.get('token')||'';if(!token)return NextResponse.json({error:'RSVP link is invalid.'},{status:400});const db=admin();const {data:m,error}=await db.from('league_meetings').select('id,title,meeting_at,location,message,is_open,season_id').eq('public_token',token).maybeSingle();if(error||!m)return NextResponse.json({error:'This RSVP link was not found.'},{status:404});await syncOpenMeetingRoster(db,m);const [{data:people,error:pErr},{data:teams,error:tErr}]=await Promise.all([db.from('league_meeting_invitees').select('id,player_id,team_id,player_name,team_name,is_coming,response_status,responded_at').eq('meeting_id',m.id).order('team_name').order('player_name'),db.from('teams').select('id,captain_player_id').eq('season_id',m.season_id).eq('is_active',true)]);if(pErr)return NextResponse.json({error:pErr.message},{status:400});if(tErr)return NextResponse.json({error:tErr.message},{status:400});const captains=new Map((teams||[]).map((t:any)=>[t.id,t.captain_player_id]));const roster=(people||[]).map((p:any)=>({...p,is_captain:!!p.player_id&&captains.get(p.team_id)===p.player_id}));return NextResponse.json({meeting:m,people:roster})}
export async function POST(req:NextRequest){const body=await req.json(),token=String(body.token||''),inviteeId=String(body.inviteeId||''),status=String(body.status||'');if(!token||!inviteeId||!['coming','declined','no_response'].includes(status))return NextResponse.json({error:'Invalid RSVP.'},{status:400});const db=admin();const {data:m}=await db.from('league_meetings').select('id,is_open').eq('public_token',token).maybeSingle();if(!m)return NextResponse.json({error:'This RSVP link was not found.'},{status:404});if(!m.is_open)return NextResponse.json({error:'RSVPs for this meeting are closed.'},{status:400});const {data:person}=await db.from('league_meeting_invitees').select('id').eq('id',inviteeId).eq('meeting_id',m.id).maybeSingle();if(!person)return NextResponse.json({error:'Player was not found for this meeting.'},{status:404});const {error}=await db.from('league_meeting_invitees').update({response_status:status,is_coming:status==='coming',responded_at:status==='no_response'?null:new Date().toISOString()}).eq('id',person.id);if(error)return NextResponse.json({error:error.message},{status:400});return NextResponse.json({ok:true,responseStatus:status,isComing:status==='coming'})}
