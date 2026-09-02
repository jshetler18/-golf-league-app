'use client'
import Link from 'next/link'
import {ReactNode,useEffect,useState} from 'react'
import {supabase} from '@/lib/supabase'

export function useAdminGuard(){
  const [admin,setAdmin]=useState(false),[ready,setReady]=useState(false)
  useEffect(()=>{(async()=>{const {data:{user}}=await supabase.auth.getUser();if(!user){setReady(true);return}const {data}=await supabase.from('profiles').select('role,status').eq('id',user.id).maybeSingle();setAdmin(data?.role==='admin'&&data?.status==='approved');setReady(true)})()},[])
  return {admin,ready}
}

export function AdminFrame({title,description,children}:{title:string;description:string;children:ReactNode}){
  return <><div className="admin-page-top-v1237"><Link href="/admin" className="admin-back-v1237">← Admin Home</Link><div className="eyebrow">Administration</div><h1>{title}</h1><p>{description}</p></div>{children}</>
}

export function AdminDenied({ready,admin}:{ready:boolean;admin:boolean}){
  if(!ready)return <p>Loading…</p>
  if(!admin)return <div className="card"><h1>Admin</h1><p>This area is available only to approved administrators.</p></div>
  return null
}
