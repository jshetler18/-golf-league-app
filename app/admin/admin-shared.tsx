'use client'
import {ReactNode,useEffect,useState} from 'react'
import {supabase} from '@/lib/supabase'

export function useAdminGuard(){
  const [admin,setAdmin]=useState(false),[ready,setReady]=useState(false),[error,setError]=useState('')
  useEffect(()=>{(async()=>{const {data:{user},error:authError}=await supabase.auth.getUser();if(authError){setError('Unable to verify your sign-in: '+authError.message);setReady(true);return}if(!user){setReady(true);return}const {data,error:profileError}=await supabase.from('profiles').select('role,status').eq('id',user.id).maybeSingle();if(profileError){setError('Unable to verify administrator access: '+profileError.message);setReady(true);return}setAdmin(data?.role==='admin'&&data?.status==='approved');setReady(true)})()},[])
  return {admin,ready,error}
}

export function AdminFrame({title,description,children}:{title:string;description:string;children:ReactNode}){
  return <><div className="admin-page-top-v1237"><h1>{title}</h1><p>{description}</p></div>{children}</>
}

export function AdminDenied({ready,admin,error}:{ready:boolean;admin:boolean;error?:string}){
  if(!ready)return <p>Loading…</p>
  if(error)return <div className="card" role="alert"><h1>Unable to Verify Administrator Access</h1><p>{error}</p><p>Your administrator approval may still be valid. Please try again when the service is available.</p><button onClick={()=>window.location.reload()}>Retry</button></div>
  if(!admin)return <div className="card"><h1>Admin</h1><p>This area is available only to approved administrators.</p></div>
  return null
}
