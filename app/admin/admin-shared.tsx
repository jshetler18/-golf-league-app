'use client'
import {ReactNode,useEffect,useState} from 'react'
import {supabase} from '@/lib/supabase'

export function useAdminGuard(){
  const [admin,setAdmin]=useState(false),[ready,setReady]=useState(false)
  useEffect(()=>{let active=true;(async()=>{try{const {data:{session}}=await supabase.auth.getSession();let user=session?.user;if(!user){const response=await supabase.auth.getUser();user=response.data.user||undefined}if(!user)return;const {data}=await supabase.from('profiles').select('role,status').eq('id',user.id).maybeSingle();if(active)setAdmin(data?.role==='admin'&&data?.status==='approved')}catch(error){console.error('Admin access verification failed',error)}finally{if(active)setReady(true)}})();return()=>{active=false}},[])
  return {admin,ready}
}

export function AdminFrame({title,description,children}:{title:string;description:string;children:ReactNode}){
  return <><div className="admin-page-top-v1237"><h1>{title}</h1><p>{description}</p></div>{children}</>
}

export function AdminDenied({ready,admin}:{ready:boolean;admin:boolean}){
  if(!ready)return <p>Loading…</p>
  if(!admin)return <div className="card"><h1>Admin</h1><p>This area is available only to approved administrators.</p></div>
  return null
}
