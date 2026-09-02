'use client'
import {useEffect,useState} from 'react'
import {supabase} from '@/lib/supabase'
import AdminAnnouncements from '../announcements'
import {AdminDenied,AdminFrame,useAdminGuard} from '../admin-shared'
type Team={id:string;name:string}
export default function AdminMessages(){const guard=useAdminGuard();const [teams,setTeams]=useState<Team[]>([]);useEffect(()=>{if(!guard.admin)return;(async()=>{const {data:s}=await supabase.from('seasons').select('id').eq('is_active',true).eq('is_closed',false).limit(1).maybeSingle();const {data:t}=s?.id?await supabase.from('teams').select('id,name').eq('season_id',s.id).eq('is_active',true).order('name'):await supabase.from('teams').select('id,name').eq('is_active',true).order('name');setTeams((t||[]) as Team[])})()},[guard.admin]);const denied=<AdminDenied {...guard}/>;if(denied)return denied;return <AdminFrame title="Messages" description="Create and manage league announcements with custom formatting."><AdminAnnouncements teams={teams}/></AdminFrame>}
