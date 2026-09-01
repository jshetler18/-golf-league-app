'use client'

import { useEffect, useState } from 'react'
import { PlayerPage } from '@/components/PlayerMobileChrome'
import { supabase } from '@/lib/supabase'

type RuleSection={heading:string;body:string}
type RulePage={page_title:string;sections:RuleSection[]}

const fallback:RulePage={
  page_title:'League Rules',
  sections:[
    {heading:'Monthly Format',body:'Each team plays one round per week for four rounds each month. The first 10 holes use Stableford scoring, with two designated bonus par-3 holes from the back nine.'},
    {heading:'Stableford Points',body:'Albatross 5 · Eagle 4 · Birdie 3 · Par 2 · Bogey 1 · Double bogey or worse 0.'},
    {heading:'Week 4 Match Play & Cup Points',body:'Seeds 1–2 award 1,000/800; 3–4 award 700/600; 5–6 award 500/400; 7–8 award 300/200; 9–10 award 100/0. Ties are resolved by the league administrator.'},
    {heading:'Official Weekly Score',body:'Raw Stableford + bonus points + monthly team handicap.'}
  ]
}

export default function Rules(){
  const [rules,setRules]=useState<RulePage>(fallback)
  const [loading,setLoading]=useState(true)
  useEffect(()=>{(async()=>{
    const {data}=await supabase.from('league_rules').select('page_title,sections').eq('id',1).maybeSingle()
    if(data){
      const sections=Array.isArray(data.sections)?data.sections as RuleSection[]:fallback.sections
      setRules({page_title:data.page_title||fallback.page_title,sections})
    }
    setLoading(false)
  })()},[])
  return <PlayerPage title="">
    <div className="simple-mobile-page rules-page-v1230">
      <h1>{rules.page_title}</h1>
      {loading?<section className="card"><p>Loading…</p></section>:<section className="card rules-content-v1230">
        {rules.sections.map((section,index)=><div className="rule-section-v1230" key={`${section.heading}-${index}`}>
          <h2>{section.heading}</h2>
          <p>{section.body}</p>
        </div>)}
      </section>}
    </div>
  </PlayerPage>
}
