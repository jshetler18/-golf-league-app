'use client'
import { useEffect,useMemo,useState } from 'react'
import { supabase } from '@/lib/supabase'

type Team={id:string;name:string}
type Month={id:string;month_start:string;course_name:string}
type Score={team_id:string;week_number:number;official_total:number|null;status:string}
type Handicap={team_id:string;handicap_points:number}
type Matchup={id:string;seed_high:number;seed_low:number;team_high_id:string;team_low_id:string;winner_team_id:string|null;high_points_awarded:number|null;low_points_awarded:number|null}

export default function TVLeaderboard(){
 const [teams,setTeams]=useState<Team[]>([]),[months,setMonths]=useState<Month[]>([]),[monthId,setMonthId]=useState(''),[scores,setScores]=useState<Score[]>([]),[handicaps,setHandicaps]=useState<Handicap[]>([]),[matchups,setMatchups]=useState<Matchup[]>([]),[flash,setFlash]=useState<string|null>(null)
 useEffect(()=>{(async()=>{const {data:s}=await supabase.from('seasons').select('id').eq('is_active',true).eq('is_closed',false).limit(1).maybeSingle();if(!s)return;const [{data:t},{data:m}]=await Promise.all([supabase.from('teams').select('id,name').eq('season_id',s.id).eq('is_active',true),supabase.from('league_months').select('id,month_start,course_name').eq('season_id',s.id).order('month_start')]);setTeams((t||[]) as Team[]);setMonths((m||[]) as Month[]);if(m?.length)setMonthId(m[m.length-1].id)})()},[])
 useEffect(()=>{if(!monthId)return;let alive=true;const load=async()=>{const [{data:a},{data:b},{data:c}]=await Promise.all([supabase.from('weekly_scores').select('team_id,week_number,official_total,status').eq('league_month_id',monthId).eq('status','approved'),supabase.from('monthly_team_handicaps').select('team_id,handicap_points').eq('league_month_id',monthId),supabase.from('week4_matchups').select('id,seed_high,seed_low,team_high_id,team_low_id,winner_team_id,high_points_awarded,low_points_awarded').eq('league_month_id',monthId).order('seed_high')]);if(alive){setScores((a||[]) as Score[]);setHandicaps((b||[]) as Handicap[]);setMatchups((c||[]) as Matchup[])}};load();const channel=supabase.channel('tv-'+monthId)
 .on('postgres_changes',{event:'*',schema:'public',table:'weekly_scores',filter:`league_month_id=eq.${monthId}`},p=>{const n=(p.new||p.old) as any;setFlash(n.team_id||null);load();setTimeout(()=>setFlash(null),1600)})
 .on('postgres_changes',{event:'*',schema:'public',table:'monthly_team_handicaps',filter:`league_month_id=eq.${monthId}`},()=>load())
 .on('postgres_changes',{event:'*',schema:'public',table:'week4_matchups',filter:`league_month_id=eq.${monthId}`},()=>load())
 .on('postgres_changes',{event:'*',schema:'public',table:'cup_points',filter:`league_month_id=eq.${monthId}`},()=>load()).subscribe();return()=>{alive=false;supabase.removeChannel(channel)}},[monthId])
 const completedWeeks=[1,2,3].filter(w=>scores.some(s=>s.week_number===w));const latestWeek=completedWeeks.length?Math.max(...completedWeeks):1
 const calc=(through:number)=>teams.map(t=>({id:t.id,total:scores.filter(s=>s.team_id===t.id&&s.week_number<=through).reduce((a,s)=>a+Number(s.official_total||0),0)})).sort((a,b)=>b.total-a.total||a.id.localeCompare(b.id))
 const prevRanks=useMemo(()=>{const map=new Map<string,number>();if(latestWeek>1)calc(latestWeek-1).forEach((r,i)=>map.set(r.id,i+1));return map},[teams,scores,latestWeek])
 const rows=useMemo(()=>calc(latestWeek).map((base,i)=>{const t=teams.find(x=>x.id===base.id)!;const wk=(n:number)=>scores.find(s=>s.team_id===t.id&&s.week_number===n)?.official_total;const h=handicaps.find(x=>x.team_id===t.id)?.handicap_points;const old=prevRanks.get(t.id);return{t,rank:i+1,h:h==null?null:Number(h),w1:wk(1),w2:wk(2),w3:wk(3),total:base.total,change:old?old-(i+1):0}}),[teams,scores,handicaps,latestWeek,prevRanks])
 const m=months.find(x=>x.id===monthId),d=m?new Date(m.month_start+'T12:00:00'):null,monthLabel=d?d.toLocaleDateString('en-US',{month:'short'}).toUpperCase()+' '+String(d.getFullYear()).slice(-2):''
 const fmt=(v:number|null|undefined)=>v==null?'—':Number(v).toFixed(1)
 const teamName=(id:string)=>teams.find(t=>t.id===id)?.name||'Team'
 const w4=(id:string)=>scores.find(s=>s.team_id===id&&s.week_number===4)?.official_total
 const showWeek4=matchups.length===5
 if(showWeek4)return <main className="tv-approved tv-week4">
   <header className="tv-approved-header tv-week4-header">
    <div className="tv-approved-logo"><img src="/tom-krise-logo.png" alt="Tom Krise 19th Hole Golf Simulator"/></div>
    <div className="tv-approved-titles"><h1>WEEK 4 MATCH PLAY</h1><div className="tv-week4-subtitle">HEAD-TO-HEAD MATCHUPS</div></div>
    <div className="tv-approved-divider"/>
    <div className="tv-approved-meta"><div className="tv-approved-month">{monthLabel}</div><div className="tv-approved-week">WEEK 4 OF 4</div></div>
   </header>
   <section className="tv-week4-table">
    <div className="tv-week4-row tv-week4-head"><span>MATCHUP</span><span>TEAM</span><span>ADJUSTED SCORE</span><span>VS</span><span>ADJUSTED SCORE</span><span>TEAM</span><span>RESULT</span></div>
    {matchups.map(x=>{const hi=w4(x.team_high_id),lo=w4(x.team_low_id);const done=hi!=null&&lo!=null&&x.winner_team_id!=null;const tied=hi!=null&&lo!=null&&Number(hi)===Number(lo)&&!x.winner_team_id;return <div className={'tv-week4-row '+((flash===x.team_high_id||flash===x.team_low_id)?'tv-approved-flash':'')} key={x.id}>
      <span className="tv-week4-match"><b>{x.seed_high}</b><i>VS</i><b>{x.seed_low}</b></span>
      <span className="tv-week4-team"><strong>{teamName(x.team_high_id).toUpperCase()}</strong>{done&&x.high_points_awarded!=null?<small>{Number(x.high_points_awarded).toLocaleString()} PTS</small>:null}</span>
      <span className="tv-week4-score">{fmt(hi)}</span><span className="tv-week4-vs">VS</span><span className="tv-week4-score">{fmt(lo)}</span>
      <span className="tv-week4-team"><strong>{teamName(x.team_low_id).toUpperCase()}</strong>{done&&x.low_points_awarded!=null?<small>{Number(x.low_points_awarded).toLocaleString()} PTS</small>:null}</span>
      <span className="tv-week4-result">{done?<><strong>{teamName(x.winner_team_id!).toUpperCase()}</strong><small>WINS</small></>:tied?<><strong>TIED</strong><small>AWAITING TIEBREAKER</small></>:<><strong>PENDING</strong><small>WAITING FOR SCORES</small></>}</span>
    </div>})}
   </section>
  </main>
 return <main className="tv-approved">
   <header className="tv-approved-header">
    <div className="tv-approved-logo"><img src="/tom-krise-logo.png" alt="Tom Krise 19th Hole Golf Simulator"/></div>
    <div className="tv-approved-titles"><div className="tv-approved-league">TOM KRISE 19TH HOLE GOLF LEAGUE</div><h1>MONTHLY STANDINGS</h1></div>
    <div className="tv-approved-divider"/>
    <div className="tv-approved-meta"><div className="tv-approved-month">{monthLabel}</div><div className="tv-approved-week">WEEK {latestWeek} OF 4</div></div>
   </header>
   <section className="tv-approved-table">
    <div className="tv-approved-row tv-approved-head"><span>RANK</span><span>TEAM</span><span>HANDICAP</span><span>WEEK 1<small>ADJUSTED</small></span><span>WEEK 2<small>ADJUSTED</small></span><span>WEEK 3<small>ADJUSTED</small></span><span>TOTAL<small>ADJUSTED</small></span></div>
    {rows.slice(0,10).map(r=><div className={'tv-approved-row '+(flash===r.t.id?'tv-approved-flash':'')} key={r.t.id}>
      <span className="tv-approved-rank">{r.rank}</span><span className="tv-approved-team">{r.t.name.toUpperCase()}</span><span className="tv-approved-handicap">{r.h==null?'—':`${Math.round(r.h)>0?'+':''}${Math.round(r.h)}`}</span><span>{fmt(r.w1)}</span><span>{fmt(r.w2)}</span><span>{fmt(r.w3)}</span><span className="tv-approved-total"><b>{fmt(r.total)}</b><i className={r.change>0?'up':r.change<0?'down':''}>{r.change>0?'▲ '+r.change:r.change<0?'▼ '+Math.abs(r.change):'—'}</i></span>
    </div>)}
   </section>
 </main>
}
