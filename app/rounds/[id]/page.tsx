'use client'
import {useEffect,useState} from 'react'
import {useParams} from 'next/navigation'
import {PlayerPage} from '@/components/PlayerMobileChrome'
import {supabase} from '@/lib/supabase'

export default function RoundCard(){
 const {id}=useParams<{id:string}>()
 const [r,setR]=useState<any>(null),[img,setImg]=useState('')
 useEffect(()=>{(async()=>{
   const {data:x}=await supabase.from('round_score_submissions').select('*,teams(name),league_months(month_start,course_name)').eq('id',id).single()
   setR(x)
   if(x?.image_path){const {data:s}=await supabase.storage.from('round-scorecards').createSignedUrl(x.image_path,600);setImg(s?.signedUrl||'')}
 })()},[id])
 if(!r)return <PlayerPage title="Round Scorecard"><div className="simple-mobile-page"><p>Loading scorecard…</p></div></PlayerPage>
 const month=new Date(r.league_months.month_start+'T12:00:00').toLocaleString('en-US',{month:'long',year:'numeric'})
 const approved=r.status==='approved'
 return <PlayerPage title="Round Scorecard"><div className="simple-mobile-page">
   <div className="card round-review-public-card">
     <div className="submission-head"><div><h1>{r.teams?.name}</h1><p>{month} · Week {r.week_number}</p><p>{r.league_months?.course_name}</p></div><span className={'submission-status '+r.status}>{r.status}</span></div>
     <div className="submitted-total-admin"><span>{approved?'Official Round Score':'Submitted Score'}</span><strong>{Number(r.official_total).toFixed(1)}</strong></div>
     {img&&<img className="score-preview" src={img} alt="Submitted scorecard"/>}
     {!approved&&<p className="muted">This score is not official until the admin approves the submitted scorecard.</p>}
     {r.status==='rejected'&&r.admin_note&&<div className="admin-denial-note"><b>Admin explanation</b><span>{r.admin_note}</span></div>}
   </div>
 </div></PlayerPage>
}
