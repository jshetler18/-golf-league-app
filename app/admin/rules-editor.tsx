'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type RuleSection={heading:string;body:string}

export default function RulesEditor(){
  const [title,setTitle]=useState('League Rules')
  const [sections,setSections]=useState<RuleSection[]>([])
  const [loading,setLoading]=useState(true)
  const [saving,setSaving]=useState(false)
  const [message,setMessage]=useState('')

  useEffect(()=>{(async()=>{
    const {data,error}=await supabase.from('league_rules').select('page_title,sections').eq('id',1).maybeSingle()
    if(error)setMessage(error.message)
    if(data){setTitle(data.page_title||'League Rules');setSections(Array.isArray(data.sections)?data.sections as RuleSection[]:[])}
    setLoading(false)
  })()},[])

  function updateSection(index:number,key:keyof RuleSection,value:string){
    setSections(current=>current.map((section,i)=>i===index?{...section,[key]:value}:section))
  }
  function move(index:number,direction:-1|1){
    const next=index+direction;if(next<0||next>=sections.length)return
    setSections(current=>{const copy=[...current];[copy[index],copy[next]]=[copy[next],copy[index]];return copy})
  }
  function remove(index:number){
    if(!window.confirm('Remove this rule section?'))return
    setSections(current=>current.filter((_,i)=>i!==index))
  }
  function add(){setSections(current=>[...current,{heading:'New Rule Section',body:''}])}
  async function save(){
    setSaving(true);setMessage('')
    const {data:{user}}=await supabase.auth.getUser()
    const cleaned=sections.map(s=>({heading:s.heading.trim(),body:s.body.trim()})).filter(s=>s.heading||s.body)
    const {error}=await supabase.from('league_rules').upsert({id:1,page_title:title.trim()||'League Rules',sections:cleaned,updated_at:new Date().toISOString(),updated_by:user?.id||null},{onConflict:'id'})
    setMessage(error?error.message:'Rules page updated successfully.')
    if(!error)setSections(cleaned)
    setSaving(false)
  }

  return <section className="admin-rules-v1230">
    <div className="section-title"><div><h2>Rules Page</h2><p className="muted">Customize the headings and text players see on the Rules page.</p></div></div>
    <div className="card">
      {loading?<p>Loading rules…</p>:<>
        <label className="field"><strong>Page Title</strong><input value={title} onChange={e=>setTitle(e.target.value)} /></label>
        <div className="admin-rule-sections-v1230">
          {sections.map((section,index)=><div className="admin-rule-section-v1230" key={index}>
            <div className="admin-rule-toolbar-v1230"><strong>Section {index+1}</strong><div><button className="btn secondary small" type="button" onClick={()=>move(index,-1)} disabled={index===0}>↑</button><button className="btn secondary small" type="button" onClick={()=>move(index,1)} disabled={index===sections.length-1}>↓</button><button className="btn danger small" type="button" onClick={()=>remove(index)}>Remove</button></div></div>
            <label className="field">Heading<input value={section.heading} onChange={e=>updateSection(index,'heading',e.target.value)} /></label>
            <label className="field">Text<textarea rows={4} value={section.body} onChange={e=>updateSection(index,'body',e.target.value)} /></label>
          </div>)}
        </div>
        <div className="admin-rule-actions-v1230"><button className="btn secondary" type="button" onClick={add}>Add Rule Section</button><button className="btn" type="button" onClick={save} disabled={saving}>{saving?'Saving…':'Save Rules Page'}</button></div>
        {message&&<p className="message">{message}</p>}
      </>}
    </div>
  </section>
}
