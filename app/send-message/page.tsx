'use client'

import {useEffect,useState} from 'react'
import {supabase} from '@/lib/supabase'
import AdminAnnouncements from '@/app/admin/announcements'
import {PlayerPage} from '@/components/PlayerMobileChrome'

type Team={id:string;name:string}

export default function SendMessagePage(){
  const [ready,setReady]=useState(false)
  const [allowed,setAllowed]=useState(false)
  const [teams,setTeams]=useState<Team[]>([])

  useEffect(()=>{;(async()=>{
    const {data:{user}}=await supabase.auth.getUser()
    if(!user){location.href='/login';return}
    const {data:p}=await supabase.from('profiles').select('role,status').eq('id',user.id).maybeSingle()
    if(p?.role!=='admin'||p?.status!=='approved'){setReady(true);return}
    setAllowed(true)
    const {data:s}=await supabase.from('seasons').select('id').eq('is_active',true).eq('is_closed',false).limit(1).maybeSingle()
    const {data:t}=s?.id
      ?await supabase.from('teams').select('id,name').eq('season_id',s.id).eq('is_active',true).order('name')
      :await supabase.from('teams').select('id,name').eq('is_active',true).order('name')
    setTeams((t||[]) as Team[])
    setReady(true)
  })()},[])

  if(!ready)return <PlayerPage title="Send Message"><div className="card"><p>Loading…</p></div></PlayerPage>
  if(!allowed)return <PlayerPage title="Send Message"><div className="card"><h2>Admin Access Required</h2><p>This page is available only to an approved administrator.</p></div></PlayerPage>
  return <PlayerPage title="Send Message"><AdminAnnouncements teams={teams}/></PlayerPage>
}
