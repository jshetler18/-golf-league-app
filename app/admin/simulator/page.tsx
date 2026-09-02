'use client'
import Link from 'next/link'
import {useEffect,useState} from 'react'
import {supabase} from '@/lib/supabase'
import {AdminDenied,AdminFrame,useAdminGuard} from '../admin-shared'
export default function SimulatorAdmin(){
 const guard=useAdminGuard(); const [counts,setCounts]=useState({teams:0,scheduled:0,makeups:0,bookings:0})
 useEffect(()=>{if(!guard.admin)return;(async()=>{const {data:s}=await supabase.from('seasons').select('id').eq('is_active',true).eq('is_closed',false).limit(1).maybeSingle();if(!s)return;const [{count:teams},{count:scheduled},{count:makeups},{count:bookings}]=await Promise.all([supabase.from('teams').select('*',{count:'exact',head:true}).eq('season_id',s.id).eq('is_active',true),supabase.from('team_sim_slots').select('*',{count:'exact',head:true}).eq('season_id',s.id),supabase.from('league_makeup_slots').select('*',{count:'exact',head:true}).eq('season_id',s.id),supabase.from('bookings').select('*',{count:'exact',head:true}).eq('status','active').gte('end_at',new Date().toISOString())]);setCounts({teams:teams||0,scheduled:scheduled||0,makeups:makeups||0,bookings:bookings||0})})()},[guard.admin])
 if(!guard.ready||!guard.admin)return <AdminDenied {...guard}/>
 const cards=[['/admin/simulator/team-schedules','⛳','Team & League Schedules',`${counts.scheduled} of ${counts.teams} teams set up`,`${counts.makeups} League Make-Up block${counts.makeups===1?'':'s'}`],['/admin/simulator/bookings','📅','Bookings & Block Time',`${counts.bookings} upcoming item${counts.bookings===1?'':'s'}`,'Add, remove, or block simulator time']]
 return <AdminFrame title="Simulator" description="Manage recurring league schedules and the simulator reservation calendar."><div className="admin-page-grid-v1237">{cards.map(c=><Link className="card admin-page-card-v1237" href={c[0]} key={c[0]}><span>{c[1]}</span><div><h2>{c[2]}</h2><p><strong>{c[3]}</strong><br/>{c[4]}</p></div><b>›</b></Link>)}</div></AdminFrame>
}
